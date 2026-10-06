import { NextResponse } from "next/server";
import { subscriptions } from "@/lib/push-store";

export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint) {
    return NextResponse.json({ error: "no subscription" }, { status: 400 });
  }
  const serialized = JSON.stringify(sub);
  if (!subscriptions.includes(serialized)) subscriptions.push(serialized);
  return NextResponse.json({ ok: true, count: subscriptions.length });
}
