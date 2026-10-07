import { readFile, writeFile } from "node:fs/promises";
import { loadFixtures } from "../lib/nlu/fixtures.ts";

const { fixtures, hash } = await loadFixtures();
const privacy = JSON.parse(await readFile("config/nlu-privacy.json", "utf8"));
const reviewed =
  privacy.fixture_review_sha256 === hash && privacy.fixture_reviewed_by;
const lines = [
  "# S3 expected-action review",
  "",
  reviewed
    ? "> Status: owner reviewed and explicitly approved all 60 expected actions on October 7, 2026. All names, records and transcripts are synthetic."
    : "> Status: owner review pending. All names, records and transcripts are synthetic.",
  "",
  `Fixture SHA-256: \`${hash}\``,
  "",
  "Review all 60 interpretations before enabling evaluation. These are proposals, not committed actions. Questions produce query plans; retrieval and answer generation are later work. All dates below use Asia/Kolkata. Held-out cases must never become prompt examples.",
  "",
];
for (const f of fixtures) {
  lines.push(
    `## ${f.id} · ${f.split}`,
    "",
    `**Transcript:** ${f.transcript}`,
    "",
    `**Expected:** ${f.understanding}`,
    "",
    `**Outcome:** ${f.refusal ? `refused (${f.refusal}); zero model calls` : f.outcomes.map((x) => `${x.index}: ${x.status}${x.reasons.length ? ` (${x.reasons.join(", ")})` : ""}${x.visibilities.length ? `; visibility ${x.visibilities.join(", ")}` : ""}`).join("; ") || "no commands"}`,
    "",
    `**Context time:** ${f.context.occurred_at}`,
    "",
    f.explanation,
    "",
    "<details><summary>Structured expected commands</summary>",
    "",
    "```json",
    JSON.stringify(f.expected, null, 2),
    "```",
    "",
    "</details>",
    "",
  );
}
await writeFile(
  "../../docs/07-s3-expected-actions.md",
  `${lines.join("\n")}\n`,
);
console.log(`Review generated: 60 synthetic cases; hash ${hash}`);
