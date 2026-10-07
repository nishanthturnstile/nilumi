// Real provider smoke test; run only against an origin you own. No credentials needed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin))
  throw new Error(
    "Usage: node scripts/validate-live.mjs https://your-staging-origin [manifest-path]",
  );
const manifestPath =
  process.argv[3] ?? join(root, "clips/generated/manifest.json");
const entries = JSON.parse(await readFile(manifestPath, "utf8"));
const fixtures = dirname(manifestPath);
const observations = [];
const failures = [];
const started = new Date().toISOString();
const page = await fetch(`${origin}/bakeoff`, {
  signal: AbortSignal.timeout(15_000),
});
if (page.status !== 200) throw new Error(`Bakeoff page: HTTP ${page.status}`);
const mime = {
  wav: "audio/wav",
  webm: "audio/webm",
  mp4: "video/mp4",
  m4a: "audio/mp4",
};
for (const entry of entries) {
  const f = new FormData();
  f.set("truth", entry.truth);
  f.set("manifest", JSON.stringify([entry]));
  f.set("mode", "codemix");
  f.set("language", "unknown");
  f.set("elevenlabs", "0");
  f.append(
    "files",
    new Blob([await readFile(join(fixtures, entry.file))], {
      type: mime[entry.file.split(".").at(-1)] ?? "audio/wav",
    }),
    entry.file,
  );
  const start = performance.now();
  try {
    const response = await fetch(`${origin}/api/bakeoff`, {
      method: "POST",
      body: f,
      signal: AbortSignal.timeout(45_000),
    });
    const data = await response.json();
    const row = data.results?.[0];
    if (!response.ok || !row)
      throw new Error(data.error ?? `HTTP ${response.status}`);
    const expectedStatus = entry.expectedStatus ?? "ok";
    const passed =
      row.status === expectedStatus &&
      (!entry.expectedSilence || row.text.trim() === "");
    const observation = {
      file: entry.file,
      fixture: entry,
      tags: entry.tags,
      noise: entry.noise,
      expectedStatus,
      passed,
      clientMs: Math.round(performance.now() - start),
      row,
      options: data.options,
    };
    observations.push(observation);
    if (!passed) failures.push(entry.file);
    console.log(
      `${observations.length}/${entries.length} ${entry.file}: ${row.status}, ${row.ms} ms, WER ${row.wer}, ${passed ? "pipeline PASS" : "FAIL"}`,
    );
  } catch (error) {
    failures.push(entry.file);
    observations.push({
      file: entry.file,
      passed: false,
      error: error.message,
    });
    console.log(`${entry.file}: FAIL ${error.message}`);
  }
}
// Exercise validation without sending data to a provider.
for (const [name, body, expected] of [
  ["malformed-body", "{}", 400],
  ["empty-batch", new FormData(), 400],
]) {
  const response = await fetch(`${origin}/api/bakeoff`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(15_000),
  });
  observations.push({
    name,
    status: response.status,
    expected,
    passed: response.status === expected,
  });
  if (response.status !== expected) failures.push(name);
}
const successes = observations.filter(
  (o) => o.row?.status === "ok" && !o.tags.includes("negative-control"),
);
const durations = successes.map((o) => o.row.ms).sort((a, b) => a - b);
const entityRows = successes.filter((o) => o.row.entityAcc !== null);
const summary = {
  speechClips: successes.length,
  pipelineFailures: failures,
  meanWer: successes.length
    ? successes.reduce((sum, o) => sum + o.row.wer, 0) / successes.length
    : null,
  meanEntityAcc: entityRows.length
    ? entityRows.reduce((sum, o) => sum + o.row.entityAcc, 0) /
      entityRows.length
    : null,
  p50Ms: durations[Math.ceil(durations.length * 0.5) - 1] ?? null,
  p95Ms: durations[Math.ceil(durations.length * 0.95) - 1] ?? null,
};
await mkdir(join(root, "validation-results"), { recursive: true });
const destination = join(
  root,
  "validation-results",
  `live-${started.replaceAll(":", "-")}.json`,
);
await writeFile(
  destination,
  JSON.stringify(
    { origin, started, inputKind: "synthetic-smoke", summary, observations },
    null,
    2,
  ),
);
console.log(JSON.stringify(summary));
console.log(`Report: ${destination}`);
if (failures.length) process.exitCode = 1;
