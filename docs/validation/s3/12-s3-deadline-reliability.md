# S3 deadline reliability investigation

Deadline enforcement and transport diagnostics are implemented in `242d751`.
The wire schema is smaller with exactly equivalent constraints. **Live deadline
reliability is still unresolved:** the three-case Luna low smoke scored 2/3,
including one five-second timeout. Paid testing stopped; no full hosted run or
model selection followed. The evaluator is disabled and verified.

## Investigation and changes

The installed Gateway SDK (`@ai-sdk/gateway` 4.0.106) sends one generation request
without fetching a model catalog. Recreating its provider is not an additional
catalog round trip. Eight non-generative lookups of the slowest completed V11
calls reported generation times of 3,642–4,479 ms, with approximately 350–525 ms
between those values and locally measured completion. This deliberately slow
sample cannot establish overall percentiles or attribute the difference to a
particular network hop. Existing successful calls already showed cache reuse.

The previous wire schema inlined repeated structures. Zod references shrink it
from **22,368 to 9,742 bytes**, a **56.4% reduction**. Remove only Zod's redundant
single-branch `allOf` wrappers to retain the supported provider subset. Expanding
every reference reproduces the previous schema exactly, including nullability,
required fields, bounds and all 18 command branches. A regression test pins its
canonical expanded fingerprint:
`81c44ccba9703586225bd8253c8e01cdb9b99aec4fdd646b69223d2ffa99f592`.
The parsed contract stays `s3-v1`; the wire representation is `s3-wire-v2`.

[Official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs)
supports schema references. Its [latency guidance](https://developers.openai.com/api/docs/guides/latency-optimization)
identifies output generation as a major cost and cautions that reducing input
often provides only modest latency gains. This optimization reduces request size;
it does not promise a five-second response or change output requirements.

Generation latency now measures the complete adapter operation using a monotonic
clock. A completion at or beyond five seconds fails even if synchronous work
delays the abort timer or the adapter reports a narrower duration. Cancellation
listeners are registered before dispatch; completed calls release their timers
and listeners. The separate one-second metadata allowance now aborts the actual
lookup and releases its waiting resources. It cannot extend the NLU deadline.

Each request records numeric counts, request-start time, response-header time,
status and completion time. Timeout rows retain their latest detached snapshot.
No URLs, headers, prompts, bodies or provider error strings enter this telemetry.
Controls, prompt, corpus, goldens, interpreter, scorer, model options, output
limit, no-retry rule and spending caps remain unchanged.

## Frozen validation

Prompt V11 is unchanged, SHA-256:
`a20411850e43b65602da6d7ee973772e73718527d9c8e7df3288d7735823ff62`.
The revised pipeline was frozen before testing, SHA-256:
`444ce3e9fbe5279f6dbb330b75177fc9e922107cb7721e57cb5cb47cdf70e353`.
The original holdout is repeated regression evidence. No held-out transcript,
expected answer, case ID or raw output was inspected for this revision.

Local validation passed **223 tests**, Biome/ESLint, type checking and a production
build. Tests cover exact expanded schema equivalence, delayed timer delivery,
synchronous cancellation, metadata cancellation and content-free timing snapshots.

| Validation | Result |
| --- | --- |
| Frozen subscription, all 60 | 59/60; held-out 11/12; dates 12/12; privacy 8/8 |
| Vercel Luna low, three development cases | 2/3; two valid schemas and verified managed OpenAI routes; one timeout |
| Full hosted comparison | Not run: failed smoke stop rule |

The subscription run observed no tool activity and passed the existing synthetic
correctness gate. It scored 56/60 before the unchanged interpreter and 59/60
afterward, with three existing normalizations. These are correctness results;
they do not establish hosted timing, routing or production privacy.

The timed-out shopping call began its request after **9.3 ms** and had received
no response headers by **5,003 ms**. The other two cases completed in **3,661 ms**
and **4,543 ms**, both correct. They began their requests in about two milliseconds
and spent only a few milliseconds between headers and SDK completion. Each call
made one request. The timeout therefore occurred while awaiting the remote
response, rather than in local post-response parsing. These measurements cannot
separate network delay, upstream queuing, schema preparation and generation.
No repeated smoke, deadline extension, repair, fallback or new model was used.
The tiny sample does not establish a speed improvement or regression.

## Accounting and shutdown

Vercel balance decreased from **USD 24.92484752 to USD 24.92349108**:
**USD 0.00135644** spent this round, including any upstream charge for the aborted
call. The unknown-cost timeout retains its full reservation. Conservative
cumulative charges are **USD 0.210533395**, leaving **USD 0.289466605** under the
unchanged USD 0.50 testing cap. All 161 prior ledger entries are preserved without
modification; the ledger now has 164 entries. SHA-256:
`0038630def5ecf064c4605d20f37708a20a828406c93af0aba76aa5cab78d313`.

Enabled deployment `0aa11b19-b917-46c7-8830-57e5f8e9a7aa` was replaced by successful
disabled deployment `4ba09cad-ed6e-44a5-9ada-d7273c754d45`. Enablement is false,
the evaluator allowlist is empty, and an authenticated request returns HTTP 404
`evaluation_disabled`. No family data was processed. Cloudflare remains an
explicit future spike option and was not called or funded in this round.

[Content-free evidence](../../../spikes/s1/evals/results/deadline-wire-v2-validation-2026-10-08.json)
retains the smoke failure, baseline observations, frozen subscription summary,
accounting and shutdown checks. The safeguards and schema optimization are
delivered; **S3 acceptance and production model selection remain pending**.
A further live comparison needs an intervention that reduces time awaiting the
remote response, followed by a passing smoke under the same gates and cap.
