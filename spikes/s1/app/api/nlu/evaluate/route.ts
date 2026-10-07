import { cookies } from "next/headers";
import { readSessionToken } from "@/lib/auth";
import { handleEvaluation } from "@/lib/nlu/evaluate";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const store = await cookies();
  const session = readSessionToken(store.get("nilumi_session")?.value);
  return handleEvaluation(req, { email: session?.email ?? null });
}
