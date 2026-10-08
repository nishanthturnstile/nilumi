# S3 paid Vercel validation — October 8, 2026

The [V11 follow-up](11-s3-v11-validation.md) records development corrections,
improved privacy correctness, retained deadline failures and verified shutdown.
S3 acceptance remains pending.

The owner added approximately USD 20 in Vercel AI Gateway credits and selected
Vercel for current testing. Vercel is again the default transport for server and
runner. Cloudflare remains an explicitly selected spike adapter for future work;
there is no automatic cross-gateway fallback. No additional purchase was made.

The live evaluation is complete, but **S3 acceptance and model selection remain
pending**. Paid access resolved Luna's earlier provider eligibility failure; it
did not resolve the frozen prompt's semantic failures or the latency target.

## Frozen evaluation results

| Candidate / run | Correct | Schema | p95 model latency | Decision |
| --- | --- | --- | --- | --- |
| Luna low smoke | 3/3 | 3/3 | 3,336 ms | Proceed to frozen evaluation |
| Luna low, all 60 cases | 54/60 (90%) | 58/58 model responses | 4,065 ms | Not selected: privacy and held-out gates failed |
| GPT-4.1 mini smoke | 2/3 | 3/3 | 2,409 ms | Stop; no full mini evaluation |

Luna scored 12/12 date scenarios, 10/12 held-out cases (requires at least 11)
and 6/8 privacy scenarios (requires all eight). These are semantic correctness
gates, separate from upstream retention/training policies. Two sensitive cases
were refused locally. All 58 dispatched full-corpus calls succeeded within the
five-second deadline, with verified managed OpenAI routing and no schema errors.
The documented 1,400 ms NLU p95 target remains unmet. The entire corpus was scored
without changing the prompt, scorer, expected answers or fixture hash.

GPT-4.1 mini misinterpreted the development memory case. Its previously approved
stop-on-failed-smoke condition was applied. Earlier Nano challenger failures are
retained; adding credits does not itself justify repeating them. No model was
selected, and these results do not authorize family-data processing.

The initial upload used the wrong archive root and failed preparation; a second
attempt was skipped by the existing watch configuration. Uploading from the
repository root produced successful deployment
`8053da4a-ba7a-466a-90fa-9b699d23a164`. One evaluation request was dispatched while
that deployment was still transitioning and failed before a usable model result.
Its maximum reservation remains charged in the conservative ledger. An
authenticated invalid-request preflight succeeded before the actual smoke.

## Controls and cost

All calls used the approved `synthetic_hobby` fixture-only exception, OpenAI-only
managed routing, per-request no-training, `store:false`, the five-second deadline,
no tools, repair, retries or cross-model fallback, and the existing local ledger.
Paid Gateway credits do not imply a Pro plan or ZDR entitlement. Production and
real family-data testing still require a separately verified eligible route.

The existing key initially reported USD 24.97400355 available. After testing it
reported USD 24.95225886: a **USD 0.02174469 balance decrease**, matching the three
successful runs' reported costs. The cumulative conservative ledger retains
**USD 0.15504459**, leaving **USD 0.34495541** under the unchanged USD 0.50 cap.
The historical 28 entries were preserved, and the ledger now has 93 entries.
Its SHA-256 is
`11b4b229b6b2c88cabed31b2a77863f162d135064d8d19f61ba16de08fd57255`.

See [content-free evidence](../spikes/s1/evals/results/paid-vercel-validation-2026-10-08.json)
for version fingerprints, aggregate scores, routing gates, cost and shutdown
verification. Raw outputs and session credentials remain in ignored local files;
held-out transcripts, answers and outputs were not inspected for prompt tuning.

## Remaining acceptance work

Evaluator shutdown is verified: deployment
`6380e7b4-e601-4565-be83-bf0a276fb060` succeeded, configured enablement is false,
the caller allowlist is empty, and an authenticated endpoint check returned
HTTP 404 `evaluation_disabled` without dispatching inference.

Investigate development-only semantic failures, revise and freeze a new prompt
candidate, then repeat an authorized smoke and frozen regression within the
remaining cap. Original held-out scores are regression evidence rather than a
new independent holdout. Preserve the privacy/date/held-out gates and report the
latency target separately. Production must repeat acceptance on its actual model
and verified privacy route.

Local validation: 216 tests, Biome/ESLint, type checking and production build passed.
