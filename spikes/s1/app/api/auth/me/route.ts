import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { needsStepUp, readSessionToken } from "@/lib/auth";

export async function GET() {
  const store = await cookies();
  const session = readSessionToken(store.get("nilumi_session")?.value);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    email: session.email,
    needsStepUp: needsStepUp(session.authAt),
  });
}
