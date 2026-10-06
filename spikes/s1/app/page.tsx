import Link from "next/link";
import { Recorder } from "@/components/recorder";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Nilumi</h1>
      <p className="text-neutral-500">S1 spike — PWA install, auth, capture, playback, push.</p>
      <div className="flex gap-4 text-sm">
        <Link className="underline" href="/auth/sign-in">Sign in</Link>
        <Link className="underline" href="/sensitive">Sensitive view</Link>
      </div>
      <Recorder />
    </main>
  );
}

