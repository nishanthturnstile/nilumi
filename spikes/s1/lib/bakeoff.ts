import { KEYTERMS } from "./keyterms";
import { entityAccuracy, p50, p95, wer } from "./scoring";
import { transcribeElevenlabs } from "./stt/elevenlabs";
import {
  type SttOptions,
  type SttResult,
  transcribeSarvam,
} from "./stt/sarvam";

export type BakeoffRow = SttResult & {
  file: string;
  truth: string;
  tags: string[];
  noise: string;
  wer: number | null;
  entityAcc: number | null;
};
type Providers = {
  sarvam: typeof transcribeSarvam;
  elevenlabs: typeof transcribeElevenlabs;
};
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BATCH_BYTES = 80 * 1024 * 1024;
const basename = (name: string) =>
  name.replaceAll("\\", "/").split("/").at(-1) ?? "";

class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function parseJson(value: FormDataEntryValue | null, label: string): unknown {
  if (typeof value !== "string" || value.length > 200_000)
    throw new InputError(`${label} must be JSON text`);
  try {
    return JSON.parse(value);
  } catch {
    throw new InputError(`${label} is invalid JSON`);
  }
}

export function summarize(results: BakeoffRow[]) {
  return [...new Set(results.map((r) => r.provider))].map((provider) => {
    const rows = results.filter((r) => r.provider === provider);
    const ok = rows.filter((r) => r.status === "ok");
    const entities = ok.filter((r) => r.entityAcc !== null);
    return {
      provider,
      total: rows.length,
      successful: ok.length,
      failed: rows.length - ok.length,
      meanWer: ok.length
        ? ok.reduce((sum, r) => sum + (r.wer ?? 0), 0) / ok.length
        : null,
      meanEntityAcc: entities.length
        ? entities.reduce((sum, r) => sum + (r.entityAcc ?? 0), 0) /
          entities.length
        : null,
      entityClips: entities.length,
      p50Ms: ok.length ? p50(ok.map((r) => r.ms)) : null,
      p95Ms: ok.length ? p95(ok.map((r) => r.ms)) : null,
    };
  });
}

export async function handleBakeoff(
  req: Request,
  providers: Providers = {
    sarvam: transcribeSarvam,
    elevenlabs: transcribeElevenlabs,
  },
): Promise<Response> {
  try {
    if (
      Number(req.headers.get("content-length")) >
      MAX_BATCH_BYTES + 1_000_000
    ) {
      throw new InputError("Batch exceeds 80 MiB", 413);
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new InputError("Send multipart form data");
    }
    const rawFiles = form.getAll("files");
    if (
      !rawFiles.length ||
      rawFiles.length > 80 ||
      rawFiles.some((f) => !(f instanceof File))
    ) {
      throw new InputError("Select between 1 and 80 audio files");
    }
    const files = rawFiles as File[];
    if (files.reduce((sum, f) => sum + f.size, 0) > MAX_BATCH_BYTES)
      throw new InputError("Batch exceeds 80 MiB", 413);
    const names = new Set<string>();
    for (const file of files) {
      if (!file.size || file.size > MAX_FILE_BYTES)
        throw new InputError(
          "Each clip must be non-empty and at most 10 MiB",
          413,
        );
      if (
        !/\.(wav|mp3|aac|aiff?|ogg|opus|flac|mp4|m4a|amr|wma|webm)$/i.test(
          file.name,
        ) ||
        (file.type &&
          !file.type.startsWith("audio/") &&
          !["video/mp4", "video/webm", "application/octet-stream"].includes(
            file.type,
          ))
      ) {
        throw new InputError(`Unsupported audio file: ${file.name}`);
      }
      const name = basename(file.name);
      if (names.has(name))
        throw new InputError(`Duplicate clip filename: ${name}`);
      names.add(name);
    }
    const keyterms = form.has("keyterms")
      ? parseJson(form.get("keyterms"), "Keyterms")
      : KEYTERMS;
    if (
      !Array.isArray(keyterms) ||
      keyterms.length > 50 ||
      keyterms.some(
        (k) => typeof k !== "string" || !k.trim() || Array.from(k).length > 64,
      )
    ) {
      throw new InputError(
        "Keyterms must contain at most 50 non-empty strings, each up to 64 characters",
      );
    }
    const mode = form.get("mode") ?? "codemix";
    const language = form.get("language") ?? "unknown";
    if (!["codemix", "translit", "transcribe"].includes(String(mode)))
      throw new InputError("Unsupported output mode");
    if (!["unknown", "en-IN", "ta-IN"].includes(String(language)))
      throw new InputError("Unsupported language");
    const options: SttOptions = {
      keyterms: [...new Set(keyterms.map((k: string) => k.trim()))],
      mode: mode as SttOptions["mode"],
      language: language as SttOptions["language"],
    };
    const manifest = new Map<
      string,
      { truth: string; tags: string[]; noise: string }
    >();
    if (form.has("manifest")) {
      const entries = parseJson(form.get("manifest"), "Manifest");
      if (!Array.isArray(entries) || entries.length > 160)
        throw new InputError("Manifest must be an array of at most 160 clips");
      for (const entry of entries) {
        if (
          !entry ||
          typeof entry.file !== "string" ||
          typeof entry.truth !== "string" ||
          entry.truth.length > 2000 ||
          (entry.tags !== undefined &&
            (!Array.isArray(entry.tags) ||
              entry.tags.some((tag: unknown) => typeof tag !== "string"))) ||
          (entry.noise !== undefined && typeof entry.noise !== "string")
        )
          throw new InputError("Invalid manifest entry");
        const name = basename(entry.file);
        if (manifest.has(name))
          throw new InputError(`Duplicate manifest filename: ${name}`);
        manifest.set(name, {
          truth: entry.truth,
          tags: entry.tags ?? [],
          noise: entry.noise ?? "unspecified",
        });
      }
    }
    // Validate every truth before making any paid provider call.
    const clips = files.map((file) => {
      const entry = manifest.get(basename(file.name));
      if (form.has("manifest") && !entry)
        throw new InputError(`Missing manifest truth for ${file.name}`);
      const truth = entry?.truth ?? form.get("truth");
      if (typeof truth !== "string" || !truth.trim() || truth.length > 2000)
        throw new InputError(`Enter a truth transcript for ${file.name}`);
      return {
        file,
        truth,
        tags: entry?.tags ?? [],
        noise: entry?.noise ?? "unspecified",
      };
    });
    const results: BakeoffRow[] = [];
    for (const clip of clips) {
      const outputs = [
        await providers.sarvam(clip.file, clip.file.name, options),
      ];
      if (form.get("elevenlabs") === "1")
        outputs.push(await providers.elevenlabs(clip.file, clip.file.name));
      for (const output of outputs) {
        results.push({
          ...output,
          file: clip.file.name,
          truth: clip.truth,
          tags: clip.tags,
          noise: clip.noise,
          wer: output.status === "ok" ? wer(clip.truth, output.text) : null,
          entityAcc:
            output.status === "ok"
              ? entityAccuracy(clip.truth, output.text, options.keyterms)
              : null,
        });
      }
    }
    return Response.json(
      { results, summary: summarize(results), options },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof InputError)
      return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
