import { cookies } from "next/headers";
import { readSessionToken } from "@/lib/auth";
import { gatewayDatabase } from "@/lib/gateway/database";
import { privacyResponse, safeGatewayResponse } from "@/lib/gateway/http";
import { PilotStore } from "@/lib/gateway/pilot-store";
import { VerificationError } from "@/lib/verification/ledger";

export const runtime = "nodejs";
async function handle(request: Request) {
  try {
    const session = readSessionToken(
      (await cookies()).get("nilumi_session")?.value,
    );
    if (!session)
      return safeGatewayResponse(
        new VerificationError("sign_in_required", 401),
      );
    return privacyResponse(
      request,
      session.email.toLowerCase(),
      new PilotStore(gatewayDatabase()),
    );
  } catch (error) {
    return safeGatewayResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
