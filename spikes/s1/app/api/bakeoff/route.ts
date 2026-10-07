import { NextResponse } from "next/server";
import { transcribeSarvam } from "@/lib/stt/sarvam";
import { transcribeElevenlabs } from "@/lib/stt/elevenlabs";
import { entityAccuracy, wer } from "@/lib/scoring";
import { KEYTERMS } from "@/lib/keyterms";

export async function POST(req: Request) {
  const form = await req.formData();
  const truth = String(form.get("truth") ?? "");
  const runElevenlabs = form.get("elevenlabs") === "1";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const results = [];
  for (const file of files) {
    const sarvam = await transcribeSarvam(file, file.name);
    results.push({
      file: file.name,
      ...sarvam,
      wer: sarvam.status === "ok" ? wer(truth, sarvam.text) : null,
      entityAcc: sarvam.status === "ok" ? entityAccuracy(truth, sarvam.text, KEYTERMS) : null,
    });
    if (runElevenlabs) {
      const el = await transcribeElevenlabs(file, file.name);
      results.push({
        file: file.name,
        ...el,
        wer: el.status === "ok" ? wer(truth, el.text) : null,
        entityAcc: el.status === "ok" ? entityAccuracy(truth, el.text, KEYTERMS) : null,
      });
    }
  }
  return NextResponse.json({ results });
}
