# Research Overview

Findings reconciled2026-10-10. Research supports decisions; it is not an alternative implementation schedule. [ADRs](../adr/README.md) state current choices and [one plan](../plans/implementation-plan.md) owns work. Dated reports retain their original testing limits.

## Voice and generative UI comparison

| Candidate | Fit and evidence | Current disposition |
|---|---|---|
| Pipecat Python + Sarvam streaming | Released Sarvam processors, transport abstraction and interruption pipeline; explicit text enables authorized application actions | Selected for P0; production/mobile/quality/cost unvalidated |
| LiveKit Agents + Sarvam | Alternative media/runtime ecosystem; compatibility must be checked per language and release | Comparison candidate if P1 transport gate needs it; not an additional implementation path |
| Direct browser REST clips | Existing harness proves scoped capture/PCM playback and provider timings | Retain historical evidence; continuing conversation replaces the clip-only product specification |
| End-to-end speech model | May reduce plumbing but would need auditable action/evidence integration and eligible multilingual/cost proof | Not selected |
| AI SDK + json-render | Typed text/UI stream, schema catalogue and app-owned components | Selected for P0/P2 |
| A2UI / AG-UI | Declarative UI/protocol reference ideas; AG-UI is an event protocol rather than the renderer itself | Supporting research, no mandatory protocol migration |
| Model-generated HTML/code | Cannot establish trusted actions, safe components or stable focus | Rejected for the Home runtime |

## Released integration facts

Pipecat1.11.0 explicitly added Saaras v4 realtime support. Sarvam's older Pipecat production guide describes a v3 lock; its configuration must not override newer release-specific capability. Pin and test a compatible released processor/client in P0. [Release](https://github.com/pipecat-ai/pipecat/releases/tag/v1.11.0), [older guide](https://docs.sarvam.ai/api/integration/pipecat-production-guide).

Sarvam documents realtime transcription with provisional/final output and language/codemix settings. Nilumi evaluates English/Tamil/Tanglish and uses final recognized input for writes. Pipecat manages media/endpointing; TypeScript owns turns/actions. [Realtime reference](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/realtime-streaming).

SmallWebRTC fits local/self-hosted prototypes. Production requires verified media reachability and process/session management or an approved managed transport. A local bot runner is not a production dispatcher. [Transport](https://docs.pipecat.ai/client/concepts/choosing-a-transport), [deployment](https://docs.pipecat.ai/pipecat/deployment/overview).

json-render defines a constrained catalogue with application-owned implementations and actions. Its AI SDK integration separates text and presentation parts; Nilumi consumes them in Home rather than requiring a chat feed. Schema validity does not establish business authorization. [Catalogue](https://json-render.dev/docs/catalog), [integration](https://json-render.dev/docs/ai-sdk).

## Evidence limits and operating questions

Ritu remains the selected voice from S4; full-turn continuous latency and Tamil/Tanglish recognition have not been established. Existing negative Gateway probes remain failed while restricted pilot controls/quotas have scoped acceptance. New streaming sessions require cost reconciliation, privacy review and both-phone tests. See the [gate register](../plans/implementation-plan.md#validation-register), [S4 evidence](../validation/s4/25-s4-v4-both-phone-analysis.md), [Gateway evidence](../validation/s3/08-s3-gateway-verification.md).

Pricing now projects continuous sessions in [Tech Stack](../core/03-tech-stack.md#5-continuous-session-cost-model). Old short-clip forecasts remain historical. No new account/provider setting or paid call was made for this revision.

## Dated supporting findings

[Latency research](19-s4-sarvam-latency-research.md), [UI/platform source review](30-ui-platform-research.md) and [reference-project analysis](product-analysis-summary.md) preserve context without active build roadmaps. Processor approvals remain in the scoped [provider record](../../spikes/s1/config/providers.md).

## Dated finding: 5. Assistant name, wake word and domain

Historical source observations from October6–8, retained as evidence rather than current instructions.



Criteria: warm, trustworthy and calm; easy for Indian-English and Tamil speakers *and* young kids; 2–3 syllables; distinctive as a wake word (uncommon phoneme sequence, not an everyday English/Tamil word or common given name, not confusable with Alexa/Siri/Google/Gemini); low trademark conflict; available domains. Twenty-five names were screened.

### 5.1 Shortlist
| Rank | Name | Meaning / sound | Wake-word fit | Conflict notes |
|---:|---|---|---|---|
| **1** | **Nilumi** | Coined from Tamil *nila* ("moon") + light; `NI-lu-mi` / நிலுமி | Excellent: "Hey Nilumi" = 4 syllables, clear `n-l-m` consonants, calm | No AI/app conflict found; `.com` registered |
| 2 | **Aayuli** | Sanskrit/Tamil *ayu/aayul* ("life, longevity"); `AA-yu-li` | Good; vowel-heavy, could blur with "Hey Julie" if rushed | Only a minor seller match; **all domains free** |
| 3 | Kuralo | Tamil *kural* ("voice"); `ku-RA-lo` | Strong `k-r-l` consonants | `.com` registered |
| 4 | Kivani | Hints at *vani* ("speech"); `ki-VA-ni` | Good | A hotel-software company uses the name |
| 5 | Nenavo | Echoes Tamil *ninaivu* ("memory"); `ne-NA-vo` | Good | `.com` registered |

Avoid: Soliya and Meyva (existing apps), Kanivo (`.app` taken), Aarilo (close to Airalo/Arlo).

### 5.2 Domain availability (RDAP + DNS, 6 Oct 2026)
`404/NX` = registry RDAP 404 + DNS NXDOMAIN (likely unregistered; a registrar may still price it as premium). `200/NS` = registered.

| Name | `.com` | `.in` | `.app` | `.family` | `get…com` / `hey…com` / `…home.com` |
|---|---|---|---|---|---|
| **Nilumi** | 200/NS | **404/NX** | **404/NX** | 404/NX | all 404/NX |
| **Aayuli** | **404/NX** | 404/NX | 404/NX | 404/NX | all 404/NX |
| Kuralo, Kivani, Nenavo, Ninavo, Niveli, Kivilo, Aarilo | 200/NS | 404/NX | 404/NX | 404/NX | all 404/NX |
| Kanivo | 200/NS | 404/NX | 200/NS | 404/NX | all 404/NX |

### 5.3 Final choice

The shortlist favored Nilumi's clear `n-l-m` consonants and calm sound. Naming and future wake-engine considerations are recorded in [ADR-028](../adr/adr-028.md); the domain/origin prerequisite is in [ADR-016](../adr/adr-016.md).

**Dated findings (6 Oct 2026):** `.in` was indicatively ₹575–899/year at Indian registrars (+GST where not included). The `.app` analysis remains research evidence only. Porcupine's free tier reportedly ended in mid-2026, so it was treated as a licensed option. No domain or trademark was registered during research; availability/conflict screening is not a formal trademark clearance.

---

## Dated finding: 10. Authentication

Historical source observations from October6–8, retained as evidence rather than current instructions.



**Owner's challenge:** are passkeys necessary, do they help a household app, and is there something simpler with the same goals?

### 10.1 Options
| Option | First sign-in on the iPhone home-screen app | New device / lost phone | Recovery without the other adult | Verdict |
|---|---|---|---|---|
| Passkeys + recovery codes (baseline) | Needs the custom domain first; standalone Face ID reports are mixed | Re-enrol via token or printed code | Printed codes in a shared home | Overkill |
| **Email code typed in the app** | Never leaves the app, so iOS link problems don't apply | Same flow | **Yes, self-service** | **Chosen** |
| Google sign-in | Redirect works; **popup flows (One Tap) fail** in iOS standalone | Works | Google's process | More moving parts than email codes |
| Magic links | **Broken on iPhone:** the link opens Safari, not the installed app | — | — | Rejected (also recent critical advisories in that plugin) |
| Invite link / QR | **On iPhone, scanning opens Safari**, so the session lands outside the installed app | — | — | Rejected as the sign-in path |
| Password | Works | Needs reset by email anyway | Via reset | No benefit over email codes |
| SMS / WhatsApp OTP | Works | Same | Yes | SMS needs TRAI DLT registration; WhatsApp needs Meta business verification |

### 10.2 Findings and limits

**Finding:** typed email codes can cover first sign-in, new-device sign-in and recovery without leaving the installed iPhone app. [ADR-023](../adr/adr-023.md) records the accepted flow and rejected alternatives. The required account/session behavior is defined in [Architecture §15.5](../core/02-architecture.md#151-identity); Better Auth's version floor/plugins and Resend/SMTP choices are in [Tech §3](../core/03-tech-stack.md#4-planned-data-and-application-services).

**Evidence and limits:** WebKit exempts server-set cookies in Home Screen apps from the 7-day script-storage cap, but an open WebKit bug can still reset sessions. This is why the design includes email-code re-sign-in with queued offline changes preserved. The Better Auth version floor reflects the reviewed 2026 magic-link, passkey, device-authorization and Drizzle rate-limit advisories. Whoever controls a member's mailbox can sign in as that member; both email accounts need two-factor sign-in.

The review's removal of primary passkeys and additional recovery/enrolment mechanisms is recorded in [ADR-023](../adr/adr-023.md). The domain prerequisite remains [ADR-016](../adr/adr-016.md); mandatory biometric access to Vault originals remains a deferred Vault decision.

---

## Dated finding: Consumer landscape (mostly secondary)

Historical source observations from October6–8, retained as evidence rather than current instructions.



| Category | Examples | Relevant behaviour | Gap Nilumi can use |
|---|---|---|---|
| Large assistants | Alexa+ India (reported launch 16 Sep 2026, Hindi/Hinglish, ₹2,000/month standalone or with Prime); Gemini for Home and Gemini Daily Brief (18+, paid tier, personal accounts); ChatGPT (Pulse reportedly folded into Scheduled Tasks in mid-2026); iOS 27 Siri personal context; Microsoft Copilot (Group Chat reportedly retired Aug 2026; only the Family-plan owner gets AI); Meta AI in WhatsApp groups | Memory, shared lists, daily briefs and some actions | Household data is pooled per account; no per-member privacy inside a shared home; remembered facts have no visible evidence; Tamil support unconfirmed |
| Family organisers | Cozi, FamilyWall, OurHome, Maple, Skylight, Hearth, TimeTree, Any.do (WhatsApp bot) | Shared calendars, lists and chores | Little or no AI; no memory with evidence or correction |
| AI chief-of-staff startups | Ohai.ai (US$6M seed, about US$30/month), Nori (launched Jan 2026, US$5–8/month, hub US/Canada only), Milo (shut down 2024) | Household memory and coordination | US-focused; no Indian languages; monetisation is hard |
| India | WhatsApp groups, JioHome, Krutrim/Kruti, DigiLocker, bill apps (CRED, Paytm, NeverDue, Remyndar, PolicyNest), domestic-help apps (Homyo, BHS) | Coordination, transactions, document storage and single-purpose reminders | Nothing combines domestic help, bills/renewals, festivals and family memory; DigiLocker stores documents but does not answer questions about them |

Repeated pains: the mental load carried mostly by mothers, overloaded WhatsApp
groups, shared-list sync failures, reminders reaching the wrong person, and
shared-account privacy. The [FTC/DOJ 2023 Alexa action](https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-doj-charge-amazon-violating-childrens-privacy-law-keeping-kids-alexa-voice-recordings-forever)
over children's voice data is a primary example.

Daily briefs converge on one pattern: one digest a day, "needs attention now"
versus "looking ahead", short cards, and single-tap actions. The reported
weakness of Pulse was generic cards when context was thin. Skylight's
always-visible display is valued because it needs no push. Indian family
digital subscriptions anchor at about ₹130–300/month; this is directional only.

**Finding:** a daily digest alone is becoming a commodity. Nilumi's credible
differences are:
- evidence-linked household memory with correction and undo
- per-member privacy inside one household
- India household follow-through (domestic help, bills and renewals, festivals)
- Tamil and Tanglish
- Vault question-answering (deferred)
- working alongside WhatsApp rather than inside it

Do not compete on smart-home control, general chat, media, large-scale
bookings or dedicated hardware.

## Dated finding: Cloudflare AI Gateway (primary docs, checked 8 Oct 2026)

Historical source observations from October6–8, retained as evidence rather than current instructions.



**Billing.** The [pricing reference](https://developers.cloudflare.com/ai-gateway/reference/pricing/)
states that core features are free. [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
(page updated 30 Sep 2026):
- adds a 5% fee on credit purchases and passes provider rates through
- warns that the balance can occasionally go negative and is then charged monthly, so credits are not a hard cap

**Credentials.** Requests resolve credentials in this order:
1. a key on the request
2. the BYOK `default` alias
3. Unified Billing

"Require provider credentials" (`byok_only: true`) or `cf-aig-no-wholesale`
stops the fallback to Unified Billing.

**Zero data retention.** The same page states:
- ZDR "routes Unified Billing traffic through provider endpoints that do not retain prompts or responses".
- ZDR applies only to Cloudflare-managed credentials, not BYOK.
- The model catalog marks which models support ZDR.
- ZDR does not control gateway logging.
- The documentation pages fetched do not state how to turn ZDR on. A third-party source names a gateway `zdr` setting and a `cf-aig-zdr` header; this was not verified because Cloudflare was not chosen.

**Logging.** [Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)
can be disabled per gateway, or per request with `cf-aig-collect-log: false`.
`cf-aig-collect-log-payload: false` keeps metadata only. Gateways created on or
after 24 Sep 2026 use Workers Logs pricing and retention.

**Spend limits.** [Spend limits](https://developers.cloudflare.com/ai-gateway/features/spend-limits/)
set dollar budgets by model, provider or metadata. They return HTTP 429 and
are eventually consistent.

**Caching.** Caching can be overridden per request.

**AI SDK.** Integration uses the `ai-gateway-provider` package; its
compatibility with `ai` 7 is unverified.

This updates the [October 7 comparison](../validation/s3/08-s3-gateway-verification.md#cloudflare-and-self-hosting),
which recorded upstream ZDR as unverified. **Not chosen:** ZDR covers only
catalog-marked models, credits carry a 5% fee, and Cloudflare would add a
processor. Nilumi stays on Vercel ([ADR-017](../adr/adr-017.md)).

### Vercel AI Gateway credits and controls (checked 8 Oct 2026)

These primary pages were fetched on 8 October; dates are the pages' "last
updated" values.

**[Pricing](https://vercel.com/docs/ai-gateway/pricing)** (updated 8 Sep)
- Tokens are charged at provider list price, with no markup or platform fee.
- The customer pays payment processing fees.
- Buying credits moves the team to the paid tier: the US$5 monthly free credit stops and rate limits rise.
- Auto top-up is off by default.
- Doc 08's dashboard inspection recorded that purchased credits expire one year after purchase.

**[Zero data retention](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr)** (updated 22 Sep)
- ZDR is available only on Pro and Enterprise.
- Per-request ZDR (`zeroDataRetention: true`) has no surcharge. Team-wide ZDR costs US$0.10 per 1,000 successful requests that report usage.
- Vercel keeps no prompts or outputs. Providers with an unknown stance count as non-ZDR, and BYOK keys are skipped unless marked ZDR-compliant.

**[Disallow prompt training](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training)** (updated 10 Sep)
- The flag is free to all users and set per request.
- "By default, AI Gateway does not route based on the training data policy."
- It applies to fallbacks.
- It returns 400 `no_providers_available` when no compliant provider exists.
- It is not enforced for BYOK, except on failover to system credentials. Providers with an unknown stance are assumed to train.

**[Provider filtering and ordering](https://vercel.com/docs/ai-gateway/models-and-providers/provider-filtering-and-ordering)** (updated 11 Sep)
- `order` sets a preference only: providers not listed "are still available but will only be used after the specified providers".
- `only` restricts routing to the listed providers.

**[Budgets](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets)** (updated 10 Sep)
- Budgets can be set per team, project, API key or user.
- They refresh monthly at UTC midnight on the 1st and are checked before each request.
- Alerts at 50, 75 and 100% fire for custom budgets only.
- A rejection may surface in AI SDK 7 as `GatewayInternalServerError`.
- Project budgets apply only to OIDC tokens from that project's deployments, and API-key spend is never attributed to a project. BYOK spend has no budget.
- **Re-checked October 8, after the credit purchase** ([budgets](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets), [pricing](https://vercel.com/docs/ai-gateway/pricing), pricing page updated 8 Sep):
  - The refresh period is `daily`, `weekly`, `monthly` or `none`; `none` is cumulative and never resets, which suits a fixed evaluation allowance.
  - Budgets are soft caps. The request that crosses the limit completes, and later requests get HTTP 402 `quota_for_entity_exceeded`.
  - Editing a budget keeps the spend already counted in the period; deleting and re-creating it starts from zero.
  - API keys are attributed to the team or a member. Alerts go to the key's creator, at most once per threshold per period.
  - No low-balance alert is documented, only auto top-up, which is off by default. Nilumi therefore relies on a monthly owner check.

**[Fair use](https://vercel.com/docs/limits/fair-use-guidelines)** (updated 14 Sep)
- Hobby is limited to non-commercial personal use.

**Implications for Nilumi**
- Purchased credits fund the founding household's pilot on Hobby.
- No-training, `only` routing and `store: false` where supported are set by one wrapper on every call.
- Budgets go on the Railway runtime's API key, not a project.
- ZDR requires Pro or Enterprise, or another route, at the production privacy gate ([ADR-017](../adr/adr-017.md)).
