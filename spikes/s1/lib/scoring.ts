function norm(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

export function wer(truth: string, hypothesis: string): number {
  const a = norm(truth);
  const b = norm(hypothesis);
  if (a.length === 0) return b.length === 0 ? 0 : 1;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[a.length][b.length] / a.length;
}

// Entity accuracy: of keyterms that appear in the truth, what fraction also
// appear in the hypothesis (case-insensitive substring match).
export function entityAccuracy(truth: string, hypothesis: string, keyterms: string[]): number {
  const t = truth.toLowerCase();
  const h = hypothesis.toLowerCase();
  const expected = keyterms.filter((k) => t.includes(k.toLowerCase()));
  if (expected.length === 0) return 1;
  const hit = expected.filter((k) => h.includes(k.toLowerCase()));
  return hit.length / expected.length;
}

export function p50(ms: number[]): number {
  const s = [...ms].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

export function p95(ms: number[]): number {
  const s = [...ms].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : 0;
}
