import { cookies } from "next/headers";
import Link from "next/link";
import {
  PrivacyControls,
  type PrivacyStatus,
} from "@/components/privacy-controls";
import { PILOT_NOTICE } from "@/config/privacy-notice";
import { readSessionToken } from "@/lib/auth";
import { gatewayDatabase } from "@/lib/gateway/database";
import { PilotStore } from "@/lib/gateway/pilot-store";

export default async function PrivacyPage() {
  let status: PrivacyStatus | null = null;
  let message = "Sign in to view household settings.";
  const session = readSessionToken(
    (await cookies()).get("nilumi_session")?.value,
  );
  if (session) {
    try {
      status = await new PilotStore(gatewayDatabase()).status(
        session.email.toLowerCase(),
      );
      message = "";
    } catch {
      message =
        "Privacy settings are not configured yet. Model requests remain blocked.";
    }
  }
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Link href="/" className="underline">
        Home
      </Link>
      <h1 className="text-2xl font-semibold">Settings · Privacy</h1>
      {PILOT_NOTICE.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <p className="text-sm text-neutral-500">
        Published terms:{" "}
        <a
          className="underline"
          href="https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training"
        >
          Vercel no-training
        </a>{" "}
        ·{" "}
        <a
          className="underline"
          href="https://developers.openai.com/api/docs/guides/your-data"
        >
          OpenAI data controls
        </a>
      </p>
      <PrivacyControls initialStatus={status} initialMessage={message} />
    </main>
  );
}
