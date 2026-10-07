import { KEYTERMS } from "../keyterms";

export type SttResult = {
  provider: string;
  model: string;
  text: string;
  ms: number;
  status: "ok" | "error";
  error?: string;
};

export async function transcribeSarvam(
  audio: Blob,
  filename: string
): Promise<SttResult> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return { provider: "sarvam", model: "saaras-v4", text: "", ms: 0, status: "error", error: "SARVAM_API_KEY missing" };
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "saaras:v4");
  form.append("language_code", "en-IN");
  form.append("mode", "transcribe");
  form.append("keyterms", JSON.stringify(KEYTERMS.slice(0, 50)));
  const started = Date.now();
  try {
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": key },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return {
      provider: "sarvam",
      model: "saaras-v4",
      text: data.transcript ?? data.text ?? "",
      ms: Date.now() - started,
      status: "ok",
    };
  } catch (e) {
    return { provider: "sarvam", model: "saaras-v4", text: "", ms: Date.now() - started, status: "error", error: e instanceof Error ? e.message : "error" };
  }
}
