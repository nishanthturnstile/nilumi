import { NextResponse } from "next/server";
import { checkCode, createSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  if (!email || !code) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }
  if (!checkCode(email, String(code))) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }
  const token = createSessionToken(email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nilumi_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 90 * 24 * 60 * 60,
  });
  return res;
}
