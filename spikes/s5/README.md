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
[S5 plan](../../docs/14-s5-platform-validation.md) for remaining configuration and
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
recipient belongs in worker configuration. Plaintext temporary files are removed
on success or failure. Output is an ignored `.age` file; R2 upload and manual
master-key recovery are not implemented/accepted yet.

[Recovery runbook](../../docs/15-s5-recovery-runbook.md) must be reviewed and copied
into the shared OneDrive document. Never commit or paste the private key.
