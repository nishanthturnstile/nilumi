import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { databaseUrl, LOCAL_URL, pool, setup, withMember } from "../src/db.mjs";
import { createSmokeServer } from "../src/server.mjs";
import { enqueue, prepareWorker } from "../src/worker.mjs";
import { journalSnapshot, restoreLocal } from "./backup.mjs";

async function rls(owner) {
  const url = new URL(databaseUrl());
  url.username = "s5_app";
  const app = pool({ connectionString: url.toString(), max: 1 });
  try {
    const identity = await app.query(
      "select current_user, rolsuper, rolbypassrls from pg_roles where rolname=current_user",
    );
    assert.equal(identity.rows[0].current_user, "s5_app");
    assert.equal(identity.rows[0].rolsuper, false);
    assert.equal(identity.rows[0].rolbypassrls, false);
    const visible = async (h, m) =>
      withMember(app, h, m, async (c) =>
        (await c.query("select id from s5.records order by id")).rows.map(
          (r) => r.id,
        ),
      );
    assert.deepEqual(await visible("h1", "adult1"), [
      "household1",
      "private1",
      "shared1",
    ]);
    assert.deepEqual(await visible("h1", "adult2"), [
      "household1",
      "private2",
      "shared1",
    ]);
    assert.deepEqual(await visible("h2", "adult3"), ["other1"]);
    assert.equal((await app.query("select * from s5.records")).rowCount, 0);
    await assert.rejects(
      withMember(app, "h1", "adult1", (c) =>
        c.query(
          "insert into s5.records values('h2','bad','adult3','private','synthetic')",
        ),
      ),
      { code: "42501" },
    );
    assert.deepEqual(await visible("h1", "adult2"), [
      "household1",
      "private2",
      "shared1",
    ]);
    await assert.rejects(app.query("select * from graphile_worker.jobs"), {
      code: "42501",
    });
    await assert.rejects(
      owner.query(
        "insert into s5.records values('h2','bad-reference','adult1','household','synthetic')",
      ),
      { code: "23503" },
    );
    return {
      passed: true,
      poolSize: 1,
      checks: 9,
      queueAccessDenied: true,
      crossHouseholdForeignKeyDenied: true,
    };
  } finally {
    await app.end();
  }
}
async function workers(db) {
  await prepareWorker(db);
  const scenarios = [
    "one_off",
    "recurring_instance",
    "snoozed",
    "edited",
    "quiet_hours",
  ];
  const due = new Date(Date.now() + 3000);
  const client = await db.connect();
  try {
    await client.query("begin");
    for (let i = 0; i < 200; i++) {
      const scenario = scenarios[i % 5],
        id = `occ-${i}`;
      // Quiet-hours fixture defers to the synthetic allowed boundary.
      const at =
        scenario === "quiet_hours" ? new Date(due.getTime() + 2000) : due;
      await client.query(
        "insert into s5.occurrences(id,revision,due_at,scenario,household_id,owner_id) values($1,1,$2,$3,$4,$5)",
        [id, at, scenario, i % 2 ? "h2" : "h1", i % 2 ? "adult3" : "adult1"],
      );
      await enqueue(client, id, 1, at);
      if (scenario === "edited" || scenario === "snoozed") {
        await client.query("update s5.occurrences set revision=2 where id=$1", [
          id,
        ]);
        await enqueue(client, id, 2, at);
      }
      // Duplicate old/current revisions must not create duplicate dispatches.
      await enqueue(
        client,
        id,
        scenario === "edited" || scenario === "snoozed" ? 2 : 1,
        at,
      );
    }
    for (let i = 0; i < 20; i++) {
      const id = `cancelled-${i}`;
      await client.query(
        "insert into s5.occurrences(id,revision,due_at,scenario,status) values($1,1,$2,'cancelled','cancelled')",
        [id, due],
      );
      await enqueue(client, id, 1, due);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  const start = () => {
    const url = new URL(LOCAL_URL);
    url.username = "s5_worker";
    const child = spawn(process.execPath, ["src/worker.mjs"], {
      env: { ...process.env, S5_DATABASE_URL: url.toString() },
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", () => {});
    return child;
  };
  const stop = async (child) => {
    if (child.exitCode !== null) return;
    const exit = once(child, "exit");
    child.kill("SIGTERM");
    await Promise.race([
      exit,
      delay(5000).then(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }),
    ]);
  };
  const child = start();
  let replacement;
  try {
    await delay(1000);
    await stop(child);
    replacement = start();
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (
        (await db.query("select count(*)::integer as n from s5.deliveries"))
          .rows[0].n === 200
      )
        break;
      await delay(100);
    }
    const result = await db.query(
      "select count(*)::integer as dispatched, count(*) filter (where d.revision<>o.revision or o.status<>'sent')::integer as stale, count(*) filter (where d.sent_at<o.due_at)::integer as early, max(extract(epoch from d.sent_at-o.due_at)*1000)::float as maximum_lateness_ms from s5.deliveries d join s5.occurrences o on o.id=d.occurrence_id",
    );
    assert.equal(result.rows[0].dispatched, 200);
    assert.equal(result.rows[0].stale, 0);
    assert.equal(result.rows[0].early, 0);
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from s5.deliveries d join s5.occurrences o on o.id=d.occurrence_id where d.household_id<>o.household_id",
        )
      ).rows[0].n,
      0,
    );
    assert.ok(result.rows[0].maximum_lateness_ms <= 60_000);
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as n from s5.deliveries where occurrence_id like 'cancelled-%'",
        )
      ).rows[0].n,
      0,
    );
    return {
      passed: true,
      ...result.rows[0],
      scenarios,
      occurrencesPerScenario: 40,
      cancelled: 20,
      processRestarts: 1,
      delivery: "synthetic_database_sink",
      railwayRedeploy: "pending",
      calendarRecurrenceExpansion: "not_exercised",
      runtimeRole: "s5_worker_restricted",
      households: 2,
      householdReceiptMismatch: 0,
      productionMigrationMaintenanceSeparation: "pending",
    };
  } finally {
    await stop(child);
    if (replacement) await stop(replacement);
  }
}
async function streaming(db) {
  const token = randomBytes(32).toString("hex");
  const server = createSmokeServer(db, token);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    assert.equal(
      (await fetch(`${origin}/stream`, { method: "POST" })).status,
      401,
    );
    assert.equal((await fetch(`${origin}/readyz`, { headers })).status, 200);
    const first = await fetch(`${origin}/stream`, { method: "POST", headers });
    const reader = first.body.getReader();
    const chunk = new TextDecoder().decode((await reader.read()).value);
    const cursor = Number(chunk.match(/id: (\d+)/)[1]);
    await reader.cancel();
    const next = await fetch(`${origin}/stream`, {
      method: "POST",
      headers: { ...headers, "Last-Event-ID": String(cursor) },
    });
    const ids = [...(await next.text()).matchAll(/id: (\d+)/g)].map((m) =>
      Number(m[1]),
    );
    assert.deepEqual(
      ids,
      Array.from({ length: 10 - cursor }, (_, i) => cursor + i + 1),
    );
    const failing = createSmokeServer(
      {
        query: async () => {
          throw Error("synthetic_db_down");
        },
      },
      token,
    );
    failing.listen(0, "127.0.0.1");
    await once(failing, "listening");
    try {
      assert.equal(
        (
          await fetch(`http://127.0.0.1:${failing.address().port}/readyz`, {
            headers,
          })
        ).status,
        503,
      );
    } finally {
      failing.closeAllConnections();
      await new Promise((resolve) => failing.close(resolve));
    }
    return {
      passed: true,
      authenticatedPost: true,
      resumedWithoutDuplicates: true,
      databaseDownReadiness: 503,
      railwayProxy: "pending",
      phoneResume: "pending",
    };
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
const db = pool({ max: 8 });
const report = {
  version: "s5-local-v1",
  at: new Date().toISOString(),
  environment: "local_docker",
  syntheticOnly: true,
  railwayAccepted: false,
};
try {
  if (databaseUrl() !== LOCAL_URL) throw new Error("s5_local_smoke_only");
  await setup(db);
  const version = await db.query(
    "select current_setting('server_version') as version, current_setting('server_version_num')::integer as number, datlocprovider as locale_provider, datcollate as collate, datctype as ctype, datlocale as icu_locale from pg_database where datname=current_database()",
  );
  assert.ok(version.rows[0].number >= 180000);
  assert.equal(version.rows[0].locale_provider, "i");
  report.database = version.rows[0];
  report.extensions = (
    await db.query(
      "select extname,extversion from pg_extension where extname in ('vector','pg_trgm') order by extname",
    )
  ).rows;
  assert.equal(report.extensions.length, 2);
  const tamil = await db.query(
    "select show_trgm('பால்') as trigrams, to_tsvector('simple','பால் பள்ளி பால்')::text as tokens, similarity('பால்','பால்கள்') as suffix_similarity, similarity('பால்','paal') as transliteration_similarity",
  );
  assert.ok(tamil.rows[0].trigrams.length > 0);
  assert.ok(tamil.rows[0].tokens.includes("பால்"));
  assert.equal(tamil.rows[0].transliteration_similarity, 0);
  report.tamil = tamil.rows[0];
  await prepareWorker(db);
  await db.query(
    await readFile(new URL("../sql/runtime.sql", import.meta.url), "utf8"),
  );
  await db.query("alter role s5_worker password 's5-local-synthetic-only'");
  report.rls = await rls(db);
  report.worker = await workers(db);
  report.streaming = await streaming(db);
  await db.query(
    "insert into s5.forget_tombstones values('h1','private1',null)",
  );
  await assert.rejects(journalSnapshot(db), /unjournaled/);
  await db.query("delete from s5.forget_tombstones");
  const backup = await restoreLocal(db, async () => {
    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query(
        "delete from s5.records where household_id='h1' and id='private1'",
      );
      await client.query(
        "insert into s5.forget_tombstones values('h1','private1',clock_timestamp())",
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });
  report.backup = {
    plaintextRestorePassed: true,
    unjournaledBlocked: true,
    postDumpForgetReplayPassed: true,
    restoredRows: backup.restoredRows,
    restoredChecks: backup.restoredChecks,
    dumpSha256: backup.sha256,
    ageEncryption: "pending_recipient_and_cli",
    r2Upload: "pending",
    masterKeyRecovery: "pending_shared_document",
  };
  assert.equal(db.s5Failed, false);
  report.localPassed = true;
} catch (error) {
  report.localPassed = false;
  report.failure =
    typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : error.message?.startsWith("s5_")
        ? error.message
        : "s5_check_failed";
  process.exitCode = 1;
} finally {
  await db.end();
  await mkdir("validation-results", { recursive: true });
  await writeFile(
    "validation-results/local-smoke.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
console.log(JSON.stringify(report));
