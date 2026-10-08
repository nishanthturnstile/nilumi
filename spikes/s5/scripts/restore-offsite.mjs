import assert from "node:assert/strict";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { databaseUrl, LOCAL_URL, pool, withMember } from "../src/db.mjs";
import { downloadVerified, recoveryJournal, sha256 } from "../src/offsite.mjs";
import { createR2Store, r2Config } from "../src/r2.mjs";
import { prepareWorker } from "../src/worker.mjs";
import { runCommand } from "./backup.mjs";

// The operator decrypts privately. This command never opens an identity file.
const report = {
  at: new Date().toISOString(),
  syntheticOnly: true,
  offsiteRestorePassed: false,
  operatorMasterKeyDecryption: "pending",
  bothAdultRecoveryAccepted: false,
};
let target, app, worker, store;
try {
  if (databaseUrl() !== LOCAL_URL) throw Error("s5_local_recovery_only");
  if (process.env.S5_OPERATOR_DECRYPTION_CONFIRMED !== "true")
    throw Error("s5_operator_decryption_confirmation_required");
  const root = await realpath("validation-results");
  const directory = await realpath(process.env.S5_RECOVERY_DIRECTORY ?? "");
  if (
    !directory.startsWith(`${root}${sep}`) ||
    !/^recovery-[a-f0-9-]{36}$/.test(directory.slice(root.length + 1))
  )
    throw Error("s5_recovery_directory_required");
  const dumpPath = await realpath(resolve(directory, "backup.pg"));
  if (dumpPath !== resolve(directory, "backup.pg"))
    throw Error("s5_recovery_dump_path_invalid");
  const dump = await readFile(dumpPath);
  if (
    dump.length > 16 * 1024 * 1024 ||
    dump.subarray(0, 5).toString() !== "PGDMP"
  )
    throw Error("s5_custom_dump_required");
  const config = r2Config();
  store = createR2Store(config);
  const verified = await downloadVerified(
    store,
    config.prefix,
    process.env.S5_RECOVERY_MANIFEST_KEY,
  );
  const localCiphertext = await readFile(resolve(directory, "backup.pg.age"));
  assert.equal(sha256(localCiphertext), verified.manifest.ciphertextSha256);
  assert.equal(sha256(verified.encrypted), sha256(localCiphertext));
  // Fresh remote read includes tombstones published after the downloaded backup.
  const journal = await recoveryJournal(store, config.prefix);
  const targetUrl = new URL(LOCAL_URL);
  targetUrl.port = "55436";
  target = pool({ connectionString: targetUrl.toString() });
  assert.equal(
    (
      await target.query(
        "select count(*)::int as n from pg_namespace where nspname in ('s5','graphile_worker')",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await target.query(
        "select count(*)::int as n from pg_roles where rolname in ('s5_app','s5_worker')",
      )
    ).rows[0].n,
    0,
  );
  await target.query(
    "create role s5_app login password 's5-local-synthetic-only' nosuperuser nobypassrls nocreatedb nocreaterole; create role s5_worker login password 's5-local-synthetic-only' nosuperuser nobypassrls nocreatedb nocreaterole; create extension vector; create extension pg_trgm;",
  );
  const metadata = (
    await target.query(
      "select current_setting('server_version_num')::int as version,datlocprovider,datlocale from pg_database where datname=current_database()",
    )
  ).rows[0];
  assert.equal(
    Math.floor(metadata.version / 10000),
    Math.floor(verified.manifest.source.serverVersionNum / 10000),
  );
  assert.equal(
    metadata.datlocprovider,
    verified.manifest.source.localeProvider,
  );
  assert.equal(metadata.datlocale, verified.manifest.source.locale);
  const extensions = (
    await target.query(
      "select extname,extversion from pg_extension where extname in ('vector','pg_trgm') order by extname",
    )
  ).rows;
  assert.deepEqual(extensions, verified.manifest.source.extensions);
  // Offsite archive contains s5, not Graphile's internal queue. Reinstall the
  // pinned queue schema as a dependency, without starting any worker process.
  await prepareWorker(target);
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
  const beforeReplay = {};
  for (const table of [
    "members",
    "records",
    "occurrences",
    "deliveries",
    "forget_tombstones",
  ]) {
    beforeReplay[table] = (
      await target.query(`select count(*)::int as n from s5.${table}`)
    ).rows[0].n;
    assert.equal(
      beforeReplay[table],
      verified.manifest.source.rowCounts[table],
    );
  }
  await target.query("begin");
  try {
    await target.query(
      "delete from s5.records r using jsonb_to_recordset($1::jsonb) j(household_id text,record_id text) where r.household_id=j.household_id and r.id=j.record_id",
      [JSON.stringify(journal)],
    );
    await target.query(
      "insert into s5.forget_tombstones(household_id,record_id,journaled_at) select household_id,record_id,clock_timestamp() from jsonb_to_recordset($1::jsonb) j(household_id text,record_id text) on conflict do nothing",
      [JSON.stringify(journal)],
    );
    assert.equal(
      (
        await target.query(
          "select count(*)::int as n from s5.records r join jsonb_to_recordset($1::jsonb) j(household_id text,record_id text) on r.household_id=j.household_id and r.id=j.record_id",
          [JSON.stringify(journal)],
        )
      ).rows[0].n,
      0,
    );
    await target.query("commit");
  } catch (error) {
    await target.query("rollback");
    throw error;
  }
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
  assert.equal(
    (
      await target.query(
        "select relrowsecurity and relforcerowsecurity as forced from pg_class where oid='s5.records'::regclass",
      )
    ).rows[0].forced,
    true,
  );
  const appUrl = new URL(targetUrl);
  appUrl.username = "s5_app";
  const workerUrl = new URL(targetUrl);
  workerUrl.username = "s5_worker";
  app = pool({ connectionString: appUrl.toString(), max: 1 });
  worker = pool({ connectionString: workerUrl.toString() });
  const visible = (h, m) =>
    withMember(app, h, m, async (c) =>
      (await c.query("select id from s5.records order by id")).rows.map(
        (r) => r.id,
      ),
    );
  const expected = (h, ids) =>
    ids.filter(
      (id) => !journal.some((j) => j.household_id === h && j.record_id === id),
    );
  assert.deepEqual(
    await visible("h1", "adult1"),
    expected("h1", ["household1", "private1", "shared1"]),
  );
  assert.deepEqual(
    await visible("h1", "adult2"),
    expected("h1", ["household1", "private2", "shared1"]),
  );
  assert.deepEqual(await visible("h2", "adult3"), expected("h2", ["other1"]));
  assert.equal((await app.query("select * from s5.records")).rowCount, 0);
  await assert.rejects(worker.query("select * from s5.records"), {
    code: "42501",
  });
  // Queue runtime is reinstalled separately; restored s5 visibility/grants were
  // checked above before the runtime migration could repair them.
  await target.query(
    await readFile(new URL("../sql/runtime.sql", import.meta.url), "utf8"),
  );
  await assert.rejects(app.query("select * from graphile_worker.jobs"), {
    code: "42501",
  });
  await worker.query(
    "insert into graphile_worker._private_tasks(identifier) values('s5_dispatch') on conflict do nothing",
  );
  const finalJournal = await recoveryJournal(store, config.prefix);
  assert.deepEqual(finalJournal, journal);
  Object.assign(report, {
    offsiteRestorePassed: true,
    operatorMasterKeyDecryption: "user_confirmed",
    bucket: config.bucket,
    manifestKey: process.env.S5_RECOVERY_MANIFEST_KEY,
    freshClusterRolesRecreated: true,
    manifestRowCountsMatched: true,
    beforeReplay,
    journalCount: journal.length,
    journalRecheckedBeforeAcceptance: true,
    forgottenRecordsAbsent: true,
    restrictedVisibilityPassed: true,
    restrictedWorkerPassed: true,
    forceRls: true,
    database: metadata,
    extensions,
    graphileQueueRuntimeReinstalled: true,
    graphileQueueContentsRestored: false,
    plaintextDumpSha256: sha256(dump),
    rpoHours: (Date.now() - Date.parse(verified.manifest.createdAt)) / 3600000,
    restoreDurationSeconds: (Date.now() - Date.parse(report.at)) / 1000,
    totalHumanRto: "pending_operator_timing",
    restoredRuntimeTrafficEnabled: false,
  });
} catch (error) {
  report.failure = error.message?.startsWith("s5_")
    ? error.message
    : "s5_offsite_restore_failed";
  process.exitCode = 1;
} finally {
  store?.close();
  await Promise.all([target?.end(), app?.end(), worker?.end()]);
  await mkdir("validation-results", { recursive: true });
  await writeFile(
    "validation-results/offsite-restore.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
console.log(JSON.stringify(report));
