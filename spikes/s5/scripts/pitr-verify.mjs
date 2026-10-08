import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { pool, withMember } from "../src/db.mjs";

const c = JSON.parse(
  await readFile("validation-results/live-private.json", "utf8"),
);
assert.equal(c.project, "9acde490-30a2-4452-889a-fa5c67a79271");
assert.equal(c.environment, "ab1b8903-8615-484e-9410-04481200abbf");
assert.ok(
  c.restoredService &&
    c.restoredService !== c.databaseService &&
    c.restoredService !== "2b23798e-f3ef-46c4-bb20-29e518784bfa",
);
process.env.S5_ALLOW_REMOTE = "true";
const url = (host, port, user, password) => {
  const u = new URL(`postgres://${host}:${port}/s5_smoke`);
  u.username = user;
  u.password = password;
  return u.toString();
};
process.env.S5_DATABASE_URL = url(
  c.proxyHost,
  c.proxyPort,
  "s5_owner",
  c.ownerPassword,
);
const source = pool(),
  target = pool({
    connectionString: url(
      c.restoredProxyHost,
      c.restoredProxyPort,
      "s5_owner",
      c.ownerPassword,
    ),
  }),
  app = pool({
    connectionString: url(
      c.restoredProxyHost,
      c.restoredProxyPort,
      "s5_app",
      c.appPassword,
    ),
    max: 1,
  });
try {
  const original = (
    await source.query("select value from s5.pitr_canary where id=1")
  ).rows[0].value;
  const restored = (
    await target.query("select value from s5.pitr_canary where id=1")
  ).rows[0].value;
  assert.equal(original, "after-change");
  assert.equal(restored, "before-change");
  const database = (
    await target.query(
      "select current_setting('server_version_num')::int as version,datlocprovider,datlocale,pg_is_in_recovery() as in_recovery from pg_database where datname=current_database()",
    )
  ).rows[0];
  assert.ok(database.version >= 180000);
  assert.equal(database.datlocprovider, "i");
  assert.equal(database.in_recovery, false);
  const extensions = (
    await target.query(
      "select extname,extversion from pg_extension where extname in ('vector','pg_trgm') order by extname",
    )
  ).rows;
  assert.equal(extensions.length, 2);
  const flags = (
    await target.query(
      "select relrowsecurity,relforcerowsecurity from pg_class where oid='s5.records'::regclass",
    )
  ).rows[0];
  assert.equal(flags.relrowsecurity, true);
  assert.equal(flags.relforcerowsecurity, true);
  const visible = await withMember(app, "h1", "adult2", async (client) =>
    (await client.query("select id from s5.records order by id")).rows.map(
      (r) => r.id,
    ),
  );
  assert.deepEqual(visible, ["household1", "private2", "shared1"]);
  assert.equal((await app.query("select * from s5.records")).rowCount, 0);
  await assert.rejects(app.query("select * from graphile_worker.jobs"), {
    code: "42501",
  });
  const report = {
    at: new Date().toISOString(),
    syntheticOnly: true,
    passed: true,
    project: c.project,
    environment: c.environment,
    image: "ghcr.io/railwayapp-templates/postgres-ssl:18",
    sourceService: c.databaseService,
    restoredService: c.restoredService,
    targetTimestamp: c.pitrTarget,
    original,
    restored,
    database,
    extensions,
    forceRls: flags,
    restoredRestrictedAppPassed: true,
    originalServicePreservedDuringRestore: true,
    masterKeyOffsiteRecoveryAccepted: false,
    productionMigrationMaintenanceSeparation: "pending",
  };
  await writeFile(
    "validation-results/pitr-smoke.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.log(
    JSON.stringify({
      passed: false,
      failure: /^[A-Z0-9_]+$/.test(error.code ?? "")
        ? error.code
        : "s5_pitr_validation_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await Promise.all([source.end(), target.end(), app.end()]);
}
