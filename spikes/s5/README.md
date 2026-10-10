# S5: Railway platform smoke

**Closed with owner acceptance October 8, 2026.** The owner completed private
master-key decryption; real offsite scratch restore and late-forget replay passed.
One recovery operator is accepted; the second-adult drill is waived for S5.
[Acceptance scope and production follow-ups](../../docs/validation/s5/16-s5-acceptance.md).

This isolated package validates infrastructure using disposable synthetic data.
It makes no AI calls and sends no real notifications. Local acceptance is not
Railway acceptance. The S1/S3 app remains separate.

Use Node 24, Docker and pnpm 12.9.1:

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm test
pnpm check
pnpm lint
pnpm smoke
docker compose down
```

The database is named `s5_smoke`, bound to loopback on port 55435, and stored on
tmpfs. Its public fixed password is for this disposable local container only.
Stopping the container removes its data. The harness refuses another database
name and requires an explicit `S5_ALLOW_REMOTE=true` for remote connections.
Never point it at an existing application database: schema setup resets the
synthetic S5 tables. No user secrets enter committed reports.

`validation-results/local-smoke.json` records actual server/extensions/locale,
Tamil tokenization, pooled non-superuser RLS checks, revision-fenced synthetic
deliveries, process replacement, POST/SSE resume and a dump/restore with forget
replay. A failed check returns a nonzero exit code and preserves partial evidence.

The worker scenarios use prepared occurrences, including recurrence instances
and deferred quiet-hour boundaries. They do not prove the production recurrence
generator, real push delivery, edits during provider dispatch or Railway redeploy.
The owner performs schema migrations; the worker runs with a separate restricted
login and worker-only Graphile RLS policies. Live scheduling uses a scoped
SECURITY DEFINER wrapper. App credentials cannot access the queue directly.

## Deployment artifact

`docker build -t nilumi-s5 .` creates the app/worker image from a pinned Node
image and lockfile. App command: `node src/server.mjs`; worker command:
`node src/worker.mjs`. `/healthz` checks the process; public `/readyz` returns
only a generic database-ready status. `/stream` requires a private bearer token
with at least 32 characters. Each service needs its own correctly scoped database
credential; do not use the local test password on Railway.

The live checks reused **Website-Thaarei → staging**, with separate temporary
Singapore database/app/worker services, one replica each and no sleeping.
The user explicitly prohibited creating a new project. All temporary resources
were removed after the checks; the existing Nilumi service was unchanged. See
[S5 plan](../../docs/validation/s5/14-s5-platform-validation.md) for remaining configuration and
acceptance gates and [live results](reports/live-smoke.json). The local commands
above provision no Railway resources. Live resources used a separate $2 allowance.

`scripts/live.mjs`, `deploy-live.mjs` and `restore-live.mjs` are operator tools for
already provisioned disposable services. Their ignored `validation-results/live-private.json`
must contain explicit target/service IDs and privately generated credentials.
They never create a project. Deployment uploads only the Dockerfile, package
lockfiles and `src`; credentials/results are excluded. Do not recreate deleted
services or retry a destructive fixture reset against another database.

`runtime.sql` is installed after owner-run Graphile migrations. It gives the
worker access only to the queue and synthetic dispatch tables, with no database
creation, role administration, superuser or BYPASSRLS privileges. A Graphile
version change needs an explicit owner migration and privilege review.

## Backup scaffold

`pnpm backup` supports the local Docker transport only. It verifies the journal
watermark, restores into `s5_restore`, checks RLS and replays forget tombstones,
then uses the `age` CLI with `S5_AGE_RECIPIENT` to encrypt the dump. Only the public
recipient belongs in worker configuration. Plaintext is piped directly into age;
no plaintext temporary dump file is created. Output is an ignored `.age` file. R2 tooling is implemented
below; real-key offsite upload/download passed, and manual recovery remains pending.

[Recovery runbook](../../docs/operations/s5/15-s5-recovery-runbook.md) must be reviewed and copied
into the shared OneDrive document. Never commit or paste the private key.

## Fresh-cluster recovery and PITR

With the source compose database running, start a separate scratch cluster:

```sh
docker compose -f compose.recovery.yaml up -d --wait
pnpm smoke:recovery
docker compose -f compose.recovery.yaml down
```

This command resets the dedicated source fixture, recreates app/worker roles on
the fresh target, restores a real dump and verifies restricted access, FORCE RLS,
queue permissions and post-dump forget replay. Recreate the scratch container
before repeating it. [Fresh recovery evidence](reports/fresh-recovery.json) and
[live PITR evidence](reports/pitr-smoke.json) passed. Railway PITR required the
major tag `ghcr.io/railwayapp-templates/postgres-ssl:18`; digest pinning was rejected.
The local compatible image is digest pinned. All temporary live resources were
removed; the reported cost is lagging and the cumulative reserve is $0.20 of $2.

## Synthetic R2 offsite commands

`r2-config.example.json` records public configuration only. The identified bucket
is the private bucket `nilumi-backups`, prefix `s5-synthetic/recovery-drill/`. The
original `nilumi` bucket serves `nilumi.in` publicly and must not receive backups.
Authenticated bucket access, real encryption, upload/download and retention dry
run passed in [live offsite evidence](reports/offsite-smoke.json). Manual
decryption and each adult's recovery remain pending. The scripts do not create
buckets or change bucket lifecycle rules.

Before running, install age locally and complete the real-key setup in the
runbook. Enter the following environment variables privately on the operator's
device, using a restricted file under ignored `validation-results/` if helpful:

- `S5_R2_ACCOUNT_ID`, `S5_R2_BUCKET`, `S5_R2_PREFIX` as in the example.
- `S5_R2_ACCESS_KEY_ID` and `S5_R2_SECRET_ACCESS_KEY` with bucket-scoped access.
- `S5_AGE_RECIPIENT`: only the real public recipient.
- `S5_MASTER_KEY_CONFIRMED=true`: only after both adults can access the real key.
- `S5_APPLY_RETENTION=false`: default to a dry run.
- `S5_AGE_BINARY`: optional explicit age executable, including Windows `age.exe`
  when running the Node harness in WSL. Pipe transport avoids cross-OS file paths.

Node can load a private environment file without putting secrets in command
arguments. Write it privately; never paste credentials into chat. Example:

```sh
node --env-file=validation-results/offsite.env scripts/offsite.mjs
```

The source must be the dedicated local Docker database. Prepare it with `pnpm
smoke`; `backup:offsite` does not initialize the fixture. The offsite command
publishes and reads back content-free forget journals before marking them
journaled, validates a snapshot-consistent dump through scratch restore, encrypts
with age, verifies downloaded ciphertext and commits the manifest last.
Retention keeps seven verified backups and requires seven days of age before
deleting eligible pairs. Only explicit `S5_APPLY_RETENTION=true` applies deletion;
journals and foreign objects are preserved. Truncated inventory, hash corruption
and invalid manifests fail closed. Limits: 16 MiB per object and 1,000 objects.

For recovery, add `S5_RECOVERY_MANIFEST_KEY` from the offsite report, then run:

```sh
node --env-file=validation-results/offsite.env scripts/download-offsite.mjs
```

This verifies and downloads encrypted data, the manifest and all forget journals
to a private ignored recovery directory. Decryption and scratch restore follow
the runbook on the trusted recovery device; this download command does not load
the private key. Adapter tests use header-shaped fixtures, not real age
encryption. Neither passing tests nor a verified download accepts S5 recovery.

After the operator privately decrypts the downloaded file to `backup.pg` in its
ignored `recovery-<uuid>` directory, start a fresh target with
`docker compose -f compose.recovery.yaml up -d --wait`. Set
`S5_RECOVERY_DIRECTORY` to that directory and
`S5_OPERATOR_DECRYPTION_CONFIRMED=true` only after successful age decryption, then
run `node --env-file=validation-results/offsite.env scripts/restore-offsite.mjs`.
The command verifies the remote backup and current journals again, recreates
roles in the empty scratch cluster, checks dump counts against the manifest,
replays forgets before app queries, and validates FORCE RLS and restricted logins.
It never opens the private identity. Its real-key restore passed after the user
privately decrypted the backup. A second fresh restore replayed a newly published
post-backup forget, removing that canary before restricted app queries. See
[restore evidence](reports/offsite-restore.json). Plaintext and scratch resources
were removed after validation.

The offsite dump contains `s5` only. Graphile's pinned schema/runtime is
reinstalled separately; this command does not prove restoration of queue contents
or production job reconstruction. Stop/remove the scratch compose cluster after
validation. Human RTO and the second adult's recovery remain separate checks.

`node --env-file=validation-results/offsite.env scripts/encryption-smoke.mjs`
validates local dump/restore and real encryption with the configured public
recipient without R2 calls or private-key access. Its encrypted output and report
are ignored. Decryption and each adult's recovery remain separate gates.
