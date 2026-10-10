import { cookies } from "next/headers";
import { readSessionToken } from "@/lib/auth";
import { handleClip } from "@/lib/voice/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const started = performance.now();
  const session = readSessionToken(
    (await cookies()).get("nilumi_session")?.value,
  );
  return handleClip(
    req,
    (await context.params).id,
    session?.email ?? null,
    process.env,
    undefined,
    started,
  );
}
export const GET = handle;
export const DELETE = handle;
export function HEAD() {
  // A speculative media probe must not begin a paid operation.
  return new Response(null, { status: 405, headers: { Allow: "GET, DELETE" } });
}
