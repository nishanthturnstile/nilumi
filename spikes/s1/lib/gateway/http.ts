import { z } from "zod";
import { PILOT_NOTICE_VERSION } from "../../config/privacy-notice";
import { VerificationError } from "../verification/ledger";
import type { PilotStore } from "./pilot-store";

const PrivacyAction = z
  .object({
    action: z.enum(["acknowledge", "withdraw", "release-veto"]),
    noticeVersion: z.literal(PILOT_NOTICE_VERSION),
    explained: z.boolean().default(false),
  })
  .strict();
export function requirePilotOrigin(request: Request) {
  const configured = process.env.GATEWAY_PILOT_ORIGIN;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new VerificationError("gateway_origin_not_configured", 503);
  let expected: URL;
  try {
    expected = new URL(configured ?? request.url);
  } catch {
    throw new VerificationError("gateway_origin_not_configured", 503);
  }
  if (
    configured &&
    (expected.username ||
      expected.password ||
      expected.pathname !== "/" ||
      expected.search ||
      expected.hash ||
      (process.env.NODE_ENV === "production" && expected.protocol !== "https:"))
  )
    throw new VerificationError("gateway_origin_not_configured", 503);
  if (request.headers.get("origin") !== expected.origin)
    throw new VerificationError("origin_refused", 403);
}
export async function privacyResponse(
  request: Request,
  email: string | null,
  store: PilotStore,
) {
  try {
    if (!email) throw new VerificationError("sign_in_required", 401);
    if (request.method === "GET")
      return Response.json(await store.status(email), {
        headers: { "cache-control": "no-store" },
      });
    if (request.method !== "POST") return new Response(null, { status: 405 });
    requirePilotOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new VerificationError("json_required", 415);
    const body = await request.text();
    if (body.length > 2048)
      throw new VerificationError("request_too_large", 413);
    const parsed = PrivacyAction.safeParse(JSON.parse(body));
    if (!parsed.success)
      throw new VerificationError("privacy_action_invalid", 400);
    return Response.json(
      await store.privacy(
        email,
        parsed.data.action,
        parsed.data.noticeVersion,
        parsed.data.explained,
      ),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return safeGatewayResponse(error);
  }
}
export function safeGatewayResponse(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof VerificationError ? error.code : "gateway_unavailable",
    },
    {
      status: error instanceof VerificationError ? error.status : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
