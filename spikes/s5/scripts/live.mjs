import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { pool, setup, withMember } from "../src/db.mjs";
import { prepareWorker } from "../src/worker.mjs";

// Operator-owned, ignored file: only newly created disposable service IDs.
const path = "validation-results/live-private.json";
const config = JSON.parse(await readFile(path, "utf8"));
assert.equal(config.project, "9acde490-30a2-4452-889a-fa5c67a79271");
assert.equal(config.environment, "ab1b8903-8615-484e-9410-04481200abbf");
assert.ok(
  config.databaseService &&
    config.databaseService !== "2b23798e-f3ef-46c4-bb20-29e518784bfa",
);
const action = process.argv[2];
const save = () =>
  writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
function setVariable(service, key, value) {
  assert.ok(service && service !== "2b23798e-f3ef-46c4-bb20-29e518784bfa");
  execFileSync(
    "railway",
    [
      "variable",
      "set",
      key,
      "--stdin",
      "--skip-deploys",
      "-p",
      config.project,
      "-e",
      config.environment,
      "-s",
      service,
    ],
    { input: value, stdio: ["pipe", "pipe", "pipe"], timeout: 30_000 },
  );
}
function url(user, password, host, port) {
  const result = new URL(`postgres://${host}:${port}/s5_smoke`);
  result.username = user;
  result.password = password;
  return result.toString();
}
async function scheduleBatch(client, fixtures) {
  await client.query(
    "select s5.schedule_occurrence(id,revision,due,scenario,status) from jsonb_to_recordset($1::jsonb) as x(id text,revision integer,due timestamptz,scenario text,status text)",
    [JSON.stringify(fixtures)],
  );
}
async function main() {
  if (action === "credentials") {
    assert.equal(config.ownerPassword, undefined);
    for (const key of [
      "ownerPassword",
      "appPassword",
      "workerPassword",
      "token",
    ])
      config[key] = randomBytes(32).toString("hex");
    await save();
    for (const [key, value] of Object.entries({
      POSTGRES_USER: "s5_owner",
      POSTGRES_DB: "s5_smoke",
      POSTGRES_PASSWORD: config.ownerPassword,
      POSTGRES_INITDB_ARGS:
        "--encoding=UTF8 --locale-provider=icu --icu-locale=en-US --locale=en_US.utf8",
    }))
      setVariable(config.databaseService, key, value);
    console.log("s5_database_credentials_configured");
    return;
  }
  if (action === "services") {
    for (const [service, user, password] of [
      [config.appService, "s5_app", config.appPassword],
      [config.workerService, "s5_worker", config.workerPassword],
    ]) {
      setVariable(
        service,
        "S5_DATABASE_URL",
        url(user, password, "nilumi-s5-postgres.railway.internal", 5432),
      );
      setVariable(service, "S5_ALLOW_REMOTE", "true");
      setVariable(service, "NODE_ENV", "production");
    }
    setVariable(config.appService, "S5_SMOKE_TOKEN", config.token);
    setVariable(config.appService, "PORT", "3000");
    console.log("s5_runtime_credentials_configured");
    return;
  }
  process.env.S5_ALLOW_REMOTE = "true";
  process.env.S5_DATABASE_URL = url(
    "s5_owner",
    config.ownerPassword,
    config.proxyHost,
    config.proxyPort,
  );
  process.env.S5_APP_PASSWORD = config.appPassword;
  const owner = pool({ max: 3 });
  const app = pool({
    connectionString: url(
      "s5_app",
      config.appPassword,
      config.proxyHost,
      config.proxyPort,
    ),
    max: 1,
  });
  try {
    if (action === "setup") {
      await setup(owner);
      await prepareWorker(owner);
      await owner.query(
        await readFile(new URL("../sql/runtime.sql", import.meta.url), "utf8"),
      );
      const password = await owner.query(
        "select format('ALTER ROLE s5_worker PASSWORD %L', $1::text) as sql",
        [config.workerPassword],
      );
      await owner.query(password.rows[0].sql);
      const roles = (
        await owner.query(
          "select rolname,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole from pg_roles where rolname in ('s5_app','s5_worker') order by rolname",
        )
      ).rows;
      for (const role of roles)
        for (const flag of [
          "rolsuper",
          "rolbypassrls",
          "rolcreatedb",
          "rolcreaterole",
        ])
          assert.equal(role[flag], false);
      const visible = (h, m) =>
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
      for (const query of [
        "select * from graphile_worker.jobs",
        "select graphile_worker.add_job('s5_dispatch')",
        "insert into s5.occurrences(id,revision,due_at,scenario) values('bad',1,now(),'bad')",
      ])
        await assert.rejects(app.query(query), { code: "42501" });
      await assert.rejects(
        withMember(app, "h1", "adult1", async (c) => {
          await c.query(
            "select s5.schedule_occurrence('rollback',1,now(),'rollback')",
          );
          throw Error("rollback_probe");
        }),
        /rollback_probe/,
      );
      assert.equal(
        (
          await owner.query(
            "select count(*)::int as n from s5.occurrences where id='rollback'",
          )
        ).rows[0].n,
        0,
      );
      assert.equal(
        (
          await owner.query(
            "select count(*)::int as n from graphile_worker.jobs where key='s5:rollback:1'",
          )
        ).rows[0].n,
        0,
      );
      const database = (
        await owner.query(
          "select version(),datlocprovider,datlocale,datcollate from pg_database where datname=current_database()",
        )
      ).rows[0];
      assert.equal(database.datlocprovider, "i");
      assert.match(database.version, /PostgreSQL 18/);
      const extensions = (
        await owner.query(
          "select extname,extversion from pg_extension where extname in ('vector','pg_trgm') order by extname",
        )
      ).rows;
      assert.equal(extensions.length, 2);
      config.report = {
        ...config.report,
        at: new Date().toISOString(),
        syntheticOnly: true,
        project: config.project,
        environment: config.environment,
        database,
        extensions,
        roles,
        rlsPassed: true,
        atomicScheduleRollbackPassed: true,
        directQueueAndOccurrenceAccessDenied: true,
      };
      await save();
      console.log(JSON.stringify(config.report));
    } else if (action === "queue") {
      await owner.query("delete from graphile_worker._private_jobs");
      const due = new Date(Date.now() + 45_000);
      const scenarios = [
        "one_off",
        "recurring_instance",
        "snoozed",
        "edited",
        "quiet_hours",
      ];
      const fixtures = [];
      const revisions = [];
      await withMember(app, "h1", "adult1", async (c) => {
        for (let i = 0; i < 200; i++) {
          const scenario = scenarios[i % 5];
          const at =
            scenario === "quiet_hours" ? new Date(due.getTime() + 2000) : due;
          fixtures.push({
            id: `occ-${i}`,
            revision: 1,
            due: at,
            scenario,
            status: "scheduled",
          });
        }
        for (let i = 0; i < 20; i++)
          fixtures.push({
            id: `cancelled-${i}`,
            revision: 1,
            due,
            scenario: "cancelled",
            status: "cancelled",
          });
        await scheduleBatch(c, fixtures);
      });
      // Update after the first transaction commits; queued old revisions persist.
      await withMember(app, "h1", "adult1", async (c) => {
        for (let i = 0; i < 200; i++) {
          const scenario = scenarios[i % 5];
          if (["snoozed", "edited"].includes(scenario)) {
            revisions.push({
              id: `occ-${i}`,
              revision: 2,
              due: new Date(due.getTime() + 3000),
              scenario,
              status: "scheduled",
            });
          }
        }
        await scheduleBatch(c, revisions);
        await scheduleBatch(c, revisions);
      });
      await assert.rejects(
        withMember(app, "h2", "adult3", (c) =>
          c.query("select s5.schedule_occurrence('occ-0',2,now(),'other')"),
        ),
        { code: "42501" },
      );
      config.report.queuedAt = new Date().toISOString();
      config.report.dueAt = due.toISOString();
      await save();
      console.log("s5_queued_200_plus_20_cancelled");
    } else if (action === "volume-canary") {
      await owner.query(
        "create table if not exists s5.volume_canary(id integer primary key,value text not null); insert into s5.volume_canary values(1,'before-snapshot') on conflict(id) do update set value=excluded.value",
      );
      console.log("s5_volume_canary_created");
    } else if (action === "volume-change") {
      await owner.query(
        "update s5.volume_canary set value='after-snapshot' where id=1",
      );
      console.log("s5_volume_canary_changed");
    } else if (action === "volume-verify") {
      assert.equal(
        (await owner.query("select value from s5.volume_canary where id=1"))
          .rows[0].value,
        "before-snapshot",
      );
      assert.equal(
        (await owner.query("select count(*)::int as n from s5.deliveries"))
          .rows[0].n,
        200,
      );
      const flags = (
        await owner.query(
          "select relrowsecurity,relforcerowsecurity from pg_class where oid='s5.records'::regclass",
        )
      ).rows[0];
      assert.equal(flags.relrowsecurity, true);
      assert.equal(flags.relforcerowsecurity, true);
      config.report.volumeRestore = {
        passed: true,
        canary: "before-snapshot",
        deliveries: 200,
        rls: flags,
      };
      await save();
      console.log(JSON.stringify(config.report.volumeRestore));
    } else if (action === "repair") {
      await owner.query(
        await readFile(new URL("../sql/runtime.sql", import.meta.url), "utf8"),
      );
      console.log("s5_runtime_policy_applied");
    } else if (action === "diagnose") {
      console.log(
        JSON.stringify(
          (
            await owner.query(
              "select usename,state,wait_event,count(*)::int as n from pg_stat_activity where datname=current_database() group by usename,state,wait_event",
            )
          ).rows,
        ),
      );
      const worker = pool({
        connectionString: url(
          "s5_worker",
          config.workerPassword,
          config.proxyHost,
          config.proxyPort,
        ),
      });
      try {
        console.log(
          JSON.stringify(
            (
              await worker.query(
                "select current_user, (select count(*)::int from graphile_worker._private_tasks) as tasks",
              )
            ).rows,
          ),
        );
      } finally {
        await worker.end();
      }
      console.log(
        JSON.stringify(
          (
            await owner.query(
              "select count(*)::int as jobs, max(attempts) as maximum_attempts,count(*) filter(where last_error is not null)::int as failed,count(*) filter(where locked_at is not null)::int as locked from graphile_worker.jobs",
            )
          ).rows[0],
        ),
      );
      console.log(
        JSON.stringify(
          (
            await owner.query(
              "select count(*)::int as deliveries from s5.deliveries",
            )
          ).rows[0],
        ),
      );
    } else if (action === "verify") {
      const deadline = new Date(config.report.dueAt).getTime() + 65_000;
      while (Date.now() < deadline) {
        if (
          (await owner.query("select count(*)::int as n from s5.deliveries"))
            .rows[0].n === 200
        )
          break;
        await delay(1000);
      }
      const result = (
        await owner.query(
          "select count(*)::int as dispatched,count(*) filter(where d.revision<>o.revision or o.status<>'sent')::int as stale,count(*) filter(where d.sent_at<o.due_at)::int as early,max(extract(epoch from d.sent_at-o.due_at)*1000)::float as maximumLatenessMs from s5.deliveries d join s5.occurrences o on o.id=d.occurrence_id",
        )
      ).rows[0];
      assert.equal(result.dispatched, 200);
      assert.equal(result.stale, 0);
      assert.equal(result.early, 0);
      assert.ok(result.maximumlatenessms <= 60_000);
      assert.equal(
        (
          await owner.query(
            "select count(*)::int as n from s5.deliveries where occurrence_id like 'cancelled-%'",
          )
        ).rows[0].n,
        0,
      );
      config.report.worker = {
        ...result,
        cancelledWithoutDelivery: 20,
        delivery: "synthetic_database_sink",
        calendarExpansion: "not_exercised",
      };
      await save();
      console.log(JSON.stringify(config.report.worker));
    } else if (action === "outage") {
      const response = await fetch(`${config.origin}/readyz`, {
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(response.status, 503);
      assert.equal(await response.text(), "not_ready");
      config.report.databaseOutageReadiness = {
        status: 503,
        genericBody: true,
      };
      await save();
      console.log(JSON.stringify(config.report.databaseOutageReadiness));
    } else if (action === "stream") {
      const headers = { Authorization: `Bearer ${config.token}` };
      assert.equal(
        (
          await fetch(`${config.origin}/readyz`, {
            signal: AbortSignal.timeout(10_000),
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await fetch(`${config.origin}/stream`, {
            method: "POST",
            signal: AbortSignal.timeout(10_000),
          })
        ).status,
        401,
      );
      const first = await fetch(`${config.origin}/stream`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      const reader = first.body.getReader();
      const chunk = new TextDecoder().decode((await reader.read()).value);
      const cursor = Number(chunk.match(/id: (\d+)/)[1]);
      await reader.cancel();
      const next = await fetch(`${config.origin}/stream`, {
        method: "POST",
        headers: { ...headers, "Last-Event-ID": String(cursor) },
        signal: AbortSignal.timeout(10_000),
      });
      assert.deepEqual(
        [...(await next.text()).matchAll(/id: (\d+)/g)].map((m) =>
          Number(m[1]),
        ),
        Array.from({ length: 10 - cursor }, (_, i) => cursor + i + 1),
      );
      const started = Date.now();
      const response = await fetch(`${config.origin}/stream/soak`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(60_000),
      });
      assert.equal(response.status, 200);
      const soakReader = response.body.getReader();
      const arrivals = [];
      for (;;) {
        const chunk = await soakReader.read();
        if (chunk.done) break;
        if (new TextDecoder().decode(chunk.value).includes(": heartbeat"))
          arrivals.push(Date.now() - started);
      }
      assert.equal(arrivals.length, 2);
      assert.ok(arrivals[0] < 35_000);
      assert.ok(arrivals[1] - arrivals[0] < 35_000);
      config.report.streaming = {
        authenticatedPost: true,
        resumePassed: true,
        proxyHeartbeatArrivalMs: arrivals,
        phoneResume: "pending",
      };
      await save();
      console.log(JSON.stringify(config.report.streaming));
    } else throw Error("s5_unknown_action");
  } finally {
    await Promise.all([owner.end(), app.end()]);
  }
  await mkdir("reports", { recursive: true });
  await writeFile(
    "validation-results/live-smoke.json",
    `${JSON.stringify(config.report, null, 2)}\n`,
  );
}
try {
  await main();
} catch (error) {
  console.log(
    JSON.stringify({
      passed: false,
      failure: /^[A-Z0-9_]+$/.test(error.code ?? "")
        ? error.code
        : "s5_live_check_failed",
    }),
  );
  process.exitCode = 1;
}
