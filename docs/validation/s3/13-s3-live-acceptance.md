# S3 live reliability and acceptance — October 8, 2026

> Historical evidence: existing spike scope and chronology, reconciled 2026-10-10. Original dates, measurements, failures, exceptions and acceptance limits remain authoritative for that experiment. This is not the new application implementation plan. The [single current plan](../../plans/implementation-plan.md) owns future work; prior acceptance does not validate Pipecat, streaming conversational STT or dynamic Home. Latest S3 synthetic correctness selection and its deferred application-latency limits are in [live acceptance](13-s3-live-acceptance.md); current restricted Gateway closure is in [verification](08-s3-gateway-verification.md#vgw-closure). Earlier pending labels describe the dated state at that point, not a competing current plan.


**Synthetic correctness acceptance passed; select `openai/gpt-6-luna` with low
reasoning for the spike.** The parser implementation and deadline safeguards
are delivered. The owner subsequently asked to prioritize
correctness and defer production latency optimization; the 1,400 ms p95 target
is reported separately and does not decide synthetic correctness acceptance.
The owner explicitly approved **30 seconds per synthetic correctness response**,
while preserving the application's five-second deadline and privacy controls.
The run stayed under the evaluator's effective USD 0.50 hard cap; the owner
approved a separate USD 2.00 cumulative cap, but the runner and ledger still need
migration before spending above USD 0.50 ([Historical experiment permission (040)](08-s3-gateway-verification.md#historical-experiment-permissions)). Earlier
five-second results retain their original gates.

## Regional reliability experiment

The historical regional experiment moved the single staging replica from Singapore to US East Virginia,
without changing the frozen V11 prompt, wire-v2 schema, models, reasoning settings,
scoring or privacy controls. There are no attached volumes. This tests whether
placement reduces time waiting for the remote response. No production traffic,
new model, service tier or paid plan is introduced.

| Frozen V11 hosted test | Result |
| --- | --- |
| Luna low, three development cases | 3/3; all schemas and managed OpenAI routes verified |
| Luna low, full 60 | 55/60; held-out 9/12; dates 9/12; privacy 8/8 |
| GPT-4.1 mini, three development cases | 2/3; valid schemas/routes; semantic preference failure |

Luna's full run had 53 successful model calls, five timeouts and two local
refusals. Every completed model call was correct. Completed-call p50 was
3,410 ms and p95 4,823 ms; these percentiles exclude failed calls and do not
prove deadline reliability. The timeout failures remain in correctness and
first-attempt schema denominators. No qualifying model was selected.

Mini completed all three calls in 1,480–2,189 ms, but incorrectly turned an
ordinary preference into a correction. Apply the failed-smoke stop rule: no full
Mini run for that frozen pipeline. A faster incorrect response cannot qualify.

Non-generative gateway timing lookups found approximately 346–362 ms beyond
reported generation time in two completed Singapore smoke calls, versus
350–446 ms in three completed US East smoke calls. These tiny samples exclude
timeouts; the change did not demonstrate lower gateway overhead. Restore the
original Singapore placement. Regional changes preserve domains, but are not
evidence of lower provider latency. See [Railway regions](https://docs.railway.com/deployments/regions).

## Development-only prompt revisions

The historical development protocol kept all 60 reviewed fixtures, goldens, contracts, interpreter and scorer fixed and inspected only development failures; the repeated original holdout remains
regression evidence, rather than independent acceptance data. Never inspect or
tune against held-out transcripts, answers or raw outputs.

V12 repeats existing intent rules after current input and adds independent
ordinary-versus-changed preference examples. Its three development checks passed,
but the frozen free regression scored 58/60, held-out 11/12, dates 11/12 and
privacy 8/8. A development date retained an unsupported leading “on”. No paid
V12 test followed.

V13 reinforces the existing date-phrase rule and adds an independent day-first
date example. Four development checks passed; the frozen free regression scored
57/60, held-out 11/12, dates 11/12 and privacy 8/8. Development failures included
a child in “us” targets and omitted explicit correction selectors. No paid V13
test followed. Both failed candidates are preserved in Git and evidence.

V14 reinforces the existing adult-only target expansion and named-entity
correction selector rules after current input. All six development checks passed.
Local validation passes 225 tests, Biome/ESLint, type checking and production build.
Its full regression scored 57/60, held-out 10/12, dates 11/12 and privacy 8/8;
no paid V14 test followed. Retain these failures without changing goldens.

For correctness-first evaluation, restore the earlier qualifying V11 prompt,
examples and subscription tests. The restored prompt has previously passed
59/60 overall, dates 12/12, held-out 11/12 and privacy 8/8. Its completed live
regional responses were all correct. The newer candidates are preserved in Git,
rather than combined into an unvalidated prompt.

The staging evaluator and runner gained an explicit `synthetic_correctness` purpose. It uses a 30-second generation cutoff only with the fixed reviewed
synthetic mode. Other modes reject it before dispatch; default calls retain
five seconds. Reports label their purpose and deadline, and the client checks
those labels. Cancellation, monotonic timing enforcement, bounded metadata,
routing verification, token limits, zero SDK retries and spending reservations
remain unchanged. This does not establish production deadline reliability.

The final evaluator passes **226 tests**, Biome/ESLint, type checking and a
production build. Tests retain the original blocked-timer five-second check,
score a valid response beyond five seconds under the opt-in allowance, reject
invalid/unbounded purposes, and prove the endpoint rejects the longer allowance
outside synthetic mode before any model dispatch.

The frozen subscription regression of restored V11 scored **58/60**, held-out
**11/12**, dates **12/12**, privacy **8/8**, with valid schemas throughout and
no observed tool activity. Extraction before the unchanged interpreter scored
52/60, with six existing normalizations. This passes correctness gates, rather
than proving hosted routing, timing or production privacy. Frozen hashes:

- Prompt: `a20411850e43b65602da6d7ee973772e73718527d9c8e7df3288d7735823ff62`
- Pipeline: `d619433feb86fe6603b48e3484358d65f2fc88a8806a1847ac9f1d2ef2fd0c80`
- Corpus: `962a1af2ba29d60cf3a16d6df1a2891d0d2c6713a0d852b41731dddfbf8caadd`

Historical runner invocation, preserved for reproduction of this disabled synthetic harness: `--purpose=synthetic_correctness` required `--mode=synthetic_hobby` and a passing three-case smoke before the frozen full run. This command is not authorization for new paid calls; current budget/policy gates apply. Credentials remain in ignored environment configuration, never in command arguments or reports:

```sh
pnpm nlu:eval -- --live --gateway=vercel --mode=synthetic_hobby \
  --purpose=synthetic_correctness --models=openai/gpt-6-luna \
  --cases=shopping-01,memories-01,dates-01 --passes=1
```

The historical full run used `--cases=all` after smoke passed. The runner retained reservations and refused dispatch beyond the cumulative cap.

## Final live correctness acceptance

Successful deployment `8e052702-01ea-4fc9-9b09-6572b95d4647` contains source commit
`b7ace59` and the frozen pipeline above. An authenticated non-generative preflight preceded the three development cases and the single full-corpus run.

| Gate | Full hosted Luna low result |
| --- | --- |
| Three-case smoke | 3/3 correct; schemas/routes verified |
| Full coverage / structural accuracy | 60/60 evaluated; 58/60 correct (96.67%) |
| Held-out | 11/12 (91.67%); meets the 11/12 minimum |
| Dates | 12/12 |
| Privacy | 8/8 |
| Schema / model completion | 58/58; two other cases refused locally as expected |
| Routing | Every dispatched call verified as managed OpenAI |
| Synthetic 30-second cutoff | No timeouts or failed model calls |
| Production latency | Deferred; p50 3,227 ms, p95 5,195 ms; four completions exceeded five seconds |

All hard correctness, coverage and routing gates pass. The report selects
`openai/gpt-6-luna`. Model settings remain low reasoning and a 4,096 output-token
limit, with no repair, retries, tools or fallback. This is a qualifying screened
candidate, rather than proof it beats every approved model: the cheaper
challengers were stopped at failed smoke and the original complete two-model
comparison remains incomplete. Do not spend more merely to improve a passing score.

Two structural errors remain. The development correction omitted an explicit
matching memory ID even though validation resolved it; strict scoring still
counts it wrong. The other is blind held-out regression evidence and was not
inspected. Neither affects the all-correct privacy/date slices. These are follow-up
quality work, rather than evidence of perfect accuracy. Any prompt change must
undergo fresh frozen validation.

Model-specific prompting follows the [official GPT-4.1 guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide).
Full literal transcripts and visible context remain intact; the final rules are
fixed instructions, rather than inferred intent or rewritten input.

## Spending, privacy and closure

The regional round consumed USD 0.02176630; the final correctness smoke and full
run consumed **USD 0.01426724** (full run USD 0.0129348). Total credit decrease
this investigation is USD 0.03603354, from USD 24.92349108 to USD 24.88745754.
Vercel reports total account usage USD 0.11254246. Conservative cumulative
testing charges are **USD 0.277306460**, leaving **USD 0.222693540** under the
USD 0.50 cap. Unknown-cost earlier timeouts retain their full reservations.
All 164 starting entries and all 228 entries before the final correctness test
remain unchanged; the final ledger has 289 entries. SHA-256:
`efeea19451ce7dda99191ce15a77877f17fd59d81e29777b827d69aa26850b0e`.

All inference used the fixed synthetic corpus, OpenAI-only managed routing,
no-training and `store:false`. No family data was sent. Cloudflare remains an
explicit unused spike alternative. Founding-household runtime calls require
S-VGW and the household acknowledgement under [ADR-017](../../adr/adr-017.md); users
outside the founding household require the production ZDR gate. Synthetic model
selection does not grant runtime approval.

The evaluator was disabled, its allowlist cleared, and authenticated
POST verified as HTTP 404 `evaluation_disabled`. Successful disabled deployment
`a0ca340e-528a-4881-b645-6e33b85ae7c2` runs one replica in Singapore.

[Content-free evidence](../../../spikes/s1/evals/results/live-acceptance-2026-10-08.json)
records all failures and gates. Synthetic live correctness selection is complete within that stated scope; it does not establish production deadline reliability or independent/shadow validation. The later restricted Gateway closure is recorded in [verification](08-s3-gateway-verification.md#vgw-closure). New Home, policy, cost, media and application release gates are owned by the [current plan](../../plans/implementation-plan.md); no historical comparison, fallback or classifier work sequence remains active.
