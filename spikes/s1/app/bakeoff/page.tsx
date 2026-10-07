"use client";
import Link from "next/link";
import { useState } from "react";
import type { BakeoffRow, summarize } from "@/lib/bakeoff";
import { KEYTERMS } from "@/lib/keyterms";

type Report = { results: BakeoffRow[]; summary: ReturnType<typeof summarize> };
export default function Bakeoff() {
  const [report, setReport] = useState<Report | null>(null);
  const [truth, setTruth] = useState("");
  const [manifest, setManifest] = useState("");
  const [keyterms, setKeyterms] = useState(KEYTERMS.join("\n"));
  const [files, setFiles] = useState<File[]>([]);
  const [includeEl, setIncludeEl] = useState(false);
  const [mode, setMode] = useState("codemix");
  const [language, setLanguage] = useState("unknown");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const form = new FormData();
      form.append("truth", truth);
      if (manifest.trim()) form.append("manifest", manifest);
      form.append(
        "keyterms",
        JSON.stringify(
          keyterms
            .split("\n")
            .map((k) => k.trim())
            .filter(Boolean),
        ),
      );
      form.append("mode", mode);
      form.append("language", language);
      form.append("elevenlabs", includeEl ? "1" : "0");
      for (const file of files) form.append("files", file);
      const res = await fetch("/api/bakeoff", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? `Request failed (${res.status})`);
      setReport(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not run bakeoff. Retry when online.",
      );
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nilumi-bakeoff-results.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6 max-w-5xl mx-auto w-full">
      <nav aria-label="Bakeoff navigation">
        <Link
          className="inline-flex min-h-11 items-center rounded border px-4"
          href="/"
        >
          ← Back to home
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold">STT bake-off</h1>
      <p>
        Choose clips and enter their exact transcripts before running. Example
        names are a starter set; edit them for your household. Clips are sent to
        the selected providers.
      </p>
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <label>
          Truth for one clip or a same-truth batch
          <textarea
            className="block w-full rounded border p-3"
            rows={2}
            value={truth}
            onChange={(e) => setTruth(e.target.value)}
          />
        </label>
        <label>
          Per-clip manifest JSON (overrides the shared truth)
          <textarea
            className="block w-full rounded border p-3 font-mono"
            rows={4}
            value={manifest}
            onChange={(e) => setManifest(e.target.value)}
            placeholder={
              '[{"file":"clip-001.webm","truth":"Add Amul milk","tags":["brand"],"noise":"clean"}]'
            }
          />
        </label>
        <label>
          Load manifest file
          <input
            className="block"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setManifest(await file.text());
                setError("");
              } catch {
                setError("Could not read manifest file");
              }
            }}
          />
        </label>
        <label>
          Keyterms (one per line, up to 50)
          <textarea
            className="block w-full rounded border p-3"
            rows={5}
            value={keyterms}
            onChange={(e) => setKeyterms(e.target.value)}
          />
        </label>
        <label>
          Output script
          <select
            className="block border rounded p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="codemix">
              Mixed script: Tamil in Tamil, English in English
            </option>
            <option value="translit">
              Latin script: use Romanized Tanglish truths
            </option>
            <option value="transcribe">Standard transcription</option>
          </select>
        </label>
        <label>
          Spoken language
          <select
            className="block border rounded p-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="unknown">
              Auto-detect (English / Tamil / Tanglish)
            </option>
            <option value="en-IN">English</option>
            <option value="ta-IN">Tamil</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeEl}
            onChange={(e) => setIncludeEl(e.target.checked)}
          />
          Include ElevenLabs (requires recorded S0 approval)
        </label>
        <label>
          Audio clips (up to 80, 10 MiB each, 80 MiB total; under 30 seconds per
          clip)
          <input
            className="block"
            type="file"
            accept="audio/*,.webm,.mp4,.m4a"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <button
          type="button"
          className="rounded bg-blue-700 text-white p-3 disabled:opacity-50"
          disabled={!files.length}
          onClick={run}
        >
          Run bakeoff ({files.length} clips)
        </button>
      </fieldset>
      {busy && <output>Running clips in sequence… Keep this page open.</output>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {report && (
        <>
          {report.summary.map((s) => (
            <p key={s.provider}>
              {s.provider}: {s.successful}/{s.total} successful; {s.failed}{" "}
              failed. Mean WER {s.meanWer?.toFixed(2) ?? "—"}; entity{" "}
              {s.meanEntityAcc === null
                ? "N/A"
                : `${(s.meanEntityAcc * 100).toFixed(0)}%`}{" "}
              ({s.entityClips} clips); p50 {s.p50Ms ?? "—"} ms, p95{" "}
              {s.p95Ms ?? "—"} ms. Latency is provider request time for
              successful clips.
            </p>
          ))}
          <button
            type="button"
            className="border rounded p-2 self-start"
            onClick={download}
          >
            Download results JSON
          </button>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Clip</th>
                  <th>Provider</th>
                  <th>ms</th>
                  <th>WER</th>
                  <th>Entity</th>
                  <th>Truth / transcript</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((r, i) => (
                  <tr key={`${r.file}-${r.provider}-${i}`} className="border-t">
                    <td>{r.file}</td>
                    <td>{r.provider}</td>
                    <td>{r.ms}</td>
                    <td>{r.wer?.toFixed(2) ?? "—"}</td>
                    <td>
                      {r.entityAcc === null
                        ? "N/A"
                        : `${(r.entityAcc * 100).toFixed(0)}%`}
                    </td>
                    <td className="min-w-64">
                      <div>Truth: {r.truth}</div>
                      <div>
                        Heard:{" "}
                        {r.status === "ok" ? r.text || "(no speech)" : r.error}
                      </div>
                    </td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
