import { cookies } from "next/headers";
import { readSessionToken } from "@/lib/auth";
import { handleDiagnostic } from "@/lib/voice/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const session = readSessionToken(
    (await cookies()).get("nilumi_session")?.value,
  );
  return handleDiagnostic(req, session?.email ?? null);
}
