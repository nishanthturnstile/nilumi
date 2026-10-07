import type { SttResult } from "./sarvam";

export async function transcribeElevenlabs(
  audio: Blob,
  filename: string
): Promise<SttResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { provider: "elevenlabs", model: "scribe-v2", text: "", ms: 0, status: "error", error: "ELEVENLABS_API_KEY missing / ElevenLabs S0 not green" };
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model_id", "scribe_v2");
  const started = Date.now();
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail?.message ?? `HTTP ${res.status}`);
    return {
      provider: "elevenlabs",
      model: "scribe-v2",
      text: data.text ?? "",
      ms: Date.now() - started,
      status: "ok",
    };
  } catch (e) {
    return { provider: "elevenlabs", model: "scribe-v2", text: "", ms: Date.now() - started, status: "error", error: e instanceof Error ? e.message : "error" };
  }
}
