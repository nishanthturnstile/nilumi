import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pool, withMember } from "../src/db.mjs";
import { journalSnapshot, runCommand } from "./backup.mjs";

const config = JSON.parse(
  await readFile("validation-results/live-private.json", "utf8"),
);
assert.equal(config.project, "9acde490-30a2-4452-889a-fa5c67a79271");
assert.equal(config.environment, "ab1b8903-8615-484e-9410-04481200abbf");
process.env.S5_ALLOW_REMOTE = "true";
const url = new URL(
  `postgres://${config.proxyHost}:${config.proxyPort}/s5_smoke`,
);
url.username = "s5_owner";
url.password = config.ownerPassword;
process.env.S5_DATABASE_URL = url.toString();
const owner = pool();
const directory = await mkdtemp(join(tmpdir(), "nilumi-s5-restore-"));
const envFile = join(directory, "postgres.env");
const image =
  "pgvector/pgvector:pg18@sha256:2358fcba361ed2233a5ed81b5fe4ca779ccb304120ce531a3bf51c0ed7e2bc11";
let created = false;
const started = Date.now();
try {
  await writeFile(
    envFile,
    `PGHOST=${config.proxyHost}\nPGPORT=${config.proxyPort}\nPGUSER=s5_owner\nPGPASSWORD=${config.ownerPassword}\nPGDATABASE=s5_smoke\nPGCONNECT_TIMEOUT=10\n`,
    { mode: 0o600 },
  );
  const command = (args, input) =>
    runCommand(
      "docker",
      ["run", "--rm", "-i", "--env-file", envFile, image, ...args],
      { input },
    );
  await owner.query(
    "insert into s5.forget_tombstones values('h1','private1',null)",
  );
  await assert.rejects(journalSnapshot(owner), /unjournaled/);
  await owner.query("delete from s5.forget_tombstones");
  await journalSnapshot(owner);
  const dump = await command(["pg_dump", "-Fc", "--schema=s5"]);
  const client = await owner.connect();
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
  const journal = await journalSnapshot(owner);
  await owner.query(
    "create database s5_restore template template0 locale_provider icu icu_locale 'en-US'",
  );
  created = true;
  await command(["pg_restore", "-d", "s5_restore", "--exit-on-error"], dump);
  url.pathname = "/s5_restore";
  const restored = pool({ connectionString: url.toString() });
  url.username = "s5_app";
  url.password = config.appPassword;
  const restoredApp = pool({ connectionString: url.toString(), max: 1 });
  try {
    // No route or app points at scratch; journal replay precedes any app probe.
    await restored.query(
      "delete from s5.records r using jsonb_to_recordset($1::jsonb) j(household_id text,record_id text) where r.household_id=j.household_id and r.id=j.record_id",
      [JSON.stringify(journal)],
    );
    const checks = (
      await restored.query(
        "select (select count(*)::int from s5.records) as rows,(select relrowsecurity and relforcerowsecurity from pg_class where oid='s5.records'::regclass) as rls,(select count(*)::int from pg_policy where polrelid='s5.records'::regclass) as policies,(select count(*)::int from s5.records where id='private1') as forgotten",
      )
    ).rows[0];
    assert.equal(checks.rows, 4);
    assert.equal(checks.rls, true);
    assert.equal(checks.policies, 1);
    assert.equal(checks.forgotten, 0);
    assert.equal(
      (await restoredApp.query("select * from s5.records")).rowCount,
      0,
    );
    const visible = await withMember(restoredApp, "h1", "adult2", async (c) =>
      (await c.query("select id from s5.records order by id")).rows.map(
        (r) => r.id,
      ),
    );
    assert.deepEqual(visible, ["household1", "private2", "shared1"]);
    config.report.logicalRestore = {
      passed: true,
      checks,
      restoredRestrictedRolePassed: true,
      unjournaledBackupBlocked: true,
      postDumpForgetReplayPassed: true,
      dumpSha256: createHash("sha256").update(dump).digest("hex"),
      elapsedMs: Date.now() - started,
      scope: "s5_schema_on_same_synthetic_cluster",
      encryptedOffsiteRecovery: "pending",
    };
    await writeFile(
      "validation-results/live-private.json",
      JSON.stringify(config, null, 2),
      { mode: 0o600 },
    );
    await writeFile(
      "validation-results/live-smoke.json",
      `${JSON.stringify(config.report, null, 2)}\n`,
    );
    console.log(JSON.stringify(config.report.logicalRestore));
  } finally {
    await Promise.all([restored.end(), restoredApp.end()]);
  }
} catch (error) {
  console.log(
    JSON.stringify({
      passed: false,
      failure: /^[A-Z0-9_]+$/.test(error.code ?? "")
        ? error.code
        : "s5_live_restore_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  try {
    if (created) await owner.query("drop database s5_restore");
  } finally {
    await owner.end();
    await rm(directory, { recursive: true, force: true });
  }
}
