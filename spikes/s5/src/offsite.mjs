import { createHash, randomUUID } from "node:crypto";

const MAX_BYTES = 16 * 1024 * 1024;
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export function testPrefix(value) {
  if (!/^s5-synthetic\/[a-z0-9-]{1,48}\/$/.test(value ?? ""))
    throw Error("s5_isolated_prefix_required");
  return value;
}
function assertKey(prefix, key) {
  testPrefix(prefix);
  if (
    !key?.startsWith(prefix) ||
    key.includes("..") ||
    !/^[a-zA-Z0-9/_.-]+$/.test(key)
  )
    throw Error("s5_invalid_object_key");
}
function bytes(value) {
  if (!Buffer.isBuffer(value) || value.length === 0 || value.length > MAX_BYTES)
    throw Error("s5_object_size_invalid");
  return value;
}
export async function putVerified(store, prefix, key, body) {
  assertKey(prefix, key);
  bytes(body);
  await store.put(key, body);
  const downloaded = bytes(await store.get(key));
  if (sha256(downloaded) !== sha256(body))
    throw Error("s5_object_hash_mismatch");
  return sha256(body);
}
export async function publishJournal(db, store, prefix) {
  testPrefix(prefix);
  // Include existing journaled rows too: verifies this destination has the full
  // content-free snapshot, rather than trusting another destination's markers.
  const rows = (
    await db.query(
      "select household_id,record_id from s5.forget_tombstones order by household_id,record_id",
    )
  ).rows;
  if (rows.length > 1000) throw Error("s5_journal_limit");
  const tombstones = rows.map(({ household_id, record_id }) => {
    if (
      ![household_id, record_id].every(
        (v) => typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v),
      )
    )
      throw Error("s5_invalid_tombstone");
    return { household_id, record_id };
  });
  const body = Buffer.from(
    JSON.stringify({ version: 1, syntheticOnly: true, tombstones }),
  );
  const key = `${prefix}journal/${sha256(body)}.json`;
  const hash = await putVerified(store, prefix, key, body);
  // Remote durability and read-back precede the database watermark update.
  await db.query(
    "update s5.forget_tombstones t set journaled_at=coalesce(t.journaled_at,clock_timestamp()) from jsonb_to_recordset($1::jsonb) j(household_id text,record_id text) where t.household_id=j.household_id and t.record_id=j.record_id",
    [JSON.stringify(tombstones)],
  );
  return { key, sha256: hash, count: tombstones.length };
}
function validateManifest(prefix, value) {
  const source = value.source;
  if (
    !source ||
    !Number.isInteger(source.serverVersionNum) ||
    source.serverVersionNum < 180000 ||
    source.localeProvider !== "i" ||
    typeof source.locale !== "string" ||
    !Array.isArray(source.extensions) ||
    !source.rowCounts
  )
    throw Error("s5_source_manifest_required");
  if (
    source.extensions.length !== 2 ||
    !["vector", "pg_trgm"].every((name) =>
      source.extensions.some(
        (e) => e.extname === name && /^\d+(\.\d+)*$/.test(e.extversion),
      ),
    )
  )
    throw Error("s5_source_manifest_required");
  for (const name of [
    "members",
    "records",
    "occurrences",
    "deliveries",
    "forget_tombstones",
  ])
    if (!Number.isInteger(source.rowCounts[name]) || source.rowCounts[name] < 0)
      throw Error("s5_source_manifest_required");
  if (
    value.version !== 1 ||
    value.syntheticOnly !== true ||
    value.restoreVerified !== true ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !/^[a-f0-9]{64}$/.test(value.ciphertextSha256 ?? "") ||
    !Number.isInteger(value.ciphertextBytes) ||
    value.ciphertextBytes < 1 ||
    value.ciphertextBytes > MAX_BYTES
  )
    throw Error("s5_invalid_manifest");
  assertKey(prefix, value.dumpKey);
  assertKey(prefix, value.journal?.key);
  if (!/^[a-f0-9]{64}$/.test(value.journal.sha256 ?? ""))
    throw Error("s5_invalid_manifest");
  const stem = `${prefix}backups/`;
  if (
    !value.dumpKey.startsWith(stem) ||
    !/^[a-f0-9-]{36}\.pg\.age$/.test(value.dumpKey.slice(stem.length)) ||
    !value.journal.key.startsWith(`${prefix}journal/`)
  )
    throw Error("s5_invalid_manifest");
  return value;
}
export async function uploadBackup({
  store,
  prefix,
  encrypted,
  journal,
  restoreVerified,
  sourceManifest,
  now = new Date(),
}) {
  testPrefix(prefix);
  bytes(encrypted);
  if (!encrypted.subarray(0, 22).equals(Buffer.from("age-encryption.org/v1\n")))
    throw Error("s5_age_ciphertext_required");
  if (restoreVerified !== true) throw Error("s5_restore_proof_required");
  const id = randomUUID();
  const dumpKey = `${prefix}backups/${id}.pg.age`;
  const manifest = validateManifest(prefix, {
    version: 1,
    syntheticOnly: true,
    createdAt: now.toISOString(),
    dumpKey,
    ciphertextSha256: sha256(encrypted),
    ciphertextBytes: encrypted.length,
    journal,
    restoreVerified: true,
    source: sourceManifest && {
      serverVersionNum: sourceManifest.serverVersionNum,
      localeProvider: sourceManifest.localeProvider,
      locale: sourceManifest.locale,
      extensions: sourceManifest.extensions?.map(({ extname, extversion }) => ({
        extname,
        extversion,
      })),
      rowCounts: Object.fromEntries(
        [
          "members",
          "records",
          "occurrences",
          "deliveries",
          "forget_tombstones",
        ].map((key) => [key, sourceManifest.rowCounts?.[key]]),
      ),
    },
  });
  if (sha256(bytes(await store.get(journal.key))) !== journal.sha256)
    throw Error("s5_journal_hash_mismatch");
  await putVerified(store, prefix, dumpKey, encrypted);
  const manifestKey = `${prefix}backups/${id}.manifest.json`;
  // Manifest is the commit marker, written only after ciphertext verification.
  await putVerified(
    store,
    prefix,
    manifestKey,
    Buffer.from(JSON.stringify(manifest)),
  );
  return { manifestKey, ...manifest };
}
export async function downloadVerified(store, prefix, manifestKey) {
  assertKey(prefix, manifestKey);
  if (
    !manifestKey.startsWith(`${prefix}backups/`) ||
    !manifestKey.endsWith(".manifest.json")
  )
    throw Error("s5_invalid_manifest_key");
  const manifest = validateManifest(
    prefix,
    JSON.parse(bytes(await store.get(manifestKey)).toString()),
  );
  if (manifest.dumpKey.replace(/\.pg\.age$/, ".manifest.json") !== manifestKey)
    throw Error("s5_manifest_pair_mismatch");
  const encrypted = bytes(await store.get(manifest.dumpKey));
  if (
    encrypted.length !== manifest.ciphertextBytes ||
    sha256(encrypted) !== manifest.ciphertextSha256
  )
    throw Error("s5_object_hash_mismatch");
  if (
    sha256(bytes(await store.get(manifest.journal.key))) !==
    manifest.journal.sha256
  )
    throw Error("s5_journal_hash_mismatch");
  return { manifest, encrypted };
}
export async function recoveryJournal(store, prefix) {
  testPrefix(prefix);
  const keys = await store.list(`${prefix}journal/`);
  if (keys.length > 1000) throw Error("s5_inventory_limit");
  const merged = new Map();
  for (const key of keys) {
    assertKey(prefix, key);
    const body = bytes(await store.get(key));
    if (key !== `${prefix}journal/${sha256(body)}.json`)
      throw Error("s5_journal_hash_mismatch");
    const snapshot = JSON.parse(body.toString());
    if (
      snapshot.version !== 1 ||
      snapshot.syntheticOnly !== true ||
      !Array.isArray(snapshot.tombstones) ||
      snapshot.tombstones.length > 1000
    )
      throw Error("s5_invalid_journal");
    for (const row of snapshot.tombstones) {
      if (
        ![row.household_id, row.record_id].every(
          (v) => typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v),
        )
      )
        throw Error("s5_invalid_tombstone");
      merged.set(`${row.household_id}:${row.record_id}`, {
        household_id: row.household_id,
        record_id: row.record_id,
      });
      if (merged.size > 1000) throw Error("s5_journal_limit");
    }
  }
  return [...merged.values()].sort(
    (a, b) =>
      a.household_id.localeCompare(b.household_id) ||
      a.record_id.localeCompare(b.record_id),
  );
}
export async function retentionPlan(
  store,
  prefix,
  { keep = 7, minimumAgeDays = 7, now = new Date() } = {},
) {
  testPrefix(prefix);
  if (
    !Number.isInteger(keep) ||
    keep < 1 ||
    keep > 30 ||
    !Number.isInteger(minimumAgeDays) ||
    minimumAgeDays < 1 ||
    minimumAgeDays > 365
  )
    throw Error("s5_invalid_retention");
  const keys = await store.list(`${prefix}backups/`);
  if (keys.length > 1000) throw Error("s5_inventory_limit");
  const manifests = [];
  for (const key of keys.filter((k) => k.endsWith(".manifest.json"))) {
    const { manifest } = await downloadVerified(store, prefix, key);
    if (Date.parse(manifest.createdAt) > now.getTime())
      throw Error("s5_future_manifest");
    manifests.push({ manifestKey: key, ...manifest });
  }
  manifests.sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      a.manifestKey.localeCompare(b.manifestKey),
  );
  return manifests
    .slice(keep)
    .filter(
      (m) =>
        now.getTime() - Date.parse(m.createdAt) >= minimumAgeDays * 86400000,
    )
    .map((m) => ({ manifestKey: m.manifestKey, dumpKey: m.dumpKey }));
}
export async function applyRetention(store, prefix, options) {
  const plan = await retentionPlan(store, prefix, options);
  for (const pair of plan) {
    await downloadVerified(store, prefix, pair.manifestKey);
    // Remove commit marker first; an interrupted deletion leaves an orphan
    // ciphertext rather than advertising a backup whose data no longer exists.
    await store.delete(pair.manifestKey);
    await store.delete(pair.dumpKey);
  }
  // Forget journals are never deleted by backup retention.
  return plan.length;
}
