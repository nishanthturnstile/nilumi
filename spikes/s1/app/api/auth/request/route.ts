import { NextResponse } from "next/server";
import { Resend } from "resend";
import { issueCode } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const code = issueCode(email);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback: no key configured — surface the code in dev logs/response.
    console.log(`[auth] RESEND_API_KEY missing; code for ${email}: ${code}`);
    return NextResponse.json({ ok: true, devCode: code });
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Nilumi <signin@nilumi.in>",
    to: email,
    subject: "Your Nilumi sign-in code",
    text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
  });
  return NextResponse.json({ ok: true });
}
