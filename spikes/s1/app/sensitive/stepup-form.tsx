"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function StepUpForm({ email }: { email: string }) {
  const router = useRouter();
  const [requested, setRequested] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function request() {
    setError(null);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const data = await res.json();
      setDevCode(data.devCode ?? null);
      setRequested(true);
    }
    else setError("failed to send code");
  }

  async function verify() {
    setError(null);
    const res = await fetch("/api/auth/stepup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (res.ok) router.refresh();
    else setError("invalid code");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {!requested ? (
        <button className="rounded bg-black px-6 py-3 text-white" onClick={request}>
          Email me a fresh code
        </button>
      ) : (
        <>
          {devCode && <p className="text-amber-600">Dev code: {devCode}</p>}
          <input
            className="w-72 rounded border border-neutral-300 p-3 text-black"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="rounded bg-black px-6 py-3 text-white" onClick={verify}>
            Confirm
          </button>
        </>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
