# S5 — Platform validation plan and initial implementation

**Status:** Local and bounded Railway synthetic checks passed; full S5 acceptance pending. User authorized
starting S5 after the S3 correctness spike. The user now confirms the shared
OneDrive recovery document exists and both adults can access it. The user generated
and privately stored one master identity for both adults; its public recipient
is configured for the synthetic spike. Decryption and recovery are still pending. No production/family
data or AI inference is part of this spike.

## Scope and gates

Reuse **Website-Thaarei → staging**, as explicitly requested on October 8, with
separate temporary Singapore app, worker and PostgreSQL 18 services. Create no
new project or environment. Do not attach S5 to an existing website's database. The current
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
results. Eleven boundary/offsite tests and the syntax/lint checks pass. The local run
dispatches 200 synthetic occurrences with no stale or early dispatch and verifies
20 cancelled occurrences produce no delivery. It also passes non-superuser
pooled RLS, POST/SSE reconnect, a real dump/restore, restored RLS policies and
post-dump forget replay. No model API credits are consumed.

The worker cases use prepared recurrence instances and quiet-hour boundaries;
production calendar expansion and edits while an external send is in flight
are not exercised. Separate worker credentials and Railway redeploy were
subsequently exercised in the live increment below.
Encryption has not been exercised with the real public recipient; R2 upload,
master-key recovery and home RTT remain pending. Live volume restore, PITR
eligibility and resource cost are recorded below. **Do not mark S5 or Phase 0 complete from these results.**

The pinned app/worker Docker image also builds, and a separate local container
probe passes public database readiness, unauthenticated stream rejection and
authenticated Last-Event-ID resume. Its image digest and probe result are in
[image evidence](../spikes/s5/reports/image-smoke.json). JavaScript syntax checks
are used for this Node script package; no TypeScript check or production app
integration is claimed.

## Live increment — October 8, 2026

The user authorized temporary services in the existing staging environment,
under the proposed **$2 tracked Railway resource allowance**, separate from S3's
AI ledger. The three services used one replica each, Singapore, with sleeping
disabled and total limits of 1 vCPU / 1 GB memory. Database storage was 1 GB;
the restore temporarily added a second 1 GB volume. Service-scoped credentials
were generated privately; neither shared variables nor existing services changed.
Upload used an explicit source-file allowlist, excluding credentials and results.

[Live evidence](../spikes/s5/reports/live-smoke.json) records:

- PostgreSQL 18.6, ICU `en-US`, pgvector 0.8.7 and pg_trgm 1.6.
- Restricted app and worker logins, neither superuser nor BYPASSRLS, pooled
  household/private visibility, denied direct app queue/occurrence access, and
  rollback of both occurrence and queue job through scoped SECURITY DEFINER scheduling.
- Two successful 200-occurrence runs after a worker-role fix; the second repeated
  a Railway redeploy while jobs were queued. No stale/early/duplicate receipts;
  20 cancelled jobs per run sent nothing. Maximum delays were 933 ms and 673 ms.
- Authenticated POST/SSE resume through Railway; incremental 25-second heartbeats
  arrived at about 25 and 51 seconds during a 55-second soak.
- Real custom-format schema dump/restore into `s5_restore`, restricted-role/RLS
  checks, blocked unjournaled backup and replay of a forget created after the dump.
- Railway volume snapshot/restore recovered a changed canary, all 200 receipts,
  and FORCE RLS. Real database shutdown made app readiness return generic HTTP 503.

The initial live worker run failed with zero job attempts: Graphile's private
tables enable RLS, so grants alone were insufficient. Worker-only policies fixed
this without BYPASSRLS. The local smoke now runs with that same restricted worker
role to catch this regression. Queue errors emit codes only, without payloads or
connection strings. Failed timing evidence is retained in the live report.
The final local regression also splits the 200 occurrences across two households
and verifies each receipt retains its occurrence's household. The live delivery
runs used one synthetic household; live visibility checks used both.

All temporary services, both volumes and the snapshot were removed after testing;
the existing `nilumi-s1` deployment stayed unchanged. Usage reporting can lag;
the report separates reported S5 service charges from the conservative reserve.
No AI calls were made and the S3 evaluator remained disabled.

**Initial PITR eligibility:** Railway CLI reports the pinned upstream pgvector image is
unsupported for built-in PITR. It requires Railway's `postgres-ssl` or
`postgres-patroni` image. Do not assume an image switch preserves PostgreSQL 18,
extensions or locale: verify those and PITR recovery in a separate bounded
increment before deciding the production backup configuration.

**Remaining acceptance:** real-recipient age encryption, isolated R2 upload/hash/
retention, live offsite manifest and role recovery, both-adult master-key recovery,
installed-PWA resume on both phones and home RTT. Separate migration/maintenance
credentials and complete production recurrence/provider-send behavior remain
outside the runtime app/worker proof. The schema-only scratch restore on the same
cluster does not prove recovery of cluster roles on a fresh provider.

Before encrypted recovery, create the shared OneDrive document, confirm both
accounts' access/2FA, generate/store the real master key there, and configure only
its public recipient on the worker. R2 credentials must be entered privately.
The user has requested the runbook before this document setup.

## Recovery increment — October 8, 2026

[Fresh-cluster evidence](../spikes/s5/reports/fresh-recovery.json) proves separate
physical clusters, explicit recreation of restricted app/worker roles, a real
dump/restore, FORCE RLS, both-adult and second-household visibility, queue
boundaries and forget replay before restored app queries. This is a local
synthetic proof; production migration/maintenance role separation is pending.
Backup metadata and the dump now share an exported PostgreSQL snapshot.

[Live PITR evidence](../spikes/s5/reports/pitr-smoke.json) supersedes the earlier
eligibility blocker: Railway's `postgres-ssl:18` major tag enabled PITR in the
existing staging environment. The source canary changed after the selected
timestamp; the restored service recovered its earlier value. PostgreSQL 18.6,
ICU `en-US`, vector 0.8.7, pg_trgm 1.6 and restricted app/FORCE RLS checks passed.
Railway rejected the digest-pinned reference for PITR. The production choice
therefore still needs an image update policy; the recorded local audit digest
does not assert the live deployment ran that exact digest.

The disposable source used 1 GB storage and 0.5 CPU/0.5 GB memory. Railway created
a 50 GB restored volume by default, inheriting the compute limits; both were
removed after the short drill. Cleanup inventory confirms only the unchanged
`nilumi-s1` service, zero volumes/buckets and no staged changes. Reported charges
for these two services were ~$0.000715, subject to lag. Another $0.10 is reserved:
**$0.20 cumulative S5 reserve within the $2 allowance**, separate from AI spending.

R2 publishing/download, manifest/hash verification, content-free journal replay
and bounded retention are now implemented with pinned AWS SDK 3.1147.0. Tests
cover corruption, missing privacy boundaries, watermark ordering and retention
failure paths. Their ciphertext fixtures are not real encryption. The user
identified bucket `nilumi` and requested guided OneDrive/key setup later.
Prefix `s5-synthetic/recovery-drill/` is prepared, but no R2 call or real-key
encryption occurred. The endpoint is not proof of authenticated bucket access.

Next: complete the runbook's guided key/document setup, privately configure scoped
R2 credentials, run the real synthetic encrypted offsite drill, and record both
adults' independent recovery and RPO/RTO. Installed-PWA/home-network evidence
remains separate. **S5 and Phase 0 remain open.**

## Real-recipient encryption increment — October 8, 2026

Both adults' document access and private master-key storage are user confirmed.
One shared age identity is intended for both operators. The public recipient is
configured; the agent has not read the identity or recovery document.
[Encryption evidence](../spikes/s5/reports/encryption-smoke.json) records a real
synthetic PostgreSQL dump encrypted with age 1.3.2 and that recipient, with
ciphertext hash/size and snapshot metadata. The dump was restored locally before
encryption. Plaintext now flows over stdin rather than a temporary dump file,
which also supports the installed Windows executable from the WSL harness.

The 200-occurrence regression and all 11 tests, syntax and Biome checks pass.
Private R2 configuration is prepared in ignored `validation-results/offsite.env`,
with credential fields empty. The upload command stopped at
`s5_r2_credentials_required` before any R2 call. Real-key decryption, offsite
upload/download, both-operator recovery and 2FA confirmation remain pending.
No Railway resources or AI calls were added in this increment.

## Private R2 bucket configuration — October 8, 2026

Browser inspection found `nilumi` has public access enabled through `nilumi.in`.
The user chose a separate private bucket, preserving the existing domain.
Created **`nilumi-backups`**, Asia-Pacific, Standard storage. Settings inspection
confirmed no custom domains and the public development URL disabled. S5 public
and ignored private configuration now use this bucket, retaining prefix
`s5-synthetic/recovery-drill/`. No backup objects were uploaded.

The browser connection initially became unstable, then recovered. Created
`nilumi-s5-synthetic-backups`: Object Read & Write, only `nilumi-backups`, one-week
TTL, dashboard-confirmed expiry October 15, 2026. Credentials were transferred
privately to the ignored mode-600 configuration without displaying values in
tool output. Automatic policy blocked agent deletion of a temporary credential
download outside the workspace. The user removed it privately; a subsequent
`Test-Path` check returned false, verifying that the temporary copy is absent.

[Live offsite evidence](../spikes/s5/reports/offsite-smoke.json) records successful
real-recipient age encryption, journal/ciphertext read-back SHA-256 verification,
manifest publication, verified download and retention dry run (zero candidates,
zero deletions). The recovery command also downloaded verified ciphertext and
the merged content-free journal to ignored private storage. The 200-occurrence
local regression passed; temporary local Docker resources were stopped/removed.
No Railway resources or AI calls were added. The subsequent master-key restore
is recorded below; independent recovery by each adult, 2FA confirmation and
installed-PWA/home RTT remain pending.

## Real-key offsite restore — October 8, 2026

The user confirmed successful decryption on their own Windows device. The agent
never opened the private identity. [Restore evidence](../spikes/s5/reports/offsite-restore.json)
records a fresh local scratch cluster restored from that decrypted R2 backup.
All five source counts matched the manifest before forget replay; recreated
restricted app/worker roles, PostgreSQL 18/extensions/ICU locale, FORCE RLS,
private visibility, cross-household visibility and queue access boundaries passed.
The current remote journals were rechecked before acceptance; app/worker runtime
traffic remained disabled.

A [new post-backup forget](../spikes/s5/reports/post-backup-forget.json) was then
published for synthetic canary `private2`. Recreating the scratch cluster and
restoring the same original dump replayed both journals and removed this canary
before app queries. This closes the encrypted offsite late-forget proof.
Plaintext dump and scratch container/network were removed; encrypted evidence
and the private master key remain in their intended locations.

The backup was about 27 minutes old and the final automated restore took ~1.6 s;
full human recovery timing is not measured. This archive contains `s5`, while
Graphile queue runtime is reinstalled separately; queue contents and production
job reconstruction are not restored. Independent both-adult recovery, 2FA,
home-network/installed-PWA validation and production role/runtime work remain
pending. **S5 and Phase 0 are still open.**

## Primary references

[Graphile Worker running jobs](https://worker.graphile.org/docs/library/run),
[transactional SQL-backed addJob](https://worker.graphile.org/docs/library/add-job),
[PostgreSQL 18 RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html),
[Railway backup/restore layers](https://docs.railway.com/guides/postgres-backups-restores).
[Railway PITR](https://docs.railway.com/volumes/point-in-time-recovery),
[Cloudflare R2 AWS SDK](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).
These inform the harness; they do not establish that the user's Railway account
or template has passed the corresponding gates.
