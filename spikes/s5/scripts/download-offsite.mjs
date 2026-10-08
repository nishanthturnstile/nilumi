import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { downloadVerified, recoveryJournal } from "../src/offsite.mjs";
import { createR2Store, r2Config } from "../src/r2.mjs";

let store;
try {
  const config = r2Config();
  store = createR2Store(config);
  const { manifest, encrypted } = await downloadVerified(
    store,
    config.prefix,
    process.env.S5_RECOVERY_MANIFEST_KEY,
  );
  const journal = await recoveryJournal(store, config.prefix);
  const directory = `validation-results/recovery-${randomUUID()}`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(`${directory}/backup.pg.age`, encrypted, { mode: 0o600 });
  await writeFile(
    `${directory}/manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o600 },
  );
  await writeFile(
    `${directory}/forget-journal.json`,
    `${JSON.stringify(journal, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      downloadVerified: true,
      encrypted: true,
      journalCount: journal.length,
      directory,
      manualDecryptionAndRestore: "pending",
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      downloadVerified: false,
      failure: error.message?.startsWith("s5_")
        ? error.message
        : "s5_offsite_download_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  store?.close();
}
