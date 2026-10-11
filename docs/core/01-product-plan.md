# Product Plan

Current product baseline: 2026-10-10. Status: **planned for MVP**, except the explicitly selected P0 technologies and dated evidence. This is the requirements authority; the [implementation plan](../plans/implementation-plan.md) owns delivery sequence.

## 1. Purpose and positioning

Nilumi helps two adults get household work done with little manual entry. Cooking, school preparation, shopping and interrupted use motivate the interaction: speak while hands are occupied, receive a short spoken response, then inspect or adjust the persistent result when convenient. Useful household follow-through and trustworthy corrected memory are the differentiators.

## 2. People and membership

The founding pilot is one household and two authenticated adults. Children and external contacts are subjects, not users. Identity comes from the signed-in member, never automatic voice recognition. Admin is an adult capability for membership and operations; it does not widen private-data access. Bootstrap is an owner-only script, then invite-only email-code sign-in. No public signup.

## 3. Home and persistent activities

Home has a stable header, brief, persistent composer and focused activity. It is the entry for all J1–J26 journeys. Recent is an activity picker within the shell, with title, last use and visibility-safe summaries. Settings, Inbox and Admin support Home; they are not competing domain tabs.

An activity holds durable identity and domain references. A presentation describes how permitted current data appears: checklist, table, timeline, text or simple diagram. Changing the presentation preserves item identities, checked state and domain data. Switching topics focuses a new activity and saves the previous one. Reopening restores its current authorized state, even after the conversational transcript expires. Archive removes an activity from Recent; forgetting removes the selected underlying content and affected derivatives.

Activities are member-owned workspaces. A household list referenced in two adults' activities is one shared list. Activity text, presentations, domain records and expiring conversation transcripts have separate retention duties. A draft meal routine or explanation can persist as an activity without creating tasks or factual memories.

## 4. Voice, text and touch

Tap once starts a foreground conversation with follow-ups, endpoint detection and interruption. Spoken responses accompany visible results by default for voice input. Text input is quiet by default. Mute, Stop, Replay and transcript/text alternatives remain available; muting output does not close the microphone session. Stop playback differs from End conversation. Backgrounding releases or suspends media and returns through an explicit reconnect; background always-listening is excluded.

Barge-in stops old speech and starts the next turn. Committed actions survive interruption. Late text, layouts or audio cannot overwrite a newer activity. While a person interacts with a checklist, generated changes preserve focus and avoid rearranging controls. Touch corrections and text follow-ups use the same active activity and item references as speech.

English, Tamil and Tanglish are first-prototype evaluation requirements, including family names, quantities, noise and language switching. Tamil text must render correctly. Full Tamil interface translation is a separate deferred capability.

## 5. Trust and initiative

Requested reversible changes execute through deterministic validation and display Undo. Ambiguous references prompt a contextual clarification; health facts need explicit confirmation and forget needs irreversible-action confirmation. Proactive suggestions need approval, edit or rejection, bound to the exact proposal and target revision. A bare yes without a specific visible proposal is insufficient. Model confidence does not grant authority.

Receipts, evidence, visible results and speech use one authoritative response. Partial failures remain partial. Answers cite visible stored sources and abstain when information is missing. Secrets are refused/redacted on every ingress. Private content must not reveal its existence through Recent, generated diagrams, speech, counts, logs, notifications or cached screens.

## 6. Core journeys

Every journey starts from Home voice/text/composer or an authorized supporting destination that restores the relevant Home activity. The following acceptance requirements retain the established correctness and privacy scope.

| # | Journey | Example | Acceptance criteria |
|---|---|---|---|
| J1 | **Store a fact** | "Remember that our washing machine warranty expires on March 15, 2028." | Correct subject, predicate and date (day precision); household visibility; transcript linked; card with Undo; retrievable with different wording |
| J2 | **Retrieve** | "When does the washer warranty end?" | Answer from evidence; evidence chip opens the source; ≤ 1 sentence spoken |
| J3 | **Correct** | "That's wrong, make it April 15." | Resolves "that" to the last memory in context; the old value is preserved in history; the new value is active; card shows X → Y |
| J4 | **Forget** | "Forget the washing machine warranty date." | Clarifies only if several match; household memories are redacted everywhere for both members ([Arch §8.6](02-architecture.md#86-forget-semantics)); a shared memory can be forgotten only by its owner; forget **can't be undone** (the card says so before confirming); later questions get "I don't know" |
| J5 | **Inspect** | "What do you remember about the water purifier?" | Lists active facts with dates and aliases; screen shows the entity page; spoken summary ≤ 3 items |
| J6 | **Unknown** | "Which year did we buy the purifier?" | "I don't have the purifier's purchase date." No inference from other facts; offers to remember |
| J7 | **Shopping list** | "Add detergent and two kilos of rice." | Two items with quantity/unit; duplicates merged; instant sync to the other phone through SSE while the list activity is open on Home; checking and unchecking work offline at the store and syncs later |
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
| J18 | **Home brief** | 7:30 am push: "Your day: 3 things need attention." Tap → Home activity → tap the insurance item's evidence chip | Built by a scheduled job per member per date in Asia/Kolkata. Running it again never creates a second brief or push. Items come from domain data (reminders due, list, calendar today and tomorrow, pending suggestions, renewals and bills), assembled deterministically. At most one LLM call, only for the optional summary line. Each item opens its evidence. The brief is built with the member's own visibility, so another member's private items, and their existence, never appear. At most one brief push per day, outside quiet hours, with a generic lock-screen preview. If the push fails, Home still shows the brief. If the calendar is not connected, expired or stale, the brief still builds and shows a Reconnect chip or stale marker |
| J19 | **Connect / disconnect calendar** | Settings → Connections → "Connect Google Calendar" | Each adult links only their own Google account, read-only, primary calendar only. Google's consent screen may warn that the app is unverified; the app explains why first. Linking never creates a Nilumi account or bypasses the invite-only rule. Imported events are private to their owner and appear only in that owner's Home. Disconnect revokes access at Google, stops any sync in progress, and deletes cached events and the brief items made from them ([ADR-045](../adr/adr-045.md)) |
| J20 | **Approve, edit or reject a suggestion** | Home: "💡 Move 'call plumber Ravi' to tomorrow 10 am? [Approve] [Edit] [Not now]" | Approve runs exactly the stored suggestion once, after rechecking that the member is still allowed, the task hasn't changed and the suggestion hasn't expired; otherwise the card says what changed and nothing runs. Edit creates a new suggestion. Not now records the decision and removes the card. Only the member it belongs to can approve. An approval can't be reused. Every outcome appears in the item's history ([ADR-042](../adr/adr-042.md)) |

| # | Journey | Example | Acceptance criteria |
|---|---|---|---|
| J21 | Continuing conversation | While cooking: ask for a routine, then add a shopping item | One tap begins follow-ups; final recognized text enters the same turn service; no repeated capture gesture; English/Tamil/Tanglish results recorded |
| J22 | Interruption | Interrupt a spoken list with “make that two kilos” | Old audio stops; committed action remains; next turn targets the correct item; late output cannot replace the new result |
| J23 | Topic switching | Switch from shopping to school preparation | New activity receives focus; previous list state remains in Recent; context does not silently cross topics |
| J24 | Presentation changes | “Show that schedule as a table” | Trusted renderer changes presentation only; stable domain IDs, quantities and checked state; fallback retains usable accurate output |
| J25 | Return to saved activity | Reopen shopping after a day or expired conversation | Authorized current data restored; offline approved projection usable; transcript expiry does not destroy activity |
| J26 | Shared input context | Check, uncheck, then say “remove the second item” | Touch/text/voice share item references; explicit desired state, version and idempotency; conflicts explained without duplicate effects |

## 7. Scope and priorities

P0 proves the connected experience with synthetic data. P1 establishes production identity, policy and recovery. P2 makes Home and activities persistent; P3 delivers shopping/routines; P4 household memory/evidence; P5 tasks/reminders; P6 briefs/approved suggestions; P7 optional calendar and lifecycle; P8 the family pilot. Calendar failure cannot block useful core Home behavior.

Must deliver: persistent results, continuous foreground speech, all three speech languages evaluated, trusted composition, manual fallback, offline list corrections, ownership/isolation, receipts/undo, memory privacy/evidence/forget, reminders/Inbox/push, backups and recovery. Should deliver recurrence, keyterm feedback, seeding, JSON export/import and costs. Defer shared displays, room/wake-word input, Vault extraction, helpers, child access, autonomous runs/delegation, external effects and additional channels until their prerequisites are satisfied. No native application contingency is part of this baseline.

## 8. Memory categories and visibility


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

**Visibility values:** `household` is readable/editable/forgettable by both adults; only the original asserter can explicitly restrict a household memory to private after an already-seen warning; `private` is readable only by its owner; `shared` is readable by both adults but keeps an immutable owner, and only that owner can edit, forget or un-share it.

**Rule:** "me / my note / remind me" → private. "Us / our / the house / a family member as subject" → household. An explicit share cue ("share it with my wife", "tell my husband", "for both of us") → shared. The owner can also Share / Un-share on the card. Sensitive categories (credentials, financial identifiers, government IDs, OTPs, security codes) → **refused**. Document extraction is deferred. P4 implements source provenance and content references without adding Vault extraction tables.



Calendar events remain private imported records, not memories, and appear through the owner's Home only. Disconnect scrubs cache and affected activity/brief presentations. Activities themselves are personal by default; referencing a household record does not make private activity text public.

## 9. Evaluation and adoption

| Measure | Requirement and evidence |
|---|---|
| Structural writes | ≥90% overall and held-out before release; ≥85% pilot floor; separately score correct targets, dates and affirmed spans |
| Retrieval and answers | Top-5 ≥90%; answer correctness ≥85%; abstention ≥95%; pilot hallucinations ≤2% |
| Privacy and secrets | 100% suite, zero cross-member/household/private-existence leaks across all modalities and caches |
| Reminder reliability | ≥200 automated occurrences, 100% dispatch within 60 seconds with no stale sends before pilot; ≥99% pilot; phone receipt measured separately |
| Home brief | One brief per member/local date, at most one push; 100% privacy/deduplication; ≥99% ready in pilot |
| Speech and latency | Record English/Tamil/Tanglish final-text and entity/quantity accuracy, correction effort, end-of-speech → visible result and first audible response, p50/p95, failures and sample size on both installed phones |
| Adoption | Useful activities completed with little manual entry, manual corrections per activity, recognition quality, voluntary interactions by the other adult, both adults voluntarily using it ≥3 times/week |

Earlier latency targets (release-to-card p50≤1.5s/p95≤3s; question first audio ≤2.5s/4.5s) remain comparison targets. P0 reports comparable complete-turn measurements and records the effect of endpointing; a 700ms synthetic TTS test is not full-turn proof. Targets cannot be silently relaxed. Optional brief habit measure is ≥5 of 7 days; it does not substitute for useful activities.

Evaluation starts with the existing 60-command corpus (grow to 150 with 20% held-out), 60 retrieval/answer cases, 40 privacy cases and approximately 80 speech clips. Extend these with connected activities and English/Tamil/Tanglish session turns. Keep frozen/regression sets separate from new blind holdouts. Model/prompt changes require absolute floors and regression limits; offline then shadow evaluation, no live family A/B experiment.

## 10. Constraints and validation ownership

Total monthly cost target ≤₹3,000, ceiling ₹5,000, AI default ₹800 with 80/100% degradation. Provider eligibility, informed household acknowledgement, no-training restrictions and production privacy gates remain binding across LLM, embeddings, STT and TTS. Withdrawal pauses all AI while permitted manual functions remain useful.

Empirical unknowns are in the [phase-owned gate register](../plans/implementation-plan.md#validation-register): voice integration and hosting, multilingual recognition, installed-phone focus/recovery, actual cost, restore and optional calendar authorization. Product choices in this document are settled; evidence can justify revisiting them through an explicit decision update.
