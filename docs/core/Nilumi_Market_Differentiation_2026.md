# Nilumi — Market Differentiation & Signature AI Experiences

> **Product strategy / feature exploration — 11 October 2026**  
> **Status:** Proposed differentiators for product planning; **not** committed scope, accepted ADRs, or evidence of implemented functionality.  
> **Product name:** Nilumi (the existing product/repository name; “Nadumi” in the request is treated as a reference to Nilumi).  
> **Purpose:** Capture the unique **experiences, differentiating capabilities, technical challenges, success criteria, and sequencing** that Nilumi should consider. **This is deliberately not a second architecture or tech-stack document.**

---

## 1. Product differentiation thesis

**Nilumi should become the household's trusted, living intelligence and follow-through layer—not another family dashboard, calendar, task list, or chat assistant.**

**Proposed promise:** *Tell Nilumi what matters once. It understands the people, objects, history, and commitments in your home; shows exactly what it understood; remembers with evidence; and helps the right person follow through—without turning family life into project management.*

### The market reality (verified public product positioning)

Existing products already advertise much of the apparent feature set:

| Product | Publicly advertised capability | What Nilumi must **not** claim as uniquely its own |
|---|---|---|
| [Nori](https://heynori.com/ai-overview) | Family AI, voice input, family preferences/memory, events, tasks, meal planning, photos/email capture; [Nori Family Hub](https://heynori.com/familyhub) also advertises hands-free voice and a shared display | “Voice-first AI for families,” “family memory,” or “AI that converts speech to tasks” |
| [Home Run](https://www.heyhomerun.ai/) | Voice/chat, cross-domain family plans, chore assignments and follow-up, documents, meals, expenses, and shared family context | “Connected plans across tasks, documents, and calendars” |
| [Ohai](https://www.ohai.ai/) | Household coordination, shared calendars, to-dos, reminders, and extraction from emails, PDFs and photos | “Family scheduling by AI,” “low-manual-entry capture,” or task delegation |
| [Pratyek](https://pratyek.com/product) | India-focused WhatsApp capture, multilingual voice, structured assets/bills/services/staff/family data, question answering, renewals | “Indian-language household memory,” “asset and bill records,” or natural-language Q&A |

**Caution:** These are the vendors' public descriptions, **not** independent proof of feature quality, retention, permission rigor, or missing capabilities. Nilumi's opportunity is in *measurably better execution and combination* of specific workflows. Never publish an “only app that can…” claim without a current head-to-head test.

### Differentiation test

A proposal earns a place in Nilumi's roadmap if it meets at least two of these:

1. **Removes household work**, rather than adding a form, dashboard, or reminder to maintain.
2. **Gets more useful over time** through corrected, permission-aware household history.
3. **Serves multiple people safely**, where personal assistants usually assume one owner.
4. **Closes the loop**, producing an observable, confirmed outcome rather than a persuasive answer.
5. **Adapts the interaction**—voice, concise text, generated view, or targeted question—to the user's situation.
6. Is **hard to reproduce well** because it needs several reliable capabilities working together; not merely a novel animation or model prompt.

---

## 2. The six flagship differentiators

The following six should define Nilumi's personality and long-term product direction. Each includes a deliberately small first version so the entire platform does not need to be built at once.

### D1 — Conversation *becomes* the interface (trusted Generative UI)

**User problem.** Most assistants respond in text; most family apps force users into tabs. The family needs the right **interactive view at the moment of asking**, without navigating or designing a screen.

**Signature behavior.** The user can say:

- “Show everything our home needs this week, grouped by who is handling it.” → generated **grouped task board**, with completion, reschedule, and filter actions.
- “What did we spend on the car this year?” → **category breakdown and timeline**, with sources and an honest “incomplete records” banner.
- “What's happening tomorrow?” → **compact timeline** on a phone, voice summary on a speaker.
- “Compare the last three purifier service visits.” → **comparison table** with source chips.
- “Help me split preparation for the weekend trip.” → **editable assignment proposal**, not a completed assignment until authorized.

**True differentiation hypothesis:** *Nilumi doesn't just create content in a chat; it creates the safest, smallest useful interactive workspace for the question, bound to live household records.* Generative UI is already an industry direction; Nilumi's product-specific advantage would be **permission-aware data binding, action safety, family context, and graceful voice/UI continuity**.

**Hard technical problems to solve:**

- Create an extensible **trusted component catalog** (cards, task board, date timeline, list, table, chart, comparison, form, evidence chip, member selector, approval).
- Let the model choose a **view and layout intent**, but not invent executable code, HTML, SQL, arbitrary URLs, or privileged actions.
- Resolve all data bindings **server-side under the requesting member's authorization**; private item counts and labels must not leak.
- Use server-issued action IDs/capabilities; a rendered **Done** button calls the same audited domain service as voice or chat.
- Stream progressive states, handle partial/invalid schemas, version catalog changes, and fall back to simple text/cards.
- Maintain continuity: a UI action updates the same task that a later spoken request refers to.

**First thin slice (P0):** Three adaptive result surfaces only: (1) task grouping, (2) dated timeline, (3) evidence-backed answer card. Add a clarification form. Do **not** generate arbitrary React components in production.

**Evidence of success:** A user resolves the request from the generated view without opening another tab; zero unauthorized actions or data bindings in adversarial tests; every unsupported payload safely falls back; low latency on real phones.

**Planning/implementation touchpoints:** Extend the existing `nilumi-ui/1` contract and `@nilumi/ui` components. Evaluate compatibility with Google's [A2UI declarative catalog approach](https://developers.googleblog.com/en/a2ui-v0-9-generative-ui/) rather than adopting a new framework by default. [AG-UI 1.0](https://docs.ag-ui.com/spec/1.0) can be evaluated later if agent-to-frontend stream interoperability becomes necessary. The [AI SDK structured-data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) and [custom-data streaming](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data) docs are relevant implementation references.

**Proposed view intent, illustrative only:**

```json
{
  "schemaVersion": "nilumi-ui/1",
  "view": "task-board",
  "groupBy": "assignee",
  "filter": { "dateRange": "this-week", "status": "active" },
  "dataHandle": "server-issued-authorized-query-id",
  "allowedActions": ["task.complete", "task.reschedule"]
}
```

The `dataHandle` and allowed action capabilities must be **generated/validated by the server**; the LLM should not be trusted to manufacture them.

---

### D2 — Dynamic household Q&A + intelligent follow-up questions

**User problem.** A family often doesn't know *what to ask*, and an assistant often lacks one important detail. Ordinary Q&A either gives a vague response, invents an answer, or asks too many questions.

**Signature behavior:**

- “When did we last repair the washing machine?” → a precise answer **with its source**, plus an optional **repair-history timeline**.
- “How much have we spent maintaining the car?” → a breakdown of **recorded expenses**, with a clear “may be incomplete” qualifier.
- “What do we know about the purifier?” → an automatically generated **‘Questions you can ask’** panel, based strictly on available authorized facts: warranty, last service, technician, next maintenance.
- “We renewed the insurance.” → one useful follow-up: **“What is the new expiry date?”** rather than a rigid long form.
- “Remind my husband about the appointment.” → clarify **which appointment** only if multiple visible candidates match.
- “What's missing for our child's school admission?” → derive a checklist only from an explicit document/list/template source; show **unknown** for unspecified requirements rather than invent rules.

**Three distinct subfeatures:**

1. **Grounded Q&A:** answer using visible records, with a proof chip and date precision.
2. **Dynamic question generation:** proactively suggest *useful, answerable questions* about a selected household entity, event, or timeline; label questions requiring missing information.
3. **Adaptive clarification:** ask the **minimum additional question** needed to perform a requested action or record a meaningful fact, then resume the suspended intent.

**Hard technical problems:** answerability detection; entity/link resolution across Tamil/English aliases; temporal and numerical aggregation; conflict-aware retrieval; evidence provenance; controlled query planning; permission-safe suggested questions; long conversation references (“that one,” “the previous service”); asking once and resuming later; distinguishing a question from consent to create a task.

**First thin slice (P0):** Evidence-backed memory Q&A + “What else can I ask about this?” for one asset; one-question clarification for person/date/duplicate ambiguity. Add generated multi-hop analytical questions after verified sources and aggregation exist.

**Safety:** Suggested Q&A must never expose the **existence** of another adult's private facts. Never infer health instructions, school requirements, or financial conclusions from missing or stale records.

**Success measure:** Answer correctness on a labeled eval set; source attribution correctness; correct abstention when unknown; clarification completion rate; median extra questions required per successful command. Goal: **fewer unnecessary questions, not more generated questions**.

**Example grounded answer contract (illustrative):**

```json
{
  "answerability": "partial",
  "answer": "I have recorded two service payments totaling ₹3,200.",
  "evidenceRefs": ["visible-record-1", "visible-record-2"],
  "missingContext": "Older visits may not have been recorded.",
  "suggestedViews": ["expense-timeline", "service-history"],
  "followUpQuestion": "Would you like to add the missing earlier visits?"
}
```

---

### D3 — Living household knowledge graph and object passports

**User problem.** Household facts are scattered between people, chats, appliances, paperwork, and time. A list of memory snippets doesn't capture relationships.

**Signature behavior:** A household asset has a continuously updated **passport**: what it is, where it is, who bought it, invoice/warranty references, service providers, dated service events, costs, pending issues, and next suggested action. It becomes possible to ask questions across connected records:

- “Who repaired the purifier before the last technician?”
- “Which appliances are likely coming out of warranty?”
- “What do we need to hand over when we shift house?”
- “Which bills or renewals depend on our vehicle?”

**Technical differentiation:** A typed entity-relation model with event chronology and provenance, **not** a loose LLM knowledge graph that can silently rewrite history. Preserve distinctions such as *when Nilumi learned a fact* versus *when the real-world event occurred*. Support aliases, merges, contradictions, and source-specific visibility.

**First thin slice (P1):** One **Home Assets** category (purifier, washing machine, vehicle) with a typed timeline and connected invoices/services. Build from already recorded memories and events; do not auto-invent missing relationships.

**Success measure:** Households correctly retrieve historical information months after entry, without manual reorganizing. Compare against plain keyword search on the same dataset.

---

### D4 — Household commitments, delegation, and follow-through without nagging

**User problem.** One family member often carries the mental load of asking, reminding, checking, and repeating. Ordinary to-do lists record work but don't resolve responsibility.

**Signature behavior:**

1. A person says, “Ask Arjun to book the vehicle service this week.”
2. Nilumi creates the task with **requester, assignee, deadline/window, and evidence**; Arjun gets an assignment notification.
3. He can **acknowledge, decline, reschedule, start, complete, or ask for clarification**.
4. A reminder is delivered according to **his** preferences, not an arbitrary household-wide alert.
5. The original requester can ask, “What's the status?” and see an authorized, factual answer.
6. Completion updates the authoritative task; future reminders stop automatically.

**Product difference to test:** The commitment is a **two-sided coordination lifecycle**, not just an assignee field. Nilumi must also avoid making one spouse a monitor of the other.

**Hard technical problems:** Assignment transitions; reassignment history; notification deduplication; idempotent completion; stale reminders; vague date windows; per-member privacy; optimistic concurrency; optional acknowledgment; declining without conflict; shared-device constraints.

**First thin slice (P0):** A single active assignee, optional acknowledgment/decline, configurable nonurgent follow-up, task completion, and a clear action receipt. **No default spouse escalation or performance scoring.**

**Success measure:** Number of delegated tasks completed without extra manual chasing; assignment acceptance rates; notification annoyance reports; both-adult adoption.

---

### D5 — Self-correcting, explainable, user-owned household memory

**User problem.** Long-term memory is useful only if a family can trust and repair it. “AI remembers everything” becomes a liability if the assistant stores wrong assertions or confuses correction with change.

**Signature behavior:**

- “The washing machine warranty expires in June.” Later: “Sorry, I meant July.” → **corrected**, with source and undoable change history where appropriate.
- “The previous service provider was Kumar, but now we use Ravi.” → records a **real-world transition**, retaining the historical relationship.
- Two adults supply conflicting purchase dates → Nilumi highlights **two attributed assertions**, requests clarification, and does not silently overwrite a private record.
- “Why do you think the warranty ends then?” → shows **the exact evidence used**.
- “Forget that fact.” → stops surfacing it from answers, search, summaries, and derived cards, subject to clearly explained backup/provider retention limitations.

**Hard technical problems:** Temporal modeling, provenance across derived objects, correction vs change semantics, identity collisions, entity merges, re-extraction regressions, contradiction detection, retention and forget propagation, provider-data limitations.

**First thin slice (P0/P1):** Verified provenance + edit/correct/forget on the first memory categories; then a periodic **contradiction inbox** that only suggests resolution to authorized members.

**Success measure:** Wrong-answer rate; percent of corrections reflected in later queries; unauthorized disclosure failures; resurrection of forgotten data after restore tests (**must be zero**).

**Positioning warning:** Competitors already market memory, privacy, or knowledge organization. The claim should be **measurable correctness and owner control**, not “Nilumi is the first to remember.”

---

### D6 — Calm household intelligence: a daily pulse, a weekly reset, and thoughtful suggestions

**User problem.** Household planning is a continuous stream of tiny decisions; dashboards require people to remember to check them, while excessive notifications create fatigue.

**Signature behavior:**

- **Daily personal pulse:** “Here are the three things needing your attention, and the two household items you should know about.” Every item has a source; other adults' private items do not appear.
- **Five-minute weekly family reset:** optional spoken or visual recap of unresolved tasks, upcoming obligations, planned purchases, and conflicting commitments. People can resolve items conversationally.
- **Relevant suggestions only:** “The purifier filter was last changed six months ago; should I set a reminder?” based on a recorded interval, **not** a claim that hardware needs maintenance without evidence.
- **Changes since last check:** “Two deadlines moved, one shared task was completed, and one date needs confirmation.”
- **Quiet modes:** reduce interruptions when users prefer digest-only delivery.

**Hard technical problems:** Event-delta assembly, relevance ranking, recency/urgency, per-person visibility, deduplication, suppression after acknowledgment, source invalidation, configurable quiet hours, stable digest identity, optional natural-language summarization.

**First thin slice (P0):** Existing deterministic Today brief plus one configurable weekly reset; recommendations always appear as **proposals requiring permission**. Add richer inference only after usefulness and annoyance are measured.

**Success measure:** Recurring, unprompted use; useful-action rate from briefs; push mute/unsubscribe rate; number of repeated human follow-ups avoided.

---

## 3. Additional high-potential differentiators / exploration backlog

These are credible experiments, **not** MVP commitments. They build on the six flagship capabilities.

| ID | Concept | Signature experience | What makes it technically hard | Suggested horizon |
|---|---|---|---|---|
| X1 | **Private-aware ambient voice and device handoff** | “What's on our schedule?” is safe on a room speaker; “show my private note” continues on the authenticated phone | Device identity, privacy-safe household context, speaker ambiguity, handoff tokens, on-device wake word | Later, after phone adoption |
| X2 | **Caregiver handover capsules** | A parent approves a 48-hour briefing of care instructions, contacts, and tasks for a grandparent/caregiver | Time-bound grants, revocation, selective disclosure, current-versus-stale instructions, audit | P2 |
| X3 | **Multimodal ‘capture once’** | Speak while photographing a warranty receipt; assistant files dates, service provider, and cost into the right asset history | OCR/VLM extraction, provenance to image region, private document masking, duplicate detection, confidence/confirmation | P1–P2 |
| X4 | **Tamil/Tanglish natural interaction** | Mid-sentence Tamil-English speech resolves the correct member, entity aliases, dates, and task | Code-switch STT, phonetic aliases, regional dates/units, multilingual retrieval, voice QA | P1, after language eval |
| X5 | **Household decision assistant** | “Which weekend is less busy for a family outing?” generates comparison and a proposed plan rather than changing calendars | Multi-member permissions, scheduling conflict detection, unavailable/private calendar handling, explicit consent | P2 |
| X6 | **Contextual preparation generator** | “We leave for the wedding on Friday” creates an **editable** preparation checklist based on shared confirmed facts and user-selected template | Template grounding, avoid fake requirements, owner assignment proposals, provenance, recurrence | P2 |
| X7 | **Household change journal / time travel** | “What changed with our car this year?” shows source-backed timeline of repairs, costs, owners, and open tasks | Temporal joins, event reconstruction, redaction after forget/unshare | P1 |
| X8 | **Maintenance intelligence, not black-box predictions** | Suggest next service using recorded last date + recorded interval, clearly marked “estimate” | Explainable rules, recurrence, incomplete records, avoiding false certainty | P1 |
| X9 | **Respectful load-sharing insights** | Optional couple-approved view of unassigned tasks and neglected categories, **without scoring people** | Consent, fairness vs biased logs, preventing interpersonal surveillance | Exploratory |
| X10 | **Family transitions / continuity packages** | Moving homes, welcoming a baby, school admission, travel, or emergency prep creates an editable, source-aware workspace | Multiple domain workflows, permissions, templates and missing-info handling | P2–P3 |
| X11 | **Explainable action receipts** | “Did you remind her?” returns scheduled/dispatched/accepted/acknowledged separately, never falsely claims delivery | Durable job receipts, provider acknowledgments, dedupe, audit | P0 foundational quality |
| X12 | **Low-friction capture from existing tools** | Share a message, photo, or email *to* Nilumi and get a safe proposal, not an automatic action | Platform share-sheet limits, consent, hostile content/prompt injection, duplicate imports | P2 |

**Avoid relying on novelty alone:** E.g. multimodal capture, family memory, Indian-language speech, and household records are **already advertised** by Nori, Home Run, Ohai, and/or Pratyek. Only prioritize an experiment if user tests show a materially better workflow.

---

## 4. The four signature demonstrations Nilumi should eventually excel at

These demonstrate differentiation better than listing 30 features on a website.

### Demo A — The house remembers a real-world event

**Spoken input:** “The water purifier was serviced today. We paid ₹1,800. They recommended changing the filter in six months.”

**Nilumi behavior:**

1. Identify the right purifier entity; if several exist, ask one clarification.
2. Record a dated service event and an expense, each linked to the source utterance.
3. Attach the recommendation as attributed information—not an unquestionable medical/technical fact.
4. Produce a dynamic **asset timeline + expense card** and a **proposed** reminder for the calculated follow-up date.
5. Allow one-tap correction of cost/date, and approval of the reminder.
6. Months later, answer “What did we do last time?” with its source and current schedule.

**Tests D1 + D2 + D3 + D5 + D6.**

### Demo B — One spouse delegates without becoming a manager

**Spoken input:** “Remind Arjun to fill petrol on Tuesday evening.”

**Nilumi behavior:** Resolve the intended member; represent **Tuesday evening as a time window**, not an invented precise time; create one task and assignment receipt; alert the assignee according to his preferences; permit acknowledge/snooze/reschedule/done; stop stale reminders; give a source-backed status answer to authorized members, without escalating by default.

**Tests D1 + D4 + D6 + X11.**

### Demo C — Questions create a useful, changing UI

**User:** “What has changed with our vehicle during the last six months?”

**Nilumi behavior:** Show an authorized, evidence-backed **change timeline** with service events, renewal dates and costs. Offer two derived follow-up questions: “Which records have missing invoices?” and “What is due next?” If records are incomplete, state the gap. Tapping “What is due next?” updates the visible interactive view without asking the user to switch modules.

**Tests D1 + D2 + D3 + D5 + X7.**

### Demo D — Shared space respects private information

**On room speaker:** “What's happening tomorrow?” → short **household-safe** answer, even when personal calendar entries exist.  
**On authenticated phone:** “And what's on my private list?” → private answer and optional dynamic task view.  
**During caregiver handover:** Only explicitly selected care-related records and tasks are visible until the handover expires.

**Tests D1 + D2 + X1 + X2 and the cross-member privacy model.**

---

## 5. Technical challenges that can create a real product edge

These are the capabilities to solve **deeply** rather than merely glue together in a demo.

| Capability | Distinguishing engineering outcome | Acceptance/evaluation idea |
|---|---|---|
| **Safe schema-driven Generative UI** | Model selects useful presentation; server binds only permitted data and actions | Invalid schema → safe fallback; adversarial actions denied; no unauthorized private content/counts |
| **Grounded dynamic Q&A** | Every factual answer traceable to source; questions generated only from authorized evidence | Separate retrieval, answer accuracy, source correctness, abstention and question usefulness evals |
| **One-question adaptive clarification** | Minimum necessary question, then reliably resume original intent | Measure clarification turns and task completion; test person/date ambiguity and interruption |
| **Temporal household memory** | Distinguishes historical change, correction, and conflicting assertions | Historical queries remain correct after amendments; no silent destructive merges |
| **Cross-member access boundaries** | Household vs shared vs private stays correct in UI, notifications, search, digests, speaker | Zero privacy leaks in seeded two-household, multi-member adversarial test suite |
| **Action/notification receipts** | Never says “done” before commit or “delivered” based only on provider acceptance | Inject duplicate requests, stale jobs, push failures and concurrent edits |
| **Voice-to-action continuity** | Spoken request, result card, button press, and follow-up voice update the same record | End-to-end test across voice, text, action click, resume and refresh |
| **Multilingual entity resolution** | Tamil, English and romanized aliases resolve the same real-world entity | Named-person/asset exact-match eval on realistic consented speech samples |
| **Retrieval with incomplete data** | Assistant can calculate totals without pretending to have complete expenses | “Known records” labels, gap prompts, numerical consistency tests |
| **Proactive relevance with consent** | Suggestions help without auto-editing household state or sending excessive pushes | Track suggestion adoption, rejections, quiet-hours compliance and annoyance |
| **Forgetting and revocation** | Data stops appearing in derivative cards, question suggestions and offline views | Seed→share→query→forget/revoke→search/brief/export/restore adversarial tests |
| **Long-term cost/latency control** | Fast trivial commands; heavier reasoning only when needed | Per-intent p50/p95 latency, model token cost and successful command ratio |

**Critical product principle:** A technically impressive capability is not differentiation if users can't notice its benefit. Every sophisticated backend feature must map to a visible “less effort / more trust / more follow-through” result.

---

## 6. Candidate prioritization (planning recommendation)

The priority values below are **hypotheses**, not market data. Product requirements, architecture decisions, and released functionality remain governed by Nilumi's existing documents and ADR review process.

| Priority | Product-facing differentiator | Minimum valuable slice | Dependency / sequencing note |
|---|---|---|---|
| **P0 / first family pilot** | Trust receipts for every voice/text action | “Heard / understood / saved / scheduled,” source, Undo/Edit when allowed | Existing voice and deterministic command pipeline |
| **P0** | Evidence-backed household answers | One source chip per factual answer; honest unknown | Structured memory and visibility permissions |
| **P0** | Dynamic Q&A / clarification | One precise missing-information question; resume command | Intent and entity resolution |
| **P0** | Adaptive generative UI | Three trusted view types, server-bound actions | Existing `nilumi-ui/1`, `@nilumi/ui` |
| **P0** | Two-sided shared task flow | Assigned→acknowledged/declined→completed, durable reminders | Proposed first-class assignment records |
| **P0** | Calm personal Today brief | Current, authorized items with evidence; optional spoken summary | Existing deterministic brief assembly |
| **P1 / prove depth** | Asset passports and living timeline | Purifier / washing machine / vehicle history | Memory entities, source events, linked operations |
| **P1** | Self-correcting knowledge | Contradiction detection and attributed resolution | Versioned facts, timeline, source quality |
| **P1** | Weekly family reset | Short opt-in “needs attention / upcoming / changed” review | Brief engine, permissions and task flow |
| **P1** | Tamil/Tanglish excellence | Narrow real-home speech eval and working member/asset references | Approved voice providers, multilingual aliases |
| **P2 / conditional expansion** | Multimodal capture and records | One document/receipt → one reviewable asset fact | OCR/provider privacy gate, R2 originals |
| **P2** | Caregiver handover | Revocable time-limited package | Grant model, child-related safety checks |
| **P2** | Contextual plan generation | Editable trip/birthday checklist proposal | Grounded templates, bounded orchestration |
| **P2–P3** | Shared speaker + private phone handoff | Household-safe room voice and authorized phone continuation | Dedicated endpoint, device auth, wake-word evaluation |

**Do not make P0 grow indefinitely.** The first pilot can narrow its distinguishing slice to: **one family fact, one shared commitment, one dependable reminder, and one useful generated view**, all handled through voice with trustworthy feedback. Expansion should follow observed usage.

---

## 7. Product differentiation metrics and go/no-go criteria

Judge differentiation through **comparative task success**, not through the number of tools or models supported.

| Question | What to measure | Suggested starting target or test |
|---|---|---|
| Do two adults voluntarily adopt it? | Both-adult weekly active usage, unprompted actions, 4-week retention | In a 10-household pilot, aim for ≥7 with both adults active at week 4; validate whether threshold predicts retention |
| Does it save real effort? | Time and steps to capture and retrieve vs familiar tools | Same scenario in Nilumi vs existing workflow; record completion time and errors |
| Does the generated UI improve understanding? | Task completion with adaptive view vs text-only response | Controlled A/B test on 3–5 household journeys |
| Is dynamic Q&A useful or noisy? | Suggested-question selection, clarification turns, rejected suggestions | Only retain generated prompts that increase successful outcomes |
| Does memory stay trustworthy? | Correct answer, citation quality, justified abstention | Grounded test cases including changed, missing, conflicting and forgotten facts |
| Does delegation reduce follow-up? | Completion without requester having to manually chase | Measure per household; watch for annoyance and perceived monitoring |
| Are private boundaries dependable? | Unauthorized read/action/existence leaks | **Zero** in tests and production incidents; block release on any confirmed violation |
| Do reminders work? | Scheduled job dispatch vs push acceptance vs device receipt vs user acknowledgment | Measure each separately; don't promise phone receipt from a provider acknowledgment |
| Is there willingness to pay? | Paid trials, not just survey intention | Test a specific household price only after repeat value is demonstrated |

**Pilot recommendation:** Start with your founding household, then—after required privacy/provider/legal checks—test with ~10 varied households. Observe what both adults actually do in the app when nobody reminds them to use it. Treat several weeks of natural repeat use as stronger evidence than enthusiastic demo reactions.

---

## 8. Market positioning: what to say and what to avoid

### Primary positioning

> **Nilumi is the household's trusted memory and follow-through assistant. Speak naturally, get the right interactive view, and let your family remember and coordinate together—without losing individual privacy.**

### Three product messages worth testing

1. **“Your home remembers.”** Repairs, warranties, expenses, relationships and history stay connected and correctable.
2. **“Say it once. Follow through together.”** Delegated responsibilities keep moving without repeated nagging.
3. **“Ask naturally. See exactly what matters.”** Answers turn into evidence-backed, actionable visual experiences.

### Claims to avoid

- “The first AI family assistant,” “the only assistant with long-term memory,” or “the only Tamil household assistant.”
- “Never forgets” or “guaranteed notifications.” Device-delivery channels cannot guarantee that a person receives or reads the alert.
- “Knows everything about your family.” Household data will be incomplete, disputed, out of date, or deliberately private.
- “Fully autonomous household manager” before external actions, approvals, recovery and consent have been tested.
- “Always listening” in an ordinary mobile PWA. Ambient wake-word experiences need a separately validated supported device/runtime.
- Relationship scoring, covert workload monitoring, emotion diagnosis, passive household audio recording, or automatic disclosure of a spouse's private data.
- Implicit medical, financial or child-care decisions derived from unverified notes.

---

## 9. What this document should change in product planning

This document is a **feature-opportunity register**. Each item requires an explicit adoption decision, not an automatic backlog entry.

Before promoting any differentiator into an implementation plan, record:

1. **User job / pain:** Who benefits, and what work disappears?
2. **Demo journey:** Exact utterance → structured action → result view → follow-up.
3. **Baseline comparison:** What does Nori, Home Run, Ohai, Pratyek, or an existing everyday workflow already achieve?
4. **Smallest testable implementation:** One narrow use case and measurable acceptance criteria.
5. **Privacy and consent rules:** Who may see it, which device, and what requires approval?
6. **Trust requirements:** Provenance, correction, abstention, idempotency, undo/forget, action receipts.
7. **Evaluation:** Accuracy, latency, user effort, repeat use, annoyance and real cost.
8. **Stage gate:** Pilot → improve → expand, or deliberately abandon.

### Files to cross-reference in the existing Nilumi repository

- [Product Plan](https://github.com/nishanthturnstile/nilumi/blob/main/docs/core/01-product-plan.md) — *what* becomes approved product scope.
- [Architecture](https://github.com/nishanthturnstile/nilumi/blob/main/docs/core/02-architecture.md) — contracts, permissions, memory, task lifecycle, dynamic UI and job reliability **after** a feature is approved.
- [Tech Stack](https://github.com/nishanthturnstile/nilumi/blob/main/docs/core/03-tech-stack.md) — platform choices; do not copy them into this strategy document.
- [Implementation Roadmap](https://github.com/nishanthturnstile/nilumi/blob/main/docs/core/05-implementation-roadmap.md) — phases and gates.
- [Design System — Pastel Rooms](https://github.com/nishanthturnstile/nilumi/blob/main/docs/design/29-design-system.md) — trusted rendered components and accessibility.
- [ADR catalog](https://github.com/nishanthturnstile/nilumi/blob/main/docs/adr/README.md) — record material changes as explicitly reviewed decisions.

**Suggested home in the repo:** `docs/research/nilumi-market-differentiation-2026.md`, or a similarly named ideation/strategy note. This is a suggestion only; no GitHub repository changes have been made.

---

## 10. Primary sources and current-reference notes

**Market sources (company websites, checked 11 October 2026):**

- Nori — [AI overview](https://heynori.com/ai-overview), [Family Hub](https://heynori.com/familyhub), [Family AI help](https://help.heynori.com/hc/en-us/articles/42765665497115-Using-Family-AI-voice-text).
- Home Run — [Family assistant](https://www.heyhomerun.ai/ai-family-assistant/), [Product overview](https://www.heyhomerun.ai/).
- Ohai — [Household manager](https://www.ohai.ai/).
- Pratyek — [Product and use cases](https://pratyek.com/product), [Main site](https://pratyek.com/).

**Official technical references behind the technically ambitious differentiators:**

- Google Developers, [A2UI v0.9: Declarative Generative UI, April 2026](https://developers.googleblog.com/en/a2ui-v0-9-generative-ui/) — component catalogs, incremental updates, model-directed UI intent.
- Google Developers, [Introducing A2UI](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) — separation between declarative UI and executable host components.
- [AG-UI 1.0 specification](https://docs.ag-ui.com/spec/1.0) — stream semantics and validation/consent boundaries for agent-facing interfaces.
- [AI SDK: structured output](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) and [streaming custom data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data) — typed data and interactive response delivery.

**Research limitation:** A public competitor landing page cannot prove that Nilumi will be unique or superior on any feature. **Differentiation is a testable hypothesis** requiring reproducible benchmark journeys, real user retention, and current vendor comparisons. Avoid turning absent documentation into a claim that a competitor lacks functionality.

---

## Final product decision to carry forward

**Build a trustworthy household interaction loop first:**

**Speak naturally → identify the right people and household context → remember or act on authorized records → generate the right interactive answer → show evidence and action receipts → follow through reliably → let the family correct the system.**

This is the combination that could make Nilumi meaningfully different. The six flagship ideas are intended to reinforce that loop; additional features should be prioritized only if they make it easier, safer, or more valuable for both adults in the household.
