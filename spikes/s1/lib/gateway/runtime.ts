import { GATEWAY_ROLES, type GatewayRole } from "../../config/gateway-roles";
import { detectSensitive } from "../nlu/sensitive";
import { VerificationError } from "../verification/ledger";
import { createCatalogGuard } from "./catalog";
import { createGatewayClient, loadGatewayCatalog } from "./client";
import { gatewayDatabase } from "./database";
import { PilotStore } from "./pilot-store";

export type GatewayIngress = "text" | "voice" | "import" | "background";
const privacyErrors = new Set([
  "household_acknowledgement_required",
  "queued_privacy_state_changed",
  "privacy_notice_changed",
]);
const catalog = createCatalogGuard(() => loadGatewayCatalog());
export function createPilotRuntime(
  store: PilotStore,
  key: string,
  options: {
    fetcher?: typeof fetch;
    catalog?: ReturnType<typeof createCatalogGuard>;
  } = {},
) {
  const guard = options.catalog ?? catalog;
  return async (
    email: string,
    role: GatewayRole,
    input: string,
    ingress: GatewayIngress,
    signal: AbortSignal,
    queuedReservation?: string,
  ) => {
    if (
      !GATEWAY_ROLES[role] ||
      !["text", "voice", "import", "background"].includes(ingress) ||
      typeof input !== "string" ||
      Buffer.byteLength(input) > 4096
    )
      throw new VerificationError("gateway_input_invalid", 400);
    if (detectSensitive(input))
      throw new VerificationError("sensitive_input_refused", 403);
    let reservation: string | null = queuedReservation ?? null;
    let minimumAllowance = 0;
    const client = createGatewayClient({
      key,
      syntheticCanary: false,
      fetch: options.fetcher,
      maxWireBytes: Buffer.byteLength(input) + 4096,
      acknowledgement: async () => (await store.status(email)).acknowledgement,
      verificationPassed: async () =>
        (await store.status(email)).evidenceAccepted,
      routeAllowed: async (r) => {
        await guard(r);
        return true;
      },
      reserve: async (r) => {
        const rates = await guard(r);
        const allowance = Math.ceil(
          ((Buffer.byteLength(input) + 4096) * rates.input +
            (r === "embed" ? 0 : 32) * rates.output) *
            1e6,
        );
        minimumAllowance = allowance;
        if (queuedReservation) return;
        reservation = await store.reserve(email, r, allowance);
      },
      state: {
        isTripped: async (r) =>
          (await store.status(email)).halts.some((h) => h.role === r),
        trip: async (r, reason) => {
          if (!privacyErrors.has(reason))
            await store.fail(reservation, email, r, reason);
        },
      },
      dispatchTransport: async (send) => {
        if (!reservation) throw new VerificationError("reservation_required");
        return store.dispatch(reservation, email, send, {
          role,
          minimumAllowance,
        });
      },
    });
    try {
      const result = await client.call(role, input, signal);
      if (!reservation) throw new VerificationError("reservation_required");
      await store.settle(reservation, email, result.receipt.costUsd as number);
      return result;
    } catch (error) {
      if (
        reservation &&
        !(error instanceof VerificationError && privacyErrors.has(error.code))
      )
        await store.fail(
          reservation,
          email,
          role,
          error instanceof VerificationError
            ? error.code
            : "gateway_request_failed",
        );
      if (reservation) await store.blockUnsent(reservation, email);
      throw error;
    }
  };
}
export function pilotRuntime() {
  return createPilotRuntime(
    new PilotStore(gatewayDatabase()),
    process.env.VGW_RUNTIME_API_KEY ?? "",
  );
}
