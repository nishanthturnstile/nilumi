"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// Display only; the server cookie remains the sole source of authorization.
// Keep the cached offline shell generic instead of caching authenticated HTML.
export function SessionStatus() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/auth/me", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const session = await response.json();
        if (!abort.signal.aborted) setSignedIn(session.authenticated === true);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  return (
    <div className="flex flex-col items-center">
      <Link
        className="flex min-h-11 items-center px-4 underline"
        href={signedIn ? "/auth/sign-in?switch=1" : "/auth/sign-in"}
      >
        {signedIn ? "Switch account" : "Sign in"}
      </Link>
      {signedIn && (
        <p className="text-sm text-neutral-500">
          Signed in on this device. No new code needed to reopen the app.
        </p>
      )}
    </div>
  );
}
