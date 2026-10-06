import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/auth";
import { subscriptions } from "@/lib/push-store";

export async function POST(req: Request) {
  const session = readSessionToken((await cookies()).get("nilumi_session")?.value);
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sub = await req.json().catch(() => null);
  let endpoint: URL;
  try { endpoint = new URL(sub?.endpoint); } catch {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  // Only the push services used by our target browsers; never arbitrary URLs.
  const host = endpoint.hostname;
  const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
    host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
  if (endpoint.protocol !== "https:" || endpoint.port || endpoint.username || endpoint.password || !allowed ||
    typeof sub?.keys?.p256dh !== "string" || typeof sub?.keys?.auth !== "string") {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const devices = subscriptions.get(session.email) ?? new Map();
  devices.set(sub.endpoint, sub);
  subscriptions.set(session.email, devices);
  return NextResponse.json({ ok: true, count: devices.size });
}
