import { z } from "zod";
import type { GatewayRole } from "../../config/gateway-roles";
import { VerificationError } from "../verification/ledger";

export type Acknowledgement = {
  currentNoticeVersion: string;
  noticeVersion: string;
  currentAdults: string[];
  coveredAdults: string[];
  currentProcessors: string[];
  processors: string[];
  withdrawn: boolean;
  recordedAt: string | null;
};
const sameSet = (a: string[], b: string[]) =>
  a.length > 0 &&
  new Set(a).size === a.length &&
  new Set(b).size === b.length &&
  a.length === b.length &&
  a.every((value) => b.includes(value));
export function requireAcknowledgement(ack: Acknowledgement | null) {
  if (
    !ack ||
    !ack.recordedAt ||
    !Number.isFinite(Date.parse(ack.recordedAt)) ||
    ack.withdrawn ||
    !ack.currentNoticeVersion ||
    ack.noticeVersion !== ack.currentNoticeVersion ||
    !sameSet(ack.currentAdults, ack.coveredAdults) ||
    !sameSet(ack.currentProcessors, ack.processors)
  )
    throw new VerificationError("household_acknowledgement_required", 403);
}

const Attempt = z.object({
  provider: z.string(),
  credentialType: z.literal("system"),
  success: z.boolean(),
});
const Metadata = z.object({
  enabledDisallowPromptTraining: z.literal(true),
  routing: z.object({
    originalModelId: z.string(),
    canonicalSlug: z.string(),
    finalProvider: z.string(),
    modelAttemptCount: z.number().int().positive(),
    totalProviderAttemptCount: z.number().int().positive(),
    modelAttempts: z
      .array(
        z.object({
          canonicalSlug: z.string(),
          success: z.boolean(),
          providerAttemptCount: z.number().int().positive(),
          providerAttempts: z.array(Attempt).nonempty(),
        }),
      )
      .nonempty(),
  }),
  cost: z.union([z.number(), z.string()]).optional(),
});
export function routingReceipt(
  raw: unknown,
  model: string,
  providers: readonly string[],
) {
  const parsed = Metadata.safeParse(raw);
  if (!parsed.success) throw new VerificationError("routing_receipt_invalid");
  const { routing, cost } = parsed.data;
  const attempts = routing.modelAttempts.flatMap(
    (attempt) => attempt.providerAttempts,
  );
  if (
    routing.originalModelId !== model ||
    routing.canonicalSlug !== model ||
    !providers.includes(routing.finalProvider) ||
    routing.modelAttemptCount !== routing.modelAttempts.length ||
    routing.totalProviderAttemptCount !== attempts.length ||
    routing.modelAttempts.some(
      (attempt) =>
        attempt.canonicalSlug !== model ||
        attempt.providerAttemptCount !== attempt.providerAttempts.length,
    ) ||
    attempts.some((attempt) => !providers.includes(attempt.provider)) ||
    !routing.modelAttempts.at(-1)?.success ||
    !attempts.at(-1)?.success ||
    attempts.at(-1)?.provider !== routing.finalProvider
  )
    throw new VerificationError("routing_receipt_invalid");
  const amount = typeof cost === "string" && !cost.trim() ? NaN : Number(cost);
  return {
    model,
    provider: routing.finalProvider,
    byok: false,
    noTraining: true,
    attempts: attempts.length,
    costUsd:
      cost !== undefined && Number.isFinite(amount) && amount >= 0
        ? amount
        : undefined,
  };
}

export type GatewayFailure = {
  reason: string;
  httpStatus?: number;
  providerCode?: string;
};
export class GatewayRequestError extends VerificationError {
  constructor(public failure: GatewayFailure) {
    super(failure.reason, 503);
  }
}
export function gatewayFailure(error: unknown): GatewayFailure | null {
  const seen = new Set<unknown>();
  function inspect(
    raw: unknown,
    depth: number,
    inheritedStatus?: number,
  ): GatewayFailure | null {
    if (depth > 6 || !raw || typeof raw !== "object" || seen.has(raw))
      return null;
    seen.add(raw);
    const record = raw as Record<string, unknown>;
    const status = record.statusCode ?? record.status;
    const httpStatus =
      typeof status === "number" && status >= 400 && status <= 599
        ? status
        : inheritedStatus;
    let nestedFailure: GatewayFailure | null = null;
    for (const field of ["code", "type"]) {
      if (
        [
          "quota_for_entity_exceeded",
          "insufficient_credits",
          "insufficient_credit_balance",
          "credit_balance_exhausted",
        ].includes(String(record[field]))
      )
        return {
          reason: "gateway_budget_or_credit_exhausted",
          httpStatus,
          providerCode: String(record[field]),
        };
      if (record[field] === "no_providers_available")
        return {
          reason: "no_providers_available",
          httpStatus,
          providerCode: "no_providers_available",
        };
    }
    for (const field of ["cause", "error", "data", "response"]) {
      const result = inspect(record[field], depth + 1, httpStatus);
      if (result?.providerCode) return result;
      if (
        result &&
        (!nestedFailure ||
          result.httpStatus === 401 ||
          result.httpStatus === 402)
      )
        nestedFailure = result;
    }
    if (
      typeof record.responseBody === "string" &&
      record.responseBody.length < 10_000
    ) {
      try {
        const result = inspect(
          JSON.parse(record.responseBody),
          depth + 1,
          httpStatus,
        );
        if (result?.providerCode) return result;
        if (
          result &&
          (!nestedFailure ||
            result.httpStatus === 401 ||
            result.httpStatus === 402)
        )
          nestedFailure = result;
      } catch {
        /* No raw error text is retained. */
      }
    }
    if (httpStatus === 402)
      return { reason: "gateway_budget_or_credit_exhausted", httpStatus };
    if (httpStatus === 401)
      return { reason: "gateway_authentication_failed", httpStatus };
    if (nestedFailure) return nestedFailure;
    if (httpStatus !== undefined)
      return { reason: "gateway_request_failed", httpStatus };
    return null;
  }
  return inspect(error, 0);
}
export function terminalGatewayError(error: unknown): string | null {
  const failure = gatewayFailure(error);
  return failure?.reason === "gateway_request_failed"
    ? null
    : (failure?.reason ?? null);
}

export type GatewayState = {
  isTripped(role: GatewayRole): Promise<boolean>;
  trip(role: GatewayRole, reason: string): Promise<void>;
};
