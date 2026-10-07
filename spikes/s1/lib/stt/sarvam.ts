import { KEYTERMS } from "../keyterms";
import { isSilentPcmWav, providerAudio } from "./audio";
import { requestTranscript, type SttResult } from "./request";

export type { SttResult } from "./request";

export type SttOptions = {
  keyterms: string[];
  language: "unknown" | "en-IN" | "ta-IN";
  mode: "codemix" | "translit" | "transcribe";
};

export async function transcribeSarvam(
  audio: Blob,
  filename: string,
  options: SttOptions = {
    keyterms: KEYTERMS,
    language: "unknown",
    mode: "codemix",
  },
): Promise<SttResult> {
  const key = process.env.SARVAM_API_KEY;
  if (!key)
    return {
      provider: "sarvam",
      model: "saaras-v4",
      text: "",
      ms: 0,
      status: "error",
      error: "SARVAM_API_KEY missing",
    };
  if (/\.wav$/i.test(filename) && (await isSilentPcmWav(audio))) {
    return {
      provider: "sarvam",
      model: "saaras-v4",
      text: "",
      ms: 0,
      status: "error",
      error: "Silent PCM WAV: no speech to transcribe",
    };
  }
  const form = new FormData();
  form.append("file", providerAudio(audio, filename), filename);
  form.append("model", "saaras:v4");
  form.append("language_code", options.language);
  form.append("mode", options.mode);
  form.append("keyterms", JSON.stringify(options.keyterms));
  return requestTranscript(
    "sarvam",
    "saaras-v4",
    "https://api.sarvam.ai/speech-to-text",
    { "api-subscription-key": key },
    form,
    "transcript",
  );
}
