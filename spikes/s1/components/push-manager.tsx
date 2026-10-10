"use client";
import { useState } from "react";
import { rootPushRegistration } from "@/lib/voice/routing";

function urlBase64ToUint8Array(value: string) {
  const base64 = (value + "=".repeat((4 - value.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (char) => char.charCodeAt(0));
}

export function PushManager() {
  const [status, setStatus] = useState("idle");
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    setBusy(true);
    setStatus("requesting…");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Open the installed Home Screen app to enable notifications");
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push is not configured");
      // Request permission before any other await, preserving the iOS tap.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications denied — allow them in device settings and retry");
      const reg = await rootPushRegistration(navigator.serviceWorker, location.origin);
      const applicationServerKey = urlBase64ToUint8Array(key);
      let sub = await reg.pushManager.getSubscription();
      const oldKey = sub?.options.applicationServerKey;
      if (sub && (!oldKey || Array.from(new Uint8Array(oldKey)).join() !== Array.from(applicationServerKey).join())) {
        await sub.unsubscribe();
        sub = null;
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const res = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Subscribe failed");
      setStatus("subscribed");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Subscribe failed");
    } finally { setBusy(false); }
  }

  async function sendTest(delaySeconds = 0) {
    setBusy(true);
    setStatus("sending…");
    try {
      const res = await fetch("/api/push/test", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delaySeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Push delivery failed — enable notifications and retry");
      setStatus(data.scheduled ? "Scheduled in 10 seconds — close the app and lock your phone now" :
        `accepted by push service for ${data.results.filter((r: string) => r === "sent").length} device(s)`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Push delivery failed");
    } finally { setBusy(false); }
  }

  return (
    <section className="flex flex-col items-center gap-3">
      <button className="rounded bg-black px-6 py-3 text-white" disabled={busy} onClick={subscribe}>
        Enable notifications
      </button>
      <button className="rounded border border-neutral-400 px-6 py-3" disabled={busy} onClick={() => sendTest()}>
        Send test notification
      </button>
      <button className="rounded border border-neutral-400 px-6 py-3" disabled={busy} onClick={() => sendTest(10)}>
        Send in 10 seconds
      </button>
      <p className="text-sm text-neutral-500" role="status">Push: {status}</p>
    </section>
  );
}
