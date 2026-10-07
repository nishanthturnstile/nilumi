export type RefusalCategory =
  | "payment_card"
  | "aadhaar"
  | "pan"
  | "secret_cue"
  | "password";
const digits: Record<string, string> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  onnu: "1",
  rendu: "2",
  moonu: "3",
  naalu: "4",
  anju: "5",
  aaru: "6",
  ezhu: "7",
  ettu: "8",
  onbadhu: "9",
  ஒன்று: "1",
  இரண்டு: "2",
  மூன்று: "3",
  நான்கு: "4",
  ஐந்து: "5",
  ஆறு: "6",
  ஏழு: "7",
  எட்டு: "8",
  ஒன்பது: "9",
  பூஜ்யம்: "0",
};
export function normalizeNumbers(input: string): string {
  let out = input.normalize("NFC").toLowerCase();
  out = out.replace(
    /\b(double|triple)\s+(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, count, digit) => digits[digit].repeat(count === "double" ? 2 : 3),
  );
  out = out.replace(/[\p{L}]+/gu, (word) => digits[word] ?? word);
  out = out.replace(/[௦-௯]/g, (x) => String(x.charCodeAt(0) - 0x0be6));
  return out.replace(/\b[\dol]+(?:[\s-]+[\dol]+)+\b/g, (x) =>
    /\d/.test(x)
      ? x.replace(/[\s-]/g, "").replace(/o/g, "0").replace(/l/g, "1")
      : x,
  );
}
export function luhn(s: string): boolean {
  let sum = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if ((s.length - 1 - i) % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0 && !/^0+$/.test(s);
}
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
export function verhoeff(s: string): boolean {
  let c = 0;
  [...s].reverse().forEach((x, i) => {
    c = d[c][p[i % 8][Number(x)]];
  });
  return c === 0;
}
export function detectSensitive(input: string): RefusalCategory | null {
  const norm = normalizeNumbers(input);
  if (/\b[a-z]{5}\d{4}[a-z]\b/i.test(norm)) return "pan";
  const runs = norm.match(/(?<!\d)\d{10,19}(?!\d)/g) ?? [];
  if (runs.some((x) => x.length >= 13 && luhn(x))) return "payment_card";
  if (runs.some((x) => x.length === 12 && /^[2-9]/.test(x) && verhoeff(x)))
    return "aadhaar";
  if (
    /(?:password|passcode|wi[ -]?fi password|login|கடவுச்சொல்)\s*(?:is|:|=|இது)?\s+(?!(?:needs?|change|changing|reset|forgot|forgotten)\b)[^\s.,;]+/i.test(
      norm,
    )
  )
    return "password";
  const cues =
    /\b(?:otp|verification|pin|cvv|password|passcode|lock code|alarm code|upi pin|net banking|account number|aadhaar|card number|code)\b/gi;
  for (const m of norm.matchAll(cues)) {
    const near = norm.slice(
      Math.max(0, m.index - 30),
      m.index + m[0].length + 50,
    );
    if (/\b(?=[a-z\d]*\d)[a-z\d]{4,}\b/i.test(near)) return "secret_cue";
    const after = norm.slice(m.index + m[0].length, m.index + m[0].length + 50);
    if (
      m[0].toLowerCase() !== "code" &&
      /^\s*(?:is\s+|[:=]\s*)?[a-z\d]{4,}\b/i.test(after) &&
      !/^\s*(?:needs?|change|changing|reset|forgot|forgotten)\b/i.test(after)
    )
      return "secret_cue";
  }
  return null;
}
