# S3 V11 development corrections and frozen validation

V11 fixes were derived solely from inspected development cases: negated
preferences must preserve their literal predicate; note contents must not become
extra shopping actions; known entity types and default visibility must not become
invented hints; uniquely referenced corrections must copy their visible memory ID;
singular note-content questions request a value. Five independently authored
examples validate these rules. Corpus, goldens, interpreter, scoring, hosted model
settings, privacy controls, deadline and caps remain unchanged.

Code is committed as `20841e6`. Frozen prompt SHA-256:
`a20411850e43b65602da6d7ee973772e73718527d9c8e7df3288d7735823ff62`.
Pipeline SHA-256:
`5d8186ed8f9d1fc8c3eed3ed6eeccec06578f58e82fa3af34698e7368905fcc7`.
The original holdout is repeated regression evidence; no held-out transcript,
expected answer or raw output was inspected for this revision.

## Outcomes

| Run | Result | Decision |
| --- | --- | --- |
| Subscription, five development cases | 5/5 correct | Freeze V11 |
| Frozen subscription, all 60 | 59/60; held-out 11/12; dates 12/12; privacy 8/8 | Correctness gate passed; not hosted acceptance |
| Vercel Luna low smoke | 3/3, schemas and routes valid | Continue to development checks |
| Vercel Luna, four repaired development cases | 4/4, schemas and routes valid | Continue to full corpus |
| Vercel Luna low, all 60 | 56/60; held-out 9/12; dates 11/12; privacy 8/8 | Not selected: deadline failures prevent hard gates |
| Vercel GPT-4.1 mini smoke | 2/3; schemas and routes valid | Stop; no full mini run |

The subscription regression observed no tool activity; this is measured behavior,
not proof that its CLI harness has an empty tool catalog. It used the existing
streaming guard and does not establish provider latency, routing or ZDR. It scored
57/60 before the unchanged deterministic interpretation, and 59/60 afterward;
two cases used existing normalization. No normalization was added for V11.

Luna's successful hosted responses had 55/55 valid schemas; three dispatched
calls exceeded the five-second deadline and remained failures, yielding 55/58
first-attempt validity across calls. Two timeouts occurred in the held-out slice
and one in the date slice. One semantic held-out failure also remains. Reported
successful-call p50/p95 latency was 3,128/4,428 ms; the separate 1,400 ms target
remains unmet. Unknown routing/cost for timed-out calls was not converted into
verified success. No retries, repair calls or hidden failures were used.

Mini's development memory statement was misclassified as a correction, despite
passing the schema. The approved failed-smoke stop rule was applied. All hosted
requests retained synthetic-only mode, OpenAI-only managed routing, no-training,
`store:false`, existing output limits and the same local ledger. No family data
was processed, and no production privacy or model acceptance is claimed.

## Cost and shutdown

Vercel credit balance decreased from USD 24.95225886 to USD 24.92484752:
**USD 0.02741134** in this round. Failed calls may still incur upstream cost;
their maximum reservations remain in the local ledger. Cumulative conservative
charges are **USD 0.203665005**, leaving **USD 0.296334995** under the USD 0.50 cap.
All 93 prior entries were preserved; there are now 161 entries. Ledger SHA-256:
`ab3405171414f02af0e5fb4493ea942cd2aff581ea672454420995c66a75db1b`.

Deployment `64423f78-4961-44a2-9676-99d0c4b922a5` ran V11. Disabled redeployment
`f09e1225-4023-43a6-bd98-ca89ff231d72` succeeded afterward. Enablement is false,
the evaluator allowlist is empty, and the authenticated endpoint returns HTTP
404 `evaluation_disabled`. The pipeline fingerprint still matches the freeze.

[Content-free evidence](../../../spikes/s1/evals/results/v11-validation-2026-10-08.json)
contains aggregate scores, version metadata, retained costs and shutdown checks.
Local validation passed: 217 tests, Biome/ESLint, type checking and production build.

## Remaining work

Development corrections are implemented and validated, but **S3 acceptance and
model selection remain pending**. Investigate deadline variability and prompt
size/latency without loosening the five-second limit. Use only development evidence
for further intent changes; retain the failed V11 runs. Any future paid evaluation
must start with a passing smoke, preserve privacy/date/held-out gates and fit the
remaining cap. Do not silently select a later successful retry or treat a
subscription score as hosted acceptance.
