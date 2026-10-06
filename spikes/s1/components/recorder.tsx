"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "requesting_mic" | "recording" | "stopping" | "uploading" | "error";

const MAX_MS = 28000;
const MIN_MS = 300;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

export function Recorder() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastUpload, setLastUpload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const stopTimerRef = useRef<number | undefined>(undefined);
  const cancelledRef = useRef(false);
  const modeRef = useRef<"hold" | "tap">("tap");

  const stopAll = useCallback(() => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finish = useCallback(
    async (keep: boolean) => {
      const rec = recRef.current;
      stopAll();
      if (!rec) {
        setPhase("idle");
        return;
      }
      setPhase("stopping");
      rec.onstop = async () => {
        const duration = Date.now() - startedAtRef.current;
        if (!keep || duration < MIN_MS || cancelledRef.current) {
          chunksRef.current = [];
          setPhase("idle");
          return;
        }
        setPhase("uploading");
        const mime = rec.mimeType;
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": mime || "application/octet-stream" },
            body: blob,
          });
          const data = await res.json();
          setLastUpload(`${data.provider ?? "n/a"} · ${data.bytes} bytes · ${duration} ms · ${mime}`);
        } catch {
          setError("upload failed");
        }
        setPhase("idle");
      };
      rec.stop();
    },
    [stopAll]
  );

  const start = useCallback(async () => {
    setError(null);
    cancelledRef.current = false;
    chunksRef.current = [];
    setPhase("requesting_mic");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      stopTimerRef.current = window.setTimeout(() => finish(true), MAX_MS);
      setPhase("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : "mic denied");
      setPhase("error");
    }
  }, [finish]);

  // Interruptions: stop & discard unless long enough to ask "Send what I heard?"
  useEffect(() => {
    function onHidden() {
      if (phase !== "recording") return;
      if (Date.now() - startedAtRef.current > 1000) {
        const keep = window.confirm("Send what I heard?");
        finish(keep);
      } else {
        cancelledRef.current = true;
        finish(false);
      }
    }
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [phase, finish]);

  const holdStarted = useRef(false);
  const suppressClick = useRef(false);
  return (
    <section className="flex flex-col items-center gap-4">
      <p className="text-sm text-neutral-500">Phase: {phase}</p>
      <button
        className="rounded-full bg-black px-8 py-4 text-white select-none touch-none"
        onPointerDown={(e) => {
          e.preventDefault();
          holdStarted.current = true;
          modeRef.current = "hold";
          start();
        }}
        onPointerUp={() => {
          if (!holdStarted.current) return;
          holdStarted.current = false;
          suppressClick.current = true; // this was a hold, don't let the click toggle tap mode
          if (modeRef.current === "hold" && Date.now() - startedAtRef.current < 250) {
            // Quick tap: convert to tap-to-start/stop mode (keep recording).
            modeRef.current = "tap";
            return;
          }
          finish(true);
        }}
        onPointerLeave={() => {
          if (modeRef.current === "hold" && holdStarted.current) {
            holdStarted.current = false;
            suppressClick.current = true;
            cancelledRef.current = true;
            finish(false); // slide off = cancel
          }
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          // Tap-to-start / tap-to-stop
          if (phase === "idle") {
            modeRef.current = "tap";
            start();
          } else if (phase === "recording" && modeRef.current === "tap") {
            finish(true);
          }
        }}
      >
        {phase === "recording" ? "Stop" : "Hold or Tap to Talk"}
      </button>
      {lastUpload && <p className="text-green-700">Uploaded: {lastUpload}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </section>
  );
}
