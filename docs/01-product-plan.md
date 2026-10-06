# 01 — Product Plan: Nilumi (MVP)

> **Status:** Revised after the October 2026 review (revision 2) · **Date:** October 2026 · Product name: **Nilumi** · Domain: **nilumi.in**
> **Related:** [02 Architecture](02-architecture.md) · [03 Tech Stack](03-tech-stack.md) · [04 Research & Decisions](04-research-and-decisions.md)

---

## 1. One line

**Nilumi is a private household assistant on both our phones. Say or type what matters, see exactly what it understood, and trust that it will remember, remind, and admit when it doesn't know.**

## 2. Problem

Household knowledge is scattered across WhatsApp chats, memory, paper warranty cards and sticky notes:

| Today | Pain |
|---|---|
| "When was the purifier serviced? Who's the plumber? When does the washing machine warranty end?" | Nobody remembers; searching chats takes minutes or fails |
| The shopping list is in one person's head or notes app | Items are forgotten at the store; duplicate purchases |
| "Remind me to renew the insurance next month" | Phone reminders are personal, not shared, and lack household context |
| Preferences (spice levels, kids' allergies, school details) | Known by one parent; the other has to ask |

Generic assistants (Google Assistant, Alexa, ChatGPT) don't hold **structured, private, correctable household memory with evidence**. They either forget, or remember opaquely.

## 3. Jobs to be done

1. "Remember this household fact **so either of us** can get it back later, worded differently."
2. "Keep **our** shopping list in sync, and let me use it at the shop even with poor signal."
3. "Remind me (or both of us) at the right time, **on my phone**."
4. "Show me what you know about X, and let me fix it when it's wrong."
5. "Keep my private notes private, even from my spouse."
6. "Never store secrets (PINs, OTPs, card numbers)."

## 4. Users and roles

| Who | Role | MVP? | Notes |
|---|---|---|---|
| **Nishanth** | `admin` + adult member | Yes | Builder; uses the admin and trace views |
| **Wife** | adult member; can also hold `admin` | Yes | **Her voluntary use is the primary success signal.** Involve her in picking use cases and the assistant's voice |
| **Kids** | `child` member (later) | Subjects only | Facts *about* kids (school, allergies, vaccination dates) are stored from day 1. Kids talking to it comes later (kid mode) |
| External people (plumber Ravi, Dr. Meena, cook) | **Entities**, not users | n/a | Stored as contacts and service providers |
| Grandparents / household help | Possible later users | No | May need Tamil, a limited role, or shared-list-only access |

Membership is invite-only: an admin creates each member profile and allowlists the sign-in email. Both adults can hold `admin`, but after an adult's first sign-in, no admin can change that adult's email or take over the account.

## 5. Goals, non-goals and success metrics

### 5.1 MVP goals
- A trustworthy **remember → retrieve → correct → forget** loop, by voice or text, from both phones.
- A **shared shopping list** that is fast, offline-tolerant and has realtime sync between phones, instant via server-sent events.
- **Tasks and reminders that actually fire** on the right person's phone.
- **Household vs private** memory that never leaks.
- An evidence trail for every answer and every stored fact.

### 5.2 Non-goals (MVP)
Smart-home device control · room speakers and the "Hey Nilumi" wake phrase (H2) · automatic speaker recognition · Tamil speech (designed for, not shipped) · proactive or autonomous behaviour beyond reminders · auto-capturing every sentence · documents/photos (designed for, first horizon H1 Family Records Vault) · financial or medical advice · access to banking, passwords or security systems · more than one household · native app stores.

### 5.3 Success metrics

**North star:** the number of interactions per week your wife starts **without being asked to test**.

| Category | Metric | Pre-pilot gate (eval sets) | Pilot target (real usage) |
|---|---|---|---|
| Memory write | Facts stored structurally correct (subject, predicate, value, visibility) | ≥ 90% (and on the held-out set) | ≥ 85% |
| Retrieval | Correct evidence in top 5 | ≥ 90% | n/a |
| Answers | Final answer correct (judged separately from retrieval) | ≥ 85% | ≥ 85% rated correct |
| Abstention | Says "I don't know" on unanswerable questions | ≥ 95% | Hallucinated answers ≤ 2% |
| **Privacy** | Private memory (or its existence) shown to the wrong member; secret stored | **0 (hard gate)** | **0** |
| Reminders | Dispatched within 60 s of the due time (S5 automated run of ≥ 200 occurrences on the worker) | **100%** | ≥ 99% dispatched on time; push **acceptance**, device **receipt** and user **acknowledgement** rates tracked separately (we can't guarantee delivery to a phone) |
| Latency | Release-to-card (writes/lists) p50 / p95 | ≤ 1.5 s / ≤ 3 s | Same |
| Latency | Release-to-first-audio (questions) p50 / p95 | ≤ 2.5 s / ≤ 4.5 s | Same |
| Value | Recurring use cases both adults use weekly | n/a | ≥ 3 |
| Cost | Total monthly run cost | n/a | ≤ ₹3,000; expected ≈ ₹1,400–2,700 |

## 6. Product principles (trust UX)

1. **Show, don't just say.** Nilumi shows *what I heard* (the transcript) and *what I did* (cards) on every voice turn. The screen is the main trust mechanism.
2. **Undo beats asking.** Clear writes are applied immediately and shown as a card with **Undo** and **Edit**. Ask only when something is genuinely ambiguous (unknown entity, ambiguous date, several matching memories), never on the basis of a vague "confidence". Two exceptions need an explicit tap: **health and allergy facts** (Confirm) and **forget** (it can't be undone).
3. **Unknown beats invented.** If there's no evidence, say so, and offer to remember it.
4. **Corrections are normal.** "That's wrong, it's April 15" works in the next turn without restating the subject.
5. **Private stays private, unless you explicitly share it.** "Remind me" and "my note" are private by default. Household facts are shared. Owner-only Share / Un-share makes a private memory visible to the other adult without giving them edit or forget rights. Visibility is visible on every card and can be toggled.
6. **Secrets are refused, not stored.** Not in memory, logs or traces.
7. **Faster than opening a notes app.** If capturing takes longer than typing a note, people stop using it.
8. **Match the input modality.** Voice in gets a short spoken reply plus the screen; text in gets a text-only reply. Speech confirms; the screen explains.

## 7. Experience overview (PWA)

| Tab | Purpose |
|---|---|
| **Talk** | Voice-first with Nilumi: the mic is primary, with a text box always available. Conversation thread with transcript bubbles and result cards (memory saved/updated/forgotten, list changes, tasks, answers with evidence chips). Voice-reply modes: auto default (voice in → spoken + screen; text in → text only), always, never |
| **Lists** | Shopping list (default) plus custom lists. Tap to tick off, swipe to remove, works offline, syncs in realtime between phones while open, and shows who added each item |
| **Tasks** | Upcoming and overdue tasks and reminders; mine / ours filter; done, snooze, reschedule |
| **Memory** | "What we know": online-only browse by entity (Appliances, People & contacts, Kids, Home, Vehicles, Preferences). Each entity page shows facts, history (X → Y), source ("you said on 5 Oct, 7:30 pm"), visibility badge, and owner-only Share / Un-share, Edit and Forget on cards. Search box |
| **Inbox** | Delivered reminders and anything that needs attention (pending clarifications, failed deliveries) |
| **Settings** | Profile, email and signed-in devices, optional Face ID step-up, notifications (incl. per-device health check), voice choice, quiet hours, privacy defaults and limits, export |
| **Admin** (Nishanth) | Turn traces, eval runs, costs, predicate registry, entity merge, backup status |

**Card anatomy (memory saved):**
`🧠 Saved · Washing machine — warranty expires — 15 Mar 2028 · 🏠 Household · [Undo] [Edit]`
with "heard: '…our washing machine warranty expires on March 15 2028'" underneath.

Cards always show one visibility badge: `🏠 Household`, `👥 Shared` or `🔒 Private`.

## 8. Core journeys and acceptance criteria

| # | Journey | Example | Acceptance criteria |
|---|---|---|---|
| J1 | **Store a fact** | "Remember that our washing machine warranty expires on March 15, 2028." | Correct subject, predicate and date (day precision); household visibility; transcript linked; card with Undo; retrievable with different wording |
| J2 | **Retrieve** | "When does the washer warranty end?" | Answer from evidence; evidence chip opens the source; ≤ 1 sentence spoken |
| J3 | **Correct** | "That's wrong, make it April 15." | Resolves "that" to the last memory in context; the old value is preserved in history; the new value is active; card shows X → Y |
| J4 | **Forget** | "Forget the washing machine warranty date." | Clarifies only if several match; household memories are redacted everywhere for both members ([Arch §8.6](02-architecture.md#86-forget-semantics)); a shared memory can be forgotten only by its owner; forget **can't be undone** (the card says so before confirming); later questions get "I don't know" |
| J5 | **Inspect** | "What do you remember about the water purifier?" | Lists active facts with dates and aliases; screen shows the entity page; spoken summary ≤ 3 items |
| J6 | **Unknown** | "Which year did we buy the purifier?" | "I don't have the purifier's purchase date." No inference from other facts; offers to remember |
| J7 | **Shopping list** | "Add detergent and two kilos of rice." | Two items with quantity/unit; duplicates merged; instant sync to the other phone through SSE while Lists is open; tick-off works offline at the store and syncs later |
| J8 | **Reminder** | "Remind us Sunday morning to check the tyre pressure." | "Sunday morning" → household default (09:00 IST, shown on card); targets both adults; dispatched on time to both phones (each person's quiet hours applied separately); an inbox entry exists even if a push is delayed; tap → done or snooze |
| J9 | **Multi-command** | "Add dishwashing liquid and remind me tomorrow evening to check the purifier." | Two cards; each succeeds or fails independently; failures never described as success |
| J10 | **Secret refused** | "My ATM PIN is 4321." | Nothing stored; the transcript is redacted in every table; reply: "That sounds sensitive, so I won't store it." |
| J11 | **Private memory** | (Wife) "Note for me: buy anniversary gift ideas." | Private to her unless she explicitly shares it; Nishanth's queries, autocomplete, counts, notifications and evidence chips can't reveal it or show that it exists — even when it was said in the same breath as a household item |
| J12 | **Cold-start seeding** | Settings → "Add home items": form or CSV for appliances (brand, model, purchase date, warranty), contacts and service providers | Creates entities, aliases and facts with `modality=import` provenance |
| J13 | **Speaker-relative references** | (Nishanth) "My wife prefers less spicy food." / (Wife) "My husband is allergic to cashews." | Subject resolves to the right member; asserted-by recorded; visible to the household. **Allergy and health facts need an explicit Confirm** on the card, and answers about them say "based on what's recorded" |
| J14 | **Maintenance due** | "Remember the purifier filter needs changing every 6 months." then "When is the purifier filter due?" | Interval stored as a recurrence; next due date computed from the last service event |
| J15 | **Lost phone** | Wife's phone is lost | She signs in on a new phone with an email code typed in the app, then revokes the lost device's session. Nobody else, including the admin, can take over her account; admin can't change another adult's email after first sign-in |
| J16 | **Export** | Settings → Export (Face ID or email code step-up) | Versioned `nilumi-export` JSON of household data plus *her own* private data with provenance; re-importable without AI re-extraction |
| J17 | **Share / un-share** | (Wife) "Note for me: Diwali gift budget ₹5,000 — share it with my husband." Later: "Stop sharing the gift budget note." | Only the owner can share or un-share; the explicit share cue creates a `👥 Shared` memory visible to both adults; the spouse can't edit, forget or un-share it; un-share removes it from the spouse's views and derived cards within one sync, with a warning that it may already have been seen; sharing never implies correction when a household value also exists |

## 9. Scope

| Priority | Items |
|---|---|
| **Must (MVP)** | PWA on Android + iPhone · email-code sign-in (invite-only profiles) + optional Face ID step-up · hold-to-talk + text · on-screen transcript and cards · STT (en-IN) · TTS with a voice-reply toggle · remember / ask / inspect / correct / forget / safe undo · explicit memory sharing · predicate registry · entities + aliases + speaker-relative resolution · household / shared / private visibility (RLS, incl. existence) · sensitive-input boundary on every ingress · crash-safe turn ledger · shopping list (offline + realtime sync between phones via SSE) · tasks + reminders (scheduled by a background worker) + web push + inbox · deterministic and evidence-grounded answers + abstention · turn traces + admin viewer · eval harness + gates · nightly encrypted backups (worker) + restore test + forget journal · cold-start seeding form · Phase-1 Family Records Vault hooks · provider eligibility gate |
| **Should** | Recurrence and "next due" (J14) · duplicate detection prompts · feedback buttons on answers · keyterm loop (aliases → STT) · quiet hours · **versioned JSON export/import** (J16) · cost dashboard |
| **Could** | Custom lists · notification actions (done/snooze from the notification) · weekly household digest · Tamil UI strings |
| **Later horizons** | H1 Family Records Vault · H2 room speaker via Home Assistant with "Hey Nilumi" wake phrase · H3 Tamil/Tanglish speech · H4 proactive maintenance · H5 kid mode · H6 shared list for household help · H7 conversation mode |
| **Not planned** | Financial or medical advice, credential storage, multi-household SaaS, native app-store apps (unless the Capacitor fallback is triggered) |

## 10. Memory categories and default visibility

| Category | Examples | Default visibility |
|---|---|---|
| `household_fact` | Wi-Fi router location, gas agency, society maintenance day | Household |
| `maintenance_event` | Purifier serviced 3 Oct; car service at 40,000 km | Household |
| `warranty` / `purchase` | Washing machine warranty until 15 Mar 2028 | Household |
| `contact` / `service_provider` | Plumber Ravi, 98xxxxxxx; pediatrician Dr. Meena | Household |
| `location` | Spare keys in the second kitchen drawer | Household |
| `preference` | Wife prefers less spicy food; kids like idli | Household (when the subject is a member) |
| `family_fact` | Aarav's school, class teacher, allergies | Household |
| `procedure` | How to reset the inverter | Household |
| `event` | Anniversary 12 Feb; PTM on Friday | Household |
| `note` | "Note for me: …" | **Private** to the speaker |
| `recommendation` | "Saravana Bhavan in Velachery was good" | Household |

**Visibility values:** `household` is readable and editable by both adults; `private` is readable only by its owner; `shared` is readable by both adults but keeps an immutable owner, and only that owner can edit, forget or un-share it.

**Rule:** "me / my note / remind me" → private. "Us / our / the house / a family member as subject" → household. An explicit share cue ("share it with my wife", "tell my husband", "for both of us") → shared. The owner can also Share / Un-share on the card. Sensitive categories (credentials, financial identifiers, government IDs, OTPs, security codes) → **refused**. Document-derived facts come later with H1 Family Records Vault; Phase 1 only reserves provenance, masking and visibility hooks.

## 11. Delivery phases (risk-first, with exit criteria; no durations)

Each phase ends with a demo to your wife and a go/no-go against its exit criteria.

### Phase 0 — Spikes and decisions (retire the big risks before building)
| Spike | What | Exit criterion |
|---|---|---|
| **S0 Provider eligibility & data terms (gate)** | For OpenAI, Anthropic, Sarvam, Deepgram, ElevenLabs / Azure if chosen, Railway, Cloudflare R2, Resend, GitHub and any new processors: are household/personal use and a home with kids permitted? Training opt-out, ZDR/retention, deletion process and settings for **our** account. Get written Sarvam confirmation for a household account in a home with minors. Current status per provider: [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) | Only eligible providers, with settings recorded, may receive **any** family voice or data, including bake-off clips |
| S1 PWA on both phones | Next.js 16 + Turbopack PWA install with Serwist; email-code sign-in inside the installed iPhone app; cookie persistence and re-sign-in fallback; optional Face ID step-up; mic capture in native formats (webm/opus on Android, mp4/aac on iOS); recorder interruptions (lock, call, backgrounding); permission persistence; web push with the app closed; SSE in the installed app across background/resume; Next.js #95588; reply playback after resume, with a Play-button fallback | Works on both phones with friction your wife accepts. **Otherwise → decide on Capacitor** (ADR-015), including its signing/distribution plan |
| S2 STT bake-off | Each adult records ~40 utterances (names, brands, dates, numbers, phone numbers, a few Tanglish) in kitchen, fan and TV conditions. Compare Sarvam Saaras v4, Deepgram Nova-3, ElevenLabs Scribe v2 and Azure Fast Transcription / MAI-Transcribe-2. Check native audio acceptance and Sarvam p50/p95 | Pick by entity-name accuracy first, then WER, then p95 latency |
| S3 NLU bake-off | 60-case golden set → **OpenAI GPT-6 Luna** and **Claude Haiku 4.5** with the real schema; add the shadow-mode path and two offline classifier experiments; measure serialized prompt size and cache behaviour | Pick by structural accuracy, p95 latency, schema-valid rate |
| S4 Voice pick | 3–4 en-IN voices (Sarvam Bulbul v3, Azure en-IN, OpenAI TTS); per-sentence playback on the installed iPhone app | **Your wife chooses**; first-audio p95 ≤ 700 ms |
| S5 Platform smoke | Railway Singapore: Postgres 18 + pgvector + pg_trgm/FTS on Tamil strings (`show_trgm`, `ts_debug`) + RLS with pooled `withMemberTx` (pool reuse, missing context, rollback) + graphile-worker wrapper timing + reminder gate of ≥ 200 automated occurrences incl. edits mid-flight, worker restarts and a redeploy → 100% dispatched within 60 s, no stale sends + streamed POST and SSE through the Railway proxy (heartbeat, 15-minute cap, reconnect) + RTT from home + backup to R2 with the in-job restore test, forget-journal replay and one manual restore with the master key + Railway volume backups configured + App Sleeping off + measured monthly cost | All green; decision records updated |
| S6 Domain | Buy `nilumi.in`, attach it to Railway with TLS and verify the Resend sender before installing the app on the phones | `nilumi.in` live with TLS and sender verified before either phone installs the app |

**Phase 0 output:** pinned model IDs, prices and provider data settings recorded in `config/models.ts`, `config/providers.md` (including new processors) and the ADR log.

### Phase 1 — Walking skeleton (end to end, thin, but with the safety rails)
Monorepo (Next.js 16 + Turbopack app + worker), GitHub Actions CI (typecheck, lint, tests) and Railway deploy pipeline with pre-deploy migrations · email-code auth for both adults · household, members and member relations seeded · sharing-ready visibility model · Phase-1 Vault hooks · **sensitive-input boundary on every ingress** · **`withMemberTx` + RLS + privacy test harness** · **turn execution ledger** (idempotent, resumable turns) · PWA shell (Talk tab, recorder state machine) · hold-to-talk → STT → turn recorded → echo card · text input · source events, turns and traces · admin trace viewer · backups via the worker + restore test (with forget-journal replay) · one rehearsed rollback.
**Exit:** both phones log in and complete voice and text turns; a killed process mid-turn resumes correctly on retry; secrets are refused on every ingress; the privacy matrix tests pass; traces show per-stage timings; the restore drill passes.

### Phase 2 — First real-memory release + shopping list (start the daily habit)
Everything a family needs to **trust** what it stores ships together: predicate registry v1 (~40 predicates, qualifiers) · entities and aliases (incl. private entities) · NLU v1 (remember, correct, forget, undo, share, un-share, list commands, smalltalk) · evidence and polarity checks · memory card with **safe Undo/Edit** (revision-checked) and owner-only Share / Un-share · **supersession** (serialized) · **correct** (was wrong vs changed) · **forget** with full redaction and tombstones · privacy cases for sharing, un-sharing and non-owner refusal · health-fact confirmation · shopping list (offline with mutation receipts, realtime invalidations, dedupe, visible conflicts) · cold-start seeding form · keyterm loop (per member).
**Exit:** NLU golden set ≥ 90% structurally correct (incl. held-out); privacy and secret cases 100%; the remember → correct → undo → forget flow passes, and the forget audit finds no residue anywhere; the shopping list works offline on both phones; your wife uses the list unprompted.

### Phase 3 — Retrieval and grounded answers
Ask and inspect · entity-scoped lookup + hybrid search · **answerability gate** (with negative examples) · **deterministic answers** for single-fact questions · sentence-gated synthesis with citations · Memory tab (entity pages, search) · TTS replies (per-sentence queue).
**Exit:** 60-question retrieval set: top-5 ≥ 90%, answer correctness ≥ 85%, abstention ≥ 95%, privacy 100%.

### Phase 4 — History, duplicates and memory polish
"Who was our plumber before Ravi?" (valid-time history) · history view (X → Y) · duplicate detection prompts · entity merge tooling · conflict UX for concurrent edits · export/import (`nilumi-export` versioned JSON, round-trip tested).
**Exit:** history questions pass in eval; the export → import round trip passes the retrieval eval.

### Phase 5 — Tasks, reminders, notifications
Tasks · reminder schedules and occurrences via graphile-worker (occurrence model) (relative dates, "us", recurrence, snooze-one vs edit-series, late policy) · web push with stable tags · inbox · per-recipient quiet hours · delivery telemetry (dispatch / accepted / received / acknowledged) · notification-health screen · generic previews for private reminders.
**Exit:** ≥ 200 occurrences incl. edits mid-flight and worker restarts dispatch 100% on time with no stale sends; real-device test reminders arrive on both phones; failed deliveries surface in the inbox and admin.

### Phase 6 — Voice polish, latency and degraded modes
Per-sentence TTS queue tuning · voice-reply modes · latency tuning (measured caching, speculative retrieval, REST vs streaming STT decision) · fallback grammar when the LLM is down · AI budget reservations and soft/hard caps · cost dashboard.
**Exit:** latency targets met over 100 real turns (bucketed by clip length and including first request after deploy); a simulated LLM outage still handles list and reminder commands; a simulated budget cap keeps lists, tasks and reminders working.

### Phase 7 — Family pilot
Use naturally, with no new features. Feedback buttons on every answer. Weekly review of traces grouped by failure type: **STT error · NLU error · entity resolution · retrieval miss · answer hallucination · policy/privacy · UX friction**. Pilot rule: collect patterns for several days before fixing.
**Report:** turns, memories created, correction rate, retrieval success, abstentions, hallucinations, latency p50/p95, cost, top three valued features, top three frustrations, your wife's unprompted weekly uses.

### Phase 8 — Stabilise and freeze
Fix the top five failures in each category through the eval gate · tune defaults · runbook and troubleshooting docs · freeze MVP scope · choose the next horizon based on the pilot data.

## 12. Evaluation (product view)

| Set | Size (initial) | Contents | Gate |
|---|---|---|---|
| NLU / extraction | 60 → 150 (+ 20% held out) | Your likely utterances incl. multi-command, relative dates, speaker-relative references, corrections, explicit share/un-share cues, negations and hypotheticals, secrets | ≥ 90% structural, also on held-out |
| Retrieval + answers | 60 | Per stored fact: direct, paraphrased, indirect, temporal, unanswerable, "right entity, wrong fact" negatives, after-correction | top-5 ≥ 90%, answer correct ≥ 85%, abstain ≥ 95% |
| Privacy | 40 | Cross-member private reads and existence leaks (autocomplete, counts, sync responses, notifications), share, un-share, forget by non-owner, shared-vs-household existence cases, mixed-visibility turns, secrets on every ingress, forget audit | **100%** |
| STT | ~80 clips | Your voices; names, brands, numbers, noise | Tracks entity-name accuracy |
| Reminders | ≥ 200 automated occurrences + real-device checks | Relative/absolute times, "us", recurrence, snooze, edits mid-flight, quiet hours, restart/redeploy cases | 100% dispatched on time; no stale sends |

Model and prompt changes must meet **absolute floors and regression limits** (Arch §16.2), so small drops can't accumulate. Model changes use offline evals first, then shadow mode; no live split on family traffic. Classifier experiments stay offline unless they clearly beat the existing gates. Real failures from the pilot are added to these sets (with consent). The sets grow from real usage, not invented examples.

## 13. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| iPhone PWA mic and push friction hurts adoption | Medium | High | Next.js doesn't change WebKit limits; Spike S1 first; Capacitor wrapper of the same code if the installed PWA is not acceptable (ADR-015) |
| STT mishears names and brands | High | High | Keyterms from aliases; on-screen transcript; phonetic entity matching; edit on the card |
| Your wife doesn't find it useful | Medium | Critical | She chooses the use cases and voice; shopping list early; north-star metric; no feature work during the pilot |
| A private note leaks between spouses | Low | Critical | RLS + privacy test gate + forget audit |
| A provider model update degrades behaviour | Medium | Medium | Pinned model IDs; eval gate; trace diffs |
| Family memory is lost | Low | Critical | Encrypted off-platform nightly backups + in-job restore test + forget-journal replay + manual restore runbook |
| Railway Postgres is unmanaged (we operate it) | Medium | High | We operate minor updates, extension updates, config, disk monitoring and recovery; monthly ops checklist; Railway volume backups; encrypted off-platform backups + restore test; exit to managed Postgres if operations become a burden |
| Railway cost creep | Medium | Medium | Measure in S5; Railway budget alerts; per-turn cost in traces; monthly AI budget with soft and hard caps |
| Scope creep (builder bias) | High | Medium | Phase exit criteria; "Later horizons" list; pilot rule |
| Domain change after install forces reinstall and push re-subscription | Medium | Medium | Buy `nilumi.in` before installing on the phones |
| Mailbox takeover = account takeover | Medium | High | Both email accounts use two-factor sign-in; optional step-up for export, private items after inactivity and forget-all |
| **AI provider terms don't permit household or minor-adjacent use, or a provider retains or trains on family data** | Medium | High | S0 eligibility and data-terms gate before any family clip or data is uploaded; opt-outs recorded; default to an eligible provider (ADR-017); re-check before kid mode |
| Builder unavailable (illness, travel) when something breaks | Medium | High | OneDrive recovery document with the master key and runbook; both adults hold admin role; walk through the recovery path together |

## 14. Decisions on the open questions

The accepted resolutions are the source of truth in [04 §2](04-research-and-decisions.md#2-section-14-open-questions-resolutions).

| # | Question | Decision |
|---|---|---|
| Q1 | Are *your own* preferences ("I like strong filter coffee") household-visible or private? | Household; notes, "for me" and "remind me" stay private |
| Q2 | Should a spouse see that a private item *exists* (without its content)? | No |
| Q3 | Voice reply default: speak only when spoken to, always, or never? | Voice-first: speak when spoken to; text input gets text-only reply |
| Q4 | What does "morning / evening / tonight" mean for reminders? | 09:00 / 18:30 / 20:30 IST, editable |
| Q5 | How long to keep conversational turns that produced no memory? | 30 days, then purge |
| Q6 | Opt in to keeping audio clips for 7 days to improve STT? | Off by default; on during Phase 0 and the pilot only |
| Q7 | Assistant name (for UI, and a future wake phrase)? | **Nilumi**; future room speaker wake phrase: "Hey Nilumi" |
| Q8 | Which custom domain? | **nilumi.in**, bought before installing the app on the phones |
| Q9 | Should household help (cook or maid) get shopping-list-only access in future? | Later (H6) |
| Q10 | Kids' health facts (allergies, vaccination dates) in MVP memory? | Yes, as facts with explicit confirmation; never advice |
| Q11 | Where does the recovery material live, and does your wife know how to use it? | A dedicated OneDrive document shared with your wife; walk through it once together |
| Q12 | Should *household* reminders show their text on the lock screen? | Yes for household, generic for private |
| New | Memory sharing | Owner-only explicit sharing creates `shared` visibility; only the owner can edit, forget or un-share |
| New | Family records / documents | Family Records Vault is the first horizon (H1); Phase 1 reserves hooks now |
| New | Hosting | Railway (Singapore), existing paid account |
| New | Vercel | Only free open-source libraries: Next.js, Turbopack and AI SDK |

## 15. Project board

Epics: **E0 Spikes & decisions · E1 Platform & delivery · E2 Identity & household · E3 Conversation & NLU · E4 Memory write · E5 Entity resolution · E6 Retrieval & answers · E7 Correct/forget/history · E8 Lists · E9 Tasks/reminders/notifications · E10 Voice · E11 Privacy & security · E12 Observability & evaluation · E13 Family pilot · E14 Family Records Vault (H1, later).**

States: **Backlog → In progress → Family testing → Done.**
