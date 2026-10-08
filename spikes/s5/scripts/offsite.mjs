import { mkdir, writeFile } from "node:fs/promises";
import { databaseUrl, LOCAL_URL, pool } from "../src/db.mjs";
import {
  applyRetention,
  downloadVerified,
  publishJournal,
  retentionPlan,
  uploadBackup,
} from "../src/offsite.mjs";
import { createR2Store, r2Config } from "../src/r2.mjs";
import { encryptDump, journalSnapshot, restoreLocal } from "./backup.mjs";

// Synthetic-only operator command. No bucket creation or lifecycle changes.
let db, store;
const report = {
  at: new Date().toISOString(),
  syntheticOnly: true,
  offsiteAutomationPassed: false,
};
try {
  if (databaseUrl() !== LOCAL_URL)
    throw Error("s5_local_offsite_source_required");
  if (process.env.S5_MASTER_KEY_CONFIRMED !== "true")
    throw Error("s5_real_master_key_confirmation_required");
  if (!/^age1[a-z0-9]+$/.test(process.env.S5_AGE_RECIPIENT ?? ""))
    throw Error("s5_public_age_recipient_required");
  const config = r2Config();
  store = createR2Store(config);
  db = pool();
  await publishJournal(db, store, config.prefix);
  const restored = await restoreLocal(db);
  const encrypted = await encryptDump(
    restored.dump,
    process.env.S5_AGE_RECIPIENT,
  );
  const journal = await publishJournal(db, store, config.prefix);
  await journalSnapshot(db); // Fail if a concurrent forget remains unjournaled.
  const uploaded = await uploadBackup({
    store,
    prefix: config.prefix,
    encrypted,
    journal,
    restoreVerified: true,
    sourceManifest: restored.sourceManifest,
  });
  await downloadVerified(store, config.prefix, uploaded.manifestKey);
  report.upload = {
    manifestKey: uploaded.manifestKey,
    ciphertextSha256: uploaded.ciphertextSha256,
    ciphertextBytes: uploaded.ciphertextBytes,
    journalCount: journal.count,
    downloadVerified: true,
  };
  const retention = { keep: 7, minimumAgeDays: 7 };
  const candidates = await retentionPlan(store, config.prefix, retention);
  report.retention = {
    ...retention,
    candidates: candidates.length,
    dryRun: process.env.S5_APPLY_RETENTION !== "true",
  };
  if (!report.retention.dryRun)
    report.retention.deletedPairs = await applyRetention(
      store,
      config.prefix,
      retention,
    );
  report.offsiteAutomationPassed = true;
  report.manualRecovery = "pending_both_adults";
} catch (error) {
  report.failure = error.message?.startsWith("s5_")
    ? error.message
    : "s5_offsite_failed";
  process.exitCode = 1;
} finally {
  store?.close();
  if (db) await db.end();
  await mkdir("validation-results", { recursive: true });
  await writeFile(
    "validation-results/offsite.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
console.log(JSON.stringify(report));
