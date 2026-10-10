# 01 — Product Plan: Nilumi (MVP)

> **Status:** Revised after the October 8, 2026 reference-architecture review (revision 3: Today brief, read-only calendar, reserved agentic contracts) · **Date:** October 2026 · Product name: **Nilumi** · Domain: **nilumi.in**
> **Related:** [ADR catalogue](../adr/README.md) · [02 Architecture](02-architecture.md) · [03 Tech Stack](03-tech-stack.md) · [04 Research](../research/04-research.md) · [05 Implementation Roadmap](05-implementation-roadmap.md)

---

## 1. One line

**Nilumi is a private household assistant on both our phones. Say or type what matters, see exactly what it understood, and trust that it will remember, remind, and admit when it doesn't know. Each morning, Today shows what needs attention, with the evidence behind every item, and Nilumi changes nothing it wasn't asked to change without your approval.**

**Positioning:** evidence-backed household follow-through. Memory with evidence and correction stays the foundation. The Today brief is the daily habit built on it. General assistants already ship daily briefs, so the brief itself is not the advantage. The advantages are:
- briefs built from the household's own corrected memory
- privacy per member, enforced by the database
- Indian household workflows
- later, Tamil and Tanglish

Competitor evidence and its verification status are in [Research](../research/04-research.md#consumer-landscape-mostly-secondary).

## 2. Problem

Household knowledge is scattered across WhatsApp chats, memory, paper warranty cards and sticky notes:

| Today | Pain |
|---|---|
| "When was the purifier serviced? Who's the plumber? When does the washing machine warranty end?" | Nobody remembers; searching chats takes minutes or fails |
| The shopping list is in one person's head or notes app | Items are forgotten at the store; duplicate purchases |
| "Remind me to renew the insurance next month" | Phone reminders are personal, not shared, and lack household context |
| Preferences (spice levels, kids' allergies, school details) | Known by one parent; the other has to ask |
| Each morning, the day's reminders, shopping list, calendar and pending decisions sit in different apps | Things slip; one parent carries the mental load of checking everything |

Generic assistants (Google Assistant, Alexa, ChatGPT) don't hold **structured, private, correctable household memory with evidence**. They either forget, or remember opaquely.

## 3. Jobs to be done

1. "Remember this household fact **so either of us** can get it back later, worded differently."
2. "Keep **our** shopping list in sync, and let me use it at the shop even with poor signal."
3. "Remind me (or both of us) at the right time, **on my phone**."
4. "Show me what you know about X, and let me fix it when it's wrong."
5. "Keep my private notes private, even from my spouse."
6. "Never store secrets (PINs, OTPs, card numbers)."
7. "Each morning, show me what needs my attention today, mine and ours, and where each item came from."
8. "Suggest routine follow-ups, but change nothing I didn't ask for until I approve it."

## 4. Users and roles

| Who | Role | MVP? | Notes |
|---|---|---|---|
| **Nishanth** | `admin` + adult member | Yes | Builder; uses the admin and trace views |
| **Wife** | adult member; can also hold `admin` | Yes | **Her voluntary use is the primary success signal.** Involve her in picking use cases and the assistant's voice |
| **Kids** | `child` member (later) | Subjects only | Facts *about* kids (school, allergies, vaccination dates) are stored from day 1. Kids talking to it comes later (kid mode) |
| External people (plumber Ravi, Dr. Meena, cook) | **Entities**, not users | n/a | Stored as contacts and service providers |
| Grandparents / household help | Possible later users | No | May need Tamil, a limited role, or shared-list-only access |

Membership is invite-only: an admin creates each member profile and allowlists the sign-in email. Both adults can hold `admin`, but after an adult's first sign-in, no admin can change that adult's email or take over the account.

**Ready for more households later ([ADR-048](../adr/adr-048.md)).**
- Roles stay generic: `admin` is a capability; member kinds are `adult` and `child`; `helper` comes later.
- Family relationships such as "my wife" are data used to resolve references, not role names.
- Nothing assumes exactly two adults.
- Only the founding household uses Nilumi until a legal gate and the production privacy gate ([ADR-046](../adr/adr-046.md)) pass.

**Actor and initiator.** Every action records two things:
- the *actor*: the member whose permissions and visibility apply
- the *initiator*: the member, a routine such as the Today brief, or a schedule that started it

A routine never sees more than its actor can see ([ADR-042](../adr/adr-042.md)).

## 5. Goals, non-goals and success metrics

### 5.1 MVP goals
- A trustworthy **remember → retrieve → correct → forget** loop, by voice or text, from both phones.
- A **shared shopping list** that is fast, offline-tolerant and has realtime sync between phones, instant via server-sent events.
- **Tasks and reminders that actually fire** on the right person's phone.
- **Household vs private** memory that never leaks.
- An evidence trail for every answer and every stored fact.
- A daily **Today brief** for each adult: reminders due, the shopping list, today's and tomorrow's calendar events, pending proposals, and renewals and bills, each with evidence. Each adult gets at most one brief push per day ([J18](#8-core-journeys-and-acceptance-criteria)).
- An optional **read-only Google Calendar** connection for each adult, feeding only that adult's Today ([ADR-045](../adr/adr-045.md)).

### 5.2 Non-goals (MVP)
Smart-home device control · room speakers and the "Hey Nilumi" wake phrase (H2) · automatic speaker recognition · Tamil speech (designed for, not shipped) · proactive behaviour beyond reminders and the daily Today brief · general agent runs, delegation and multi-step autonomy (agentic horizon, [ADR-041](../adr/adr-041.md)) · any effect outside Nilumi, such as messages, bookings, payments or calendar writes ([ADR-042](../adr/adr-042.md)) · calendar write access · general web browsing · a WhatsApp bot ([ADR-049](../adr/adr-049.md)) · auto-capturing every sentence · documents/photos (designed for, first horizon H1 Family Records Vault) · financial or medical advice · access to banking, passwords or security systems · more than one household (contracts are ready; [ADR-048](../adr/adr-048.md)) · native app stores.

### 5.3 Success metrics

**North star:** the number of interactions per week your wife starts **without being asked to test**. **Daily habit signal:** each adult opens Today on most days without a nudge beyond the brief push.

| Category | Metric | Pre-pilot gate (eval sets) | Pilot target (real usage) |
|---|---|---|---|
| Memory write | Facts stored structurally correct (subject, predicate, value, visibility) | ≥ 90% (and on the held-out set) | ≥ 85% |
| Retrieval | Correct evidence in top 5 | ≥ 90% | n/a |
| Answers | Final answer correct (judged separately from retrieval) | ≥ 85% | ≥ 85% rated correct |
| Abstention | Says "I don't know" on unanswerable questions | ≥ 95% | Hallucinated answers ≤ 2% |
| **Privacy** | Private memory, private calendar event or private brief item (or its existence) shown to the wrong member, including in notifications; secret stored | **0 (hard gate)** | **0** |
| Reminders | Dispatched within 60 s of the due time (S5 automated run of ≥ 200 occurrences on the worker) | **100%** | ≥ 99% dispatched on time; push **acceptance**, device **receipt** and user **acknowledgement** rates tracked separately (we can't guarantee delivery to a phone) |
| Today brief | Exactly one brief per member per date, ready by the member's chosen time; at most one brief push per member per day | **100%** in the automated seeded run | ≥ 99% of days ready on time |
| Today habit | Days per week each adult opens Today | n/a | ≥ 5 of 7 for each adult |
| Today usefulness | Items marked useful or acted on from Today; evidence chips opened; proposals approved, edited or rejected | n/a | Tracked from the first pilot week; targets are set from that baseline |
| Latency | Release-to-card (writes/lists) p50 / p95 | ≤ 1.5 s / ≤ 3 s | Same |
| Latency | Release-to-first-audio (questions) p50 / p95 | ≤ 2.5 s / ≤ 4.5 s | Same |
| Value | Recurring use cases both adults use weekly | n/a | ≥ 3 |
| Cost | Total monthly run cost | n/a | Target ≤ ₹3,000 (expected ≈ ₹1,400–2,700); ceiling ≤ ₹5,000 ([ADR-047](../adr/adr-047.md)) |

## 6. Product principles (trust UX)

1. **Show, don't just say.** Nilumi shows *what I heard* (the transcript) and *what I did* (cards) on every voice turn. The screen is the main trust mechanism.
2. **Undo beats asking.** Clear writes are applied immediately and shown as a card with **Undo** and **Edit**. Ask only when something is genuinely ambiguous (unknown entity, ambiguous date, several matching memories), never on the basis of a vague "confidence". Two exceptions need an explicit tap: **health and allergy facts** (Confirm) and **forget** (it can't be undone).
3. **Unknown beats invented.** If there's no evidence, say so, and offer to remember it.
4. **Corrections are normal.** "That's wrong, it's April 15" works in the next turn without restating the subject.
5. **Private stays private, unless you explicitly share it.** "Remind me" and "my note" are private by default. Household facts are shared. Owner-only Share / Un-share makes a private memory visible to the other adult without giving them edit or forget rights. Visibility is visible on every card and can be toggled.
6. **Secrets are refused, not stored.** Not in memory, logs or traces.
7. **Faster than opening a notes app.** If capturing takes longer than typing a note, people stop using it.
8. **Match the input modality.** Voice in gets a short spoken reply plus the screen; text in gets a text-only reply. Speech confirms; the screen explains.
9. **Evidence on every claim.** Every Today item and every answer links to its source: a memory, reminder, list item or calendar event.
10. **Suggestions wait for approval.** What you ask for directly keeps undo-first behaviour (principle 2). What Nilumi suggests on its own, such as a follow-up in Today, needs one tap. The approval runs exactly what was shown; editing creates a new suggestion. Nothing outside Nilumi (messages, bookings, payments, calendar writes) is in the MVP ([ADR-042](../adr/adr-042.md)).
11. **One push a day.** Today sends at most one brief notification per member per day, at their chosen time and outside quiet hours. Reminders keep their own pushes. Today briefs and private items show a generic lock-screen preview; household reminder previews follow [ADR-035](../adr/adr-035.md).

## 7. Experience overview (PWA)

| Tab | Purpose |
|---|---|
| **Today** (landing screen) | The member's own daily brief in two tiers, **Needs attention now** and **Later this week**. It shows reminders due, shopping-list highlights, today's and tomorrow's calendar events (if connected), pending suggestions, and renewals and bills. Each item has an evidence chip; suggestions appear as approval cards. An optional one-line summary sits on top. A **Reconnect** chip or a stale marker appears when the calendar can't be read; the brief still works without it |
| **Talk** | Voice-first with Nilumi: the mic is primary, with a text box always available. Conversation thread with transcript bubbles and result cards (memory saved/updated/forgotten, list changes, tasks, answers with evidence chips). Voice-reply modes: auto default (voice in → spoken + screen; text in → text only), always, never |
| **Lists** | Shopping list (default) plus custom lists. Tap to tick off, swipe to remove, works offline, syncs in realtime between phones while open, and shows who added each item |
| **Tasks** | Upcoming and overdue tasks and reminders; mine / ours filter; done, snooze, reschedule |
| **Memory** | "What we know": online-only browse by entity (Appliances, People & contacts, Kids, Home, Vehicles, Preferences). Each entity page shows facts, history (X → Y), source ("you said on 5 Oct, 7:30 pm"), visibility badge, and owner-only Share / Un-share, Edit and Forget on cards. Search box |
| **Inbox** | Delivered reminders and anything that needs attention (pending clarifications, pending suggestions, failed deliveries) |
| **Settings** | Profile, email and signed-in devices, optional Face ID step-up, notifications (incl. per-device health check), voice choice, quiet hours, Today brief time, **Connections** (Google Calendar: connect, last sync, disconnect), privacy defaults and limits, export |
| **Admin** (Nishanth) | Turn traces, eval runs, costs, predicate registry, entity merge, backup status |

**Card anatomy (memory saved):**
`🧠 Saved · Washing machine — warranty expires — 15 Mar 2028 · 🏠 Household · [Undo] [Edit]`
with "heard: '…our washing machine warranty expires on March 15 2028'" underneath.

**Card anatomy (Today suggestion):**
`💡 Suggested · Move "call plumber Ravi" to tomorrow 10 am? · 🏠 Household · [Approve] [Edit] [Not now]`
with an evidence chip pointing to the overdue task.

Cards always show one visibility badge: `🏠 Household`, `👥 Shared` or `🔒 Private`.

An **Activity** view (run history, pause and stop) and a separate **Approvals** view are reserved for the agentic horizon ([ADR-041](../adr/adr-041.md)). Before the pilot, suggestions appear only as cards in Today and Inbox.

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
| J18 | **Today brief** | 7:30 am push: "Your day: 3 things need attention." Tap → Today → tap the insurance item's evidence chip | Built by a scheduled job per member per date in Asia/Kolkata. Running it again never creates a second brief or push. Items come from domain data (reminders due, list, calendar today and tomorrow, pending suggestions, renewals and bills), assembled deterministically. At most one LLM call, only for the optional summary line. Each item opens its evidence. The brief is built with the member's own visibility, so another member's private items, and their existence, never appear. At most one brief push per day, outside quiet hours, with a generic lock-screen preview. If the push fails, Today still shows the brief. If the calendar is not connected, expired or stale, the brief still builds and shows a Reconnect chip or stale marker |
| J19 | **Connect / disconnect calendar** | Settings → Connections → "Connect Google Calendar" | Each adult links only their own Google account, read-only, primary calendar only. Google's consent screen may warn that the app is unverified; the app explains why first. Linking never creates a Nilumi account or bypasses the invite-only rule. Imported events are private to their owner and appear only in that owner's Today. Disconnect revokes access at Google, stops any sync in progress, and deletes cached events and the brief items made from them ([ADR-045](../adr/adr-045.md)) |
| J20 | **Approve, edit or reject a suggestion** | Today: "💡 Move 'call plumber Ravi' to tomorrow 10 am? [Approve] [Edit] [Not now]" | Approve runs exactly the stored suggestion once, after rechecking that the member is still allowed, the task hasn't changed and the suggestion hasn't expired; otherwise the card says what changed and nothing runs. Edit creates a new suggestion. Not now records the decision and removes the card. Only the member it belongs to can approve. An approval can't be reused. Every outcome appears in the item's history ([ADR-042](../adr/adr-042.md)) |

## 9. Scope

| Priority | Items |
|---|---|
| **Must (MVP)** | PWA on Android + iPhone · email-code sign-in (invite-only profiles) + optional Face ID step-up · hold-to-talk + text · on-screen transcript and cards · STT (en-IN) · TTS with a voice-reply toggle · remember / ask / inspect / correct / forget / safe undo · explicit memory sharing · predicate registry · entities + aliases + speaker-relative resolution · household / shared / private visibility (RLS, incl. existence) · sensitive-input boundary on every ingress · crash-safe turn ledger · shopping list (offline + realtime sync between phones via SSE) · tasks + reminders (scheduled by a background worker) + web push + inbox · deterministic and evidence-grounded answers + abstention · turn traces + admin viewer · eval harness + gates · nightly encrypted backups (worker) + restore test + forget journal · cold-start seeding form · Family Records Vault provenance/masking hooks · provider eligibility gate · **Today brief** (J18) · **read-only Google Calendar per adult** (J19) · **approval cards for suggestions inside Nilumi** (J20) |
| **Should** | Recurrence and "next due" (J14) · duplicate detection prompts · feedback buttons on answers and Today items · keyterm loop (aliases → STT) · quiet hours · **versioned JSON export/import** (J16) · cost dashboard |
| **Could** | Custom lists · notification actions (done/snooze from the notification) · weekly household digest · Tamil UI strings |
| **Later horizons** | H1 Family Records Vault · H2 room speaker via Home Assistant with "Hey Nilumi" wake phrase · H3 Tamil/Tanglish speech · H4 proactive maintenance · H5 kid mode · H6 shared list for household help · H7 conversation mode · **agentic horizon**: bounded agent runs, delegation, artifacts, Activity view with pause and stop, external actions only with approval ([ADR-041](../adr/adr-041.md)–[ADR-044](../adr/adr-044.md)) · Telegram, SMS or RCS channel ([ADR-049](../adr/adr-049.md)) · more households after the legal gate ([ADR-048](../adr/adr-048.md)) |
| **Not planned** | Financial or medical advice, credential storage, a WhatsApp bot, multi-household SaaS before the legal gate, native app-store apps (unless the Capacitor fallback is triggered) |

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

**Rule:** "me / my note / remind me" → private. "Us / our / the house / a family member as subject" → household. An explicit share cue ("share it with my wife", "tell my husband", "for both of us") → shared. The owner can also Share / Un-share on the card. Sensitive categories (credentials, financial identifiers, government IDs, OTPs, security codes) → **refused**. Document-derived facts come later with H1 Family Records Vault. The MVP reserves provenance, masking and visibility hooks; their delivery is mapped in the [roadmap](05-implementation-roadmap.md#phase-1--walking-skeleton-with-safety-rails).

**Imported calendar events** are not memories. They are private to the member who connected the calendar, appear only in that member's Today, and are deleted on disconnect ([ADR-045](../adr/adr-045.md)).

## 11. Delivery phases (risk-first, with exit criteria; no durations)

Phase 0–8 (including Phase 6A, the Today brief), prerequisites, completion outcomes and later horizons are defined in the [Implementation Roadmap](05-implementation-roadmap.md#2-mvp-phases). This document owns product requirements and acceptance criteria; the roadmap owns delivery order.

## 12. Evaluation (product view)

| Set | Size (initial) | Contents | Gate |
|---|---|---|---|
| NLU / extraction | 60 → 150 (+ 20% held out) | Your likely utterances incl. multi-command, relative dates, speaker-relative references, corrections, explicit share/un-share cues, negations and hypotheticals, secrets | ≥ 90% structural, also on held-out |
| Retrieval + answers | 60 | Per stored fact: direct, paraphrased, indirect, temporal, unanswerable, "right entity, wrong fact" negatives, after-correction | top-5 ≥ 90%, answer correct ≥ 85%, abstain ≥ 95% |
| Privacy | 40 | Cross-member private reads and existence leaks (autocomplete, counts, sync responses, notifications), share, un-share, forget by non-owner, shared-vs-household existence cases, mixed-visibility turns, secrets on every ingress, forget audit | **100%** |
| STT | ~80 clips | Your voices; names, brands, numbers, noise | Tracks entity-name accuracy |
| Reminders | ≥ 200 automated occurrences + real-device checks | Relative/absolute times, "us", recurrence, snooze, edits mid-flight, quiet hours, restart/redeploy cases | 100% dispatched on time; no stale sends |
| Today brief | Seeded and form-entered households | Per-member visibility (private items, calendar events, shared then un-shared, forgotten items), dedupe and reruns, quiet hours, calendar missing/expired/stale, all-day, recurring and time-zone events, suggestion approve/edit/expire/stale-target cases | **100%** privacy and exactly-once; runs before the S3 NLU gate passes because it doesn't depend on speech understanding |

Model and prompt changes must meet **absolute floors and regression limits** (Arch §16.2), so small drops can't accumulate. Model changes use offline evals first, then shadow mode; no live split on family traffic. Classifier experiments stay offline unless they clearly beat the existing gates. Real failures from the pilot are added to these sets (with consent). The sets grow from real usage, not invented examples.

## 13. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| iPhone PWA mic and push friction hurts adoption | Medium | High | Next.js doesn't change WebKit limits; [roadmap S1](05-implementation-roadmap.md#phase-0--spikes-and-decisions); Capacitor wrapper of the same code if the installed PWA is not acceptable ([ADR-015](../adr/adr-015.md)) |
| STT mishears names and brands | High | High | Keyterms from aliases; on-screen transcript; phonetic entity matching; edit on the card |
| Your wife doesn't find it useful | Medium | Critical | She chooses the use cases and voice; shopping list early; north-star metric; no feature work during the pilot |
| A private note leaks between spouses | Low | Critical | RLS + privacy test gate + forget audit |
| A provider model update degrades behaviour | Medium | Medium | Pinned model IDs; eval gate; trace diffs |
| Family memory is lost | Low | Critical | Encrypted off-platform nightly backups + in-job restore test + forget-journal replay + manual restore runbook |
| Railway Postgres is unmanaged (we operate it) | Medium | High | We operate minor updates, extension updates, config, disk monitoring and recovery; monthly ops checklist; Railway volume backups; encrypted off-platform backups + restore test; exit to managed Postgres if operations become a burden |
| Railway cost creep | Medium | Medium | Measure in S5; Railway budget alerts; per-turn cost in traces; monthly AI budget with soft and hard caps |
| Scope creep (builder bias) | High | Medium | [Roadmap completion outcomes and pilot rule](05-implementation-roadmap.md#2-mvp-phases); "Later horizons" list |
| Domain change after install forces reinstall and push re-subscription | Medium | Medium | Buy `nilumi.in` before installing on the phones |
| Mailbox takeover = account takeover | Medium | High | Both email accounts use two-factor sign-in; optional step-up for export, private items after inactivity and forget-all |
| **AI provider terms don't permit household or minor-adjacent use, or a provider retains or trains on family data** | Medium | High | S0 eligibility and data-terms gate before any family clip or data is uploaded; opt-outs recorded; default to an eligible provider ([ADR-017](../adr/adr-017.md)); no-training routing enforced on every LLM and embedding call; re-check before kid mode |
| **A model provider keeps pilot prompts under its published retention terms** (zero data retention is not used during the founding-household pilot) | High | Medium | The owner records one informed household acknowledgement for both adults before real use, after explaining it to the other adult; either adult can withdraw it, which pauses every AI call for the household. It covers the processors, their published retention, children's facts, calendar titles and the fact that deleting in Nilumi can't erase provider copies. The sensitive-input scanner refuses or masks secrets on every input. Settings → Privacy states the limits plainly. ZDR becomes mandatory at the production privacy gate, before anyone outside the household, helpers, kid mode or commercial use ([ADR-046](../adr/adr-046.md)) |
| Builder unavailable (illness, travel) when something breaks | Medium | High | OneDrive recovery document with the master key and runbook; both adults hold the admin capability; walk through the recovery path together |
| Big assistants already ship daily briefs (Gemini, Alexa+, ChatGPT scheduled tasks) | High | Medium | Position Today as evidence-backed follow-through over the household's own corrected memory, private per member; measure habit and usefulness, not novelty; competitor claims stay provisional ([Research](../research/04-research.md#consumer-landscape-mostly-secondary)) |
| Google OAuth friction: unverified-app warning, 100-user cap, scope review | Medium | Medium | Read-only scope only; app published, because Testing mode expires refresh tokens after 7 days; explain the warning before linking; calendar stays optional; S-GCAL spike ([ADR-045](../adr/adr-045.md)) |
| Nilumi changes something nobody asked for | Low | High | Single broker that fails closed; suggestions need approval; approvals are immutable and rechecked before they run; no effects outside Nilumi in the MVP ([ADR-042](../adr/adr-042.md)) |
| The S3 speech-understanding gate keeps failing | High | High | Today is deterministic and tested with seeded and form-entered data, so it doesn't wait on S3; the Phase 0 and Phase 2 NLU gates are unchanged |
| An external household is onboarded before legal duties are clear (DPDP) | Low | High | Primary legal verification before any external household, whatever the date ([ADR-048](../adr/adr-048.md)) |

## 14. Decisions on the open questions

Q1–Q12 are resolved. Their decision history and links to the applied requirements are maintained once in the [ADR resolved-question map](../adr/README.md#resolved-question-map). Product behavior is defined here in §4 (membership), §6–§8 (trust UX and journeys), §9 (scope) and §10 (visibility). Technical defaults for dates, retention, recovery and notifications are defined in Architecture and linked from that decision map.

Accepted choices and pending validations are distinct: provider approvals, model/voice selections and platform proofs remain in the [roadmap's pending-validation register](05-implementation-roadmap.md#5-pending-validations-and-decisions).

## 15. Project board

Epic identifiers and board states live in the [roadmap's journey coverage and project board](05-implementation-roadmap.md#4-journey-coverage-and-project-board).
