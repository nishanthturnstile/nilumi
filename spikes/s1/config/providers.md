# Verification route records

Checked October 10, 2026. Positive synthetic chat/embedding routing and canary
revocation are verified. Exact live quota rejection passed. S-VGW is accepted for
the restricted founding pilot under ADR-052: documentary storage evidence and a
negative-test exception with primary-only routing and a local catalog guard.
Family traffic remains gated by deployed controls and explicit acknowledgement.

| Role/model | Approved provider | No training | Published retention | Storage | Fallback |
| --- | --- | --- | --- | --- | --- |
| NLU / answer: `openai/gpt-6-luna` | Gateway-managed OpenAI only | Public catalog `all`; `disallowPromptTraining:true`; live chat receipt confirms no-training, managed credentials and one OpenAI attempt | OpenAI default abuse-monitoring retention up to 30 days, with published legal/safety exceptions. Generation application state is controlled by `store`; prompt caching can retain encrypted tensors up to 24 hours independently. No pilot ZDR claim. | `providerOptions.openai.store:false`; pinned `ai` 7.0.130 / gateway 4.0.106 serialization verified. Luna's published gateway contract forwards options in the provider namespace; AI SDK documents OpenAI `store`. Documentary chain established; no direct downstream request observation. | Disabled; no live challenger accepted |
| Embedding: `openai/text-embedding-3-small`, requested 768 dimensions | Gateway-managed OpenAI only | Catalog `all`; live embedding receipt confirms no-training, managed credentials and one OpenAI attempt | Published `/v1/embeddings` baseline: no training, abuse monitoring 30 days, no retained application state. No managed-account ZDR agreement is assumed. | Endpoint has no supported `store` field. Dimension option is serialized locally; live follow-up reports observed 768 dimensions in memory; vectors are not retained. | Disabled; use full-text/trigram if eligibility cannot pass |
| TTS: Sarvam `bulbul:v3`, en-IN | Direct Sarvam | S0 owner evidence green in Tech Stack §7 | Existing S0 retention/deletion evidence applies | Synthetic fixture text only in S4; no uploaded audio | ElevenLabs remains S0-gated |
| Quota-test workload only: `openai/gpt-5.5` | Gateway-managed OpenAI only | October 10 public catalog `all`; every request uses `disallowPromptTraining:true` and `only:[openai]`; require a managed no-training receipt | Same published OpenAI endpoint data controls; synthetic enumerated numbers only. No ZDR claim. | `openai.store:false`, `reasoningEffort:none`; base tier only; fixed 224-output-token limit and complete SDK payload <=512 UTF-8 bytes. Fresh catalog reservation is US$0.00928, limited to US$0.01. | Never enabled as a runtime role or fallback; isolated, revoked canary only |

The alternative negative-policy profile is `inference-net/schematron-v2-small`,
`only:[inference-net]`, with `disallowPromptTraining:true`. The October 10 public
catalog reports `no_training:none`; Vercel's model reference documents that exact
provider slug. This is a fixed synthetic rejection test, never an eligible family
route. A generic failure cannot pass it. Both Arcee rounds and both Schematron rounds (streaming and non-streaming)
returned HTTP 500 without an explicit rejection; all remain failed.

Sources checked October 10:

- [Vercel's exact Luna model contract](https://vercel.com/ai-gateway/models/gpt-6-luna#provider-options) documents provider options passing through under their provider namespace, with AI SDK v7 usage.
- [Gateway provider options](https://vercel.com/docs/ai-gateway/models-and-providers/provider-options) documents combining routing controls with provider options.
- [AI SDK OpenAI options](https://ai-sdk.dev/providers/ai-sdk-providers/openai) documents `openai.store` for supported text endpoints.
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) documents default no-training, abuse monitoring, endpoint state and prompt-cache retention. These are published defaults, not evidence of a special agreement for Vercel's managed account. `store:false` is not ZDR.
- [Gateway no-training](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training) and [embeddings](https://vercel.com/docs/ai-gateway/modalities/embeddings) define the request controls.
- [Live controls evidence](../evals/results/vgw-live-controls-2026-10-10.json) contains only permitted receipt, account, cost and shutdown metadata.
- [Vercel GPT-5.5 model contract](https://vercel.com/ai-gateway/models/gpt-5.5) documents the temporary quota model and provider-option forwarding.
- [Vercel Schematron V2 Small contract](https://vercel.com/ai-gateway/models/schematron-v2-small) documents the alternative negative model/provider pairing.

The wrapper and pinned SDK tests verify NLU/answer/embedding construction. The
live positive text probe covers the shared Luna route, not structured NLU
correctness or production integration. Its receipts cannot demonstrate remote
storage behavior. The forwarding row uses the published contract plus local
serialization; canary reports deliberately keep `providerForwardingVerified:false`
because they do not observe the downstream provider request. No privacy status
is promoted to active family use before deployed controls and explicit household
acknowledgement are complete. Before every family transport, the local catalog
guard requires an approved OpenAI role and no-training eligibility; the five-minute
cache expires closed if refresh fails. See the [final acceptance artifact](../evals/results/vgw-pilot-acceptance-2026-10-10.json).
