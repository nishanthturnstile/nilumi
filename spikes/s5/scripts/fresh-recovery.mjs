import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { databaseUrl, LOCAL_URL, pool, setup, withMember } from "../src/db.mjs";
import { prepareWorker } from "../src/worker.mjs";
import { runCommand } from "./backup.mjs";

const source = pool(),
  targetUrl = new URL(LOCAL_URL);
targetUrl.port = "55436";
const target = pool({ connectionString: targetUrl.toString() });
const report = {
  at: new Date().toISOString(),
  syntheticOnly: true,
  environment: "two_local_docker_clusters",
  pitrLiveAccepted: false,
  masterKeyRecoveryAccepted: false,
};
try {
  if (databaseUrl() !== LOCAL_URL) throw Error("s5_local_recovery_only");
  await setup(source);
  await prepareWorker(source);
  await source.query(
    await readFile(new URL("../sql/runtime.sql", import.meta.url), "utf8"),
  );
  const sourceId = (
    await source.query(
      "select system_identifier::text from pg_control_system()",
    )
  ).rows[0].system_identifier;
  const targetId = (
    await target.query(
      "select system_identifier::text from pg_control_system()",
    )
  ).rows[0].system_identifier;
  assert.notEqual(sourceId, targetId);
  assert.equal(
    (
      await target.query(
        "select count(*)::int as n from pg_roles where rolname in ('s5_app','s5_worker')",
      )
    ).rows[0].n,
    0,
  );
  // Recreate cluster login roles explicitly; pg_dump does not contain them.
  await target.query(
    "create role s5_app login password 's5-local-synthetic-only' nosuperuser nobypassrls nocreatedb nocreaterole; create role s5_worker login password 's5-local-synthetic-only' nosuperuser nobypassrls nocreatedb nocreaterole; create extension vector; create extension pg_trgm;",
  );
  const metadata = (
    await target.query(
      "select current_setting('server_version_num')::int as version,datlocprovider,datlocale from pg_database where datname=current_database()",
    )
  ).rows[0];
  assert.ok(metadata.version >= 180000);
  assert.equal(metadata.datlocprovider, "i");
  const extensions = (
    await target.query(
      "select extname,extversion from pg_extension where extname in ('vector','pg_trgm') order by extname",
    )
  ).rows;
  assert.equal(extensions.length, 2);
  const dump = await runCommand("docker", [
    "compose",
    "exec",
    "-T",
    "postgres",
    "pg_dump",
    "-U",
    "s5_owner",
    "-d",
    "s5_smoke",
    "-Fc",
    "--schema=s5",
    "--schema=graphile_worker",
  ]);
  await source.query(
    "begin;delete from s5.records where household_id='h1' and id='private1';insert into s5.forget_tombstones values('h1','private1',clock_timestamp());commit;",
  );
  await runCommand(
    "docker",
    [
      "compose",
      "-f",
      "compose.recovery.yaml",
      "exec",
      "-T",
      "postgres",
      "pg_restore",
      "-U",
      "s5_owner",
      "-d",
      "s5_smoke",
      "--exit-on-error",
    ],
    { input: dump },
  );
  // Scratch has no exposed app/worker; replay precedes restricted login queries.
  await target.query(
    "delete from s5.records where household_id='h1' and id='private1'",
  );
  const appUrl = new URL(targetUrl);
  appUrl.username = "s5_app";
  const app = pool({ connectionString: appUrl.toString(), max: 1 });
  const workerUrl = new URL(targetUrl);
  workerUrl.username = "s5_worker";
  const worker = pool({ connectionString: workerUrl.toString() });
  try {
    const visible = (h, m) =>
      withMember(app, h, m, async (c) =>
        (await c.query("select id from s5.records order by id")).rows.map(
          (r) => r.id,
        ),
      );
    assert.deepEqual(await visible("h1", "adult1"), ["household1", "shared1"]);
    assert.deepEqual(await visible("h1", "adult2"), [
      "household1",
      "private2",
      "shared1",
    ]);
    assert.deepEqual(await visible("h2", "adult3"), ["other1"]);
    assert.equal((await app.query("select * from s5.records")).rowCount, 0);
    await assert.rejects(app.query("select * from graphile_worker.jobs"), {
      code: "42501",
    });
    await assert.rejects(worker.query("select * from s5.records"), {
      code: "42501",
    });
    await worker.query(
      "insert into graphile_worker._private_tasks(identifier) values('s5_dispatch') on conflict do nothing",
    );
    const checks = (
      await target.query(
        "select (select count(*)::int from s5.records) as records,(select relrowsecurity and relforcerowsecurity from pg_class where oid='s5.records'::regclass) as force_rls,(select count(*)::int from s5.records where id='private1') as forgotten",
      )
    ).rows[0];
    assert.equal(checks.records, 4);
    assert.equal(checks.force_rls, true);
    assert.equal(checks.forgotten, 0);
    const roles = (
      await target.query(
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
    report.passed = true;
    report.distinctClusters = true;
    report.rolesRecreated = true;
    report.roles = roles;
    report.database = metadata;
    report.extensions = extensions;
    report.checks = checks;
    report.visibilityCanaries = true;
    report.workerQueuePolicyRestored = true;
    report.candidateImage =
      "ghcr.io/railwayapp-templates/postgres-ssl:18@sha256:57311072102a147982142c8398deab4c52727a2a474a7230810910a5710ca005";
  } finally {
    await Promise.all([app.end(), worker.end()]);
  }
} catch (error) {
  report.passed = false;
  report.failure = /^[A-Z0-9_]+$/.test(error.code ?? "")
    ? error.code
    : "s5_fresh_recovery_failed";
  process.exitCode = 1;
} finally {
  await Promise.all([source.end(), target.end()]);
  await mkdir("validation-results", { recursive: true });
  await writeFile(
    "validation-results/fresh-recovery.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
console.log(JSON.stringify(report));
