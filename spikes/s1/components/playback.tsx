"use client";
import { useEffect, useRef, useState } from "react";

type Line = { seq: number; text: string };

export function Playback() {
  const [lines, setLines] = useState<Line[]>([]);
  const [played, setPlayed] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("idle");
  const [needsTap, setNeedsTap] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<number[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const turnIdRef = useRef(`t${Date.now()}`);

  function primeAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", playNext);
    }
    // Prime the element inside the user gesture so later autoplay has a chance.
    audioRef.current.src = "/api/speech/1";
    audioRef.current.load();
  }

  async function playNext() {
    const seq = queueRef.current.shift();
    if (seq === undefined) return;
    const audio = audioRef.current!;
    audio.src = `/api/speech/${seq}`;
    try {
      await audio.play();
      setPlayed((p) => new Set(p).add(seq));
      setNeedsTap(false);
    } catch {
      // iOS resume / silent mode / interruption: visible play button is the path.
      queueRef.current.unshift(seq);
      setNeedsTap(true);
      setStatus("tap ▶ to resume");
    }
  }

  function enqueue(seq: number) {
    if (played.has(seq) || queueRef.current.includes(seq)) return; // dedupe
    queueRef.current.push(seq);
    if (audioRef.current && audioRef.current.paused) playNext();
  }

  function connect(maxPlayed: number) {
    esRef.current?.close();
    const es = new EventSource(
      `/api/turns/stream?turn_id=${turnIdRef.current}&max_played=${maxPlayed}`
    );
    esRef.current = es;
    es.addEventListener("sentence.validated", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setLines((prev) =>
        prev.some((l) => l.seq === d.seq) ? prev : [...prev, { seq: d.seq, text: d.text }]
      );
    });
    es.addEventListener("speech.ready", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      enqueue(d.seq);
    });
    es.addEventListener("turn.done", () => {
      setStatus("done");
      es.close();
    });
    es.onerror = () => {
      setStatus("reconnecting…");
      es.close();
      // Reconnect with client-side seq dedupe — no duplicate text/audio.
      setTimeout(() => connect(Math.max(...Array.from(played), 0)), 1500);
    };
  }

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && status === "reconnecting…") {
        connect(Math.max(...Array.from(played), 0));
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, played]);

  return (
    <section className="flex flex-col items-center gap-3">
      <button
        className="rounded bg-black px-6 py-3 text-white"
        onClick={() => {
          primeAudio();
          setStatus("streaming…");
          connect(0);
        }}
      >
        Play test turn
      </button>
      <p className="text-sm text-neutral-500">Status: {status}</p>
      <ul className="text-left">
        {lines.map((l) => (
          <li key={l.seq}>
            {l.text} {played.has(l.seq) ? "🔊" : ""}
          </li>
        ))}
      </ul>
      {needsTap && (
        <button
          className="rounded border border-neutral-400 px-6 py-3"
          onClick={() => {
            setNeedsTap(false);
            playNext();
          }}
        >
          ▶ Play reply
        </button>
      )}
    </section>
  );
}
