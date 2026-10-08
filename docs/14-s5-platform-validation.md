# S5 — Platform validation plan and initial implementation

**Status:** Local harness implemented; Railway acceptance pending. User authorized
starting S5 after the S3 correctness spike. The shared OneDrive recovery document
does not exist yet; prepare the runbook first, as requested. No production/family
data or AI inference is part of this spike.

## Scope and gates

Use an isolated Singapore environment with one app, one worker and PostgreSQL 18
with pgvector. Do not attach S5 to an existing website's database. The current
Railway project also hosts other applications; existing services were inspected
read-only. Nilumi staging has an app but no database volume. The local harness
lives in `spikes/s5/`, separately from the accepted S1/S3 implementation.

1. **Database and locale:** pin actual server/image/extensions; verify UTF-8 and
   ICU or a suitable non-C locale. Record `show_trgm`, simple FTS and Tamil vowel,
   suffix and transliteration behavior. Exact token support is not morphology or
   Tamil↔romanized equivalence.
2. **Pooled roles/RLS:** real restricted login, no superuser/BYPASSRLS, FORCE RLS,
   member/household visibility, private-record existence exclusion, transaction
   context reset after success/failure, and cross-household reference rejection.
   Finish separate app/worker/migration/maintenance credentials and atomic
   SECURITY DEFINER scheduling under the Architecture contract before live acceptance.
3. **Worker reliability:** at least 200 occurrences spanning one-off, recurring,
   snoozed, edited mid-flight and quiet hours, plus process restart and a Railway
   redeploy. Require every expected dispatch within 60 seconds, zero stale sends,
   no cancelled sends and no duplicate effects. An isolated database sink proves
   scheduling/claims, not external push delivery.
4. **POST/SSE:** authenticated requests, heartbeat, incremental delivery, disconnect
   cleanup, Last-Event-ID replay and readiness failure during DB outage. Repeat
   through Railway's proxy and on both installed PWAs, including app resume.
5. **Backup/forget:** block unjournaled dump upload; restore a real custom-format
   dump into scratch; validate roles, RLS, manifest and canaries; replay tombstones
   created after the dump; prevent restored traffic until replay passes.
6. **Encrypted offsite recovery:** encrypt with the real public age recipient,
   upload to an isolated R2 prefix, verify hash, enforce retention, and perform
   manual master-key recovery from the shared OneDrive document. Private key stays
   off Railway/GitHub. Record RPO/RTO and recovery by both adults.
7. **Railway operations:** volume backups and restore proof; verify actual template
   PITR support rather than assuming it; always-on app/worker during reliability
   tests; measured resource cost and home-network RTT.

## Delivered local implementation

Pinned PostgreSQL/pgvector and Node Docker image digests, Node 24 and pnpm 12.9.1;
`pg` 8.23.1, graphile-worker 0.18.0 and Biome 2.2.6 are pinned in the new package.
No alternative formatter is introduced. The package contains:

- Disposable loopback-only Postgres 18 compose configuration with ICU locale.
- Synthetic schema and real restricted app login; pooled member transactions.
- Atomic occurrence/enqueue transactions and revision-conditional dispatch with
  one database receipt per occurrence. Worker process replacement preserves jobs.
- Public generic health/readiness and an authenticated synthetic POST/SSE stream.
- Local `pg_dump`/`pg_restore` transport, journal gate/replay, policy/row checks,
  and an age-encryption scaffold that cleans up plaintext files.
- Boundary tests, a reproducible smoke runner, a deployable app/worker image and
  the [recovery runbook](15-s5-recovery-runbook.md).

Run the commands in [the spike README](../spikes/s5/README.md). Results are
aggregates and synthetic locale examples; credentials and CLI diagnostics never
enter reports. Setup refuses other database names and resets only this dedicated
synthetic dataset. The package is not a production migration.

## Initial evidence and limits

[Tracked local evidence](../spikes/s5/reports/local-smoke.json) records actual
results. Four boundary tests and the syntax/lint checks pass. The local run
dispatches 200 synthetic occurrences with no stale or early dispatch and verifies
20 cancelled occurrences produce no delivery. It also passes non-superuser
pooled RLS, POST/SSE reconnect, a real dump/restore, restored RLS policies and
post-dump forget replay. No model API credits are consumed.

The worker cases use prepared recurrence instances and quiet-hour boundaries;
production calendar expansion, edits while an external send is in flight,
least-privilege worker credentials and Railway redeploy are not exercised yet.
The heartbeat is implemented but a long Railway proxy soak is not yet measured.
Encryption has not been exercised with the real public recipient; R2 upload,
master-key recovery, volume restore/PITR, home RTT and live resource cost are
pending. **Do not mark S5 or Phase 0 complete from these local results.**

The pinned app/worker Docker image also builds, and a separate local container
probe passes public database readiness, unauthenticated stream rejection and
authenticated Last-Event-ID resume. Its image digest and probe result are in
[image evidence](../spikes/s5/reports/image-smoke.json). JavaScript syntax checks
are used for this Node script package; no TypeScript check or production app
integration is claimed.

## Next live increment

The reviewed deployment shape is a new isolated S5 environment/project in
Singapore, one PostgreSQL volume, and one replica each of app and worker, using
the pinned images. Keep the environment synthetic-only and retire its compute
after the validation window. Actual spend must be tracked separately from S3's
model-testing ledger; S3's accepted evaluator remains disabled.

Before provisioning, agree the temporary resource allowance and isolation target.
Before encrypted recovery, create the shared OneDrive document, confirm both
accounts' access/2FA, generate/store the real master key there, and configure only
its public recipient on the worker. R2 credentials must be entered privately.
The user has requested the runbook before this document setup.

## Primary references

[Graphile Worker running jobs](https://worker.graphile.org/docs/library/run),
[transactional SQL-backed addJob](https://worker.graphile.org/docs/library/add-job),
[PostgreSQL 18 RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html),
[Railway backup/restore layers](https://docs.railway.com/guides/postgres-backups-restores).
These inform the harness; they do not establish that the user's Railway account
or template has passed the corresponding gates.
