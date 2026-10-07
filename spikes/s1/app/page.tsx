import Link from "next/link";
import { Playback } from "@/components/playback";
import { PushManager } from "@/components/push-manager";
import { Recorder } from "@/components/recorder";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Nilumi</h1>
      <p className="text-neutral-500">
        S1 spike v2 — PWA install, auth, capture, playback, push.
      </p>
      <nav
        aria-label="Main navigation"
        className="flex flex-wrap justify-center gap-2 text-sm"
      >
        <Link
          className="flex min-h-11 items-center rounded border px-4"
          href="/bakeoff"
        >
          STT bakeoff
        </Link>
        <Link
          className="flex min-h-11 items-center px-4 underline"
          href="/auth/sign-in"
        >
          Sign in
        </Link>
        <Link
          className="flex min-h-11 items-center px-4 underline"
          href="/sensitive"
        >
          Sensitive view
        </Link>
      </nav>
      <Recorder />
      <Playback />
      <PushManager />
    </main>
  );
}
