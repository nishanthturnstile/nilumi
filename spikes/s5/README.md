# S5: Railway platform smoke

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
The local harness runs with migration credentials for worker setup; the separate
least-privilege worker and SECURITY DEFINER scheduling wrapper are still live
acceptance work. App credentials are restricted and direct queue reads are denied.

## Deployment artifact

`docker build -t nilumi-s5 .` creates the app/worker image from a pinned Node
image and lockfile. App command: `node src/server.mjs`; worker command:
`node src/worker.mjs`. `/healthz` checks the process; public `/readyz` returns
only a generic database-ready status. `/stream` requires a private bearer token
with at least 32 characters. Each service needs its own correctly scoped database
credential; do not use the local test password on Railway.

The proposed live environment is isolated from Website-Thaarei and the existing
Nilumi app: a Singapore database named `s5_smoke`, an app and a worker, one replica
each, no sleeping during the bounded reliability test. See
[S5 plan](../../docs/14-s5-platform-validation.md) for remaining configuration and
acceptance gates. No paid Railway resource is provisioned by these commands.

## Backup scaffold

`pnpm backup` supports the local Docker transport only. It verifies the journal
watermark, restores into `s5_restore`, checks RLS and replays forget tombstones,
then uses the `age` CLI with `S5_AGE_RECIPIENT` to encrypt the dump. Only the public
recipient belongs in worker configuration. Plaintext temporary files are removed
on success or failure. Output is an ignored `.age` file; R2 upload and manual
master-key recovery are not implemented/accepted yet.

[Recovery runbook](../../docs/15-s5-recovery-runbook.md) must be reviewed and copied
into the shared OneDrive document. Never commit or paste the private key.
