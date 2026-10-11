# S5 acceptance — October 8, 2026

> Historical evidence: existing spike scope and chronology, reconciled 2026-10-10. Original dates, measurements, failures, exceptions and acceptance limits remain authoritative for that experiment. This is not the new application implementation plan. The [single current plan](../../plans/implementation-plan.md) owns future work; prior acceptance does not validate Pipecat, streaming conversational STT or dynamic Home. Latest scoped S5 acceptance and owner recovery exception are in [acceptance](16-s5-acceptance.md); new production recovery is still gated. Earlier pending labels describe the dated state at that point, not a competing current plan.


**Status: CLOSED — owner accepted the synthetic platform spike.** The owner
confirmed their validation is complete and explicitly chose one recovery operator:
"we no need to valdiate again for my wife, we will go with one mine".
Independent recovery by the second adult is waived for S5. It was not performed
and is not recorded as a passing test. Both adults' shared-document access remains
user confirmed; one real age master identity is stored privately.

## Accepted evidence

- [Local smoke](../../../spikes/s5/reports/local-smoke.json) and
  [Railway runtime checks](../../../spikes/s5/reports/live-smoke.json): PostgreSQL 18,
  extensions/ICU locale, pooled restricted-role/RLS isolation, 200-occurrence
  scheduling with restart/redeploy, stale/cancelled/duplicate fencing,
  authenticated POST/SSE reconnect/heartbeats, readiness failure and snapshot restore.
- [Fresh-cluster recovery](../../../spikes/s5/reports/fresh-recovery.json) and
  [Railway PITR](../../../spikes/s5/reports/pitr-smoke.json): recreated restricted roles,
  policies, compatible PostgreSQL 18 image and point-in-time canary recovery.
- [Private R2 offsite backup](../../../spikes/s5/reports/offsite-smoke.json): real age
  encryption, ciphertext/journal SHA-256 read-back, manifest publication,
  verified download and retention dry run in `nilumi-backups`.
- [Real-key restore](../../../spikes/s5/reports/offsite-restore.json): owner-performed
  private decryption, fresh scratch restore, manifest counts, restricted app/worker
  visibility and FORCE RLS. A [newer forget journal](../../../spikes/s5/reports/post-backup-forget.json)
  removed its canary before app queries against the restored original backup.
- Eleven automated tests, Biome and syntax checks passed. Temporary Railway and
  local database resources, plaintext dump and temporary credential copy were
  removed. No AI calls were used. The conservative Railway reserve remains
  $0.20 within the separate $2 allowance; usage reporting can lag.

## Scope decision and follow-ups

The owner's closure accepts the available synthetic feasibility evidence. It
does not turn unmeasured items into passing tests or accept production readiness.

- Second-adult independent recovery: **waived for S5**; do not reopen it as an S5
  blocker without a new owner decision. The founding household uses one operator.
- Full human RPO/RTO rehearsal and 2FA confirmation: mapped to P1 staging foundations and P8 human recovery rehearsal.
  The measured ~1.6 s automated restore and ~27-minute backup age are not full
  human recovery timing or production RPO/RTO guarantees.
- S5-specific installed-PWA resume/home-network RTT: deferred to implemented-app
  validation. Earlier S1 phone acceptance remains separate evidence.
- Production migration/maintenance role separation, image update policy,
  backup scheduling/retention enforcement, derived-content redaction, queue
  reconstruction and recurrence/provider-send behavior: mapped to P1/P4 recovery foundations and P5 reminder work in the current plan. This offsite archive restores `s5`; Graphile runtime
  is reinstalled and queue contents are not recovered.
- Test R2 token expires October 15, 2026. Establish production credentials and
  recovery configuration belongs to P1; the private master identity stays off
  Railway and GitHub.

S5 is closed. Other historical spike/provider gates retain their stated scope. This decision closes no gate of the new P0–P8 application plan.
