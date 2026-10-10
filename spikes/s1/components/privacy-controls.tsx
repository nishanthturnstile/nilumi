"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { PILOT_NOTICE_VERSION } from "../config/privacy-notice";

export type PrivacyStatus = {
  owner: boolean;
  adults: string[];
  acknowledgement: { recordedAt: string | null; withdrawn: boolean } | null;
  recordedBy: string | null;
  vetoes: string[];
  evidenceAccepted: boolean;
};
export function PrivacyControls({
  initialStatus,
  initialMessage,
}: {
  initialStatus: PrivacyStatus | null;
  initialMessage: string;
}) {
  const [status, setStatus] = useState<PrivacyStatus | null>(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const [explained, setExplained] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/privacy", { cache: "no-store" });
    if (!response.ok) {
      setStatus(null);
      setMessage(
        response.status === 401
          ? "Sign in to view household settings."
          : "Privacy settings are not configured yet. Model requests remain blocked.",
      );
      return;
    }
    setStatus(await response.json());
    setMessage("");
  }, []);
  const act = async (action: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/privacy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          noticeVersion: PILOT_NOTICE_VERSION,
          explained,
        }),
      });
      if (!response.ok) {
        setMessage(
          "The change was refused. Refresh and check the current notice and withdrawal status.",
        );
        return;
      }
      setExplained(false);
      await load();
    } catch {
      setMessage(
        "The change could not be confirmed. Refresh before proceeding.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="flex flex-col gap-4"
      aria-label="Household privacy acknowledgement"
    >
      <output aria-live="polite">{message}</output>
      {!status && (
        <Link href="/auth/sign-in" className="underline">
          Sign in
        </Link>
      )}
      {status && (
        <>
          <p>Adults covered: {status.adults.join(", ")}</p>
          <p>
            {status.acknowledgement?.recordedAt
              ? `Recorded by ${status.recordedBy} on ${new Date(status.acknowledgement.recordedAt).toLocaleString()}.`
              : "No current household acknowledgement."}
          </p>
          {status.vetoes.length > 0 && (
            <p>
              Withdrawal is active. Only each withdrawing adult can release
              their own withdrawal.
            </p>
          )}
          {!status.evidenceAccepted && (
            <p>Gateway validation has not been accepted for this household.</p>
          )}
          {status.owner && (
            <>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={explained}
                  onChange={(e) => setExplained(e.target.checked)}
                />
                I have explained this notice to the other adult and acknowledge
                it for both current adults.
              </label>
              <button
                type="button"
                disabled={busy || !explained || status.vetoes.length > 0}
                onClick={() => void act("acknowledge")}
                className="min-h-11 rounded border px-4 disabled:opacity-50"
              >
                Record household acknowledgement
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("withdraw")}
            className="min-h-11 rounded border px-4"
          >
            Withdraw model access
          </button>
          {status.vetoes.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("release-veto")}
              className="min-h-11 rounded border px-4"
            >
              Release my withdrawal
            </button>
          )}
        </>
      )}
    </section>
  );
}
