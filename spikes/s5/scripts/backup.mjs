import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { databaseUrl, pool } from "../src/db.mjs";

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    // Provider/CLI diagnostics may contain credentials. Consume, never echo.
    child.stderr.resume();
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("s5_command_timeout"));
    }, 60_000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("s5_command_failed"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(Buffer.concat(chunks))
        : reject(new Error("s5_command_failed"));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input);
  });
}
export async function journalSnapshot(db) {
  const result = await db.query(
    "select household_id, record_id from s5.forget_tombstones where journaled_at is null order by household_id,record_id",
  );
  if (result.rowCount) throw new Error("s5_unjournaled_forget_blocks_backup");
  const journal = await db.query(
    "select household_id, record_id from s5.forget_tombstones order by household_id,record_id",
  );
  return journal.rows;
}
export async function restoreLocal(db, afterDump = async () => {}) {
  // Docker container transport is restricted to this named disposable service.
  if (
    databaseUrl() !==
    "postgres://s5_owner:s5-local-synthetic-only@127.0.0.1:55435/s5_smoke"
  )
    throw new Error("s5_local_backup_transport_required");
  await journalSnapshot(db);
  const compose = ["compose", "-f", "compose.yaml", "exec", "-T", "postgres"];
  const snapshot = await db.connect();
  let dump, sourceManifest;
  try {
    await snapshot.query("begin isolation level repeatable read read only");
    const id = (await snapshot.query("select pg_export_snapshot() as id"))
      .rows[0].id;
    sourceManifest = (
      await snapshot.query(
        'select current_setting(\'server_version_num\')::int as "serverVersionNum",datlocprovider as "localeProvider",datlocale as locale from pg_database where datname=current_database()',
      )
    ).rows[0];
    sourceManifest.extensions = (
      await snapshot.query(
        "select extname,extversion from pg_extension where extname in ('vector','pg_trgm') order by extname",
      )
    ).rows;
    sourceManifest.rowCounts = {};
    for (const table of [
      "members",
      "records",
      "occurrences",
      "deliveries",
      "forget_tombstones",
    ])
      sourceManifest.rowCounts[table] = (
        await snapshot.query(`select count(*)::int as n from s5.${table}`)
      ).rows[0].n;
    dump = await runCommand("docker", [
      ...compose,
      "pg_dump",
      "-U",
      "s5_owner",
      "-d",
      "s5_smoke",
      "-Fc",
      "--schema=s5",
      `--snapshot=${id}`,
    ]);
    await snapshot.query("commit");
  } catch (error) {
    await snapshot.query("rollback");
    throw error;
  } finally {
    snapshot.release();
  }
  await afterDump();
  const journal = await journalSnapshot(db);
  await runCommand("docker", [
    ...compose,
    "createdb",
    "-U",
    "s5_owner",
    "s5_restore",
  ]);
  try {
    await runCommand(
      "docker",
      [
        ...compose,
        "pg_restore",
        "-U",
        "s5_owner",
        "-d",
        "s5_restore",
        "--exit-on-error",
      ],
      { input: dump },
    );
    // Restore is isolated. Replay the post-backup journal before exposing data.
    const forgotten = JSON.stringify(journal);
    await runCommand(
      "docker",
      [
        ...compose,
        "psql",
        "-U",
        "s5_owner",
        "-d",
        "s5_restore",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        input: Buffer.from(
          `DELETE FROM s5.records r USING jsonb_to_recordset('${forgotten.replaceAll("'", "''")}'::jsonb) j(household_id text,record_id text) WHERE r.household_id=j.household_id AND r.id=j.record_id;\n`,
        ),
      },
    );
    const restored = await runCommand("docker", [
      ...compose,
      "psql",
      "-U",
      "s5_owner",
      "-d",
      "s5_restore",
      "-At",
      "-c",
      "select count(*) from s5.records",
    ]);
    const original = await db.query(
      "select count(*)::integer as count from s5.records",
    );
    if (Number(restored.toString().trim()) !== original.rows[0].count)
      throw new Error("s5_restore_count_mismatch");
    const checks = await runCommand("docker", [
      ...compose,
      "psql",
      "-U",
      "s5_owner",
      "-d",
      "s5_restore",
      "-At",
      "-c",
      "select json_build_object('rls', (select relrowsecurity and relforcerowsecurity from pg_class where oid='s5.records'::regclass), 'policies', (select count(*) from pg_policy where polrelid='s5.records'::regclass), 'forgotten', (select count(*) from s5.records where id='private1'))",
    ]);
    const restoredChecks = JSON.parse(checks.toString().trim());
    if (
      !restoredChecks.rls ||
      restoredChecks.policies !== 1 ||
      (journal.length && restoredChecks.forgotten !== 0)
    )
      throw new Error("s5_restore_policy_or_forget_failure");
    return {
      dump,
      journal,
      restoredRows: original.rows[0].count,
      restoredChecks,
      sourceManifest,
      sha256: createHash("sha256").update(dump).digest("hex"),
    };
  } finally {
    await runCommand("docker", [
      ...compose,
      "dropdb",
      "-U",
      "s5_owner",
      "s5_restore",
    ]);
  }
}
export async function encryptDump(dump, recipient, ageBinary = "age") {
  if (!recipient || !/^age1[a-z0-9]+$/.test(recipient))
    throw new Error("s5_public_age_recipient_required");
  const directory = await mkdtemp(join(tmpdir(), "nilumi-s5-backup-"));
  try {
    await chmod(directory, 0o700);
    const plaintext = join(directory, "dump.pg");
    const encrypted = join(directory, "dump.pg.age");
    await writeFile(plaintext, dump, { mode: 0o600 });
    await runCommand(ageBinary, ["-r", recipient, "-o", encrypted, plaintext]);
    return await readFile(encrypted);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = pool();
  try {
    const result = await restoreLocal(db);
    const encrypted = await encryptDump(
      result.dump,
      process.env.S5_AGE_RECIPIENT,
    );
    await writeFile("validation-results/s5-backup.pg.age", encrypted, {
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        encrypted: true,
        restoredRows: result.restoredRows,
        encryptedSha256: createHash("sha256").update(encrypted).digest("hex"),
        r2Upload: "pending",
        manualRecovery: "pending",
      }),
    );
  } catch {
    console.error(
      "S5 backup failed; no credentials or CLI diagnostics printed.",
    );
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}
