function norm(s: string): string[] {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function wer(truth: string, hypothesis: string): number {
  const a = norm(truth);
  const b = norm(hypothesis);
  if (a.length === 0) return b.length === 0 ? 0 : 1;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] / a.length;
}

// Exact normalized token sequences; no expected entity means N/A.
export function entityAccuracy(
  truth: string,
  hypothesis: string,
  keyterms: string[],
): number | null {
  const t = ` ${norm(truth).join(" ")} `;
  const h = ` ${norm(hypothesis).join(" ")} `;
  const terms = [
    ...new Set(keyterms.map((k) => norm(k).join(" ")).filter(Boolean)),
  ];
  const expected = terms.filter((k) => t.includes(` ${k} `));
  if (expected.length === 0) return null;
  return expected.filter((k) => h.includes(` ${k} `)).length / expected.length;
}

// Nearest-rank percentiles. Summaries omit these when there are no successes.
export function p50(ms: number[]): number {
  const s = [...ms].sort((a, b) => a - b);
  return s.length ? s[Math.ceil(s.length * 0.5) - 1] : 0;
}

export function p95(ms: number[]): number {
  const s = [...ms].sort((a, b) => a - b);
  return s.length ? s[Math.ceil(s.length * 0.95) - 1] : 0;
}
