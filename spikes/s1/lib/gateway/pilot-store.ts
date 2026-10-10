import { randomUUID } from "node:crypto";
import type { GatewayRole } from "../../config/gateway-roles";
import {
  PILOT_NOTICE_VERSION,
  PILOT_PROCESSORS,
} from "../../config/privacy-notice";
import { VerificationError } from "../verification/ledger";
import type { Database, Sql } from "./database";
import { type Acknowledgement, requireAcknowledgement } from "./policy";

export const PILOT_EVIDENCE_VERSION = "s-vgw-adr052-pilot-v1";
type Household = {
  id: string;
  owner_email: string;
  adults: string[];
  notice_version: string;
  processors: string[];
  acknowledgement: Acknowledgement | null;
  vetoes: string[];
  evidence_version: string | null;
  monthly_cap_micros: string | number;
  revision: string | number;
} & Record<string, unknown>;
export class PilotStore {
  constructor(
    private db: Database,
    private now = Date.now,
  ) {}
  private async household(sql: Sql, email: string) {
    const h = (
      await sql.query<Household>(
        "SELECT * FROM gateway_pilot.household WHERE id='founding' FOR UPDATE",
      )
    ).rows[0];
    if (!h || !h.adults.includes(email))
      throw new VerificationError("household_member_required", 403);
    return h;
  }
  private acknowledgement(h: Household): Acknowledgement | null {
    if (!h.acknowledgement) return null;
    return {
      ...h.acknowledgement,
      currentNoticeVersion: PILOT_NOTICE_VERSION,
      currentAdults: h.adults,
      currentProcessors: [...PILOT_PROCESSORS],
      withdrawn: h.vetoes.length > 0,
    };
  }
  private async authorize(sql: Sql, h: Household, role: GatewayRole) {
    if (h.evidence_version !== PILOT_EVIDENCE_VERSION)
      throw new VerificationError("gateway_verification_required", 403);
    if (
      h.notice_version !== PILOT_NOTICE_VERSION ||
      JSON.stringify([...h.processors].sort()) !==
        JSON.stringify([...PILOT_PROCESSORS].sort())
    )
      throw new VerificationError("household_acknowledgement_required", 403);
    requireAcknowledgement(this.acknowledgement(h));
    if (
      (
        await sql.query(
          "SELECT 1 FROM gateway_pilot.halt WHERE household_id=$1 AND role=$2",
          [h.id, role],
        )
      ).rows.length
    )
      throw new VerificationError("role_halted");
  }
  async status(email: string) {
    return this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      return {
        owner: h.owner_email === email,
        adults: h.adults,
        acknowledgement: this.acknowledgement(h),
        vetoes: h.vetoes,
        evidenceAccepted: h.evidence_version === PILOT_EVIDENCE_VERSION,
        recordedBy: h.acknowledgement
          ? String(
              (h.acknowledgement as Acknowledgement & { recordedBy?: string })
                .recordedBy ?? "",
            )
          : null,
        revision: Number(h.revision),
        halts: (
          await sql.query(
            "SELECT role,reason FROM gateway_pilot.halt WHERE household_id=$1",
            [h.id],
          )
        ).rows,
      };
    });
  }
  async privacy(
    email: string,
    action: "acknowledge" | "withdraw" | "release-veto",
    noticeVersion: string,
    explained: boolean,
  ) {
    return this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      if (noticeVersion !== PILOT_NOTICE_VERSION)
        throw new VerificationError("privacy_notice_changed", 409);
      let ack = h.acknowledgement;
      let vetoes = [...h.vetoes];
      if (action === "withdraw") {
        vetoes = [...new Set([...vetoes, email])];
        ack = null;
      } else if (action === "release-veto") {
        vetoes = vetoes.filter((x) => x !== email);
        ack = null;
      } else {
        if (h.owner_email !== email || !explained || vetoes.length)
          throw new VerificationError("privacy_acknowledgement_refused", 403);
        ack = {
          currentNoticeVersion: PILOT_NOTICE_VERSION,
          noticeVersion: PILOT_NOTICE_VERSION,
          currentAdults: h.adults,
          coveredAdults: h.adults,
          currentProcessors: [...PILOT_PROCESSORS],
          processors: [...PILOT_PROCESSORS],
          withdrawn: false,
          recordedAt: new Date(this.now()).toISOString(),
          recordedBy: email,
        } as Acknowledgement;
      }
      await sql.query(
        "UPDATE gateway_pilot.household SET acknowledgement=$1::jsonb,vetoes=$2::jsonb,notice_version=$3,processors=$4::jsonb,revision=revision+1,updated_at=now() WHERE id=$5",
        [
          JSON.stringify(ack),
          JSON.stringify(vetoes),
          PILOT_NOTICE_VERSION,
          JSON.stringify(PILOT_PROCESSORS),
          h.id,
        ],
      );
      await sql.query(
        "INSERT INTO gateway_pilot.privacy_event(id,household_id,actor_email,action,notice_version,revision) VALUES($1,$2,$3,$4,$5,$6)",
        [
          randomUUID(),
          h.id,
          email,
          action,
          PILOT_NOTICE_VERSION,
          Number(h.revision) + 1,
        ],
      );
      return { ok: true };
    });
  }
  async reserve(email: string, role: GatewayRole, allowance: number) {
    if (!Number.isSafeInteger(allowance) || allowance < 1)
      throw new VerificationError("invalid_reservation");
    return this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      await this.authorize(sql, h, role);
      const period = new Date(this.now()).toISOString().slice(0, 7);
      const total = Number(
        (
          await sql.query(
            "SELECT COALESCE(SUM(charged),0)::text AS total FROM gateway_pilot.reservation WHERE household_id=$1 AND period=$2",
            [h.id, period],
          )
        ).rows[0].total,
      );
      if (total + allowance > Number(h.monthly_cap_micros))
        throw new VerificationError("hard_cap_reached");
      const id = randomUUID();
      await sql.query(
        "INSERT INTO gateway_pilot.reservation(id,household_id,actor_email,role,period,revision,allowance,charged,state) VALUES($1,$2,$3,$4,$5,$6,$7,$7,'reserved')",
        [id, h.id, email, role, period, h.revision, allowance],
      );
      return id;
    });
  }
  async dispatch(
    id: string,
    email: string,
    send: () => Promise<Response>,
    expected?: { role: GatewayRole; minimumAllowance: number },
  ) {
    const result = await this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      const r = (
        await sql.query(
          "SELECT * FROM gateway_pilot.reservation WHERE id=$1 AND household_id=$2 FOR UPDATE",
          [id, h.id],
        )
      ).rows[0];
      if (
        !r ||
        r.actor_email !== email ||
        r.state !== "reserved" ||
        (expected &&
          (r.role !== expected.role ||
            Number(r.allowance) < expected.minimumAllowance))
      )
        throw new VerificationError("reservation_not_dispatchable");
      try {
        await this.authorize(sql, h, r.role as GatewayRole);
        if (Number(r.revision) !== Number(h.revision))
          throw new VerificationError("queued_privacy_state_changed", 403);
        if (
          (
            await sql.query(
              "SELECT 1 FROM gateway_pilot.reservation WHERE household_id=$1 AND state IN ('dispatched','unknown')",
              [h.id],
            )
          ).rows.length
        )
          throw new VerificationError("prior_dispatch_unresolved");
      } catch (error) {
        await sql.query(
          "UPDATE gateway_pilot.reservation SET state='blocked',charged=0,reason='dispatch_precondition_failed' WHERE id=$1",
          [id],
        );
        return { error };
      }
      await sql.query(
        "UPDATE gateway_pilot.reservation SET state='dispatched' WHERE id=$1",
        [id],
      );
      // Start transport while holding the household lock. Withdrawal linearizes
      // before this start or after it; the response does not hold the SQL lock.
      const response = send();
      response.catch(() => {});
      return { response };
    });
    if ("error" in result) throw result.error;
    return result.response;
  }
  async settle(id: string, email: string, costUsd: number) {
    if (!Number.isFinite(costUsd) || costUsd < 0)
      throw new VerificationError("routing_cost_missing");
    const exceeded = await this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      const r = (
        await sql.query(
          "SELECT * FROM gateway_pilot.reservation WHERE id=$1 AND household_id=$2 FOR UPDATE",
          [id, h.id],
        )
      ).rows[0];
      if (!r || r.actor_email !== email || r.state !== "dispatched")
        throw new VerificationError("reservation_not_settleable");
      const charge = Math.ceil(costUsd * 1e6);
      if (!Number.isSafeInteger(charge))
        throw new VerificationError("routing_cost_invalid");
      await sql.query(
        "UPDATE gateway_pilot.reservation SET state='settled',charged=$2 WHERE id=$1",
        [id, charge],
      );
      if (charge > Number(r.allowance))
        await sql.query(
          "INSERT INTO gateway_pilot.halt(household_id,role,reason) VALUES($1,$2,'reservation_exceeded') ON CONFLICT DO NOTHING",
          [h.id, r.role],
        );
      return charge > Number(r.allowance);
    });
    if (exceeded) throw new VerificationError("reservation_exceeded");
  }
  async blockUnsent(id: string, email: string) {
    await this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      await sql.query(
        "UPDATE gateway_pilot.reservation SET state='blocked',charged=0,reason='unsent' WHERE id=$1 AND household_id=$2 AND actor_email=$3 AND state='reserved'",
        [id, h.id, email],
      );
    });
  }
  async fail(
    id: string | null,
    email: string,
    role: GatewayRole,
    reason: string,
  ) {
    await this.db.transaction(async (sql) => {
      const h = await this.household(sql, email);
      if (id)
        await sql.query(
          "UPDATE gateway_pilot.reservation SET state='unknown',reason=$3 WHERE id=$1 AND household_id=$2 AND actor_email=$4 AND state IN ('reserved','dispatched')",
          [id, h.id, reason, email],
        );
      await sql.query(
        "INSERT INTO gateway_pilot.halt(household_id,role,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [h.id, role, reason],
      );
    });
  }
}
