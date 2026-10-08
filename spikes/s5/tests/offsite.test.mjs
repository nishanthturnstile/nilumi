import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyRetention,
  downloadVerified,
  publishJournal,
  recoveryJournal,
  retentionPlan,
  sha256,
  testPrefix,
  uploadBackup,
} from "../src/offsite.mjs";
import { r2Config } from "../src/r2.mjs";

const prefix = "s5-synthetic/unit-test/";
const sourceManifest = {
  serverVersionNum: 180006,
  localeProvider: "i",
  locale: "en-US",
  extensions: [
    { extname: "vector", extversion: "0.8.7" },
    { extname: "pg_trgm", extversion: "1.6" },
  ],
  rowCounts: {
    members: 3,
    records: 5,
    occurrences: 0,
    deliveries: 0,
    forget_tombstones: 0,
  },
};
const encrypted = Buffer.from(
  "age-encryption.org/v1\nsynthetic-adapter-fixture-not-real-encryption",
);
function memoryStore() {
  const objects = new Map(),
    deleted = [];
  return {
    objects,
    deleted,
    async put(k, b) {
      objects.set(k, Buffer.from(b));
    },
    async get(k) {
      if (!objects.has(k)) throw Error("missing");
      return objects.get(k);
    },
    async list(p) {
      return [...objects.keys()].filter((k) => k.startsWith(p));
    },
    async delete(k) {
      deleted.push(k);
      objects.delete(k);
    },
  };
}
async function fixture(store, now = new Date()) {
  const journalBody = Buffer.from(
    '{"version":1,"syntheticOnly":true,"tombstones":[]}',
  );
  const journal = {
    key: `${prefix}journal/${sha256(journalBody)}.json`,
    sha256: sha256(journalBody),
    count: 0,
  };
  await store.put(journal.key, journalBody);
  return uploadBackup({
    store,
    prefix,
    encrypted,
    journal,
    restoreVerified: true,
    now,
    sourceManifest,
  });
}
test("R2 requires explicit credentials and a synthetic prefix", () => {
  for (const p of [
    "",
    "family/",
    "s5-synthetic/../",
    "s5-synthetic/test/other/",
  ])
    assert.throws(() => testPrefix(p));
  assert.throws(
    () =>
      r2Config({
        S5_R2_ACCOUNT_ID: "a".repeat(32),
        S5_R2_BUCKET: "test-bucket",
        S5_R2_PREFIX: prefix,
      }),
    /credentials/,
  );
});
test("journal watermark advances only after remote read-back verification", async () => {
  let marked = false;
  const db = {
    async query(sql) {
      if (sql.startsWith("select"))
        return {
          rows: [
            { household_id: "h1", record_id: "r1", body: "must-not-upload" },
          ],
        };
      marked = true;
      return {};
    },
  };
  const store = memoryStore();
  const put = store.put;
  store.put = async (k, b) =>
    put(k, Buffer.concat([b, Buffer.from("corrupt")]));
  await assert.rejects(publishJournal(db, store, prefix), /hash_mismatch/);
  assert.equal(marked, false);
  store.put = put;
  const journal = await publishJournal(db, store, prefix);
  assert.equal(marked, true);
  assert.equal(
    (await store.get(journal.key)).toString().includes("must-not-upload"),
    false,
  );
});
test("ciphertext is read back before manifest becomes visible; corruption blocks restore", async () => {
  const store = memoryStore();
  const uploaded = await fixture(store);
  assert.deepEqual(
    (await downloadVerified(store, prefix, uploaded.manifestKey)).encrypted,
    encrypted,
  );
  store.objects.set(uploaded.dumpKey, Buffer.from("corrupt"));
  await assert.rejects(
    downloadVerified(store, prefix, uploaded.manifestKey),
    /hash_mismatch/,
  );
  const failing = memoryStore();
  const put = failing.put;
  failing.put = async (k, b) =>
    put(k, k.endsWith(".age") ? Buffer.from("corrupt") : b);
  await assert.rejects(fixture(failing), /hash_mismatch/);
  assert.equal(
    [...failing.objects.keys()].some((k) => k.endsWith(".manifest.json")),
    false,
  );
});
test("plaintext and unverified restores cannot be published", async () => {
  const store = memoryStore();
  const uploaded = await fixture(store);
  await assert.rejects(
    uploadBackup({
      store,
      prefix,
      encrypted: Buffer.from("PGDMP plaintext"),
      journal: uploaded.journal,
      restoreVerified: true,
    }),
    /ciphertext_required/,
  );
  await assert.rejects(
    uploadBackup({
      store,
      prefix,
      encrypted,
      journal: uploaded.journal,
      restoreVerified: false,
    }),
    /restore_proof/,
  );
});
test("recovery includes forget snapshots published after the backup", async () => {
  const store = memoryStore();
  await fixture(store);
  const body = Buffer.from(
    JSON.stringify({
      version: 1,
      syntheticOnly: true,
      tombstones: [{ household_id: "h2", record_id: "later" }],
    }),
  );
  await store.put(`${prefix}journal/${sha256(body)}.json`, body);
  assert.deepEqual(await recoveryJournal(store, prefix), [
    { household_id: "h2", record_id: "later" },
  ]);
  store.objects.set(
    `${prefix}journal/${sha256(body)}.json`,
    Buffer.from("corrupt"),
  );
  await assert.rejects(recoveryJournal(store, prefix), /hash_mismatch/);
});
test("retention preserves newest backup, foreign objects and every forget journal", async () => {
  const store = memoryStore();
  await fixture(store, new Date("2026-01-01"));
  await fixture(store, new Date("2026-01-02"));
  const latest = await fixture(store, new Date("2026-02-01"));
  await store.put("unrelated/keep", Buffer.from("foreign"));
  const journalKeys = [...store.objects.keys()].filter((k) =>
    k.includes("/journal/"),
  );
  const options = { keep: 1, minimumAgeDays: 7, now: new Date("2026-02-02") };
  assert.equal((await retentionPlan(store, prefix, options)).length, 2);
  assert.equal(store.deleted.length, 0);
  assert.equal(await applyRetention(store, prefix, options), 2);
  assert.ok(store.objects.has(latest.manifestKey));
  assert.ok(store.objects.has("unrelated/keep"));
  for (const k of journalKeys) assert.ok(store.objects.has(k));
});
test("tampered cross-prefix manifests and corrupt inventories abort retention before deletion", async () => {
  const store = memoryStore();
  const uploaded = await fixture(store, new Date("2026-01-01"));
  const manifest = JSON.parse(store.objects.get(uploaded.manifestKey));
  manifest.dumpKey = "unrelated/keep.pg.age";
  store.objects.set(
    uploaded.manifestKey,
    Buffer.from(JSON.stringify(manifest)),
  );
  await assert.rejects(
    applyRetention(store, prefix, { keep: 1, now: new Date("2026-02-01") }),
    /invalid/,
  );
  assert.equal(store.deleted.length, 0);
});
