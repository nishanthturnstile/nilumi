import { requestTranscript, type SttResult } from "./request";

export async function transcribeElevenlabs(
  audio: Blob,
  filename: string,
): Promise<SttResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || process.env.ELEVENLABS_S0_APPROVED !== "true") {
    return {
      provider: "elevenlabs",
      model: "scribe-v2",
      text: "",
      ms: 0,
      status: "error",
      error: "ElevenLabs requires S0 approval and an API key",
    };
  }
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model_id", "scribe_v2");
  return requestTranscript(
    "elevenlabs",
    "scribe-v2",
    "https://api.elevenlabs.io/v1/speech-to-text",
    { "xi-api-key": key },
    form,
    "text",
  );
}
