"use client";
import { useState } from "react";

type Row = {
  file: string; provider: string; model: string; ms: number; status: string;
  text: string; error?: string; wer: number | null; entityAcc: number | null;
};

export default function Bakeoff() {
  const [rows, setRows] = useState<Row[]>([]);
  const [truth, setTruth] = useState("");
  const [includeEl, setIncludeEl] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const form = new FormData();
    form.append("truth", truth);
    form.append("elevenlabs", includeEl ? "1" : "0");
    for (const f of Array.from(files)) form.append("files", f);
    const res = await fetch("/api/bakeoff", { method: "POST", body: form });
    const data = await res.json();
    setRows(data.results ?? []);
    setBusy(false);
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">STT bake-off</h1>
      <textarea
        className="w-full max-w-2xl rounded border border-neutral-300 p-3 text-black"
        rows={2}
        placeholder="Truth transcript for the selected clips"
        value={truth}
        onChange={(e) => setTruth(e.target.value)}
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={includeEl} onChange={(e) => setIncludeEl(e.target.checked)} />
        Include ElevenLabs (only after its S0 verification)
      </label>
      <input type="file" accept="audio/*" multiple onChange={(e) => run(e.target.files)} />
      {busy && <p>Running…</p>}
      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="text-left">
            <th>Clip</th><th>Provider</th><th>ms</th><th>WER</th><th>Entity</th><th>Text</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-200">
              <td>{r.file}</td>
              <td>{r.provider}</td>
              <td>{r.ms}</td>
              <td>{r.wer === null ? "—" : r.wer.toFixed(2)}</td>
              <td>{r.entityAcc === null ? "—" : (r.entityAcc * 100).toFixed(0) + "%"}</td>
              <td className="max-w-xs truncate">{r.status === "ok" ? r.text : r.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
