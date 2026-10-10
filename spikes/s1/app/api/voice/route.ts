import { cookies } from "next/headers";
import { readSessionToken } from "@/lib/auth";
import { handleVoice } from "@/lib/voice/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(req: Request) {
  const session = readSessionToken(
    (await cookies()).get("nilumi_session")?.value,
  );
  return handleVoice(req, session?.email ?? null);
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
