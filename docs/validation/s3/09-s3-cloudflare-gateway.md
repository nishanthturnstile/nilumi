# S3 Cloudflare gateway preparation — October 8, 2026

## Decision and status

The owner requested Cloudflare AI Gateway for synthetic testing, then clarified
that either Vercel or Cloudflare may serve development while a paid route is
selected for production. The owner subsequently added paid Vercel credits and
selected Vercel for the current synthetic evaluation. Gateway transport is
explicit: `NLU_GATEWAY` accepts `vercel` (default) or `cloudflare`. Unknown values block calls.
There is no automatic cross-gateway fallback. Existing Vercel code, privacy
evidence and regression tests remain available when Vercel is explicitly selected.

Account setup and read-only runtime-token preflight are now verified; live
Cloudflare acceptance is pending. Railway staging has the Cloudflare credential
and gateway variables installed without deployment. The evaluator remains
disabled on its previously deployed artifact. No inference, credit purchase or
automatic top-up was performed.
Prompt v10, the frozen corpus, parser contracts and scoring gates are unchanged.
The full hosted comparison and model selection remain pending.

## Account inspection and official documentation

The authenticated collaborative browser showed AI Gateway onboarding for account
`68876249314ab88c8b5bdb86ba5fd8c8`. The credits screen showed **USD 0.00**,
no usage and no top-up invoices. After the owner restored the browser connection,
gateway `nilumi-s3` was created and its saved settings were verified through the
dashboard and the actual runtime token. The token has account-scoped AI Gateway
Read/Run and Workers AI Read permissions, expires November 7, and was installed
privately in an ignored mode-0600 local file and Railway staging. No secret is
included in the [setup evidence](../../../spikes/s1/evals/results/cloudflare-account-setup-2026-10-08.json).

Saved settings: authentication on, logs/classification/cache/retries off,
`zdr:true`, `byok_only:false`, no stored provider keys, Logpush off. A USD 0.35
spending rule applies to all providers/models over a sliding 30-day window.
Cloudflare spend enforcement is eventually consistent, so the local cumulative
ledger remains the primary testing guard. Automatic top-up remains disabled.

Cloudflare's [REST API](https://developers.cloudflare.com/ai-gateway/usage/rest-api/)
supports Responses requests at `/accounts/{account}/ai/v1/responses`, with a
fully qualified OpenAI model and an explicit `cf-aig-gateway-id`. Inference needs
Account / Workers AI / Read token permission; management reads additionally
need the appropriate AI Gateway read permission. Gateway-only tokens cannot
authenticate the new inference endpoint.

[Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
requires prepaid inference credits and charges a 5% credit-purchase fee.
Gateway core features being free does not make OpenAI inference free. ChatGPT
subscription access does not fund this account. ZDR applies to eligible models
using Cloudflare-managed credentials; it does not disable gateway logging.
The authenticated third-party catalog records `zdr:false` for GPT-6 Luna and
`zdr:true` for GPT-5 nano, GPT-4.1 nano and GPT-4.1 mini; all four list Responses
support. Luna must not be used with this gateway's ZDR setting. Catalog metadata
does not establish live authorization, schema compatibility or five-second
latency. OpenAI's [default API policy](https://developers.openai.com/api/docs/guides/your-data)
excludes training unless the account explicitly opts in, but Cloudflare-managed
account opt-in status/route-specific no-training assurance remains unverified.
The privacy profile continues blocking inference; family-data eligibility remains
false. GPT-4.1 mini is an already owner-approved candidate for a later three-case
synthetic smoke, subject to its privacy and fresh pricing gates.

### Pre-payment setup and minimum deposit

The owner subsequently authorized completing account configuration before
payment. The first browser connection disconnected during editing. After the
owner restored it, gateway creation, configuration and credential installation
succeeded. Read-only preflight returned HTTP 200 for gateway settings and credit
balance and passed the application's strict route-configuration verification.

Cloudflare's [top-up API reference](https://developers.cloudflare.com/api/resources/ai_gateway/subresources/billing/subresources/topup/methods/create/)
specifies a minimum of 1,000 cents: **USD 10.00 in credits**. With the documented
5% purchase fee, the expected payment is **USD 10.50 before applicable taxes,
foreign exchange or card charges**. The account-specific checkout was inspected
with an amount of USD 10 and displayed a USD 0.50 fee and USD 10.50 total. It was
cancelled without submitting payment. Automatic top-up remains disabled. This deposit is
separate from the unchanged USD 0.50 cumulative inference-testing cap and the
existing USD 5 monthly usage allowance; it requires more upfront funding than
that allowance. No purchase or cap increase is authorized or performed.

Gateway settings and scoped credential installation are complete. Before payment
for validation, resolve managed-route no-training assurance and choose a ZDR
eligible approved challenger with fresh pricing. Adding credits will not resolve
Luna's catalog ZDR restriction. Zero credits prevents live eligibility/latency
testing; completed non-billable setup does not imply a successful smoke.

## Implemented transport and gates

- Direct OpenAI Responses request, strict existing JSON schema, `store:false`,
  `background:false`, no streaming or tools, unchanged output limit, approved
  low reasoning where supported. GPT-4.1 challengers omit reasoning effort.
- Logging and payload collection disabled; caching skipped; a single attempt
  requested. A local five-second abort covers configuration reads, inference
  and response consumption. Cloudflare's documented provider timeout measures
  first response bytes, so the local deadline remains necessary.
- Before each inference, read the named gateway and provider-key list. Require
  authentication, logs off, zero cache TTL, explicit `byok_only:false`, and an
  empty provider-key list. Strict mode also requires gateway `zdr:true` in
  addition to the separately verified model/privacy profile. Missing or unsafe
  configuration blocks inference. No provider key is sent in the request.
- Accept only the requested model, completed assistant JSON, existing validated
  schema and consistent nonnegative usage. Reject tools, truncation, malformed
  JSON and model substitution. Provider error bodies are never serialized.
- Reports distinguish `cloudflare_configuration_and_response_model` evidence
  from Vercel's per-generation routing receipt. This is configuration-derived
  evidence based on documented credential precedence, not a new receipt claim.
  Gateway configuration can change after inspection; account write access must
  remain controlled, and this limitation must be assessed before production.
- A separate Cloudflare privacy profile stays unverified and prevents live
  execution. Vercel metadata cannot satisfy it. `synthetic_hobby` remains the
  legacy wire name of the fixture-only exception, not a Cloudflare plan claim.
- Runner and server must agree on the chosen gateway. Both use the same durable
  cumulative ledger; switching gateways never resets historical charges.

## Pricing and budget

The [Cloudflare Luna catalog](https://developers.cloudflare.com/ai/models/openai/gpt-6-luna/)
was inspected October 8. The Cloudflare manifest conservatively uses its higher
long-context rates for input, output and cache, plus a 5% allocation for credit
purchase fees. Usage-based amounts remain **estimated**, not provider-reported
charges. Other approved challengers have no verified Cloudflare rate manifest
yet. Entries expire after 24 hours and require reinspection before live use.
Explicit Vercel runs continue verifying Vercel's catalog independently.

The unchanged local ledger retains **USD 0.126034025**, leaving
**USD 0.373965975** within the USD 0.50 cap. Its SHA-256 remains
`874982ab82557d820b120ff27b9d525e286f65af283c650d3504e589e74fadab`.
Cloudflare dry-run maximum reservations are **USD 0.0425583375** for the three
development cases and **USD 0.8231918625** for all 60 cases (two secret cases
are refused locally). The combined bound exceeds the remaining allowance.
Per-call settlement may release unused reservations, but full completion under
the current cap cannot be promised from these bounds. No cap increase is approved.

## Setup and validation sequence

1. Create a named gateway (suggested ID `nilumi-s3`) with logs, caching and retries
   disabled, authentication enabled, no provider keys and managed billing allowed.
   Recheck exact retry behavior and all settings before making paid calls.
2. Install an account-scoped token privately as `CLOUDFLARE_API_TOKEN`, plus
   `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_GATEWAY_ID`. Keep secrets in ignored
   environment files or Railway secrets. Verify permissions through read-only
   requests. Do not paste credentials into chat, tracked files or CLI arguments.
3. Verify managed OpenAI no-training policy, approved-model availability, relevant
   pricing and model-specific ZDR eligibility separately. Record only proven
   Cloudflare facts in `config/cloudflare-privacy.json`; preserve pending flags.
4. Fund inference only with owner-authorized payment. Funding does not increase
   the cumulative test cap. Resolve a defensible reservation/run plan before
   promising the full comparison.
5. Deploy the tested artifact disabled; confirm owner session/origin/corpus gates.
   Enable only for the three original development cases, with matching server
   `NLU_GATEWAY=cloudflare` and runner `--gateway=cloudflare`.
6. Stop if smoke fails. If it passes, run the frozen comparison only within the
   remaining allowance, evaluate every acceptance gate and disable afterward.
   Production must repeat validation on its actual model and privacy route.

Local checks: 216 tests, Biome/ESLint, type checking and production build.
Transport tests are mocked and establish request/parser/gate behavior; they do
not establish live provider accuracy, latency, price or privacy eligibility.
