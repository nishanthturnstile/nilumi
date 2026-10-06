import { NextResponse } from "next/server";
import webpush from "web-push";
import { subscriptions } from "@/lib/push-store";

export async function POST() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID env vars missing" }, { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@nilumi.in",
    publicKey,
    privateKey
  );
  const results: string[] = [];
  for (const serialized of subscriptions) {
    try {
      await webpush.sendNotification(
        JSON.parse(serialized),
        JSON.stringify({ title: "Nilumi", body: "Test reminder: time to check in." })
      );
      results.push("sent");
    } catch (e) {
      results.push(`fail: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return NextResponse.json({ ok: true, results });
}
