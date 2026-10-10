"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BENCHMARK_IDS,
  COMBINATIONS,
  LISTENING_IDS,
  ONSET_METHOD,
  PLAYBACK_STARTUP_MS,
  SMOKE_IDS,
  SMOKE_PAUSE_MS,
  TTS_SETTINGS,
  VOICE_PROFILE,
  VOICE_TRANSPORT,
  VOICE_VERSION,
  VOICES,
  type Voice,
  ZERO_PREFIX_POLICY,
} from "@/config/voice";
import { pauseBetweenChecks } from "@/lib/voice/pause";
import { PcmPlayer, type PreparedClip, playClip } from "@/lib/voice/playback";
import { summarizeVoice, type TrialResult } from "@/lib/voice/report";
import {
  type RoutingState,
  requestRoute,
  startVoiceRouting,
  VOICE_ROUTING_POLICY,
} from "@/lib/voice/routing";
import { ScreenAwake, type ScreenAwakeStatus } from "@/lib/voice/screen-awake";

type Settings = {
  capInr: number;
  reservedInr: number;
  selection: { voice: Voice } | null;
};
const STORAGE = `nilumi-s4-trials-${VOICE_VERSION}`;
const DIAGNOSTIC_STORAGE = `nilumi-s4-diagnostics-${VOICE_VERSION}`;
const buttonClass =
  "min-h-11 rounded-lg border px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

export default function VoiceVerification() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready to compare voices");
  const [busy, setBusy] = useState(false);
  const [sentence, setSentence] = useState("");
  const [candidate, setCandidate] = useState<Voice>(VOICES[0]);
  const [order, setOrder] = useState<Voice[]>([...VOICES]);
  const [rows, setRows] = useState<TrialResult[]>([]);
  const [diagnostics, setDiagnostics] = useState<TrialResult[]>([]);
  const [network, setNetwork] = useState<"wifi" | "mobile">("wifi");
  const [replyMode, setReplyMode] = useState<"auto" | "always" | "never">(
    "auto",
  );
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [audibleVerified, setAudibleVerified] = useState(false);
  const [deviceNote, setDeviceNote] = useState("");
  const [needsResume, setNeedsResume] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const [awakeStatus, setAwakeStatus] = useState<ScreenAwakeStatus>("off");
  const [routingState, setRoutingState] = useState<RoutingState>("pending");
  const screenAwake = useRef<ScreenAwake | null>(null);
  const audio = useRef<PcmPlayer | null>(null);
  const controller = useRef<AbortController | null>(null);
  const currentId = useRef<string | null>(null);
  const generation = useRef(0);
  const localRows = useRef<TrialResult[]>([]);
  const localDiagnostics = useRef<TrialResult[]>([]);
  const remainingQueue = useRef<{ voice: Voice; fixtures: string[] } | null>(
    null,
  );

  useEffect(() => {
    if (!navigator.serviceWorker) return;
    return startVoiceRouting(
      navigator.serviceWorker,
      location.origin,
      setRoutingState,
    );
  }, []);

  useEffect(() => {
    const awake = new ScreenAwake(
      navigator.wakeLock
        ? () => navigator.wakeLock.request("screen")
        : undefined,
      () => !document.hidden,
      setAwakeStatus,
    );
    screenAwake.current = awake;
    const visibility = () => awake.visibilityChanged();
    document.addEventListener("visibilitychange", visibility);
    if (keepAwake) awake.enable();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      awake.disable();
      screenAwake.current = null;
    };
  }, [keepAwake]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/voice");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(data);
    } catch {
      setError(
        "Voice testing is unavailable. Sign in with an approved account; setup must be enabled first.",
      );
    }
  }, []);
  useEffect(() => {
    performance.setResourceTimingBufferSize?.(1000);
    Promise.resolve().then(() => {
      void refresh();
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
        if (
          Array.isArray(stored) &&
          stored.every(
            (row) =>
              row &&
              typeof row.id === "string" &&
              typeof row.voice === "string" &&
              row.version === VOICE_VERSION &&
              COMBINATIONS.includes(row.combination) &&
              ["ok", "failed", "blocked", "interrupted", "cancelled"].includes(
                row.status,
              ),
          )
        ) {
          localRows.current = stored;
          setRows(stored);
        }
      } catch {
        /* A corrupt local report cannot qualify a benchmark. */
      }
      try {
        const stored = JSON.parse(
          localStorage.getItem(DIAGNOSTIC_STORAGE) ?? "[]",
        );
        if (
          Array.isArray(stored) &&
          stored.length <= 10 &&
          stored.every(
            (row) =>
              row &&
              row.fixture === "diagnostic" &&
              row.version === VOICE_VERSION &&
              typeof row.id === "string" &&
              COMBINATIONS.includes(row.combination),
          )
        ) {
          localDiagnostics.current = stored;
          setDiagnostics(stored);
        }
      } catch {
        /* Free checks remain separate from acceptance evidence. */
      }
      setOrder([...VOICES].sort(() => Math.random() - 0.5));
    });
    return () => {
      // These refs represent the current lifecycle, not a mounted DOM snapshot.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      controller.current?.abort();
      audio.current?.dispose();
      audio.current = null;
      if (currentId.current)
        void fetch(`/api/voice/${currentId.current}`, {
          method: "DELETE",
          keepalive: true,
        });
    };
  }, [refresh]);

  function stop() {
    generation.current++;
    controller.current?.abort();
    audio.current?.stop();
    remainingQueue.current = null;
    if (currentId.current)
      void fetch(`/api/voice/${currentId.current}`, { method: "DELETE" });
    setBusy(false);
    setNeedsResume(false);
    setStatus("Stopped. Completed trials are kept.");
  }
  function save(row: TrialResult) {
    localRows.current = [...localRows.current, row];
    setRows(localRows.current);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(localRows.current));
    } catch {
      setError(
        "Phone storage is full. Download the report before closing this page.",
      );
    }
  }
  function saveDiagnostic(row: TrialResult) {
    localDiagnostics.current = [
      ...localDiagnostics.current,
      { ...row, id: crypto.randomUUID() },
    ].slice(-10);
    setDiagnostics(localDiagnostics.current);
    try {
      localStorage.setItem(
        DIAGNOSTIC_STORAGE,
        JSON.stringify(localDiagnostics.current),
      );
    } catch {
      setError("Phone storage is full. Download the report before closing.");
    }
  }

  async function run(
    mode: "listen" | "benchmark" | "smoke",
    remaining?: { voice: Voice; fixtures: string[] },
  ) {
    if (!settings || busy) return;
    const voice =
      remaining?.voice ??
      (mode !== "listen" ? settings.selection?.voice : candidate);
    if (!voice) return;
    const shouldSpeak =
      replyMode === "always" || (replyMode === "auto" && inputMode === "voice");
    if (!shouldSpeak) {
      setSentence("Your list is up to date.");
      setStatus("Text reply only. No speech requested.");
      return;
    }
    const runId = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setNeedsResume(false);
    const device = /iPhone/.test(navigator.userAgent)
      ? "iphone"
      : /Android/.test(navigator.userAgent)
        ? "android"
        : null;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (mode !== "listen" && (!device || !standalone)) {
      setError(
        "Run the benchmark from the installed app on iPhone or Android.",
      );
      setBusy(false);
      return;
    }
    if (!audio.current)
      audio.current = new PcmPlayer(
        new AudioContext({ latencyHint: "interactive" }),
      );
    const player = audio.current;
    const unlocked = player.unlock();
    const combination =
      `${device ?? "iphone"}/${network}` as TrialResult["combination"];
    const fixtures =
      remaining?.fixtures ??
      (mode === "benchmark"
        ? Array.from(
            { length: 50 },
            (_, index) => BENCHMARK_IDS[index % BENCHMARK_IDS.length],
          )
        : mode === "smoke"
          ? [...SMOKE_IDS]
          : LISTENING_IDS);
    let preparingFixture: string | null = null;
    try {
      await unlocked;
      for (let index = 0; index < fixtures.length; index++) {
        if (abort.signal.aborted || generation.current !== runId) break;
        setStatus(
          `${mode !== "listen" ? "Measuring" : "Listening"} ${index + 1} of ${fixtures.length}`,
        );
        preparingFixture = fixtures[index];
        const response = await fetch("/api/voice", {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixture: fixtures[index], voice, mode }),
        });
        const prepared = (await response.json()) as PreparedClip & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(prepared.error ?? "voice_request_failed");
        currentId.current = prepared.id;
        preparingFixture = null;
        // Start measured playback before any React render or next async step.
        const playback = playClip(
          player,
          prepared,
          abort.signal,
          combination,
          voice,
          standalone,
        );
        setSentence(prepared.text);
        const result = await playback;
        if (mode !== "listen") save({ ...result, purpose: mode });
        if (generation.current !== runId) break;
        if (result.status !== "ok") {
          remainingQueue.current =
            mode === "listen"
              ? { voice, fixtures: [...fixtures.slice(index + 1)] }
              : null;
          setNeedsResume(
            result.status === "blocked" || result.status === "interrupted",
          );
          setStatus(
            "Playback stopped. This attempted trial remains in the report.",
          );
          break;
        }
        currentId.current = null;
        if (index === fixtures.length - 1)
          setStatus(
            mode === "benchmark"
              ? "50 trials recorded. Download your report."
              : mode === "smoke"
                ? "Two check sentences recorded. Download the timings before a full run."
                : "Finished. Choose the voice you prefer.",
          );
        if (mode === "smoke" && index < fixtures.length - 1) {
          setStatus("Waiting six seconds before the second check sentence.");
          await pauseBetweenChecks(SMOKE_PAUSE_MS, abort.signal);
        }
      }
    } catch {
      if (mode !== "listen" && preparingFixture) {
        save({
          purpose: mode,
          id: crypto.randomUUID(),
          fixture: preparingFixture,
          voice,
          version: VOICE_VERSION,
          combination,
          standalone,
          status: abort.signal.aborted ? "cancelled" : "failed",
          firstAudioMs: null,
          providerMs: null,
          cached: false,
          sentenceLength: 0,
          at: new Date().toISOString(),
        });
      }
      if (!abort.signal.aborted)
        setError(
          "Speech is unavailable or the allowance cannot cover another attempt. The screen reply remains available.",
        );
    } finally {
      if (generation.current === runId) setBusy(false);
      void refresh();
    }
  }

  async function diagnostic() {
    if (busy || !settings) return;
    if (!audio.current)
      audio.current = new PcmPlayer(
        new AudioContext({ latencyHint: "interactive" }),
      );
    const player = audio.current;
    const unlocked = player.unlock();
    const runId = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setNeedsResume(false);
    setStatus("Playing a short tone. This check uses no speech credits.");
    try {
      await unlocked;
      const device = /Android/.test(navigator.userAgent) ? "android" : "iphone";
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      const result = await playClip(
        player,
        {
          id: "diagnostic",
          text: "A short tone checks playback.",
          fixture: "diagnostic",
          url: "/api/voice/diagnostic",
          version: VOICE_VERSION,
        },
        abort.signal,
        `${device}/${network}`,
        "ritu",
        standalone,
      );
      saveDiagnostic(result);
      if (generation.current === runId)
        setStatus(
          result.status === "ok"
            ? `Audio check passed. Estimated onset: ${Math.round(result.firstAudioMs ?? 0)} ms. No speech credits used.`
            : "Audio check did not finish. Return to the foreground and try again.",
        );
    } catch {
      if (generation.current === runId)
        setError(
          "Audio could not start. Return to the foreground and try again.",
        );
    } finally {
      if (generation.current === runId) setBusy(false);
    }
  }

  async function choose() {
    const response = await fetch("/api/voice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice: candidate, selectedBy: "wife" }),
    });
    if (!response.ok) {
      setError("Could not save the voice choice. Please retry when online.");
      return;
    }
    await refresh();
    setStatus("Your voice choice is saved.");
  }
  function download() {
    const selected = settings?.selection?.voice ?? candidate;
    const report = {
      version: VOICE_VERSION,
      selectedVoice: selected,
      settings: TTS_SETTINGS,
      metric: "sentence-available-to-audible-playback",
      onsetMethod: ONSET_METHOD,
      transport: VOICE_TRANSPORT,
      profile: VOICE_PROFILE,
      startupBufferMs: PLAYBACK_STARTUP_MS,
      zeroPrefixPolicy: ZERO_PREFIX_POLICY,
      traceSchema: "s4-latency-1",
      clientDiagnosticsVersion: "s4-client-timing-1",
      harnessRevision: "s4-controls-1",
      routing: {
        policy: VOICE_ROUTING_POLICY,
        state: routingState,
        controller: requestRoute(),
      },
      screenAwake: { enabled: keepAwake, status: awakeStatus },
      smokeFixtures: SMOKE_IDS,
      smokePauseMs: SMOKE_PAUSE_MS,
      deviceNote,
      audibleOnsetVerified: audibleVerified,
      budget: settings,
      trials: rows,
      diagnostics,
      summary: summarizeVoice(rows, selected, audibleVerified),
      exportedAt: new Date().toISOString(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nilumi-s4-results.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const summary = summarizeVoice(
    rows,
    settings?.selection?.voice ?? candidate,
    audibleVerified,
  );
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Link
        className="inline-flex min-h-11 items-center self-start underline"
        href="/"
      >
        ← Home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Choose Nilumi’s voice</h1>
        <p className="mt-2 text-neutral-600">
          Listen to the same sentences in each voice, then choose the one you
          would enjoy hearing every day.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      <fieldset disabled={busy || !settings} className="flex flex-col gap-4">
        <legend className="mb-3 font-medium">Compare voices</legend>
        <div className="flex flex-wrap gap-2">
          {order.map((voice, index) => (
            <label
              key={voice}
              className={`${buttonClass} flex items-center gap-2 ${candidate === voice ? "border-black bg-neutral-100" : ""}`}
            >
              <input
                type="radio"
                name="candidate"
                checked={candidate === voice}
                onChange={() => setCandidate(voice)}
              />
              Voice {String.fromCharCode(65 + index)}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className={`${buttonClass} bg-black text-white`}
            type="button"
            onClick={() => void run("listen")}
          >
            Listen to six samples
          </button>
          <button
            className={buttonClass}
            type="button"
            onClick={() => void choose()}
          >
            This is my preferred voice
          </button>
        </div>
        {settings?.selection && (
          <p className="text-sm">Selected voice: {settings.selection.voice}</p>
        )}
      </fieldset>
      <button
        className={`${buttonClass} self-start`}
        type="button"
        disabled={busy || !settings}
        onClick={() => void diagnostic()}
      >
        Play free audio check
      </button>
      <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={keepAwake}
            onChange={(event) => setKeepAwake(event.target.checked)}
          />
          Keep screen awake on this test page
        </label>
        <output aria-live="polite">
          {awakeStatus === "active"
            ? "Screen will stay awake while this page is visible."
            : awakeStatus === "requesting"
              ? "Requesting screen wake lock…"
              : !keepAwake
                ? "Normal screen timeout is enabled."
                : "Screen wake lock is not active. Tap Retry, or temporarily extend Auto-Lock / Screen timeout in phone settings."}
        </output>
        {keepAwake &&
          awakeStatus !== "active" &&
          awakeStatus !== "requesting" && (
            <button
              className={`${buttonClass} self-start`}
              type="button"
              onClick={() => screenAwake.current?.enable()}
            >
              Retry screen wake lock
            </button>
          )}
        <p className="text-xs text-neutral-500">
          Manual locking or leaving the app still interrupts a test.
        </p>
      </div>
      {diagnostics.length > 0 && (
        <p className="text-sm">
          Free checks saved: {diagnostics.length}. Downloads include the latest
          ten checks separately from paid trials.
        </p>
      )}
      <p className="text-xs text-neutral-500">
        Test version: {VOICE_VERSION}. Previous phone results are kept
        separately.
      </p>
      <output aria-live="polite" className="text-sm text-neutral-600">
        {status}
      </output>
      {sentence && (
        <div className="rounded-xl border bg-neutral-50 p-5 text-lg">
          {sentence}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {busy && (
          <button className={buttonClass} type="button" onClick={stop}>
            Stop playback
          </button>
        )}
        {needsResume && (
          <button
            className={buttonClass}
            type="button"
            onClick={() => {
              const pending = remainingQueue.current;
              remainingQueue.current = null;
              if (pending?.fixtures.length) void run("listen", pending);
              else {
                setNeedsResume(false);
                setStatus("Ready. The interrupted trial stays in your report.");
              }
            }}
          >
            Continue audio test
          </button>
        )}
      </div>
      <fieldset
        disabled={busy}
        className="flex flex-wrap gap-4 rounded-xl border p-4"
      >
        <legend className="px-1 font-medium">Reply behavior</legend>
        <label>
          Reply mode
          <select
            className="mt-1 block min-h-11 rounded border p-2"
            value={replyMode}
            onChange={(e) => setReplyMode(e.target.value as typeof replyMode)}
          >
            <option value="auto">Auto</option>
            <option value="always">Always speak</option>
            <option value="never">Text only</option>
          </select>
        </label>
        <label>
          Input type
          <select
            className="mt-1 block min-h-11 rounded border p-2"
            value={inputMode}
            onChange={(e) => setInputMode(e.target.value as typeof inputMode)}
          >
            <option value="voice">Voice</option>
            <option value="text">Typed text</option>
          </select>
        </label>
      </fieldset>
      <section className="flex flex-col gap-4 border-t pt-6">
        <h2 className="text-xl font-semibold">Measure your selected voice</h2>
        <p className="text-sm text-neutral-600">
          Use the installed app on each phone. Choose the current network and
          keep the app open for 50 sentences. All four phone/network
          combinations need p95 ≤700 ms.
        </p>
        <label>
          Current connection
          <select
            disabled={busy}
            className="mt-1 block min-h-11 rounded border p-2"
            value={network}
            onChange={(e) => setNetwork(e.target.value as typeof network)}
          >
            <option value="wifi">Home Wi-Fi</option>
            <option value="mobile">Mobile data</option>
          </select>
        </label>
        <label>
          Phone and audio output (optional)
          <input
            disabled={busy}
            className="mt-1 block min-h-11 w-full rounded border p-2"
            value={deviceNote}
            maxLength={160}
            placeholder="Phone model, OS version, built-in speaker or headphones"
            onChange={(event) => setDeviceNote(event.target.value)}
          />
        </label>
        <button
          disabled={busy || !settings?.selection}
          className={`${buttonClass} self-start`}
          type="button"
          onClick={() => void run("smoke")}
        >
          Check 2 sentences with a pause
        </button>
        {rows.some((row) => row.purpose === "smoke") && (
          <div className="text-sm" aria-live="polite">
            {rows
              .filter((row) => row.purpose === "smoke")
              .slice(-SMOKE_IDS.length)
              .map((row) => (
                <p key={row.id}>
                  {row.fixture}:{" "}
                  {row.firstAudioMs === null
                    ? "no onset"
                    : `${Math.round(row.firstAudioMs)} ms`}{" "}
                  ({row.status})
                </p>
              ))}
            <p>These checks stay separate from the 50-trial acceptance runs.</p>
          </div>
        )}
        <p className="text-sm">
          The two-sentence check costs at most ₹0.234. Keep the app open during
          the six-second pause, then download the results before a full run.
        </p>
        <button
          disabled={busy || !settings?.selection}
          className={`${buttonClass} self-start bg-black text-white`}
          type="button"
          onClick={() => void run("benchmark")}
        >
          Run 50 uncached trials
        </button>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={audibleVerified}
            onChange={(e) => setAudibleVerified(e.target.checked)}
          />
          I verified a sample on both phones: the recorded onset matches when
          speech becomes audible.
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Phone / network</th>
                <th>Trials</th>
                <th>Failures</th>
                <th>p95</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item) => (
                <tr className="border-t" key={item.combination}>
                  <td className="py-3">{item.combination}</td>
                  <td>{item.attempted}</td>
                  <td>{item.failed}</td>
                  <td>
                    {item.p95Ms === null ? "—" : `${Math.round(item.p95Ms)} ms`}
                  </td>
                  <td>{item.accepted ? "Pass" : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {settings && (
          <p className="text-sm">
            Conservatively reserved: ₹{settings.reservedInr.toFixed(2)} / ₹
            {settings.capInr.toFixed(2)}.
          </p>
        )}
        <button
          disabled={!rows.length && !diagnostics.length}
          className={`${buttonClass} self-start`}
          type="button"
          onClick={download}
        >
          Download results
        </button>
        <p className="text-xs text-neutral-500">
          Results stay on this phone until downloaded. Combine both phone
          reports for final review. Browser onset estimates require the audible
          sample check; release-to-reply latency is measured separately.
        </p>
      </section>
    </main>
  );
}
