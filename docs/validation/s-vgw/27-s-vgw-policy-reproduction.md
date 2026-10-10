# S-VGW policy rejection reproduction — October 10, 2026

**Status:** Owner requested keeping this report local; not sent to Vercel. No household data,
credentials, provider responses or raw error messages are included.

## Expected and observed result

Vercel's [no-training documentation](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training)
says a model with no compliant providers fails with `no_providers_available`
(the published example has HTTP 400). The live public catalog classifies
`arcee-ai/trinity-large-thinking` as `no_training: none`. The
[model's official reference](https://vercel.com/ai-gateway/models/trinity-large-thinking)
documents `arcee-ai` as its provider slug.

Four independent, isolated-key synthetic rounds returned **HTTP 500 without the
recognized policy code**, rather than an explicit policy rejection. Two used
Arcee; two used `inference-net/schematron-v2-small`, also classified
`no_training: none`, with `only: ['inference-net']`. The last round used
`streamText` instead of `generateText` through the same pinned SDK and wrapper.
Safe transport diagnostics captured HTTP 500 before SDK response processing.
Vercel inference logs agree and report zero metered cost for all negative calls.
This is an unresolved gateway/API-path failure; the precise cause is unknown.

| Field | Value |
| --- | --- |
| AI SDK | `ai@7.0.130` |
| Gateway SDK | `@ai-sdk/gateway@4.0.106` |
| Runtime | Node.js 24.21.0 |
| Model | `arcee-ai/trinity-large-thinking` |
| Provider allowlist | `only: ['arcee-ai']` |
| Privacy filter | `disallowPromptTraining: true` |
| Authentication | Team-attributed Gateway key; managed credentials; no configured BYOK |
| Account | Hobby with purchased credits, auto-reload disabled |
| Prompt | Fixed synthetic fixture: `Reply with the single word moon.` |
| Output bound | 32 tokens |
| SDK retries | `maxRetries: 0`; no application retry or fallback |
| First request | `gw_152a44e1-89d3-4adf-9077-25c890ae5b86`, 2026-10-10 05:42:17 UTC |
| Second request | `gw_87ff6341-da05-4b8f-9b10-becb89252eea`, 2026-10-10 06:06:34 UTC |
| Schematron non-streaming | `gw_e424525f-8f56-496d-859d-d0b1cc968565`, 2026-10-10 06:24:48 UTC |
| Schematron streaming | `gw_56f7fdd9-f7fc-40ee-a550-8bffb897abc7`, 2026-10-10 06:33:59 UTC |
| SDK transport | Gateway v4 `/language-model`; `ai-language-model-streaming: false` or `true`, respectively |
| Actual result | HTTP 500, explicit policy error unavailable, zero metered cost in gateway logs |

All four rounds' positive controls succeeded through the same wrapper with managed
OpenAI, the no-training flag and one provider attempt: `openai/gpt-6-luna` chat
and `openai/text-embedding-3-small` embedding. The last three embedding results had
768 observed dimensions. All temporary keys were deleted and their previously
successful credentials returned HTTP 401 on `GET /v1/credits`; local credentials
were removed.

## Minimal reproduction shape

This snippet describes the failing synthetic request. Running it requires a
new authorized isolated key and durable reservation; neither a revoked key nor
the runtime key should be used. It is not an additional authorized live probe.

```ts
import { createGateway } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const gateway = createGateway({ apiKey: process.env.VGW_CANARY_API_KEY });
await generateText({
  model: gateway('arcee-ai/trinity-large-thinking'),
  prompt: 'Reply with the single word moon.',
  maxOutputTokens: 32,
  maxRetries: 0,
  abortSignal: AbortSignal.timeout(15_000),
  providerOptions: {
    gateway: {
      only: ['arcee-ai'],
      disallowPromptTraining: true,
    },
  },
});
```

## Resolution needed

Explain why the pinned SDK path returns HTTP 500 instead of the documented
policy rejection, and identify a supported way to obtain a machine-readable
`no_providers_available` rejection with the filter and allowlist unchanged.
The founding-household release remains blocked pending a verified policy
rejection and the separate exact live quota rejection.

Evidence: [first round](../../../spikes/s1/evals/results/vgw-live-controls-2026-10-10.json),
[second round and aggregate accounting](../../../spikes/s1/evals/results/vgw-followup-controls-2026-10-10.json),
[Schematron non-streaming](../../../spikes/s1/evals/results/vgw-closure-controls-2026-10-10.json),
[Schematron streaming](../../../spikes/s1/evals/results/vgw-stream-controls-2026-10-10.json),
[approved completion sequence](../../plans/26-s-vgw-completion-plan.md).

## Proposed support message

Subject: AI Gateway v4 no-training rejection returns HTTP 500 on two ineligible models

We are validating the documented `disallowPromptTraining: true` rejection using
`ai@7.0.130`, `@ai-sdk/gateway@4.0.106`, Node.js 24.21.0 and purchased credits on
Hobby. Fixed synthetic input only; Team-attributed isolated keys, managed
credentials, no BYOK, `maxRetries: 0`, maximum 32 output tokens, and provider
allowlists unchanged. Expected `no_providers_available` per your documentation.

`arcee-ai/trinity-large-thinking` with `only: ['arcee-ai']` returned HTTP 500 twice:
`gw_152a44e1-89d3-4adf-9077-25c890ae5b86` (05:42:17 UTC) and
`gw_87ff6341-da05-4b8f-9b10-becb89252eea` (06:06:34 UTC).
`inference-net/schematron-v2-small` with `only: ['inference-net']` returned HTTP 500
through both non-streaming and streaming SDK paths:
`gw_e424525f-8f56-496d-859d-d0b1cc968565` (06:24:48 UTC) and
`gw_56f7fdd9-f7fc-40ee-a550-8bffb897abc7` (06:33:59 UTC). All dates October 10,
2026. Public catalog classifies both models `no_training: none`.

Sanitized transport capture contains no recognized policy code. Dashboard logs
confirm HTTP 500 and zero metered cost. Positive OpenAI chat/embedding controls
passed on each key. All used test keys have since been revoked and verified 401.

Please identify why the v4 SDK path returns 500 and the supported way to obtain
the documented machine-readable policy rejection while retaining the privacy
filter and allowlist. Our family-call release gate remains closed. No credentials,
household content, raw responses or raw errors are included in this report.
