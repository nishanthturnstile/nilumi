"use client";
import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PushManager() {
  const [status, setStatus] = useState("idle");

  async function subscribe() {
    setStatus("requesting…");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setStatus(res.ok ? "subscribed" : "subscribe failed");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "denied");
    }
  }

  async function sendTest() {
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = await res.json();
    setStatus(res.ok ? `sent to ${data.results?.length ?? 0} device(s)` : data.error);
  }

  return (
    <section className="flex flex-col items-center gap-3">
      <button className="rounded bg-black px-6 py-3 text-white" onClick={subscribe}>
        Enable notifications
      </button>
      <button className="rounded border border-neutral-400 px-6 py-3" onClick={sendTest}>
        Send test notification
      </button>
      <p className="text-sm text-neutral-500">Push: {status}</p>
    </section>
  );
}
