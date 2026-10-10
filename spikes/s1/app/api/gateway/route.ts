import { cookies } from "next/headers";
import { z } from "zod";
import { readSessionToken } from "@/lib/auth";
import { requirePilotOrigin, safeGatewayResponse } from "@/lib/gateway/http";
import { pilotRuntime } from "@/lib/gateway/runtime";
import { VerificationError } from "@/lib/verification/ledger";

export const runtime = "nodejs";
const Input = z
  .object({
    role: z.enum(["nlu", "answer", "embed"]),
    input: z.string().min(1).max(4096),
  })
  .strict();
export async function POST(request: Request) {
  try {
    if (process.env.GATEWAY_PILOT_ENABLED !== "true")
      throw new VerificationError("gateway_pilot_disabled", 503);
    if (
      process.env.NODE_ENV !== "production" ||
      !process.env.AUTH_SECRET ||
      !process.env.RESEND_API_KEY ||
      process.env.RESEND_API_KEY === "CONFIGURE_IN_RAILWAY"
    )
      throw new VerificationError("verified_email_auth_required", 503);
    const session = readSessionToken(
      (await cookies()).get("nilumi_session")?.value,
    );
    if (!session) throw new VerificationError("sign_in_required", 401);
    requirePilotOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new VerificationError("json_required", 415);
    const body = await request.text();
    if (Buffer.byteLength(body) > 8192)
      throw new VerificationError("request_too_large", 413);
    const parsed = Input.safeParse(JSON.parse(body));
    if (!parsed.success)
      throw new VerificationError("gateway_input_invalid", 400);
    const result = await pilotRuntime()(
      session.email.toLowerCase(),
      parsed.data.role,
      parsed.data.input,
      "text",
      AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
    );
    if (parsed.data.role === "embed")
      return Response.json(
        {
          ok: true,
          dimensions:
            "embedding" in result.result
              ? result.result.embedding.length
              : null,
        },
        { headers: { "cache-control": "no-store" } },
      );
    return Response.json(
      {
        text: "text" in result.result ? result.result.text : "",
        receipt: result.receipt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return safeGatewayResponse(error);
  }
}
