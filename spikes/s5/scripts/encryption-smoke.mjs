import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pool } from "../src/db.mjs";
import { sha256 } from "../src/offsite.mjs";
import { encryptDump, restoreLocal, runCommand } from "./backup.mjs";

const db = pool();
try {
  const restored = await restoreLocal(db);
  const encrypted = await encryptDump(
    restored.dump,
    process.env.S5_AGE_RECIPIENT,
  );
  assert.ok(
    encrypted.subarray(0, 22).equals(Buffer.from("age-encryption.org/v1\n")),
  );
  const ageVersion = (
    await runCommand(process.env.S5_AGE_BINARY || "age", ["--version"])
  )
    .toString()
    .trim();
  const report = {
    at: new Date().toISOString(),
    syntheticOnly: true,
    realRecipientEncryptionPassed: true,
    publicRecipient: process.env.S5_AGE_RECIPIENT,
    ageVersion,
    sourceManifest: restored.sourceManifest,
    ciphertextBytes: encrypted.length,
    ciphertextSha256: sha256(encrypted),
    plaintextTemporaryFileCreated: false,
    r2UploadAccepted: false,
    masterKeyDecryptionAccepted: false,
    bothAdultRecoveryAccepted: false,
  };
  await mkdir("validation-results", { recursive: true });
  await writeFile("validation-results/real-recipient-smoke.pg.age", encrypted, {
    mode: 0o600,
  });
  await writeFile(
    "validation-results/encryption-smoke.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report));
} catch {
  console.log(
    JSON.stringify({
      realRecipientEncryptionPassed: false,
      failure: "s5_encryption_smoke_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
