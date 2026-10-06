import { NextResponse } from "next/server";
import { Resend } from "resend";
import { issueCode } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (process.env.NODE_ENV === "production" && (!apiKey || apiKey === "CONFIGURE_IN_RAILWAY")) {
    return NextResponse.json({ error: "Email sign-in is not configured yet" }, { status: 503 });
  }
  const code = issueCode(email);
  if (!apiKey) {
    // Local-only fallback: show the code on the sign-in and step-up screens.
    return NextResponse.json({ ok: true, devCode: code });
  }
  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? "Nilumi <signin@nilumi.in>",
      to: email,
      subject: "Your Nilumi sign-in code",
      text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    });
    if (error) {
      return NextResponse.json({ error: "Failed to send sign-in code" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to send sign-in code" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
