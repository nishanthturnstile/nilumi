# S3 Cloudflare gateway preparation — October 8, 2026

## Decision and status

The owner requested Cloudflare AI Gateway for synthetic testing, then clarified
that either Vercel or Cloudflare may serve development while a paid route is
selected for production. Gateway transport is now explicit: `NLU_GATEWAY`
accepts `cloudflare` (the new default) or `vercel`. Unknown values block calls.
There is no automatic cross-gateway fallback. Existing Vercel code, privacy
evidence and regression tests remain available when Vercel is explicitly selected.

This is locally validated preparation, not live Cloudflare acceptance. The
Railway evaluator remains disabled on its previously deployed artifact. No new
deployment, inference, credit purchase or automatic top-up was performed.
Prompt v10, the frozen corpus, parser contracts and scoring gates are unchanged.
The full hosted comparison and model selection remain pending.

## Account inspection and official documentation

The authenticated collaborative browser showed AI Gateway onboarding for account
`68876249314ab88c8b5bdb86ba5fd8c8`. The credits screen showed **USD 0.00**,
no usage and no top-up invoices. A gateway creation form was inspected, but no
creation was submitted. The browser became unavailable during preparation;
gateway creation and credential installation remain pending.

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
No model-specific ZDR or upstream no-training verification is recorded as
complete. Family-data eligibility remains false.

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
