"use client";
import { useEffect, useRef, useState } from "react";

type Line = { seq: number; text: string };
// Silent PCM clip: play() runs inside the initial user gesture.
const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQIAAAAAAA==";

export function Playback() {
  const [lines, setLines] = useState<Line[]>([]);
  const [played, setPlayed] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("idle");
  const [needsTap, setNeedsTap] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<number[]>([]);
  const playedRef = useRef(new Set<number>());
  const activeRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const blockedRef = useRef(false);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const streamDoneRef = useRef(false);

  async function playNext() {
    const audio = audioRef.current;
    if (!audio || busyRef.current || blockedRef.current || document.hidden) return;
    if (activeRef.current !== null && !audio.paused) return;
    if (activeRef.current === null) {
      const seq = queueRef.current.shift();
      if (seq === undefined) {
        if (streamDoneRef.current) setStatus("done");
        return;
      }
      activeRef.current = seq;
      audio.src = `/api/speech/${seq}`;
    }
    const generation = generationRef.current;
    busyRef.current = true;
    try {
      await audio.play();
      if (generation !== generationRef.current) return;
      setNeedsTap(false);
      setStatus("playing…");
    } catch {
      if (generation !== generationRef.current) return;
      blockedRef.current = true;
      setNeedsTap(true);
      setStatus("tap ▶ to resume");
    } finally {
      if (generation === generationRef.current) busyRef.current = false;
    }
  }

  function disconnect() {
    esRef.current?.close();
    esRef.current = null;
    if (retryRef.current !== null) clearTimeout(retryRef.current);
    retryRef.current = null;
  }

  function connect() {
    disconnect();
    if (!turnRef.current || streamDoneRef.current || document.hidden) return;
    const generation = generationRef.current;
    const es = new EventSource(
      `/api/turns/stream?turn_id=${turnRef.current}&max_played=${Math.max(0, ...playedRef.current)}`
    );
    esRef.current = es;
    const current = () => generation === generationRef.current && esRef.current === es;
    es.addEventListener("sentence.validated", (e) => {
      if (!current()) return;
      const d = JSON.parse((e as MessageEvent).data);
      setLines((prev) => prev.some((l) => l.seq === d.seq) ? prev : [...prev, d]);
    });
    es.addEventListener("speech.ready", (e) => {
      if (!current()) return;
      const { seq } = JSON.parse((e as MessageEvent).data);
      // Reconnect handlers read current refs, including the in-flight clip.
      if (playedRef.current.has(seq) || activeRef.current === seq || queueRef.current.includes(seq)) return;
      queueRef.current.push(seq);
      void playNext();
    });
    es.addEventListener("turn.done", () => {
      if (!current()) return;
      streamDoneRef.current = true;
      disconnect();
      if (activeRef.current === null && queueRef.current.length === 0) setStatus("done");
    });
    es.onerror = () => {
      if (!current()) return;
      disconnect();
      setStatus(blockedRef.current ? "tap ▶ to resume" : "reconnecting…");
      if (!document.hidden) retryRef.current = setTimeout(connect, 1500);
    };
  }

  function startTurn() {
    disconnect();
    generationRef.current += 1;
    turnRef.current = crypto.randomUUID();
    streamDoneRef.current = false;
    playedRef.current.clear();
    queueRef.current = [];
    activeRef.current = null;
    busyRef.current = false;
    blockedRef.current = false;
    setLines([]);
    setPlayed(new Set());
    setNeedsTap(false);
    setStatus("streaming…");
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.onended = () => {
      const seq = activeRef.current;
      if (seq === null) return; // The silent primer is not a reply.
      playedRef.current.add(seq);
      setPlayed(new Set(playedRef.current));
      activeRef.current = null;
      void playNext();
    };
    audio.onerror = () => {
      if (activeRef.current === null) return;
      blockedRef.current = true;
      setNeedsTap(true);
      setStatus("audio unavailable — tap ▶ to retry");
    };
    audio.src = SILENCE;
    void audio.play().catch(() => {});
    connect();
  }

  useEffect(() => {
    function onVisible() {
      if (document.hidden) {
        disconnect();
        if (activeRef.current !== null) {
          audioRef.current?.pause();
          blockedRef.current = true;
          setNeedsTap(true);
          setStatus("tap ▶ to resume");
        }
      } else {
        connect();
        void playNext();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      generationRef.current += 1;
      disconnect();
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
    // All asynchronous handlers read refs; React state is display-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col items-center gap-3">
      <button
        aria-label="Play a test turn audio reply"
        className="rounded bg-black px-6 py-3 text-white" onClick={startTurn}>
        Play test turn
      </button>
      <p className="text-sm text-neutral-500" role="status">Status: {status}</p>
      <ul className="text-left">
        {lines.map((l) => <li key={l.seq}>{l.text} {played.has(l.seq) ? "🔊" : ""}</li>)}
      </ul>
      {needsTap && (
        <button className="rounded border border-neutral-400 px-6 py-3" onClick={() => {
          blockedRef.current = false;
          // Retry failed requests, retaining position for paused clips.
          if (audioRef.current?.error) audioRef.current.load();
          void playNext();
        }}>
          ▶ Play reply
        </button>
      )}
    </section>
  );
}
