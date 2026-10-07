import type { Context } from "./context";
import type { Fixture } from "./fixtures";
import { normalize, resolveEntity, type Validation } from "./validate";

// Evidence spans are scored by validation, allowing different supported clauses.
// IDs/aliases are canonicalized through visible fixtures, never model-invented data.
function canonical(value: unknown, ctx: Context): unknown {
  if (Array.isArray(value)) return value.map((x) => canonical(x, ctx));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.mention === "string") {
      if ("member_id" in obj) {
        const m = ctx.members.find((x) => x.id === obj.member_id);
        if (m) return { member_id: m.id };
      }
      if (
        "list_id" in obj ||
        ctx.lists.some((x) =>
          [x.name, ...x.aliases].some(
            (s) => normalize(s) === normalize(String(obj.mention)),
          ),
        )
      ) {
        const list = ctx.lists.find((x) =>
          [x.name, ...x.aliases].some(
            (s) => normalize(s) === normalize(String(obj.mention)),
          ),
        );
        if (list) return { list_id: list.id };
      }
      const resolved = resolveEntity(obj as { mention: string }, ctx);
      if (resolved.entity) return { existing_id: resolved.entity.id };
      const member = ctx.members.filter((x) =>
        [x.name, ...x.aliases].some(
          (s) => normalize(s) === normalize(String(obj.mention)),
        ),
      );
      if (member.length === 1) return { member_id: member[0].id };
    }
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .filter((k) => k !== "evidence")
        .map((k) => [k, canonical(obj[k], ctx)]),
    );
  }
  if (typeof value === "string") return value.normalize("NFC");
  return value;
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function score(fixture: Fixture, validation: Validation) {
  if (fixture.refusal)
    return {
      correct:
        validation.status === "refused" &&
        fixture.refusal === validation.category,
      schemaValid: null,
      mismatches:
        validation.status === "refused" &&
        fixture.refusal === validation.category
          ? []
          : ["refusal"],
    };
  if (validation.status !== "parsed")
    return {
      correct: false,
      schemaValid: false,
      mismatches: [validation.status],
    };
  const actual = validation.outcomes.map((x) => ({
    index: x.index,
    status: x.status,
    reasons: x.reasons,
    visibilities: x.visibilities,
    provisional: x.provisional,
  }));
  const mismatches: string[] = [];
  if (
    !equal(
      canonical(fixture.expected, fixture.context),
      canonical(validation.parsed, fixture.context),
    )
  )
    mismatches.push("commands");
  if (!equal(fixture.outcomes, actual)) mismatches.push("outcomes");
  return { correct: !mismatches.length, schemaValid: true, mismatches };
}
export type ScoredRow = {
  caseId: string;
  modelId: string;
  pass: number;
  status: string;
  correct: boolean;
  schemaValid: boolean | null;
  latencyMs: number;
  costUsd: number | null;
  category: string;
  split: string;
  tags: string[];
  language: string;
  routedProvider?: string | null;
  routedModel?: string | null;
  isByok?: boolean | null;
  usage?: {
    input: number;
    output: number;
    cached: number;
    cacheWrite: number;
    reasoning: number;
  };
  promptBytes?: number;
  accountedCostUsd?: number;
};
export function percentile(values: number[], p: number): number | null {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null;
}
function metrics(rows: ScoredRow[]) {
  const attempted = rows.filter((x) => x.status !== "not_evaluated");
  const calls = attempted.filter((x) => x.status !== "refused");
  const successful = calls.filter((x) => x.status === "ok");
  const correct = attempted.filter((x) => x.correct).length;
  return {
    attempted: attempted.length,
    correct,
    accuracy: attempted.length ? correct / attempted.length : null,
    modelCalls: calls.length,
    schemaValidRate: calls.length
      ? calls.filter((x) => x.schemaValid === true).length / calls.length
      : null,
    successfulCalls: successful.length,
    failures: calls.length - successful.length,
    latency: {
      samples: successful.length,
      p50Ms: percentile(
        successful.map((x) => x.latencyMs),
        0.5,
      ),
      p95Ms: percentile(
        successful.map((x) => x.latencyMs),
        0.95,
      ),
    },
    tokenUsage: {
      callsWithUsage: calls.filter((x) => x.usage !== undefined).length,
      input: calls.reduce((n, x) => n + (x.usage?.input ?? 0), 0),
      output: calls.reduce((n, x) => n + (x.usage?.output ?? 0), 0),
      cached: calls.reduce((n, x) => n + (x.usage?.cached ?? 0), 0),
      cacheWrite: calls.reduce((n, x) => n + (x.usage?.cacheWrite ?? 0), 0),
      reasoning: calls.reduce((n, x) => n + (x.usage?.reasoning ?? 0), 0),
      observedCacheHits: calls.filter((x) => (x.usage?.cached ?? 0) > 0).length,
    },
    unknownCostCalls: calls.filter((x) => x.costUsd === null).length,
    accountedCostUsd: rows.reduce(
      (n, x) => n + (x.accountedCostUsd ?? x.costUsd ?? 0),
      0,
    ),
    reportedOrEstimatedCostUsd: rows.reduce((n, x) => n + (x.costUsd ?? 0), 0),
  };
}
export function summarize(rows: ScoredRow[], expected: number) {
  const groups: Record<string, ScoredRow[]> = {};
  for (const row of rows)
    for (const label of [
      `model:${row.modelId}`,
      `model:${row.modelId}/pass:${row.pass}`,
      `category:${row.category}`,
      `model:${row.modelId}/pass:${row.pass}/category:${row.category}`,
      `model:${row.modelId}/pass:${row.pass}/language:${row.language}`,
      `language:${row.language}`,
      `split:${row.split}`,
      `model:${row.modelId}/pass:${row.pass}/split:${row.split}`,
      ...row.tags.map((t) => `tag:${t}`),
      ...row.tags.map((t) => `model:${row.modelId}/pass:${row.pass}/tag:${t}`),
    ]) {
      groups[label] ??= [];
      groups[label].push(row);
    }
  const slices = Object.fromEntries(
    Object.entries(groups).map(([key, group]) => [key, metrics(group)]),
  );
  const candidates = Object.fromEntries(
    [...new Set(rows.map((x) => x.modelId))].map((modelId) => {
      const modelRows = rows.filter((x) => x.modelId === modelId);
      const passes = [...new Set(modelRows.map((x) => x.pass))].map((pass) => {
        const subset = modelRows.filter((x) => x.pass === pass);
        const measured = metrics(subset);
        const held = subset.filter((x) => x.split === "held_out");
        const date = subset.filter((x) => x.tags.includes("dates"));
        const privacy = subset.filter((x) => x.tags.includes("privacy"));
        const fullCoverage =
          subset.length === 60 &&
          new Set(subset.map((x) => x.caseId)).size === 60 &&
          measured.attempted === 60;
        const privacyPass =
          privacy.length >= 8 && privacy.every((x) => x.correct);
        const datePass = date.length >= 12 && date.every((x) => x.correct);
        const heldOutPass =
          held.length === 12 && held.filter((x) => x.correct).length >= 11;
        const accuracyPass =
          measured.accuracy !== null && measured.accuracy >= 0.9;
        const latencyTargetPass =
          measured.latency.p95Ms !== null && measured.latency.p95Ms <= 1400;
        const routeVerified = subset
          .filter((x) => x.status !== "refused" && x.status !== "not_evaluated")
          .every(
            (x) =>
              x.routedProvider === "openai" &&
              x.routedModel === modelId &&
              x.isByok === false,
          );
        return {
          pass,
          fullCoverage,
          privacyPass,
          datePass,
          heldOutPass,
          accuracyPass,
          latencyTargetPass,
          routeVerified,
          qualifies:
            fullCoverage &&
            privacyPass &&
            datePass &&
            heldOutPass &&
            accuracyPass &&
            routeVerified,
        };
      });
      return [
        modelId,
        {
          ...metrics(modelRows),
          passes,
          qualifies: passes.length > 0 && passes.every((x) => x.qualifies),
        },
      ];
    }),
  );
  const qualifying = Object.entries(candidates)
    .filter(([, candidate]) => candidate.qualifies)
    .sort(
      (a, b) =>
        (b[1].accuracy ?? 0) - (a[1].accuracy ?? 0) ||
        (a[1].latency.p95Ms ?? Infinity) - (b[1].latency.p95Ms ?? Infinity) ||
        (b[1].schemaValidRate ?? 0) - (a[1].schemaValidRate ?? 0) ||
        a[1].reportedOrEstimatedCostUsd - b[1].reportedOrEstimatedCostUsd,
    );
  const total = metrics(rows);
  return {
    expected,
    ...total,
    notEvaluated: expected - total.attempted,
    costUsd: total.unknownCostCalls ? null : total.reportedOrEstimatedCostUsd,
    slices,
    candidates,
    coverageComplete: total.attempted === expected,
    selection:
      total.attempted === expected
        ? (qualifying[0]?.[0] ?? "pending_live_gates")
        : "pending_live_gates",
  };
}
