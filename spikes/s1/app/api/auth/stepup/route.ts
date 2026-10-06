import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkCode, readSessionToken, refreshSessionAuthAt } from "@/lib/auth";

// Re-verify a fresh code, then bump authAt in the session cookie.
export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  const store = await cookies();
  const token = store.get("nilumi_session")?.value;
  const session = readSessionToken(token);
  if (!session || session.email !== email) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  if (!checkCode(email, String(code))) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }
  const fresh = refreshSessionAuthAt(token as string);
  if (!fresh) return NextResponse.json({ error: "no session" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nilumi_session", fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 90 * 24 * 60 * 60,
  });
  return res;
}
