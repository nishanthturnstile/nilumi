import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { readSessionToken } from "@/lib/auth";
import { pendingTests, subscriptions } from "@/lib/push-store";

export async function POST(req: Request) {
  const session = readSessionToken((await cookies()).get("nilumi_session")?.value);
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  }
  const devices = subscriptions.get(session.email);
  if (!devices?.size) {
    return NextResponse.json({ error: "Enable notifications again on this device" }, { status: 409 });
  }
  const body = await req.json().catch(() => ({}));
  const delayed = body?.delaySeconds === 10;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@nilumi.in", publicKey, privateKey);
  async function send() {
    const results = await Promise.all([...devices!.values()].map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify({
          title: "Nilumi", body: "Test reminder: time to check in.",
        }), { TTL: 300, timeout: 10000 });
        return "sent";
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) devices!.delete(sub.endpoint);
        return "failed";
      }
    }));
    return { ok: results.every((r) => r === "sent"), results };
  }
  if (delayed) {
    if (pendingTests.has(session.email)) {
      return NextResponse.json({ error: "A delayed test is already scheduled" }, { status: 409 });
    }
    pendingTests.add(session.email);
    // Spike-only timer on one always-on replica; it survives closing the client.
    setTimeout(() => {
      void send().then((result) => {
        console.info("Delayed push test", { sent: result.results.filter((r) => r === "sent").length,
          failed: result.results.filter((r) => r === "failed").length });
      }).catch(() => console.error("Delayed push test failed"))
        .finally(() => pendingTests.delete(session.email));
    }, 10000);
    return NextResponse.json({ ok: true, scheduled: true, delaySeconds: 10 }, { status: 202 });
  }
  const result = await send();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
