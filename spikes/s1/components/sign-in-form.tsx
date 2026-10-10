"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setError(null);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "failed");
    setRequested(true);
    if (data.devCode) setDevCode(data.devCode);
  }

  async function verify() {
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "failed");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign in to Nilumi</h1>
      {!requested ? (
        <>
          <input
            className="w-72 rounded border border-neutral-300 p-3 text-black"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-black px-6 py-3 text-white"
            onClick={request}
          >
            Email me a code
          </button>
        </>
      ) : (
        <>
          <p className="text-neutral-500">Code sent to {email}</p>
          {devCode && <p className="text-amber-600">Dev code: {devCode}</p>}
          <input
            className="w-72 rounded border border-neutral-300 p-3 text-black"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-black px-6 py-3 text-white"
            onClick={verify}
          >
            Sign in
          </button>
        </>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
