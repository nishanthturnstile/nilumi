# 02 — Architecture and Technical Design: Nilumi

> **Status:** Final baseline · Revision 2 after the October 2026 owner decisions · **Date:** October 2026
> **October 8, 2026 revision:** adds the Today brief, read-only Google Calendar, two execution paths, the tool broker and approvals, durable agent runs, the trusted UI catalog, multi-household readiness and the agentic horizon from [ADR-041](../adr/adr-041.md)–[ADR-049](../adr/adr-049.md). Agent runs, artifacts and delegation are post-pilot.
> **Related:** [ADR catalogue](../adr/README.md) · [01 Product Plan](01-product-plan.md) · [03 Tech Stack](03-tech-stack.md) · [04 Research](../research/04-research.md) · [05 Implementation Roadmap](05-implementation-roadmap.md)

## How to read this document

- §1–§5: drivers, principles, topology and code structure.
- §6–§7: the **turn pipeline** (the heart of the system), the execution paths, tool broker, durable runs and UI catalog (§6.5–§6.8), and the NLU contract.
- §8–§13: memory model, data model, retrieval, identity and entity resolution, dates, lists, reminders, the Today brief and Google Calendar.
- §14–§18: voice, privacy and security, observability and evaluation, operations, latency.
- §19–§21: API surface, evolution path, and a pointer to the ADR catalogue.
- This document owns technical design and contracts; [03 Tech Stack](03-tech-stack.md) owns technology choices and provider status. [ADR catalogue](../adr/README.md) owns accepted decision records; [04 Research](../research/04-research.md) owns evidence and review history; [05 Implementation Roadmap](05-implementation-roadmap.md) owns delivery sequence and spike prerequisites.
- **Baseline status:** accepted design does not mean implementation or verification is complete. Provider approvals, exact model/voice selections and platform proofs remain [pending validations](05-implementation-roadmap.md#5-pending-validations-and-decisions).
- **October 8 revision:** §6.5–§6.8, §13.4–§13.5, §20.8–§20.9 and the marked additions in §1–§5, §9 and §15–§21 come from [ADR-041](../adr/adr-041.md)–[ADR-049](../adr/adr-049.md) and the [October 8 review](../research/04-research.md#october-8-reference-architecture-consumer-and-platform-review). Anything marked planned, reserved or post-pilot is not built; pre-pilot items still depend on the [Phase 0 spikes](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

---

## 1. Context and drivers

### 1.1 System in one paragraph
Two adults (later, kids) use Nilumi, an installable Next.js 16 PWA at `https://app.nilumi.in` ([ADR-055](../adr/adr-055.md)), on their phones (one Android, one iPhone) to speak or type. A Railway project in the Southeast Asia (Singapore) region runs the app service (Next.js standalone Node server with the PWA, Hono `/v1` API, Better Auth and SSE), a worker service (graphile-worker jobs and maintenance), and Railway Postgres 18 with pgvector. The API transcribes speech, interprets it with one structured LLM call routed through the in-process AI SDK provider registry, executes deterministic commands against Postgres (memories, lists, tasks, reminders), retrieves evidence for questions, answers with citations, optionally speaks the reply, and streams result cards back to the phone. The worker delivers reminders through Web Push, appends the forget journal, runs maintenance and backups, and performs restore tests. Before the pilot it also assembles each member's daily **Today brief** deterministically under that member's own access context (§13.4) and, for adults who link it, reads their primary Google Calendar read-only for today and tomorrow (§13.5). Postgres is the only stateful authority.

### 1.2 Quality attributes (ranked)
| Rank | Attribute | Meaning here |
|---|---|---|
| 1 | **Correctness and trust** | Stored facts match what was said; answers come only from evidence; corrections and forgets are reliable |
| 2 | **Privacy** | Private items never cross members; explicit sharing is owner-controlled; secrets are never stored; forget means forget |
| 3 | **Latency** | Feels faster than opening a notes app on the measured India → Railway Singapore path (§18) |
| 4 | **Durability** | Family memory survives any single service failure through encrypted R2 backups, the forget journal, restore tests and Railway volume backups |
| 5 | **Evolvability** | New channels (Home Assistant), Tamil, the Vault and new models without rewrites |
| 6 | **Simplicity** | One Docker image, two Node start commands, one Postgres authority, and no platform-specific state |
| 7 | **Cost** | Expected monthly total ≈ ₹1,400–2,700, with AI budget caps still enforced (§17.4) |

### 1.3 Constraints
TypeScript end-to-end · Railway Southeast Asia (Singapore) on the owner's existing paid account · Next.js 16 App Router PWA with Turbopack, React 19, Tailwind v4 and Serwist · Vercel usage limited to free open-source libraries (Next.js, Turbopack, AI SDK and optional copy-in UI components) plus one metered exception: Vercel AI Gateway for LLM and embedding routing, funded by purchased credits on Hobby ([ADR-021](../adr/adr-021.md), [ADR-046](../adr/adr-046.md)) · Railway App Sleeping off for `app` and `worker` · Node 24 LTS · PWA on iOS and Android · domain `nilumi.in` bought; app origin `app.nilumi.in` attached before installing the app on the phones; static marketing site on the apex · English MVP, Tamil-ready · single household · one part-time developer.

---

## 2. Architecture principles

1. **LLM as parser, code as executor.** The LLM converts language into a typed command list. Deterministic code validates, resolves, authorizes and writes. The LLM never writes to the database directly and never decides permissions.
2. **Postgres is the authority.** Postgres is the source of truth for family data, vectors, full-text search, durable jobs, pub/sub invalidations and access policy. graphile-worker stores jobs in Postgres, SSE invalidations originate from Postgres `LISTEN/NOTIFY`, and backups/restore tests validate this single authority.
3. **Evidence or silence.** Answers cite stored evidence; without evidence, the answer is a deterministic "I don't know".
4. **Every input is an event.** Voice, text, UI edits, imports and documents all become `source_events`. Memories are derived from them and keep a link back.
5. **Channels are adapters.** The brain exposes one `turn` contract. The PWA is the first channel; Home Assistant and others come later.
6. **Model roles, not models.** Code depends on roles (`nlu`, `answer`, `embed`, `stt`, `tts`) resolved through the AI SDK provider registry. Each role is pinned to an exact model ID in config and changed only through the eval gate.
7. **Privacy in the database, not in conventions.** Visibility is enforced by row-level security, so a forgotten `WHERE` clause can't leak data.
8. **Design for Tamil, ship English.** Unicode-safe search, multilingual embeddings, `language` fields and STT/TTS adapters exist from day 1.
9. **Make the invisible visible.** Every turn produces a trace; every write produces a card with Undo.
10. **Two execution paths over the same executors.** Constrained commands (the turn pipeline, at most two LLM calls) are the default for every command. Bounded agent runs exist only for run types registered in code, with explicit step, tool and cost limits, and none ships before the pilot (§6.5, [ADR-041](../adr/adr-041.md)).
11. **Model output never authorizes.** A model may propose a command, tool call or action; code, policy, RLS and the acting member's own decision authorize it.
12. **Fail-closed tool policy and immutable approvals.** Declaring a tool does not grant it. Any request no policy rule matches is denied. An approval binds immutable arguments to the actor, target revision and policy version, and it can be consumed once (§6.6, [ADR-042](../adr/adr-042.md)).
13. **Trusted UI catalog, no raw HTML.** Output beyond plain text uses the versioned `nilumi-ui/1` components, composed by the server from validated data. Model text fills text fields only (§6.8, [ADR-044](../adr/adr-044.md)).
14. **External text is data, never instructions.** Calendar event text, forwarded or imported text, stored memories and transcripts, and later any connector, Vault OCR or MCP output, are delimited and rendered as untrusted data, like evidence (§10.3). They cannot change policy, choose tools or create proposals (§13.5, §15.1).

---

## 3. System context and topology

```mermaid
flowchart LR
  subgraph Phones
    A["Nishanth's phone<br/>(Android PWA)"]
    B["Wife's phone<br/>(iPhone PWA)"]
  end

  subgraph Rail["Railway project · Southeast Asia (Singapore)"]
    APP["app<br/>Next.js standalone<br/>PWA + Hono API + Better Auth + SSE"]
    WORKER["worker<br/>graphile-worker<br/>reminders + Today brief + maintenance"]
    PG[("postgres<br/>Postgres 18 + pgvector<br/>pg_trgm + FTS + RLS<br/>job queue + pub/sub")]
  end

  subgraph External["External services"]
    LLM["LLM providers<br/>direct via AI SDK registry"]
    STT["STT provider<br/>Sarvam default"]
    TTS["TTS provider<br/>direct adapter"]
    PUSH["Web Push services<br/>(FCM / APNs web push)"]
    R2[("Cloudflare R2<br/>encrypted backups + forget journal<br/>later Vault originals")]
    RESEND["Resend<br/>sign-in codes and invitations from no-reply@nilumi.in"]
    MON["Uptime monitor"]
    GCAL["Google Calendar API<br/>read-only, per adult (§13.5)"]
    HA["Home Assistant later<br/>(Hey Nilumi · §20.2)"]
  end

  A & B -- "HTTPS same origin · app.nilumi.in" --> APP
  APP -- "pg Pool / withMemberTx" --> PG
  WORKER -- "graphile-worker queue + scoped jobs" --> PG
  PG -- "LISTEN/NOTIFY IDs + kinds" --> APP
  APP --> LLM
  APP --> STT
  APP --> TTS
  APP --> RESEND
  WORKER --> LLM
  WORKER --> PUSH --> A & B
  WORKER --> R2
  APP -. "OAuth link / revoke" .-> GCAL
  WORKER -- "events.list today + tomorrow" --> GCAL
  MON --> APP
  HA -. "future channel adapter" .-> APP
```

**Why this topology:** Railway is the starting host because the owner already has a paid account, wants Singapore hosting and wants the app, worker and database together. The app and API share `app.nilumi.in`, so host-only cookies, PWA install state, push subscriptions, email sender and optional WebAuthn step-up bind to one final origin. Postgres remains the durable authority for data, vectors, search, jobs, pub/sub and RLS. R2 is off-platform durability for encrypted backups, the forget journal and later Vault originals. Google Calendar is a read-only data source for adults who link it; its event text is untrusted data, never instructions (§13.5). Home Assistant returns later as a **channel adapter** (§20.2) that calls the same turn contract.

---

## 4. Containers and deployment

The production unit is one Docker image deployed as two Railway services plus Railway Postgres.

| Service | Runtime / start command | Responsibility | Scaling / limits |
|---|---|---|---|
| `app` | Node 24 LTS, Next.js 16 `output: 'standalone'`, `node apps/web/server.js` | PWA, Hono `/v1` API at `app/api/[[...route]]/route.ts`, Better Auth at `/api/auth/*`, streamed turn responses, `GET /v1/events` SSE, health/readiness | 1 instance for MVP; stateless and can scale to 2. Railway proxy allows a request up to 15 min while data flows and closes after 5 min idle, so SSE sends heartbeat comments about every 25 s and clients reconnect with `Last-Event-ID` |
| `worker` | Same image, `node apps/worker/dist/worker.js` | graphile-worker tasks, reminder delivery, recurrence/snooze scheduling, forget-journal append, embeddings backfill, retention purges, forget audit, next-due computation, Today brief assembly and calendar window refresh (§13.4–§13.5), nightly backup + restore test | 1 always-on instance; App Sleeping off; jobs are at-least-once and idempotent |
| `postgres` | Railway Postgres 18 + pgvector template on a volume | Data, vectors, FTS, trigram/phonetic search, RLS, graphile-worker queue, budget reservations, `LISTEN/NOTIFY` invalidations | Private networking only; no public TCP proxy. We operate minor updates, `ALTER EXTENSION vector UPDATE`, config, disk monitoring and recovery |
| External services | Provider APIs | LLM/STT/TTS, Web Push, Resend, Cloudflare R2, uptime monitoring, Google Calendar (read-only, §13.5) | Enabled only after provider gate (§15.4); family data minimized per provider |

- **One image, two commands:** the multi-stage Dockerfile uses Node 24 slim and includes `postgresql-client-18` for `pg_dump`/`pg_restore`; it does **not** include ffmpeg. The same image and `docker-compose.yml` also support local parity and the Dokploy-VM exit path.
- **Same origin:** `https://app.nilumi.in` serves the PWA, API and auth routes; staging is `https://staging-app.nilumi.in` with its own database and synthetic data; the apex `https://nilumi.in` is a static marketing site with no app cookies ([ADR-055](../adr/adr-055.md)). There is no CORS surface for first-party calls, and server-set `SameSite` cookies stay simple.
- **Private networking and region:** `app`, `worker` and `postgres` communicate over Railway private networking in Singapore. External egress is only to approved providers.
- **Always-on:** App Sleeping/serverless mode stays off for both `app` and `worker`, because reminders and SSE require live processes.
- **Portability and exit:** if Railway operations become a burden, either run the same image + `docker-compose.yml` on the Dokploy VM, or move only Postgres to a managed Postgres provider while keeping the app/worker contract. RTO target stays ≤ 2 h via the runbook (§17.2).

---

## 5. Code structure

### 5.1 Monorepo (pnpm workspaces)

Extend this existing Nilumi repository in Phase 1. `packages/ui` (`@nilumi/ui`)
is the production design-system package: retain its tokens/helpers and add
reusable components to `src/` in place. Its `specimen/` stays a review reference;
screens, routes and feature data wiring belong in `apps/web`. The spike projects
remain references rather than becoming the production app. No new repository
or replacement UI package is planned.

```
nilumi/
├── apps/
│   ├── web/                         # Next.js 16 App Router PWA + Turbopack
│   │   ├── app/                     # pages, layouts, route handlers
│   │   │   ├── api/
│   │   │   │   ├── [[...route]]/    # Hono API mounted in Next.js
│   │   │   │   └── auth/            # Better Auth route handlers
│   │   ├── service-worker/          # Serwist SW, push, offline shell
│   │   └── modules/                 # server/client module boundaries (see 5.2)
│   └── worker/                      # graphile-worker entrypoint, tasks and crontab
├── packages/
│   ├── contracts/                   # Zod schemas: API DTOs, NLU command union, cards, events, nilumi-ui/1 catalog
│   ├── ui/                          # Design system "Pastel Rooms": globals.css tokens, shadcn/ui (Base UI) primitives, Nilumi composites (ADR-056)
│   ├── db/                          # Drizzle schema, migrations, RLS policies (SQL), seed
│   ├── ai/                          # provider registry, role aliases, prompts, adapters
│   └── domain/                      # pure logic: dates, detectors, normalization, scoring
├── evals/                           # datasets (JSONL), scorers, runner, reports/
├── .github/workflows/               # CI + manual live evals only
├── docs/                            # these documents
├── Dockerfile                       # one image for app and worker
├── docker-compose.yml               # local parity and Dokploy exit path
└── package.json
```

There is no `apps/server` and no separate API origin. All domain operations go through the Hono `/v1` API; Server Actions are not used for domain writes. Railway runs the same image with two start commands.

### 5.2 Server modules (boundaries enforced by lint rules: modules talk via exported service interfaces only)
| Module | Owns |
|---|---|
| `identity` | Better Auth email OTP integration, invite-only members, member relations, sessions, request context (household, member, member kind), the admin capability (re-read from `members` inside each admin action's transaction, so a revocation applies at once), the household privacy acknowledgement (§15.4) |
| `conversation` | Turn orchestration (§6), conversations, pending clarifications, response streaming, undo operations |
| `nlu` | Prompt assembly, the NLU call, schema validation, evidence-span and share-cue verification |
| `memory` | Predicate registry, memory writes, supersession, history, share/un-share, forget/redaction |
| `entities` | Entities, aliases, resolution cascade (§11), merge, safe shared projections |
| `retrieval` | Query planning, structured lookup, hybrid search, evidence packs, abstention gate, answer generation |
| `lists` | Lists, items, dedupe, offline mutation idempotency |
| `tasks` | Tasks, reminders, graphile-worker scheduling, recurrence, snooze, reconciliation |
| `notify` | Web Push subscriptions, deliveries, inbox and SSE invalidation events |
| `voice` | STT/TTS adapters, keyterm builder, native audio validation, R2 phrase cache |
| `privacy` | Shared sensitive-input detector with `refuse` and `mask` modes, redaction utilities, retention hooks, forget audit |
| `ai` | AI SDK provider registry, role aliases, the single gateway wrapper (no-training, `only` list, `store: false` where supported, routing-receipt check; [ADR-046](../adr/adr-046.md)), fallback wrappers, shadow-mode comparison logs |
| `observability` | Traces, cost accounting, metrics, admin endpoints |
| `ops` | Backups, restore tests, health/readiness, retention, Railway/Postgres operational checks |
| `briefs` | **Pre-pilot.** Today brief scheduling per member, deterministic assembly, `daily_briefs`/`brief_items`, the optional single summary call, push hand-off to `notify`, regeneration and scrubbing (§13.4) |
| `context` | **Pre-pilot.** Context assembly for briefs (and later runs) under the member's own RLS context: visible reminders, tasks, list state, cached calendar events, pending approvals and due dates from memory, each with an evidence reference; untrusted text kept in delimited data blocks |
| `integrations` | **Pre-pilot, behind S-GCAL.** Google Calendar connection through Better Auth `linkSocial`, granted-scope check, server-only token access, serialized refresh, bounded-window sync, disconnect and revocation (§13.5) |
| `policy` | **Pre-pilot (internal actions only).** The versioned default policy object, effect classes, actor/initiator inputs and fail-closed evaluation (§6.6) |
| `tool-broker` | **Pre-pilot subset.** Tool registry, approval proposals, decisions and dispatch for internal actions proposed by the Today brief; **post-pilot:** every tool call from agent runs (§6.6) |
| `ui-protocol` | **Pre-pilot (`card`, `list`, `evidence-chip`, `approval`).** Server-side composers for `nilumi-ui/1`; the Zod contracts live in `packages/contracts` and the PWA renders only known components (§6.8) |
| `agent-runtime` | **Post-pilot.** Registered run types, AI SDK loop controls, run state, leases and fencing (§6.5, §6.7) |
| `artifacts` | **Post-pilot.** Versioned artifacts with owner, visibility and forget handling (§6.8) |

Modules marked post-pilot are planned boundaries only; nothing in them is built before the pilot.

---

## 6. Turn pipeline

A **turn** is one user input (a voice clip or text) and everything the system does in response.

### 6.1 Sequence

```mermaid
sequenceDiagram
  autonumber
  participant P as PWA
  participant A as Next.js route handler + Hono
  participant S as STT
  participant D as Postgres
  participant R as AI SDK registry
  participant L as LLM
  participant T as TTS
  P->>A: POST /v1/turns {turn_id (uuidv7), audio | text}
  A->>S: transcribe(audio, keyterms) [voice only]
  S-->>A: transcript
  A->>A: sensitive-input boundary (refuse mode)
  A->>D: short withMemberTx: INSERT source_event + entity shortlist
  par NLU
    A->>R: resolve role nlu (AI Gateway wrapper)
    R->>L: structured output call
  and speculative retrieval
    A->>R: resolve role embed
    R->>L: embed(transcript)
    A->>D: hybrid search (RLS-scoped)
  end
  A-->>P: route-handler stream: transcript event
  A->>D: execute commands (short withMemberTx per command + turn_commands receipt)
  A-->>P: stream: result cards (with undo/share actions)
  opt command = ask / inspect
    A->>A: answerability gate; deterministic answer if single-fact
    A->>R: resolve role answer
    R->>L: answer(evidence pack) [synthesis only; sentence-gated]
    A-->>P: stream: validated sentences + evidence chips + speech.ready
  end
  P->>A: GET /v1/turns/{id}/speech/{seq} [voice input or always mode]
  A->>T: synthesize(sentence) [direct adapter]
  T-->>P: audio clip (queued playback)
  A->>D: commit turn ledger, content_refs, budget usage and trace before final success
  A-->>P: stream: done
```

### 6.2 Steps and rules
| Step | Rule |
|---|---|
| **Idempotency and execution ledger** | The client generates `turn_id` (uuidv7) before upload. The server binds it to the **authenticated member and a request hash** on first receipt; a reuse by another member or with a different body is rejected (409) without revealing anything. The turn moves through `received → transcribed → interpreted → executing → completed / failed`. Each command's effect, its `operations` row, budget accounting, `content_refs` and its result card commit **atomically together with a `turn_commands(turn_id, command_index)` receipt before success is returned**. A retry replays committed results and **resumes** only unfinished commands. |
| **Transactions** | Every database access goes through `withMemberTx(ctx, fn)` backed by a process-level `pg` Pool over Railway private networking: lease one client, `BEGIN`, set `app.household_id` and `app.member_id` with transaction-local `set_config`, run all scoped queries through the tx handle, then commit/rollback and release in `finally`. No global query handle is exported, and no transaction is held across STT, LLM, TTS, email or push calls. |
| **STT** | Voice clips ≤ 30 s (REST limit, suitable for push-to-talk). Keyterms (≤ 50) come from the **speaker's** most-used visible aliases (§14.3). The transcript is shown after the secret guard. |
| **Secret pre-guard** | The shared sensitive-input boundary (§15.3) runs **before** anything is persisted or sent to the LLM. On a hit: persist a redacted event, reply with a template, stop. |
| **Context assembly** | Now (household TZ), speaker + member relations, up to the last 3 turns of this conversation (text + referenced memory IDs), any pending clarification, the entity shortlist (≤ 20), and the transcript. |
| **NLU and routing** | One structured-output call via the AI SDK provider registry (§2, [ADR-022](../adr/adr-022.md)). Every LLM and embedding model is built by one gateway wrapper on Vercel AI Gateway with Gateway-managed credentials and no BYOK ([ADR-038](../adr/adr-038.md), [ADR-046](../adr/adr-046.md)). The wrapper sets `disallowPromptTraining`, an `only` provider list per role and `store: false` where supported. It checks each response's routing receipt; an unknown, BYOK or unlisted provider stops further calls for that role. A CI test forbids building models any other way. Timeout 5 s; one retry on the approved challenger. Budget, credit-exhaustion and `no_providers_available` errors are terminal: no retry or challenger call, straight to hard-cap degraded mode (§17.3). |
| **Speculative retrieval** | Runs in parallel with NLU for every turn and saves one round trip when the turn is a question. |
| **Execution** | Each command runs in its own short `withMemberTx`, so a multi-command turn can partially succeed. Each command returns a **card** and, where reversible, an **operation** (for undo). Failures and rejected facts produce error or "incomplete" cards; nothing is described as done unless it committed. |
| **Response stream** | The Next.js route handler returns a streamed response with transcript, cards, validated answer sentences and `speech.ready` events. User-visible success never depends on deferred work outside the request; the ledger commits before `done`. |
| **Speech** | TTS is synthesized on demand per sentence (§14.4). Voice input speaks by default; text input returns text only. |
| **Trace** | Every stage's timing, provider, exact model IDs (including STT), prompt versions, token counts, cost, NLU JSON, candidates and scores, evidence IDs, outcome and shadow-mode comparison metadata (§16.1) are written at the end of the turn. |

### 6.3 Clarifications
Clarification is triggered only by **deterministic conditions**, never by LLM-reported confidence:
- the entity resolves to two or more candidates within the ambiguity margin (§11.3);
- a date is ambiguous (e.g. "3/4" in a context where it isn't clearly day-first), or the LLM's resolution disagrees with chrono-node (§12);
- forget/correct/share/un-share matches more than one memory;
- a required slot is missing (a reminder without a time);
- sharing a fact would expose a private entity name/type and needs the owner to confirm the safe projection (§8.8).

The pending state is stored on `conversations.pending` with a 5-minute expiry. The next turn's NLU sees it and may emit `clarify_answer`. The original command then resumes with the chosen candidate.

### 6.4 Undo
Reversible commands record an `operations` row with its inverse **and its expected postcondition** (for example, "memory M is active at revision r"). The card's **Undo** (or "undo that") reverts the latest operation(s) of the conversation within 24 h **only if the postcondition still holds**. If the spouse has changed the fact since, undo shows a conflict card instead of overwriting newer data. Undoing a supersession explicitly restores the predecessor (§8.3 ordering). Undo marks memories `retracted`: undo is "that was a mistake". **Forget is not undoable**, and forgetting a memory invalidates every pending inverse that could resurrect it. Undoing a share is an un-share, not a delete.

### 6.5 Execution paths
Nilumi has two execution paths over the same domain executors, RLS context and receipts ([ADR-041](../adr/adr-041.md), which partially supersedes [ADR-003](../adr/adr-003.md)). The Today brief uses neither: it is a deterministic worker job (§13.4).

| | Constrained command (default) | Bounded agent run (post-pilot) |
|---|---|---|
| Entry | Every voice or text turn (§6.1) | Only a run type registered in code; code selects it, never the model |
| LLM calls | At most two (NLU, optional answer) | Up to the run type's explicit `stopWhen: isStepCount(n)`; never the AI SDK default of 20 |
| Tools | None; the closed command set (§7.1) maps to executors | An `activeTools` allow-list, narrowed per step with `prepareStep`; every call goes through the broker (§6.6) |
| Writes | Undo-first with templated confirmation cards ([ADR-010](../adr/adr-010.md)) | Internal writes need an approval card; external writes are denied until a later ADR |
| Model | Registry role aliases (§2, principle 6) | One declared role alias ([ADR-022](../adr/adr-022.md)) |
| Cost | Reservation before each provider call (§17.4) | Worst-case reservation before the run starts, plus a reservation before each step's model call ([ADR-047](../adr/adr-047.md)) |
| State | Turn ledger and receipts (§6.2) | Durable run tables with leases and fencing (§6.7) |
| Output | Result cards and validated sentences | Typed `nilumi-ui/1` parts only (§6.8) |
| Status | Pre-pilot path | No run type ships before the pilot; each needs spike S-AGENT and its evals (§16.2) |

**Run type contract (planned, illustrative):**
```ts
type RunTypeDefinition = {
  id: string; version: number;
  roleAlias: string;      // ADR-022 registry alias; exact model ID pinned in config
  maxSteps: number;       // passed as stopWhen: isStepCount(maxSteps)
  activeTools: ToolName[];// allow-list; prepareStep may only narrow it
  maxCostUsd: number;     // worst case, reserved before the run starts
  evalSuite: string;      // trajectory, approval-bypass and privacy fixtures
  enabled: boolean;       // false until the suite passes; a failing suite disables the run type
};
```
- A run executes as its **actor** (the member whose authority and RLS visibility apply) and records its **initiator** (member, routine, schedule or agent run) separately (§6.6).
- Tool calls reach the same executors as constrained commands, through the broker and policy. Model output never authorizes an action.
- The AI SDK `toolApproval` status only signals that approval is needed; persistence, binding and rechecks are Nilumi's (§6.6).
- No agent framework is added. AI SDK (S1 pins `ai` 7.0.130) remains the only model-orchestration library.
- H7 conversation mode (§20.6) is unchanged and may later reuse this path.

### 6.6 Tool broker, policy and approvals
**Broker stages.** Every tool call from a bounded run, and every action proposed for approval, passes through one server-side broker ([ADR-042](../adr/adr-042.md)):
1. **Resolve** the tool by name and version in the registry; an unknown or disabled tool is denied.
2. **Evaluate policy** for the actor, initiator, household, effect class, data scopes and target.
3. **Record the decision** (`allow`, `require_approval` or `deny`) with the policy version and reason.
4. **Execute** the executor with validated arguments inside the actor's `withMemberTx`.
5. **Record a receipt**, in the same transaction as an internal write.

Constrained commands keep their existing executor path, `turn_commands` receipts and `operations` rows (§6.2, §6.4).

**Registry.** Each tool declares its mechanism (name, version, Zod input schema), one effect class and the data scopes it touches. Declaring a tool does not grant it.

| Effect class | Examples | Default policy v1 |
|---|---|---|
| Read | Visible lists, reminders, memories | Allowed within the actor's RLS visibility |
| Reversible internal write | Add list items, create a reminder | From a constrained command: undo-first. Proposed by the Today brief or an agent run: approval |
| Irreversible internal write | Forget | From a constrained command: the existing explicit rules (§8.6). Proposed: approval |
| Notification | Reminder push, the member's own brief push | Existing reminder and push rules (§13.2–§13.3); routine pushes the member already authorized need no per-send approval |
| External read | A future connector read | No v1 rule, so denied. Calendar sync (§13.5) is an `integrations` worker job, not a broker tool |
| External write | Calendar write, outbound messages | Denied until a later ADR |

**Policy.**
- Inputs: actor, initiator (`member`, `routine`, `schedule`, `agent_run`), household (from the session or job, never the client), tool name and version, effect class, data scopes, and target record and revision.
- The default policy is an explicit, versioned object in code. Any request no rule matches is denied. Changing the policy is a reviewed code change with a new version.
- MCP tool annotations and other server-supplied hints are untrusted and never relax policy. Any future MCP tool starts disabled (§20.9).

**Approval binding.** A proposal (`approvals`, §9) stores immutable arguments bound to the actor, household, connection (if any), tool name and version, target-record revision, policy version, initiator and expiry. A trigger rejects changes to those columns.

| Status | Meaning |
|---|---|
| `pending` | Shown as an `approval` card to the actor only |
| `executed` | Approved, rechecks passed, the stored arguments ran and the receipt committed in the same transaction |
| `rejected` | The actor declined |
| `expired` | Past `expires_at`, or its source was scrubbed (§13.4) |
| `superseded` | The actor edited it; the edit is a new `pending` proposal |
| `stale` | Approved, but a dispatch recheck failed; nothing ran |

**Dispatch** (`POST /v1/approvals/:id/decision`, §19):
1. The request carries the proposal ID and `approve`, `reject` or `edit` only. Arguments sent with an approval are ignored; `edit` creates a new proposal that needs its own approval.
2. Only the actor can decide. Any other member gets the same not-found response as for an unknown ID, so the proposal's existence does not leak.
3. In one short `withMemberTx` as the actor, lock the row where `status = 'pending'` and `expires_at > now()`, then recheck authorization under RLS, the current policy, tool availability and version, and the target revision.
4. If every check passes, run the **stored** arguments, write one `tool_invocations` row (status `succeeded`, with the receipt) and its `content_refs`, and set `executed`, all in that transaction. Reversible executors still record an `operations` row, so the result card offers Undo (§6.4).
5. If any check fails, set `stale`, run nothing and explain why on the card. A stale, rejected or expired proposal has no invocation row.
6. A repeated decision reads the invocation by `approval_id` and replays the recorded outcome; it never runs again. `approval_id` is unique, so a racing second consume fails on the constraint and rolls back.

**Receipt before the pilot.** A minimal `tool_invocations` table (§9) ships with `approvals`, before the run tables. Before the pilot its `run_id` and `run_step_id` are always null and carry no foreign key; the run-table migration adds those foreign keys (§6.7). Approval receipts never go to `mutation_receipts`, which stays the offline idempotency ledger for list, task and inbox mutations (§13.1).

**After the pilot.** An approval created by a run step stores that step's run and step IDs, and its invocation must carry the same pair; a composite foreign key ties the step to its run. Approving commits the tool effect, the `tool_invocations` row and receipt, its `content_refs`, the run's `waiting_for_approval → queued` transition and the outbox job in one transaction. A resumed run reads the recorded invocation result and never calls the tool again.

**Scope before the pilot.** Approval cards cover internal actions proposed by the Today brief only, for example "Add a renewal reminder?" or "Add these to the shopping list?". No external-effect tool and no agent run exists before the pilot. Proposals are generated under the actor's RLS context, so a proposal can never touch another member's private data.

### 6.7 Durable agent runs
**Post-pilot.** These tables and transitions are defined now and created with the first bounded run type, after spike S-AGENT ([ADR-043](../adr/adr-043.md)). Before the pilot, only `daily_briefs`, `brief_items` and the minimal `tool_invocations` for approval receipts (§6.6) from this family of tables are created; the Today brief is a cron job, not a run. Spike S-DBOS may compare DBOS Transact before the run tables ship.

**Tables** (§9): `agent_runs`, `run_steps`, `tool_invocations` (already present; the run migration adds its run foreign keys) and the append-only `run_events`. graphile-worker jobs carry only `run_id`; all other state is read from Postgres.

**Legal state transitions.** `run_state_transitions` holds exactly the pairs below. A trigger on `agent_runs` requires `queued` on insert and rejects any other change of `state`. `completed`, `failed` and `cancelled` are terminal.

| From | To | Trigger | Written by |
|---|---|---|---|
| (insert) | `queued` | Run created after its worst-case cost is reserved | API |
| `queued` | `running` | A worker claims the lease | Worker |
| `queued` | `cancelled` | The actor cancels | API |
| `running` | `running` | Lease takeover after `lease_expires_at`: new `writer_id`, revision + 1 | Worker |
| `running` | `waiting_for_input` | A step needs the actor's input | Lease holder |
| `running` | `waiting_for_approval` | A step created an approval proposal | Lease holder |
| `running` | `paused` | Pause requested; applied at the next step boundary | Lease holder |
| `running` | `cancelled` | Cancel requested; applied at the next step boundary | Lease holder |
| `running` | `completed` | The final step finished | Lease holder |
| `running` | `failed` | Step limit reached without completion, a step reservation refused, or an unrecoverable error | Lease holder |
| `running` | `outcome_unknown` | An invocation may have been dispatched without a receipt | Lease holder or takeover worker |
| `waiting_for_input` | `queued` | Input recorded | API |
| `waiting_for_approval` | `queued` | The proposal was approved, rejected, expired or marked stale | API or expiry job |
| `waiting_for_input`, `waiting_for_approval` | `cancelled` | The actor cancels | API |
| `paused` | `queued` | The actor resumes | API |
| `paused` | `cancelled` | The actor cancels | API |
| `outcome_unknown` | `queued` | Reconciliation or the actor records the invocation's real outcome and resumes | API or reconciler |
| `outcome_unknown` | `failed`, `cancelled` | The actor ends the run | API |

**Leases and fencing.**
- Claim: `UPDATE agent_runs SET state = 'running', writer_id = $w, lease_expires_at = now() + $ttl, revision = revision + 1 WHERE id = $id AND revision = $rev AND (state = 'queued' OR (state = 'running' AND lease_expires_at < now())) RETURNING revision`.
- Every later write (step record, invocation, transition, lease renewal) compares and swaps on `(run_id, revision, writer_id)`. Zero rows updated means the writer is stale: it stops without recording steps or effects.
- The lease holder renews the lease while working. Waiting and paused states clear `writer_id` and release the lease; a decision, input or resume enqueues a new job keyed by run ID and revision.
- Pause and cancel requests on a running run are stored in `requested_action`, and the lease holder applies them before starting the next step, so a request never fences an effect in flight.

**Steps and effects.**
1. Before each model call, the step reserves its maximum cost within the run's reservation (§17.4). A refused reservation fails the run.
2. An internal write and its `tool_invocations` receipt commit in one transaction, so its outcome is never unknown.
3. An effect outside that transaction (a push send now, an external call later) first commits a `tool_invocations` row with an idempotency key and status `dispatching`, then dispatches, then records the receipt.
4. A takeover worker that finds an invocation still `dispatching` marks the invocation and the run `outcome_unknown`. It is **never redispatched automatically**; the run waits for reconciliation or the actor.

**Cancel and pause** stop future steps only. The UI states that an effect already dispatched cannot be recalled.

**Required tests when the tables ship:** stale-writer fencing, lease expiry and takeover, a crash between dispatch and receipt, cancellation after dispatch, and rejection of every transition not in the table.

### 6.8 Artifacts and trusted UI catalog
Output beyond plain text uses `nilumi-ui/1`, a versioned catalog of Zod schemas in `packages/contracts` ([ADR-044](../adr/adr-044.md)).

| Component | Use | Phase |
|---|---|---|
| `card` | One brief item or result: title, text, evidence and actions | Pre-pilot |
| `list` | Grouped items, such as brief sections or list state | Pre-pilot |
| `evidence-chip` | Link to the source record, memory or calendar event behind an item | Pre-pilot |
| `approval` | A proposal with Approve, Edit and Reject (§6.6) | Pre-pilot |
| `form` | Structured input for a run waiting for input | Post-pilot |
| `table` | Tabular results | Post-pilot |
| `progress` | Run state and step progress | Post-pilot |
| `artifact` | Reference to a versioned artifact | Post-pilot |

**Delivery.** Parts travel as typed data parts in AI SDK `UIMessage` streams, or as typed REST payloads such as `GET /v1/briefs/today`. Each part names its catalog version and component.

**Rendering rules.**
- The PWA validates each part with the same schema and renders only known components and props. Anything unknown or invalid falls back to plain text.
- No raw HTML is rendered. Markdown is rendered without HTML.
- The server composes components from validated data. Model text may fill text fields only, such as the brief's summary line, and never chooses components, IDs or actions.
- Component actions post a server-issued ID (for example an approval ID) to a typed endpoint and never carry executable arguments.
- Calendar text and other untrusted text appear only as plain text in text fields.

**Artifacts (post-pilot).** `artifacts` and immutable `artifact_versions` (§9) have an owner and [ADR-031](../adr/adr-031.md) visibility, RLS like memories, and `content_refs` for forget scrubbing. Export handling is decided when they ship. Any sandboxed artifact (rendered code or HTML) needs a separate decision; the minimum bar is a `srcdoc` iframe sandbox without `allow-same-origin`, a strict CSP and no network access.

**Deferred.** AG-UI, CopilotKit and MCP Apps are not adopted. Nilumi uses A2UI's declarative-catalog pattern, not its packages.

**Tests.** Schema tests for every component, and snapshot tests for brief and approval cards, run in CI (§16.2).

---

## 7. NLU contract

### 7.1 Output schema (Zod in `packages/contracts`, sent to the provider as a JSON Schema)
```ts
type NluResult = {
  language: "en" | "ta" | "mixed";
  commands: Command[];                    // 0..5, executed in order
  smalltalk_reply?: string;               // only when commands is empty
};

type Command =
  | { kind: "remember"; facts: FactCandidate[] }
  | { kind: "correct"; target: TargetRef; new_value: TypedValue;
      reason: "was_wrong" | "changed_in_world"; effective?: DateExpr;
      evidence: { start: number; end: number } }
  | { kind: "forget"; target: TargetRef }
  | { kind: "share"; target: TargetRef; evidence: { start: number; end: number } }
  | { kind: "unshare"; target: TargetRef }
  | { kind: "undo" }
  | { kind: "ask"; query: QueryPlan }
  | { kind: "inspect"; entity: EntityRef }
  | { kind: "list_add"; list: ListRef; items: { name: string; quantity?: number; unit?: string; note?: string }[] }
  | { kind: "list_complete" | "list_remove"; list: ListRef; items: string[] }
  | { kind: "list_read"; list: ListRef }
  | { kind: "task_create"; title: string; due?: DateExpr; assignees: MemberRef[]; remind_at?: DateExpr; recurrence?: string }
  | { kind: "reminder_create"; text: string; at: DateExpr; targets: MemberRef[]; recurrence?: string }
  | { kind: "task_complete"; target: TargetRef }
  | { kind: "task_list"; range?: DateExpr; assignee?: MemberRef }
  | { kind: "clarify_answer"; choice: string }
  | { kind: "unsupported"; reason: string };

type FactCandidate = {
  subject: EntityRef;
  predicate: string;                      // registry key, or "new:<snake_case>" (provisional)
  qualifier?: string;                     // role slot, e.g. "plumber" for service_provider
  object?: EntityRef;                     // entity-valued facts ("Ravi is our plumber")
  value?: TypedValue;                     // literal-valued facts
  valid_from?: DateExpr;                  // when it became true in the world, if stated ("from March")
  visibility_hint?: "household" | "shared" | "private";
  share_intent?: boolean;                 // true only when the evidence span contains an explicit share cue
  evidence: { start: number; end: number }; // exact character offsets into the transcript
  polarity: "affirmed" | "negated" | "hypothetical";
};

type EntityRef  = { existing_id?: string; mention: string; type_hint?: EntityType;
                    relation?: "self" | "spouse" | "child" | "children" | "household" };
type TargetRef  = { memory_id?: string; refers_to_last?: boolean; entity?: EntityRef; predicate?: string };
type TypedValue = { type: "text" | "date" | "datetime" | "number" | "money" | "phone" | "duration" | "boolean";
                    value: string; unit?: string; date?: DateExpr };
type DateExpr   = { phrase: string; resolved: string /* ISO 8601, household TZ */;
                    precision: "minute" | "day" | "month" | "year" | "approx" };
type QueryPlan  = { entities: EntityRef[]; predicates: string[]; time?: DateExpr;
                    answer_shape: "value" | "list" | "when" | "who" | "yes_no" | "summary";
                    include_history: boolean };
```

### 7.2 Validation after the LLM (deterministic)
1. **Schema validation** (Zod). On failure: one repair retry with the validation error, then a fallback reply.
2. **Evidence check**: each fact's `evidence` offsets must point at a transcript span that **contains the asserted value or entity mention** (normalized exact match), and the subject mention must be in the same clause. Deterministic cue rules (negation such as "not / no longer / never"; hypotheticals such as "if / maybe / might / should we") must agree with `polarity`. Only `affirmed` facts are written. Negated and hypothetical facts become a clarification or are ignored. Facts that fail validation are **shown as an "incomplete" card** ("I couldn't save: …"), never silently dropped. **Intent comes only from the member's own words:** every write command, share and visibility change must likewise cite a span of the current turn's transcript, or belong to the pending command the member is answering. Retrieved memories, calendar text, imported or forwarded text and earlier model output can only resolve references (step 6); they are never the evidence for a write.
3. **Share-cue validation**: `share_intent` or a `share` command is accepted only when the exact evidence span contains an explicit cue such as "share it with my wife", "tell my husband", "for both of us" or "let my wife know". The validator, not the LLM, decides that the cue exists. Without a verified cue, the LLM may only make facts **more private**, never less private.
4. **Health and allergy facts** (`allergic_to`, medication-like predicates) always require an explicit **Confirm** on the card before they become active. Answers about them always say "based on what's recorded", and the system never infers safety from the absence of a stored allergy.
5. **Registry check**: the predicate must exist and be compatible with the subject type and value type. `new:*` predicates are stored as **provisional** registry entries for admin review; they still work and are visibly marked.
6. **Reference checks**: `existing_id`s must be in the shortlist or context; `memory_id`s must be visible to the speaker (RLS). Sharing or un-sharing also verifies the actor is the owner.
7. **Date check**: recompute `resolved` from `phrase` with chrono-node (§12); a mismatch triggers a clarification.
8. **Policy check**: visibility defaults (§8.2), member targeting (reminders for "us" → all adults), shared-memory adult-only reads and existence-leak rules (§15.2).

### 7.3 Prompt structure (designed for provider prompt caching)
```
[static, cacheable]  role + rules · predicate registry (keys, types, descriptions, aliases)
                     · command schema · ~25 few-shot examples · safety and sharing rules
[dynamic]            now · speaker + relations · last ≤3 turns · pending clarification
                     · entity shortlist (id, type, canonical, aliases) · transcript
```
Prompts live in `packages/ai/prompts/*.ts` with a `PROMPT_VERSION`. The version, model ID and registry version are stored on every memory (`extractor`) and every trace. Cache minimums differ by provider; measure the fully serialized static prefix on the pinned model ([roadmap S3](05-implementation-roadmap.md#phase-0--spikes-and-decisions)) and never assume cache hits in the latency or cost budget.

---

## 8. Memory model

### 8.1 Concepts
| Concept | Definition |
|---|---|
| **Source event** | An immutable record of an input (voice/text/UI/document import): who, when, the raw text, STT or extraction metadata. Changed only by redaction. |
| **Entity** | A thing the household talks about: person (members *and* external people), appliance, vehicle, place, organization, service provider, document, item, food, activity. Has aliases. |
| **Member** | A household person who can log in or be targeted (adult/child). Each member *is* an entity, plus a `members` row. |
| **Memory** | One assertion: **subject → predicate → (object entity \| typed value)**, with visibility, provenance, validity time and status. |
| **Predicate** | A registry entry defining meaning, value type, cardinality, allowed subject types and default visibility. |
| **Operation** | One applied change with its inverse (the undo unit). |
| **History** | An append-only log of every memory state change, including visibility changes. |

### 8.2 Who it's about, who said it, who can see it
| Field | Question it answers | Example: Nishanth says "My wife prefers less spicy food" |
|---|---|---|
| `subject_entity_id` | Who or what is it about? | Wife (member entity) |
| `asserted_by_member_id` | Who said it? | Nishanth |
| `visibility` | Who can see it? | `household` |
| `owner_member_id` | If private or shared, whose? | null for household; owner for `private` and `shared` |
| `shared_at` | When did a private memory become shared? | null unless explicitly shared |
| `object_entity_id` | Is the value another entity? | null (the value is the literal "low") |
| `qualifier` | Which slot of a role-like predicate? | null (for "Our plumber is Ravi": `service_provider` + qualifier `plumber`) |

| Visibility | Who can read | Who can edit, forget or change visibility | Owner semantics |
|---|---|---|---|
| `household` | All adults; children later by `audience` | Any adult | `owner_member_id` is null |
| `shared` | All adults, never children | **Only the owner** | `owner_member_id` is immutable; `shared_at` records the grant time |
| `private` | Owner only | Owner only | `owner_member_id` is required |

**Default visibility rules** (deterministic; overridable on the card):
1. Category `note`, "for me", "remind me", "my private…" → `private` (owner = speaker).
2. The subject is the household, a shared asset, an external contact, a kid, or the spouse → `household`.
3. The subject is the speaker and the predicate is a preference/fact → registry `default_visibility` (household unless defined otherwise).
4. The LLM's `visibility_hint` may only make facts **more** private. It may make a fact less private (`private` → `shared`) only when an explicit share cue is verified deterministically in the evidence span (§7.2).
5. Memory data is never persisted in offline caches; only lists, tasks and the inbox are (§13.1), so share revocation is bounded by the next SSE invalidation, focus/refetch or app open.

### 8.3 Predicate registry and cardinality
Example entries (v1 ships ~40):

| key | memory_type | value_type | cardinality | subject types |
|---|---|---|---|---|
| `warranty_expires_on` | warranty | date | one | appliance, vehicle, item |
| `purchased_on` | purchase | date | one | appliance, vehicle, item |
| `serviced_on` | maintenance_event | date | **many** (events) | appliance, vehicle |
| `service_interval` | maintenance | duration | one | appliance, vehicle |
| `service_provider` | contact | entity | **one per qualifier** (`plumber`, `electrician`, `pediatrician`…) | household, appliance |
| `phone_number` | contact | phone | many | person, organization |
| `role_for_household` | contact | text ("plumber") | many | person |
| `stored_at` | location | text/entity | one | item |
| `prefers` / `dislikes` | preference | text | many | person |
| `allergic_to` | family_fact | text | many | person |
| `school` / `class_teacher` | family_fact | entity | one | person (child) |
| `birthday` / `anniversary` | event | date | one | person / household |
| `procedure` | procedure | text | many | appliance, household |
| `note` | note | text | many | any |

Rules:
- **Cardinality is owned by the registry and enforced by the database**: `memories(predicate_key, cardinality)` has a composite foreign key to `predicates(key, cardinality)`, so the copied column can't drift. Changing a predicate's cardinality is an explicit migration.
- **Cardinality `one`** is unique per subject + predicate + qualifier + visibility/owner. A new active value **supersedes** the old one in that slot. A shared fact keeps a separate slot from the household fact; sharing never silently changes the household record.
- **Supersession is serialized and ordered.** The writer takes `pg_advisory_xact_lock(hash(household, subject, predicate, qualifier, owner))`; this also covers the empty-slot case where two concurrent first writes race. Then it updates the predecessor, inserts the successor, and links them in one transaction.
- **Cardinality `many`** values are added. A near-duplicate (same subject+predicate, normalized value similarity ≥ 0.9) becomes a no-op ("Already known") under the reader's RLS context.
- **Contradiction on `one`** (a different value already exists and the user didn't say "change"): apply the supersede, and the card says "Updated: 15 Mar 2028 → 15 Apr 2028 [Undo]". For a shared fact colliding with a household fact, answers show both with attribution and the card offers an explicit "Make this the household value" action.
- **Event predicates** (`serviced_on`) are `many`. "Last serviced" is a query (max date), not a stored field.
- **Value shape invariant:** `value_type='entity'` ⇒ `object_entity_id` set and `value` null; otherwise `value` set and `object_entity_id` null (check constraint plus a trigger against the registry).

### 8.4 Time
- **Record time** (`created_at`, plus history timestamps): when the system learned or replaced something.
- **Valid time** (`valid_from`, `valid_to`): when the fact is true **in the world**. It is set only from what the user states ("from March", "until last week") or an explicit world change. **A correction never sets `valid_to`.**
- **Two kinds of replacement** (from `correct.reason` or the NLU's reading of "now / new / from now on" vs "wrong / I meant"):
  - `was_wrong` → predecessor `superseded`, history `corrected`, `valid_to` untouched (it was never true).
  - `changed_in_world` → predecessor `superseded`, `valid_to = effective date` (default: the turn time), history `superseded`.
- **Date values** carry `precision` (`day`/`month`/`year`/`approx`) and the original phrase, so "we bought it in 2020" is never shown as "1 Jan 2020".

### 8.5 Lifecycle

```mermaid
stateDiagram-v2
  [*] --> active: remember / import / UI create
  [*] --> pending_confirmation: health/allergy fact
  pending_confirmation --> active: Confirm on card
  pending_confirmation --> retracted: Discard
  active --> active: share / un-share (visibility change)
  active --> superseded: new value for a cardinality-one slot / correct
  active --> retracted: undo (within 24h, postcondition holds)
  active --> forgotten: forget
  superseded --> forgotten: forget (includes history)
  retracted --> [*]
  forgotten --> [*]
```
Only `active` memories are used for answers. `superseded` memories are used for history questions. `retracted` memories are invisible except in the admin trace. `forgotten` memories have no content left, and forget can't be undone.

### 8.6 Forget semantics
"Forget X" must mean **the system can no longer produce X**, for every member and every surface.

**Authorization:** household memories are forgettable by any adult. Private and shared memories are forgettable **only by the owner**; a non-owner request for a shared memory is refused without leaking extra detail. Vault documents later follow the same owner/visibility rule for `documents`, `document_chunks` and R2 originals (§20.1).

**Mechanism:** a narrowly privileged database function `forget_memory(memory_id, actor_member_id)` (`SECURITY DEFINER`, fixed `search_path`, EXECUTE granted only to `fa_app`). It first verifies authorization, then purges across members, because a household or shared fact's evidence may sit in the *other* spouse's surfaces after sharing. A **provenance map** (`content_refs`: which rows hold content derived from which memory or source event) tells it exactly where copies live. Each step:

| Store | Action |
|---|---|
| `memories` (+ its superseded chain unless the user says "only the latest") | `value`, `value_text`, `memory_text`, `evidence_span`, `evidence_refs` → **NULL**; `status=forgotten`. The FTS column recomputes to empty |
| `memory_history` | `old_value`/`new_value` → NULL; a content-free "forgotten by Y at T" row is kept |
| `memory_embeddings` | Rows deleted |
| `source_events.raw_text` | Redacted (`redaction='forgotten'`) if no other active memory depends on it; otherwise the forgotten span is masked |
| `turns` (`commands`, `cards`, `response_text`), `turn_commands.result`, `turn_traces.nlu_raw` | Content fields that reference the memory or its source event are scrubbed |
| `operations.inverse` | Inverses that could resurrect the content are voided (`status=expired`) |
| `conversations.pending` | Pending clarifications that mention it are cleared |
| `entities` / `entity_aliases` | An entity created by the forgotten fact with no other references is forgotten too |
| `inbox_items`, pending reminder occurrences | Scrubbed or cancelled if derived from it |
| Debug audio (if opted in) | Deleted |
| Clients | SSE invalidations and focus/reconnect refetches clear affected list/task/inbox cards; memory content was never offline-cached |

Then:
- The same database transaction inserts a **content-free tombstone** (memory ID, source event IDs, time) into `forget_tombstones` and enqueues a `journal_tombstone` graphile-worker job. The card says **"Forgotten"** when the DB redaction and outbox commit.
- The worker appends the tombstone to the off-platform R2 forget journal within seconds and sets `forget_tombstones.journaled_at`. The backup job first drains unjournaled tombstones and refuses to upload a dump unless every tombstone up to the dump snapshot is journaled. Every restore replays the journal before accepting traffic.
- A **forget audit** job searches all text columns for the forgotten value string; any hit fails the audit and alerts the admin.
- **Honest limits** (shown in Settings → Privacy): encrypted backups keep forgotten content until they expire (30 daily / 6 monthly), and copies already retained by AI providers under their own policies (§15.4) can't be erased by us.

### 8.7 Versioning and re-extraction
Every memory stores `extractor = {model, prompt_version, registry_version}`. Because source events are kept, an improved extractor can be **replayed offline** over past events to produce a *diff report* (new / changed / dropped facts). Changes are applied only after review. Memories the user has confirmed or edited are never replaced automatically.

### 8.8 Sharing (explicit, owner-only)
1. **Who can share:** only the owner of a private memory can share it. Household rows are already visible to adults; another adult can't share a private item they can't see.
2. **How sharing starts:** at capture time when the evidence span contains an explicit share cue verified by code (§7.2), or later through a card action / voice command that resolves to a visible owned memory.
3. **What `shared` means:** visibility becomes `shared`, `owner_member_id` remains immutable, `shared_at` is set, and all adults can read it. Children never read `shared` rows; later child access uses household `audience`.
4. **Owner rights:** only the owner can edit, forget or un-share a shared memory. Other adults can cite it, see it in answers and ask to make a separate household correction.
5. **Cardinality-one interaction:** a shared fact does **not** occupy the household cardinality-one slot. If a household value already exists, answers show both with attribution ("Household record: …; Nishanth's shared note: …"). Making it the household value is an explicit supersession.
6. **Referenced private entities:** if a shared memory points at an owner-private entity, the card asks to confirm that the entity's **name and type** become visible. The entity becomes `shared` as a safe projection; aliases and other memories stay private.
7. **History:** history snapshots visibility. The other adult sees history from the share time forward, never pre-share private values.
8. **Un-share:** visibility returns to `private`; the card warns it may already have been seen. Derived content in the other adult's turn cards and inbox items is scrubbed through `content_refs`. Undo of a share is un-share.
9. **Forget and evals:** forget of a shared memory is owner-only. Privacy evals include share, un-share, cached/derived content scrubbing, forget by a non-owner, cardinality collisions and existence leaks of shared entities.

---

## 9. Data model

Railway Postgres 18 with the pgvector template is the production database. All timestamps are `timestamptz` (UTC); the household timezone is applied at the edges. Better Auth owns its own tables (`user`, `session`, `account`, `verification`; `passkey` only when optional WebAuthn step-up is enabled), and `members.user_id` links to them. The DDL is abridged: Drizzle schema files are the source of truth, and RLS policies are SQL migrations.

**Household consistency** ([ADR-048](../adr/adr-048.md)). Every household-owned table has `household_id uuid not null`, including child, ledger and join tables. Only `households` and the global registries (`predicates`, `embedding_configs`, `run_state_transitions`) have none.
- **Composite foreign keys.** Every household-owned parent declares `unique (household_id, id)`, and every reference between household-owned rows is composite, `(household_id, parent_id)`, so a row can never point into another household. This covers member, entity, memory, source-event, list, task, connection, approval and run references alike. The abridged DDL shows single-column references for brevity, and the composite form on `member_relations` and `privacy_acknowledgement_members`; the Drizzle schema is the source of truth. Only references to the global registries and to Better Auth's `user` table stay single-column.
- **ID arrays.** Member-ID arrays (`tasks.assignee_member_ids`, `reminder_schedules.target_member_ids`) cannot carry foreign keys. A trigger rejects any ID that is not a member of the row's household. The ID arrays in `forget_tombstones` are a journal of deleted rows and deliberately have no check.
- **Polymorphic references.** `content_refs (table_name, row_id)`, `brief_items.source_id` and `approvals.target_id` cannot use a foreign key. Their `household_id` is set by server functions from the current context, and a trigger checks that the target table is on an allowlist and the target row exists in the same household.
- **RLS.** Policies on every household-owned table include `household_id = current_setting('app.household_id')::uuid`, including tables that also inherit through a parent.
- **CI.** A schema test fails if a table outside the global list lacks `household_id not null`, has a single-column foreign key to a household-owned parent, or has a member-ID array or polymorphic reference without its trigger.

```sql
-- Extensions (generic Postgres; no pg_cron or provider-only APIs)
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists fuzzystrmatch;

-- Household & identity -------------------------------------------------------
create table households (
  id uuid primary key default uuidv7(),
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  locale text not null default 'en-IN',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table entities (
  id uuid primary key default uuidv7(),
  household_id uuid not null references households(id),
  entity_type text not null,              -- person|appliance|vehicle|place|organization|service_provider|document|item|food|activity|custom
  canonical_name text not null,
  description text,
  attributes jsonb not null default '{}',
  visibility text not null default 'household' check (visibility in ('household','shared','private')),
  owner_member_id uuid,                   -- required for private/shared projections
  shared_at timestamptz,
  status text not null default 'active',  -- active|merged|forgotten
  merged_into_id uuid references entities(id),
  source_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((visibility = 'household' and owner_member_id is null and shared_at is null)
      or (visibility in ('shared','private') and owner_member_id is not null))
);

create table members (
  id uuid primary key default uuidv7(),
  household_id uuid not null references households(id),
  entity_id uuid not null unique references entities(id),
  user_id text unique,                    -- Better Auth user; null for kids without login
  kind text not null check (kind in ('adult','child')),   -- 'helper' later (ADR-034)
  is_admin boolean not null default false,               -- a capability, not a member kind
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (household_id, id),              -- target of composite household foreign keys
  check (not is_admin or kind = 'adult')
);

create table member_relations (
  household_id uuid not null,
  member_id uuid not null,
  relation text not null,                 -- spouse|child|parent|sibling
  related_member_id uuid not null,
  primary key (member_id, relation, related_member_id),
  foreign key (household_id, member_id) references members(household_id, id),
  foreign key (household_id, related_member_id) references members(household_id, id)
);

-- Pilot privacy notice (§15.4, ADR-046). At most one active row per household. The household is
-- acknowledged only while the active row matches the current notice version and its covered
-- members equal the household's current adults. A server function records, withdraws and
-- supersedes rows; after a withdrawal only the adult who withdrew can record the next one.
create table privacy_acknowledgements (
  id uuid primary key default uuidv7(),
  household_id uuid not null references households(id),
  notice_version text not null,
  recorded_by_member_id uuid not null,    -- an adult with the admin capability, or the last withdrawer
  recorded_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','withdrawn','superseded')),
  ended_at timestamptz,
  withdrawn_by_member_id uuid,
  unique (household_id, id),
  foreign key (household_id, recorded_by_member_id) references members(household_id, id),
  foreign key (household_id, withdrawn_by_member_id) references members(household_id, id),
  check ((status = 'active') = (ended_at is null)),
  check ((status = 'withdrawn') = (withdrawn_by_member_id is not null))
);
create unique index privacy_acknowledgements_one_active
  on privacy_acknowledgements (household_id) where status = 'active';

create table privacy_acknowledgement_members (   -- the adults an acknowledgement covers
  household_id uuid not null,
  acknowledgement_id uuid not null,
  member_id uuid not null,                -- a trigger requires kind = 'adult'
  primary key (acknowledgement_id, member_id),
  foreign key (household_id, acknowledgement_id) references privacy_acknowledgements(household_id, id),
  foreign key (household_id, member_id) references members(household_id, id)
);

create table entity_aliases (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  entity_id uuid not null references entities(id),
  alias text not null,
  alias_norm text not null,
  alias_phonetic text,
  language text not null default 'en',
  source text not null,                   -- seed|user|nlu|clarification|stt_correction
  use_count int not null default 0,
  last_used_at timestamptz,
  unique (household_id, alias_norm, entity_id)
);
create index on entity_aliases using gin (alias_norm gin_trgm_ops);
create index on entity_aliases (household_id, alias_phonetic);

-- Knowledge -----------------------------------------------------------------
create table predicates (
  key text primary key,
  memory_type text not null,
  value_type text not null,               -- text|date|datetime|number|money|phone|duration|boolean|entity
  cardinality text not null check (cardinality in ('one','many')),
  subject_types text[] not null,
  default_visibility text not null default 'household' check (default_visibility in ('household','private')),
  description text not null,
  aliases text[] not null default '{}',
  status text not null default 'active',  -- active|provisional|deprecated
  registry_version int not null,
  unique (key, cardinality)
);

create table conversations (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  member_id uuid not null references members(id),
  channel text not null,                  -- pwa|ha|import
  pending jsonb,
  pending_expires_at timestamptz,
  last_turn_at timestamptz,
  created_at timestamptz not null default now()
);

create table source_events (
  id uuid primary key,                    -- = client turn_id (uuidv7)
  household_id uuid not null,
  member_id uuid not null references members(id),
  request_hash text not null,
  state text not null default 'received', -- received|transcribed|interpreted|executing|completed|failed
  conversation_id uuid references conversations(id),
  channel text not null,
  modality text not null check (modality in ('voice','text','ui','import','document')),
  raw_text text,
  redaction text,                         -- null|sensitive|forgotten|retention
  language text,
  stt jsonb,                              -- {provider, model, ms, confidence, audio_ms}
  extraction jsonb,                       -- later Vault imports: extractor, version, page refs
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table turn_commands (
  household_id uuid not null,
  source_event_id uuid not null references source_events(id),
  command_index smallint not null,
  kind text not null,
  status text not null check (status in ('pending','committed','failed','skipped')),
  operation_id uuid,
  result jsonb,
  committed_at timestamptz,
  primary key (source_event_id, command_index)
);

create table memories (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  subject_entity_id uuid not null references entities(id),
  predicate_key text not null,
  cardinality text not null,
  qualifier text not null default '',
  object_entity_id uuid references entities(id),
  value jsonb,
  value_text text,
  memory_text text,
  visibility text not null check (visibility in ('household','shared','private')),
  owner_member_id uuid references members(id),
  shared_at timestamptz,
  asserted_by_member_id uuid not null references members(id),
  valid_from timestamptz, valid_to timestamptz,
  status text not null check (status in ('pending_confirmation','active','superseded','retracted','forgotten')),
  superseded_by_id uuid references memories(id),
  replaced_reason text,                   -- was_wrong|changed_in_world
  importance smallint not null default 0,
  revision int not null default 1,
  source_event_id uuid not null references source_events(id),
  evidence_span text,
  evidence_refs jsonb not null default '[]', -- [{source_type:'memory'|'document', memory_id?, document_id?, chunk_id?, page?}]
  extractor jsonb not null,
  fts tsvector generated always as (
        setweight(to_tsvector('english', coalesce(memory_text,'')), 'A')
     || setweight(to_tsvector('simple',  coalesce(memory_text,'') || ' ' || coalesce(value_text,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (predicate_key, cardinality) references predicates(key, cardinality),
  check ((visibility = 'household' and owner_member_id is null and shared_at is null)
      or (visibility in ('shared','private') and owner_member_id is not null))
);
create index on memories using gin (fts);
create index on memories (household_id, subject_entity_id, predicate_key) where status = 'active';
create unique index memories_one_active_value on memories (
  household_id, subject_entity_id, predicate_key, qualifier, visibility,
  coalesce(owner_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
) where status = 'active' and cardinality = 'one';

create table memory_embeddings (
  household_id uuid not null,
  memory_id uuid not null references memories(id) on delete cascade,
  config_id text not null,
  content_hash text not null,
  embedding halfvec not null,
  created_at timestamptz not null default now(),
  primary key (memory_id, config_id)
);

create table operations (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  member_id uuid not null,
  source_event_id uuid references source_events(id),
  kind text not null,
  inverse jsonb not null,
  expected jsonb not null,
  status text not null default 'applied', -- applied|undone|expired|conflict
  undo_expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table memory_history (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  memory_id uuid not null references memories(id),
  operation_id uuid references operations(id),
  change_type text not null,              -- created|superseded|corrected|edited|visibility_changed|retracted|forgotten
  old_value jsonb, new_value jsonb,
  old_visibility text, new_visibility text,
  actor_member_id uuid not null,
  source_event_id uuid,
  created_at timestamptz not null default now()
);

create table content_refs (
  id uuid primary key default uuidv7(),
  household_id uuid not null,             -- set by server functions; a trigger checks the target row
  memory_id uuid,
  source_event_id uuid,
  table_name text not null,               -- turns|turn_commands|turn_traces|inbox_items|operations|conversations
                                          -- + daily_briefs|brief_items|approvals|tool_invocations (pre-pilot, §13.4, §6.6)
                                          -- + run_steps|agent_runs|artifacts|artifact_versions (post-pilot)
  row_id text not null,
  check (memory_id is not null or source_event_id is not null),
  unique nulls not distinct (table_name, row_id, memory_id, source_event_id)
);

create table forget_tombstones (
  id uuid primary key default uuidv7(),
  household_id uuid not null,             -- journal and restore replay are per household
  memory_ids uuid[] not null,
  source_event_ids uuid[] not null,
  entity_ids uuid[] not null default '{}',
  actor_member_id uuid not null,
  created_at timestamptz not null default now(),
  journaled_at timestamptz                -- set once the worker appends to R2
);

-- Operational state ----------------------------------------------------------
-- MVP lists and tasks support household/private visibility. Add shared later only if a real use case needs it.
create table lists (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  kind text not null check (kind in ('shopping','todo','custom')),
  name text not null,
  visibility text not null default 'household' check (visibility in ('household','private')),
  owner_member_id uuid,
  check ((visibility = 'household' and owner_member_id is null)
      or (visibility = 'private' and owner_member_id is not null))
);

create table list_items (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  list_id uuid not null references lists(id),
  title text not null,
  name_norm text not null,
  quantity numeric, unit text, note text,
  status text not null check (status in ('open','done','removed')),
  added_by_member_id uuid not null,
  completed_by_member_id uuid, completed_at timestamptz,
  source_event_id uuid,
  version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index list_items_open_dedupe on list_items (list_id, name_norm) where status = 'open';

create table mutation_receipts (          -- offline list, task and inbox mutations only (§13.1); not approvals
  client_mutation_id uuid primary key,
  household_id uuid not null,
  member_id uuid not null,
  request_hash text not null,
  kind text not null,
  canonical_id uuid,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  title text not null, notes text,
  assignee_member_ids uuid[] not null,
  visibility text not null check (visibility in ('household','private')),
  owner_member_id uuid,
  due_at timestamptz, due_precision text,
  status text not null check (status in ('open','done','cancelled')),
  created_by_member_id uuid not null,
  completed_by_member_id uuid, completed_at timestamptz,
  source_event_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table reminder_schedules (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  task_id uuid references tasks(id),
  text text not null,
  dtstart timestamptz not null,
  tzid text not null default 'Asia/Kolkata',
  rrule text,
  target_member_ids uuid[] not null,
  created_by_member_id uuid not null,
  visibility text not null check (visibility in ('household','private')),
  owner_member_id uuid,
  status text not null check (status in ('active','paused','ended','cancelled')),
  revision int not null default 1,
  late_policy text not null default 'deliver_as_missed',
  source_event_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table reminder_occurrences (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  schedule_id uuid not null references reminder_schedules(id),
  schedule_revision int not null,
  scheduled_for timestamptz not null,
  snoozed_until timestamptz,
  status text not null check (status in ('scheduled','dispatching','sent','acknowledged','skipped','cancelled')),
  job_key text not null unique,
  scheduled_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (schedule_id, scheduled_for, schedule_revision)
);

create table notification_deliveries (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  occurrence_id uuid references reminder_occurrences(id),   -- reminder push; null for a brief push
  daily_brief_id uuid,                    -- Today brief push (§13.4); references daily_briefs below
  member_id uuid not null,
  push_subscription_id uuid,
  deliver_after timestamptz not null,
  dispatched_at timestamptz,
  accepted_at timestamptz,
  received_at timestamptz,
  acknowledged_at timestamptz,
  error text,
  unique (occurrence_id, member_id, push_subscription_id),
  check (num_nonnulls(occurrence_id, daily_brief_id) = 1)
);
create unique index notification_deliveries_brief_dedupe
  on notification_deliveries (daily_brief_id, member_id, push_subscription_id) where daily_brief_id is not null;

create table push_subscriptions (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  member_id uuid not null references members(id),
  endpoint text not null unique, p256dh text not null, auth text not null,
  user_agent text, platform text,
  last_success_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table inbox_items (
  id uuid primary key default uuidv7(),
  household_id uuid not null, member_id uuid not null,
  kind text not null,
  payload jsonb not null, read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Observability, budgets and feedback ---------------------------------------
create table turns (
  id uuid primary key default uuidv7(),
  source_event_id uuid not null unique references source_events(id),
  conversation_id uuid not null references conversations(id),
  household_id uuid not null, member_id uuid not null,
  commands jsonb,
  cards jsonb,
  response_text text,
  evidence_refs jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table turn_traces (
  source_event_id uuid primary key references source_events(id),
  household_id uuid not null, member_id uuid not null,
  stages jsonb not null,
  nlu_raw jsonb, retrieval jsonb,
  models jsonb not null, prompt_versions jsonb not null,
  shadow jsonb,                           -- challenger comparisons; no live split
  tokens jsonb, cost_usd numeric(10,6),
  total_ms int, outcome text,
  created_at timestamptz not null default now()
);

create table budget_reservations (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  member_id uuid not null,
  source_event_id uuid references source_events(id),
  daily_brief_id uuid,                    -- the brief's optional summary call (§13.4)
  run_id uuid, run_step_id uuid,          -- post-pilot: run_step_id null = the run's worst-case reservation;
                                          -- set = one step's reservation within it (§6.7)
  provider_role text not null,
  estimated_usd numeric(10,6) not null,
  actual_usd numeric(10,6),
  status text not null check (status in ('reserved','reconciled','released')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (num_nonnulls(source_event_id, daily_brief_id, run_id) <= 1),
  check (run_step_id is null or run_id is not null)
);

create table feedback (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  source_event_id uuid not null references source_events(id),
  member_id uuid not null,
  rating text not null check (rating in ('correct','partial','wrong','should_not_remember')),
  failure_tag text,
  note text,
  created_at timestamptz not null default now()
);

-- Reserved for H1 Family Records Vault; not created in the MVP:
-- documents, document_pages, document_extractions, document_chunks.
-- They reuse visibility/owner semantics, R2 keys under households/{household_id}/...,
-- source_type evidence refs, and the shared sensitive detector in mask mode.
```

**Database locale:** create the database with an ICU or `en_US.UTF-8` locale (not `C`). Whether `pg_trgm` and FTS tokenize Tamil (including vowel signs) acceptably is **verified, not assumed**, under the production locale (§20.3); delivery validation is assigned to [roadmap S5](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

**October 8 additions: Today brief, approvals, tool invocations and calendar (pre-pilot).** Abridged like the DDL above. Policies are listed in §15.2. Every table carries `household_id` from the session or job, never the client ([ADR-048](../adr/adr-048.md)). Calendar tables are created only after spike S-GCAL passes ([ADR-045](../adr/adr-045.md)).

```sql
-- Google Calendar (§13.5) ------------------------------------------------------
-- RLS: owner only. No family text. OAuth tokens stay in Better Auth's `account` row,
-- encrypted at rest, and are read only by server code by account ID + owning user.
create table connections (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  member_id uuid not null references members(id),   -- owner; adults only
  provider text not null check (provider in ('google_calendar')),
  account_id text,                        -- Better Auth account; null after disconnect
  granted_scopes text[] not null,         -- must be exactly calendar.events.readonly
  calendar_id text not null default 'primary',
  status text not null check (status in ('active','reconnect_required','disconnecting','disconnected')),
  sync_generation int not null default 1, -- bumped on disconnect and reconnect; fences in-flight syncs
  refresh_lease_until timestamptz,        -- serializes token refresh per account
  last_synced_at timestamptz,
  last_error text,                        -- category only: expired|revoked|scope_missing|transient
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (member_id, provider)            -- re-linking reuses the row
);

-- RLS: owner only, with no shared or household projection. Not memories; excluded from
-- retrieval, the NLU shortlist, keyterms and export. Event text is untrusted data.
-- Rows are replaced on every window sync and deleted on disconnect or reconnect_required.
create table calendar_events_cache (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  connection_id uuid not null references connections(id),
  owner_member_id uuid not null references members(id),
  sync_generation int not null,           -- rows from an older generation are never read
  google_event_id text not null,          -- instance ID (singleEvents=true)
  recurring_event_id text,
  title text,                             -- event summary; description and attendees are not stored
  location text,
  is_all_day boolean not null,
  starts_at timestamptz, ends_at timestamptz,   -- timed events
  start_date date, end_date date,               -- all-day: date-only, end exclusive, household time zone
  event_tz text,                          -- the event's own time zone, for display
  status text not null check (status in ('confirmed','tentative')),   -- cancelled instances are dropped
  fetched_at timestamptz not null,
  unique (connection_id, google_event_id),
  check ((is_all_day and start_date is not null and end_date is not null and starts_at is null and ends_at is null)
      or (not is_all_day and starts_at is not null and ends_at is not null and start_date is null and end_date is null))
);

-- Approvals (§6.6) ---------------------------------------------------------------
-- RLS: actor only; other members cannot see that a proposal exists.
-- Family text in args: content_refs; forget, un-share or revoke expires a pending proposal
-- and scrubs args of decided ones.
create table approvals (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  actor_member_id uuid not null references members(id),   -- the only member who can see or decide it
  initiator_kind text not null check (initiator_kind in ('member','routine','schedule','agent_run')),
  initiator_id uuid,                      -- e.g. daily_briefs.id; agent_runs.id post-pilot
  connection_id uuid references connections(id),          -- null for internal tools
  tool_name text not null,
  tool_version int not null,
  effect_class text not null check (effect_class in ('reversible_internal_write','irreversible_internal_write')),
                                          -- pre-pilot: internal writes only
  args jsonb not null,                    -- validated against the tool schema; executed verbatim
  args_hash text not null,
  target_table text, target_id uuid, target_revision int, -- null when the action creates a record
  policy_version text not null,
  status text not null default 'pending'
    check (status in ('pending','executed','rejected','expired','superseded','stale')),
  supersedes_id uuid references approvals(id),            -- set when created by an edit
  expires_at timestamptz not null,
  decided_at timestamptz,
  decision_note text,                     -- reason category for stale or expired; no family text
  created_at timestamptz not null default now()
);
-- A trigger allows only status, decided_at and decision_note to change, and status only from 'pending'.
-- Receipt: one tool_invocations row per executed approval (approval_id unique), written in the
-- dispatch transaction, so an approval is consumed once.

-- Tool invocations (§6.6, §6.7) -------------------------------------------------
-- Created pre-pilot with approvals; holds approval receipts. RLS: actor only.
-- Family text in args and receipt: content_refs. The run-table migration (post-pilot) adds
-- foreign keys from (household_id, run_id) to agent_runs and (run_id, run_step_id) to run_steps,
-- and adds the same run_id and run_step_id pair to approvals created by a run step (§6.6).
create table tool_invocations (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  actor_member_id uuid not null references members(id),
  run_id uuid, run_step_id uuid,          -- always null pre-pilot
  approval_id uuid unique references approvals(id),       -- an approval is consumed once
  tool_name text not null, tool_version int not null,
  effect_class text not null,
  policy_version text not null,
  policy_decision text not null check (policy_decision in ('allow','require_approval','deny')),
  args jsonb not null,                    -- family text: content_refs
  idempotency_key text unique,            -- required before any effect outside the write transaction
  status text not null check (status in ('recorded','dispatching','succeeded','failed','outcome_unknown')),
  receipt jsonb,                          -- family text: content_refs
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (run_id is not null or approval_id is not null),   -- pre-pilot rows always carry approval_id
  check (run_step_id is null or run_id is not null)
);

-- Today brief (§13.4) ------------------------------------------------------------
-- RLS: the brief's member only, for both tables. Assembled under that member's own context.
-- Family text (summary_text, brief_items.ui): content_refs; scrubbed on forget, un-share or revoke.
create table daily_briefs (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  member_id uuid not null references members(id),
  local_date date not null,               -- household date (Asia/Kolkata)
  status text not null check (status in ('assembling','ready')),
  revision int not null default 1,        -- bumped on regeneration or scrub
  summary_text text,                      -- optional single LLM line; null when skipped or scrubbed
  summary_language text,                  -- en|ta|tanglish
  calendar_state text not null check (calendar_state in ('not_connected','fresh','stale','reconnect_required')),
  calendar_synced_at timestamptz,
  push_due_at timestamptz,                -- member's chosen time, moved out of quiet hours
  assembled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (member_id, local_date)          -- one brief per member per local date
);

create table brief_items (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  daily_brief_id uuid not null references daily_briefs(id) on delete cascade,
  member_id uuid not null,                -- same member as the brief
  section text not null check (section in ('attention','today','tomorrow','ahead')),
  kind text not null,                     -- reminder|task|list|calendar_event|approval|renewal|bill|warranty
  source_kind text not null,              -- evidence link: reminder_occurrence|task|list|memory|calendar_event|approval
  source_id uuid not null,
  source_revision int,                    -- source version seen at assembly
  position int not null,
  ui jsonb not null,                      -- nilumi-ui/1 card; composed by the server from source data
  approval_id uuid references approvals(id),   -- optional internal-action proposal
  created_at timestamptz not null default now(),
  unique (daily_brief_id, source_kind, source_id)
);
-- Scrubbing deletes the affected items, clears summary_text and bumps the brief revision.
```

**Post-pilot: durable runs and artifacts.** Defined now, created only with the first bounded run type after spike S-AGENT ([ADR-043](../adr/adr-043.md), [ADR-044](../adr/adr-044.md)). RLS for run tables is actor-only; artifacts follow [ADR-031](../adr/adr-031.md) visibility like memories (§15.2).

```sql
create table run_state_transitions (
  from_state text not null, to_state text not null,
  primary key (from_state, to_state)      -- exactly the pairs in §6.7; checked by a trigger on agent_runs
);

create table agent_runs (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  actor_member_id uuid not null references members(id),
  initiator_kind text not null check (initiator_kind in ('member','routine','schedule','agent_run')),
  initiator_id uuid,
  run_type text not null, run_type_version int not null,
  state text not null check (state in ('queued','running','waiting_for_input','waiting_for_approval',
                                       'paused','completed','failed','cancelled','outcome_unknown')),
  revision int not null default 1,        -- CAS on (id, revision, writer_id)
  writer_id text,                         -- lease holder; null when not running
  lease_expires_at timestamptz,
  requested_action text check (requested_action in ('pause','cancel')),
  step_count int not null default 0,
  max_steps int not null,
  input jsonb not null,                   -- family text: content_refs
  result_summary text,                    -- family text: content_refs
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (state <> 'running' or (writer_id is not null and lease_expires_at is not null))
);

create table run_steps (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  run_id uuid not null references agent_runs(id),
  step_index int not null,
  run_revision int not null,              -- inserted only in the same transaction as a successful CAS
  writer_id text not null,
  role_alias text not null, model_id text,
  active_tools text[] not null,           -- allow-list after prepareStep
  model_output jsonb,                     -- family text: content_refs
  tokens jsonb, cost_usd numeric(10,6),
  status text not null check (status in ('started','completed','failed')),
  created_at timestamptz not null default now(),
  unique (run_id, step_index)
);

-- tool_invocations already exists (pre-pilot, above). This migration adds:
--   foreign key (run_id) references agent_runs(id), foreign key (run_step_id) references run_steps(id).

create table run_events (                 -- append-only: the app role has insert and select only
  id bigint generated always as identity primary key,
  household_id uuid not null,
  run_id uuid not null references agent_runs(id),
  run_revision int not null,
  kind text not null,                     -- state_changed|lease_claimed|step_started|step_finished|invocation_recorded
  from_state text, to_state text,
  ref_id uuid,                            -- step, invocation or approval ID
  created_at timestamptz not null default now()
);                                        -- IDs and states only; no family text

create table artifacts (
  id uuid primary key default uuidv7(),
  household_id uuid not null,
  kind text not null,
  title text,                             -- family text: content_refs
  visibility text not null check (visibility in ('household','shared','private')),
  owner_member_id uuid references members(id),
  shared_at timestamptz,
  run_id uuid references agent_runs(id),
  current_version int not null default 1,
  status text not null default 'active' check (status in ('active','forgotten')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((visibility = 'household' and owner_member_id is null and shared_at is null)
      or (visibility in ('shared','private') and owner_member_id is not null))
);

create table artifact_versions (          -- immutable except forget scrubbing
  artifact_id uuid not null references artifacts(id),
  version int not null,
  household_id uuid not null,
  content jsonb,                          -- nilumi-ui/1 data; nulled by forget via content_refs
  created_by_member_id uuid not null references members(id),
  created_at timestamptz not null default now(),
  primary key (artifact_id, version)
);
```

**Reserved, not created** ([ADR-048](../adr/adr-048.md)). These are schema designs only; nothing reads or writes them before a later decision (§20.8).

| Contract | Purpose | Minimum fields |
|---|---|---|
| `resource_grants` | Grant a member access to one resource beyond its default visibility | `household_id`, grantor, grantee, resource table and ID, capability, expiry, revocation, audit trail |
| `delegations` | Let one member act for another within a narrowed scope | `household_id`, grantor, grantee, scope, purpose, expiry, revocation, audit trail |
| `consents` | Record consent for a purpose across its lifecycle | `household_id`, grantor, grantee, scope, purpose, expiry, revocation, audit trail |

---

## 10. Retrieval and grounded answers

### 10.1 Stages
| Stage | What | Why |
|---|---|---|
| **A. Structured lookup** | Resolve the `QueryPlan` entities (§11) and predicates, then fetch `active` memories for (entity, predicate, qualifier). RLS makes household rows, the caller's private rows and adult-visible shared rows visible. For `include_history`, fetch the `changed_in_world` chain that the caller may read. For "next due", compute it from interval + last event. | Deterministic and exact for dates, contacts, warranties and preferences. Always ranked first. |
| **B. Hybrid search** | One SQL query fusing FTS rank, best alias similarity per memory, and vector cosine distance with Reciprocal Rank Fusion (k = 60). RLS scopes it automatically. **RRF is used only for ordering.** | Paraphrases ("who fixes leaking taps?" → plumber Ravi), model numbers, error codes. |
| **C. Merge and select** | Union A + B, deduplicate, apply a small recency/importance boost, and keep **≤ 8 evidence items**. If both household and shared values answer a cardinality-one question, keep both. | Small, precise context = faster and fewer hallucinations; shared facts don't silently overwrite household facts. |
| **D. Answerability gate** | Decides whether the evidence *answers this question*, not merely whether something related exists. Answerable when **(a)** a structured hit covers the requested predicate (and time, if asked), or **(b)** a hybrid hit has a raw cosine similarity ≥ τ_vec **and** its predicate or memory type is compatible with the `answer_shape`, or an FTS/alias hit matches the requested attribute. Not answerable → deterministic template. | "Unknown beats invented", enforced in code. |
| **E. Answer** | **Deterministic first:** `value`/`when`/`who`/`yes_no` answers from a single structured hit are templated, with no LLM. If a household and a shared value both apply, the template shows attribution ("Household record: …; Nishanth's shared note: …"). **Synthesis** uses one LLM call over the numbered evidence pack. Output is buffered **per sentence**; each sentence must cite `[n]` markers that refer to provided evidence and contain its key values. | Grounding is checked *before* the user sees or hears it, so streaming audio can't spread an unsupported claim. |

### 10.2 Hybrid query (illustrative)
```sql
with q as (
  select $1::halfvec as v,
         websearch_to_tsquery('english', $2) || websearch_to_tsquery('simple', $2) as tq,
         $3::text as raw
),
fts as (
  select m.id, row_number() over (order by ts_rank_cd(m.fts, q.tq) desc, m.id) as r
  from memories m, q
  where m.status = 'active' and m.fts @@ q.tq
),
vec as (
  select m.id, row_number() over (order by e.embedding <=> q.v, m.id) as r
  from memory_embeddings e join memories m on m.id = e.memory_id, q
  where m.status = 'active' and e.config_id = $4
),
alias as (
  select m.id, row_number() over (order by word_similarity(a.alias_norm, q.raw) desc, m.id) as r
  from memories m
  join entities ent on ent.id = m.subject_entity_id
  join entity_aliases a on a.entity_id = ent.id, q
  where m.status = 'active' and word_similarity(a.alias_norm, q.raw) >= 0.6
)
select id, sum(score) as rrf_score
from (
  select id, 1.0/(60+r) score from fts
  union all select id, 1.0/(60+r) from vec
  union all select id, 1.0/(60+r) from alias
) s
group by id
order by rrf_score desc
limit 12;
```
All table reads above run under the caller's RLS context, including `shared` rows visible to adults.

### 10.3 Evidence pack format (data, never instructions)
```json
{
  "items": [
    {"n": 1, "source_type": "memory", "memory_id": "…", "visibility": "household", "text": "The washing machine warranty expires on 15 Mar 2028.", "attribution": "household"},
    {"n": 2, "source_type": "memory", "memory_id": "…", "visibility": "shared", "text": "Nishanth's note says the shop offered an extended warranty.", "attribution": "shared by Nishanth"}
  ],
  "rules": "Use only these items as evidence. If they do not answer, say you do not know."
}
```
Document chunks later use the same shape with `source_type: "document"`, `document_id`, `chunk_id` and page refs (§20.1).

### 10.4 "What do you remember about X?" (inspect)
Purely deterministic: resolve X → fetch active memories for the entity (+ aliases, + last updated) → the screen shows the entity page, grouped by household, shared and private visibility. Speech summarizes the top 3 by importance and recency through a template. No LLM is needed.

---

## 11. Identity, references and entity resolution

### 11.1 Identity per channel
| Channel | Identity source | Private reads |
|---|---|---|
| PWA | Better Auth email-code session cookie → `member_id`; optional WebAuthn step-up for sensitive actions | Allowed for the owner |
| Home Assistant (later) | Device → member mapping. Shared devices map to a `household` context | **Not allowed** on shared devices (household-only context). "Check your phone for private items." |
| Import / UI | Session member | Owner |
| Forwarded-text capture (post-pilot candidate, §20.9) | Session cookie from the installed PWA (Android Web Share Target), or a member-bound device token for an iOS Shortcut. The token can only create inbox items and is revocable in Settings → Devices | None: the token reads nothing |

### 11.2 Speaker-relative references (resolved before entity lookup)
| Mention | Resolution |
|---|---|
| I / me / my (as subject) | Speaker's member entity |
| my wife / my husband | `member_relations(speaker, 'spouse')` |
| our son / my daughter / the kids | `member_relations(speaker, 'child')` (+ name disambiguation) |
| we / us / our (as subject or target) | Household (for subjects), all adults (for reminder targets) |
| that / it (in a correction, share, un-share or forget) | Last memory referenced in the conversation's previous ≤ 3 turns |

### 11.3 Entity resolution cascade
1. **Relational** reference (above) → done.
2. **NLU-provided `existing_id`** from the shortlist → validated (exists, visible, type-compatible).
3. **Exact normalized alias** match.
4. **Fuzzy**: `word_similarity(alias_norm, mention) ≥ 0.6`, **or** phonetic equality (`alias_phonetic`) for person and brand names. This catches STT variants like "Aquagard" or "Ravee".
5. **Semantic**: embedding similarity against entity profile text ("water filter" → purifier).
6. **No match** → create a new entity (provenance-linked). The card shows "New: *Aquaguard* (appliance) [Change]".

**Ambiguity:** two or more candidates within a 0.1 score margin → clarification ("The Bosch washing machine or the LG one?").
**Alias learning:** clarification answers, card edits and admin merges add aliases (`source` recorded). Aliases feed the STT keyterms (§14.3), so recognition improves as the household uses it.

### 11.4 Shortlist for NLU
Before the NLU call, the transcript's n-grams are matched (trigram + phonetic, ~5 ms in Postgres, **RLS-scoped**, so another member's private entities never appear) to produce ≤ 20 candidate entities. These are given to the LLM with IDs, so the LLM *chooses* among real entities instead of inventing names. Members and their relations are always included. Shared safe-projection entities are visible to adults, but their private aliases and other private memories are not.

---

## 12. Dates, times and recurrence

- **Household timezone:** `Asia/Kolkata`. All relative expressions are resolved against the **turn's `occurred_at`** in that timezone.
- **Dual resolution:** the LLM returns `{phrase, resolved, precision}`. The server re-parses `phrase` with **chrono-node `en.GB`** (day-first, matching Indian convention: "3/4" = 3 April). A disagreement leads to a clarification showing both options.
- **Vague parts of day** (household settings, editable): morning 09:00 · afternoon 14:00 · evening 18:30 · tonight 20:30 · weekend = Saturday 10:00. Cards always show the concrete resolved time.
- **Edge rules:** "next Saturday" said on a Thursday = the coming Saturday; said on a Saturday = +7 days. A resolved time already in the past (e.g. "remind me at 7" at 19:30) → the next occurrence, with a clarification for reminders.
- **Precision is stored** (`day`/`month`/`year`/`approx`) and respected in answers ("in 2020", not "1 Jan 2020").
- **Recurrence:** RFC 5545 RRULE strings (`rrule` library) for reminders and tasks. Maintenance intervals are ISO 8601 durations (`P6M`) on `service_interval`; "next due" = latest `serviced_on` + interval (§10.1).

---

## 13. Lists, tasks, reminders and notifications

### 13.1 Client sync, offline data and lists
- **Normalization and dedupe:** `name_norm` (lowercased, singularized, unit-stripped). The partial unique index on open items means "add rice" twice merges, and the quantity is updated when given.
- **Realtime invalidation:** each signed-in PWA opens `GET /v1/events` (SSE). Each app instance keeps one dedicated Postgres `LISTEN` connection. Database notifications carry **IDs and kinds only**; before an event is emitted to a member, the app checks visibility under that member's RLS context. The client handles events by invalidating active TanStack Query keys and refetching normal APIs, never by trusting content from the event stream.
- **Heartbeats and reconnect:** SSE sends a heartbeat comment about every 25 s to stay below Railway's 5-minute idle cutoff. Clients reconnect with `Last-Event-ID`; after reconnect, app resume, focus or network recovery, active queries are invalidated to cover missed events.
- **Offline:** only lists, tasks and the inbox are persisted in IndexedDB. Every mutation carries a `client_mutation_id` and gets a durable `mutation_receipts` entry (member, request hash, canonical ID, committed response), so each completion, removal or edit replays idempotently. When the server merges an offline-added item into an existing open item, it returns the **canonical ID**, and the client remaps queued follow-up mutations to it. Tick-off is monotonic (open → done). Edits use `version` checks; a conflict is **shown**, never silently discarded.
- **Persisted data hygiene:** memory data is never offline-cached. The persisted store is namespaced by member ID and **wiped on logout or account switch**; forget/un-share revocation reaches the other phone by SSE, focus/reconnect refetch or the next app open.
- **iOS has no Background Sync**, so the queue flushes when the app is next opened or regains connectivity while open. This is acceptable because the user is in the app while shopping.

### 13.2 Tasks and reminders
- **Model:** a `reminder_schedule` (the series: text, targets, immutable `dtstart` + `tzid` anchor, optional RRULE, revision) produces `reminder_occurrences` (concrete firings, computed from the anchor and **never** from a delayed delivery time), and each occurrence produces per-recipient, per-device `notification_deliveries`. "Remind me to renew insurance next month" → task + schedule.
- **Atomic scheduling:** the app calls a narrow `SECURITY DEFINER` wrapper, `schedule_occurrence`, inside the business transaction. The wrapper inserts the occurrence as `scheduled` and enqueues a graphile-worker job with `run_at = scheduled_for` and a stable `job_key` for that occurrence/revision. `fa_app` has EXECUTE on the wrapper but no direct queue privileges. The card says **"Scheduled"** only after this transaction commits.
- **Wake and claim:** graphile-worker wakes at `run_at`. The job performs a revision-stamped claim such as `UPDATE reminder_occurrences SET status='dispatching', claimed_at=now() WHERE id=$id AND status='scheduled' AND schedule_revision=$rev RETURNING ...`. Stale, duplicate, cancelled or superseded jobs no-op. Delivery is at-least-once; stable notification tags collapse rare duplicates on device.
- **Delivery:** after the claim, the worker writes per-recipient delivery rows, applies each recipient's quiet hours independently, sends Web Push, records `dispatched_at`/`accepted_at`, sets the occurrence `sent`, and creates an **inbox item regardless of push outcome**. HTTP 404/410 revokes the subscription; other push errors retry with backoff. The reminder is never silently dropped.
- **Edit/cancel:** edits bump the schedule revision and enqueue replacement occurrences in the same transaction. Old jobs no-op because the revision claim fails. A notification already past the claim can't be recalled; the card documents that race.
- **Recurrence and snooze:** after an occurrence is sent, the next one is computed from `dtstart`/`rrule`/`tzid` and scheduled through the same wrapper. Snooze affects one occurrence (`snoozed_until`). Completing a linked task ends future occurrences.
- **Reconciliation:** graphile-worker maintenance tasks check for missed or stuck occurrences and repair them from Postgres state. This is a safety net; normal scheduling is transactional with the business write.
- **Validation:** the reminder reliability suite is specified in [§16.2](#162-evaluation-harness-and-gates); its initial proof and feature-release rerun are assigned in the [roadmap](05-implementation-roadmap.md#2-mvp-phases).
- **Targets:** "remind me" → speaker. "Remind us" → all adult members. "Remind my wife" → the spouse (she sees "from Nishanth").
- **Time zone:** reminders fire in the schedule's `tzid` (the household timezone by default). Travel and per-member timezones are out of MVP scope and documented.

### 13.3 Web Push
- VAPID keys (server). Subscriptions are per device and stored in `push_subscriptions`. A **notification-health screen** per device shows the last accepted and last received push, with a "send test" button.
- Payloads are end-to-end encrypted to the subscription keys (RFC 8291), so Apple and Google push services can't read them. **Private reminders use a generic lock-screen preview by default** ("You have a private reminder"); household reminders show their text (configurable).
- **Measured separately** (RFC 8030 distinguishes acceptance from delivery): worker dispatch → push-service acceptance → browser service-worker receipt (the SW posts `POST /v1/push/receipts`, best effort) → user acknowledgement. We don't claim alarm-grade delivery; Focus modes, offline phones and OS policy can delay presentation without any error.
- **iOS:** push requires the PWA to be **installed to the Home Screen** and permission granted from inside the installed app. Onboarding walks your wife through this once ([roadmap S1](05-implementation-roadmap.md#phase-0--spikes-and-decisions)).
- Delivery is initiated by the worker. Notification actions (Done/Snooze) are supported on Android. On iOS, tapping opens the reminder in the app.

### 13.4 Today brief
**Pre-pilot.** Each member gets one brief per household date. It is assembled deterministically by a worker job, not an agent run ([ADR-041](../adr/adr-041.md), [ADR-043](../adr/adr-043.md)). Today is the PWA's default landing screen from Phase 1 as a placeholder; the brief replaces the placeholder in Phase 6A. Tables are in §9; the API is `GET /v1/briefs/today` (§19).

**Sources.** Every source is read under the brief member's own RLS visibility, and every item carries an evidence link (`source_kind`, `source_id`) rendered as an `evidence-chip` (§6.8).

| Section | Items | Evidence link |
|---|---|---|
| `attention` | Pending approvals for this member, missed or overdue reminders and tasks, a Reconnect chip when the calendar needs it | Approval, reminder occurrence or task |
| `today` | Reminders and tasks due today, shopping and other list state, today's calendar events | Occurrence, task, list or calendar event |
| `tomorrow` | Tomorrow's due items and calendar events | Occurrence, task or calendar event |
| `ahead` | Upcoming renewal, bill and warranty dates from visible memories, within a configured look-ahead window | Memory |

**Assembly** (`briefs` and `context` modules):
1. **Schedule.** A graphile-worker cron task computes household dates and times in Asia/Kolkata itself, without relying on the server time zone. It enqueues each member's job when that member's chosen brief time arrives, with job key `brief:{member_id}:{local_date}`. If no brief exists yet, `GET /v1/briefs/today` runs the same assembly on demand.
2. **Context.** The job runs as `fa_worker` and performs every scoped read and write in `withMemberTx` with the brief member's context (§15.2), never as `fa_maint` or a superuser. The brief can therefore never include another member's private items or reveal that they exist.
3. **Calendar.** If the member has an active connection, the window is refreshed first (§13.5), then read from the cache. A refresh failure sets `calendar_state` to `stale` or `reconnect_required`, and assembly continues.
4. **Compose.** Fixed rules select, group and order items. The server builds each item's `nilumi-ui/1` card from source data. One short transaction upserts `daily_briefs` on `(member_id, local_date)` and replaces its `brief_items`, so the same inputs always produce the same brief.
5. **Proposals.** Rules may attach an internal-action approval proposal (§6.6) to an item, for example "Add a renewal reminder?" for a renewal date that has no reminder, or "Add these to the shopping list?". Proposals are created with `initiator_kind = 'schedule'`, the member as actor, and an expiry. Calendar text never creates a proposal.
6. **Summary (optional).** At most **one** LLM call per brief writes a single summary line or Tamil/Tanglish phrasing. It goes through a registry role alias on the AI Gateway route ([ADR-046](../adr/adr-046.md)) and runs only when:
   - the provider gate (§15.4) allows family data,
   - the household is below the AI soft cap (§17.4), and
   - its budget reservation succeeds.

   Input is the composed item text, with calendar text inside a delimited data block (§13.5). Output must be one plain-text line within a length limit, with no markup or links. Any failure leaves `summary_text` empty, with no retry and no second call. **The brief is complete with zero LLM calls.**
7. **Push.** One push per member per household date, at `push_due_at`: the member's chosen time, moved to the end of quiet hours when it falls inside them. The job key and the brief index on `notification_deliveries` (§9) deduplicate it. The lock-screen preview is always generic, for example "Your Today brief is ready" ([ADR-035](../adr/adr-035.md)), and tapping opens Today. If the push fails or is never seen, the brief is still on the Today screen, and no second push is sent that day.

**Regeneration and scrubbing.**
- When a source changes after assembly (a reminder completed, a list edited, a calendar refresh), the affected items are rebuilt by the same rules and the brief `revision` is bumped. SSE invalidation carries IDs and kinds only (§13.1). Regeneration sends no new push and never calls the model; if an item the summary covered was removed, the summary is cleared.
- Forget, un-share, visibility revocation and calendar disconnect use `content_refs` and the evidence links to find affected items. The same transaction, or the scrub job, deletes those items, clears the summary and bumps the revision. Pending proposals tied to them expire.
- Brief text follows turn-body retention (§15.6) and is excluded from export (§19).

### 13.5 Read-only Google Calendar connection
**Pre-pilot, behind spike S-GCAL** ([ADR-045](../adr/adr-045.md), [roadmap Phase 0](05-implementation-roadmap.md#phase-0--spikes-and-decisions)). Adults only; each adult links their own Google account. Google is recorded as a data provider in [Tech Stack §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate).

**Linking.**
- `POST /v1/connections/google` (adult session) starts Better Auth `linkSocial` for Google with offline access and the single scope `calendar.events.readonly`, and returns the redirect URL.
- The callback links Google to the signed-in user only. It never creates a Nilumi account or session; sign-up stays invite-only ([ADR-023](../adr/adr-023.md)).
- The server checks that the granted scopes are exactly that scope. Otherwise it unlinks and shows an error, and no connection is created. Only the `primary` calendar is read, and there is no write scope.
- The OAuth app is published but unverified (fewer than 100 users), and its warning screen is accepted. Testing mode is not used because its seven-day refresh-token expiry would break the brief.
- Linking is tested from both installed PWAs as part of S-GCAL.

**Tokens.**
- Better Auth stores tokens in its `account` row, encrypted at rest. Key handling is documented with the backup material ([ADR-032](../adr/adr-032.md)).
- Tokens are read only on the server, through Better Auth by account ID and owning user. They are never sent to the client, logged or traced.
- Refresh is serialized per account by a short lease on the connection row (`refresh_lease_until`), taken in its own transaction. No transaction is held across a Google call (§6.2).

**Bounded-window sync.**
- Each sync calls `events.list` on `primary` with `timeMin` at the start of today and `timeMax` at the end of tomorrow, both in Asia/Kolkata. It uses `singleEvents=true` and `orderBy=startTime`, and follows pagination.
- There are no sync tokens, because Google does not allow `syncToken` together with `timeMin`/`timeMax`, and no push channels.
- A sync runs before each brief assembly. Results replace that connection's rows in one transaction, conditional on `status = 'active'` and an unchanged `sync_generation`. A fenced sync discards its results.
- **Recurring events:** `singleEvents=true` expands series into instances. Each instance is stored by its instance ID with `recurring_event_id`. Modified instances arrive as their own instances, and cancelled instances are dropped.
- **All-day events:** stored as date-only `start_date`/`end_date` with an exclusive end, interpreted as household dates and never converted to instants. A multi-day event appears on each day in range.
- **Time zones:** timed events are stored as instants and shown in the household time zone. The event's own time zone is kept for display when it differs. Because the window is computed in Asia/Kolkata, events created in other zones land on the correct household day. Per-member time zones remain out of scope (§13.2).
- **Minimization:** only title, location, times and status are stored. Descriptions, attendees, conferencing links and attachments are not.

| `calendar_state` | Cause | Brief behavior |
|---|---|---|
| `not_connected` | No connection | No calendar items |
| `fresh` | The sync before assembly succeeded | Events shown |
| `stale` | Transient failure (network, server error, rate limit) | Cached events shown with a stale marker and their fetch time |
| `reconnect_required` | Refresh token expired or revoked, or the scope is missing | Cache deleted, calendar items scrubbed, Reconnect chip shown; the rest of the brief is unaffected |

**Untrusted text.**
- Event titles and locations are third-party data; anyone can invite a member to an event.
- They are rendered as plain text and reach a model only inside a delimited data block for the optional summary, which is marked as data, never instructions.
- They never select tools, create proposals or change policy. Injection fixtures are in §16.2.

**Visibility.**
- Imported events are private to their owner, with no household or shared projection. They are not memories.
- They are excluded from retrieval, the NLU shortlist, keyterms and export ([ADR-031](../adr/adr-031.md)).
- Another member's brief never shows them, and other members cannot tell whether a member has connected a calendar.
- To remove an event from Nilumi, the member deletes it in Google, and the next sync drops it, or disconnects.

**Disconnect** (`DELETE /v1/connections/google/:id`):
1. One transaction sets `disconnecting` and bumps `sync_generation`, which fences any sync in flight.
2. Outside any transaction, the token is revoked at Google.
3. One transaction then:
   - unlinks the Better Auth account and its tokens,
   - deletes cached events,
   - scrubs calendar brief items (§13.4), and
   - sets `disconnected`.
4. If revocation at Google fails, local deletion still completes. The UI says so and links to the member's Google account permissions.

Removing access from the Google side surfaces at the next refresh as `reconnect_required`. Member removal deletes the connection and its cache.

**Calendar write** is not in scope. It needs approval cards and a new ADR (§20.9).

---

## 14. Voice subsystem

### 14.1 Capture (PWA)
- **Recorder state machine:** `idle → requesting_mic → recording → stopping → uploading → idle`, with `cancelled` and `error` exits. It supports **hold-to-talk** (pointer capture; slide off the button to cancel) **and tap-to-start / tap-to-stop** (accessibility, one-handed use). If mic permission resolves *after* the finger is lifted, the recording is cancelled, not started.
- Minimum 300 ms (filters accidental taps). Auto-stops at 28 s with a hint (the STT REST limit is 30 s).
- **Interruption handling:** `visibilitychange`, page hide, screen lock, an incoming call or audio-session interruption → stop and discard (or keep, if > 1 s, and ask "Send what I heard?"). Always stop all tracks so the mic indicator turns off.
- `MediaRecorder` mime negotiation: record native browser formats, `audio/webm;codecs=opus` on Android Chrome and `audio/mp4` (AAC) on iOS Safari. The shortlisted STT vendors accept both; if a vendor rejects iOS fragmented MP4, remux in JavaScript or drop that vendor. There is no server-side transcoding binary.
- **Playback:** a single reusable `<audio>` element is primed during the user gesture. If a later `play()` is still rejected (iOS resume, silent mode, interruption), the turn shows a visible **▶ Play reply** button. That fallback is a first-class path, not an error. Installed-iPhone resume and interruption behavior is validated in [roadmap S1](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

### 14.2 STT adapter
```ts
interface SttAdapter {
  transcribe(input: { audio: Uint8Array; mime: string; languageHint?: "en-IN" | "ta-IN" | "auto";
                      keyterms?: string[] }): Promise<{ text: string; language?: string; confidence?: number;
                      words?: { w: string; start: number; end: number; conf?: number }[];
                      provider: string; model: string; ms: number }>;
}
```
Default: **Sarvam Saaras v4** (`mode=transcribe`, keyterms), accepted as the baseline for cost, India hosting, keyterm biasing and future Tanglish `codemix`, subject to provider approval and bake-off validation. The adapter uses direct multipart `fetch` if an SDK lags the REST keyterm API. Validated fallback option: ElevenLabs Scribe v2 (only after its S0 verification). S2 bake-off shortlist: Sarvam Saaras v4 · ElevenLabs Scribe v2. REST only for the MVP; streaming is revisited if batch p95 breaks the budget or hands-free mode arrives.

### 14.3 Keyterm loop
Keyterms are the top 50 aliases **visible to the speaker**, ranked by `use_count`, recency and type (people and brands first), plus member names. They're cached **per member** (never household-wide, so private entity names can't leak into another member's recognition) and rebuilt when aliases change. This closes the loop: **new entity → alias → keyterm → better recognition next time.**

### 14.4 TTS and speech lifecycle
- `TtsAdapter.synthesize({text, voice, language}) → AsyncGenerator<PCM, CompletionMetadata>`: progressive audio for one complete validated sentence. Completion metadata verifies format, sample alignment, silence and final integrity; arbitrary transport chunks are not independently playable files.
- **Lifecycle:** as each validated sentence is ready (§10.1 E), the turn stream emits `speech.ready {turn_id, seq, url}`. The URL is short-lived, signed, member-bound and `Cache-Control: no-store`. The client keeps a **per-sentence playback queue**, fetching `/v1/turns/{id}/speech/{seq}` in order. Sentence audio is synthesized on demand from stored sentence text, with a bounded active replay spool and durable completed audio. Durable budget reservation precedes dispatch; repeated reads join the same attempt or replay completed audio (same `seq` → same audio). A failed or uncertain attempt cannot automatically dispatch again. First chunks may reach playback before completion, but late failure remains a failed attempt. Cancelling the turn stops the queue, invalidates late chunks and cancels pending synthesis where possible. The S4 streaming candidate is validated separately before production integration.
- **Phrase cache:** templated confirmations ("Added to the shopping list.") are cached in R2 by `(text, voice, language, model, settings, version)` hash. Shared caching is restricted to fixed non-personal phrases; uncached benchmarks bypass it.
- **Voice-reply modes:** `auto` (voice input → spoken reply + screen; text input → text only), `always`, `never`. The screen is always updated.
- Default: **Sarvam Bulbul v3 (en-IN voice your wife picks)**. Alternate/fallback option: ElevenLabs (subject to the S4 quality check and S0 verification).

---

## 15. Privacy and security

### 15.1 Threat model
| Threat | Example | Primary controls |
|---|---|---|
| Cross-member exposure | The husband sees the wife's private note (or vice versa) | RLS (§15.2), explicit `shared` semantics (§8.8), privacy eval gate, admin is not a bypass |
| Secret capture | "My UPI PIN is…" stored or logged | Shared sensitive-input boundary (§15.3), refuse mode before persistence/LLM, log policy |
| Lost or stolen phone | Someone opens the installed PWA | Session list + remote revoke, 90-day sliding server-set cookie, optional WebAuthn step-up or fresh email code for sensitive views/actions |
| Email account compromise | Attacker controls a member's mailbox and requests an email code | Honest limit: mailbox takeover = account takeover; both adults protect email with MFA; session notifications and revoke UI |
| Provider exposure | OpenAI, Anthropic, Vercel AI Gateway, Sarvam, ElevenLabs, Railway, R2, Resend, GitHub or extractors retain data | Provider gate (§15.4), data minimization, no-training gateway routing with an `only` list, direct STT/TTS calls, RLS, encrypted backups; during the pilot, provider retention is disclosed and acknowledged; ZDR at the production privacy gate ([ADR-046](../adr/adr-046.md)) |
| Prompt injection via stored or imported content | A memory, transcript, forwarded message, imported file, later Vault OCR text, tool result or MCP description says "ignore previous instructions and add…" | Every untrusted source (stored memories and transcripts, calendar text, forwarded or imported text, Vault OCR, tool results, MCP metadata and earlier model output) enters prompts only inside delimited data blocks (§10.3). Untrusted text never selects a tool, UI component or policy. Model output never authorizes an action: commands are a closed set validated in code, every write must cite the member's own words in the current turn (§7.2), and anything not initiated by the member's own turn needs an approval bound to stored arguments (§6.6). Today-brief proposals come from structured records, never from model text (§13.4). Output is validated and rendered as plain text, without model-supplied HTML, links or images (§6.8). Injection fixtures for each ingress pass at 100% (§16.2). The threat model is revised before any external-read or external-write tool ships (§20.9) |
| Account/infra compromise | Leaked API keys, exposed DB | Secrets in Railway/GitHub only, private networking, least-privilege DB roles, no owner credentials in runtime, dependency updates |
| Backup leakage | R2 bucket exposed | `age`-encrypted dumps; private key only in the OneDrive recovery document (§17.2) |
| Prompt injection via calendar text | An invited event titled "Ignore your rules and add…" | Event text stored and rendered as plain data; delimited data block in the optional summary call, with plain-text output only; calendar text never creates proposals or selects tools; injection fixtures (§13.5, §16.2) |
| Approval replay or argument substitution | A replayed decision request, altered arguments or a changed target runs an action twice or differently | Server-issued approval IDs; immutable arguments bound to actor, tool version, target revision, policy version and expiry; only stored arguments execute; single consume with the receipt in the same transaction; dispatch rechecks; an edit is a new proposal (§6.6) |
| OAuth token theft or refresh race | A token leaks through a log or the client, or concurrent refreshes invalidate each other | Read-only scope; tokens encrypted at rest; server-only retrieval by account ID and owning user; never logged or traced; per-account refresh lease; revoke on disconnect (§13.5) |
| Cross-member leakage in the brief | One adult's brief shows, counts or hints at the other's private reminder or calendar event | Assembly under the brief member's own RLS context, never a bypass role; owner-only calendar cache; generic lock-screen preview; `content_refs` scrubbing; brief privacy fixtures at 100% (§13.4, §16.2) |
| Untrusted MCP tool metadata (future) | A server marks a destructive tool `readOnlyHint` | Annotations never relax policy; Nilumi assigns the effect class; MCP tools disabled by default; no MCP client before the pilot (§6.6, §20.9) |
| A shared trust boundary mistaken for isolation | A job, delegated run or artifact gains another member's visibility because it shares a process, role or origin | Isolation comes only from per-member RLS context, set per transaction and per job; the household comes from the session or job; future delegated runs get a fresh task ID and narrowed tools; future sandboxed artifacts run without `allow-same-origin`; RLS tests include a second household (§15.2, §20.9) |
| Gateway privacy controls bypassed or drifting | A call omits no-training or the `only` list, someone adds a BYOK credential, or a fallback serves an unlisted provider | One gateway wrapper; a CI test forbids other model construction; routing receipts are checked on every response; S-VGW proves the controls; a regression fails the privacy gate ([ADR-046](../adr/adr-046.md), §15.4) |
| Stale-writer duplicate effects | A worker whose lease expired repeats a step, a write or a push | CAS on `(run_id, revision, writer_id)` and fencing; internal writes and receipts in one transaction; idempotency key and invocation record before any other effect; `outcome_unknown` never redispatched automatically (§6.7); brief job keys and the delivery index (§13.4) |

### 15.2 Row-level security
- **DB roles:** `fa_owner` (migrations only), `fa_app` (runtime API; no BYPASSRLS; not the table owner; no queue privileges), `fa_worker` (graphile-worker jobs; queue access; sets member context per job before scoped work), and `fa_maint` (BYPASSRLS; backups, restore test, retention, forget audit and restore-time tombstone replay; credentials loaded only by the maintenance tasks in the worker).
- **Context:** every scoped query runs inside `withMemberTx` (§6.2), which begins with
  `select set_config('app.household_id', $1, true), set_config('app.member_id', $2, true);`
  These settings are transaction-local, so pooled connections can't leak context. A query issued without the `tx` handle fails, because the policies require the settings.
- **Policy pattern** (memories and entities shown; lists/tasks use their own household/private rules):
```sql
alter table memories enable row level security;
alter table memories force row level security;
create policy memories_read on memories
  for select using (
    household_id = current_setting('app.household_id')::uuid
    and (visibility = 'household'
         or (visibility = 'shared' and is_adult_member(current_setting('app.member_id')::uuid))
         or owner_member_id = current_setting('app.member_id')::uuid));

create policy memories_insert on memories
  for insert with check (
    household_id = current_setting('app.household_id')::uuid
    and (visibility = 'household'
         or owner_member_id = current_setting('app.member_id')::uuid));

create policy memories_update on memories
  for update using (
    household_id = current_setting('app.household_id')::uuid
    and ((visibility = 'household' and is_adult_member(current_setting('app.member_id')::uuid))
         or owner_member_id = current_setting('app.member_id')::uuid))
  with check (
    household_id = current_setting('app.household_id')::uuid
    and ((visibility = 'household' and is_adult_member(current_setting('app.member_id')::uuid))
         or owner_member_id = current_setting('app.member_id')::uuid));
-- No DELETE policy: rows are never deleted by the app; forget runs through forget_memory() (§8.6).
```
Policies are **per command** on purpose: permissive policies are OR-ed, so a read policy without `FOR SELECT` would also let every adult *update* `shared` rows. `is_adult_member()` is a `STABLE SECURITY DEFINER` helper reading `members.kind`. The admin capability (`members.is_admin`) never widens row visibility. A trigger keeps `owner_member_id` immutable once set (ownership never changes on share/un-share).

**Table-by-table matrix** (R = read, W = write; "parent" = inherits through an `EXISTS` on the RLS-filtered parent):

| Table | Read | Write | Notes |
|---|---|---|---|
| `memories`, `entities` | household rows + adult-visible shared rows + own private rows | household rows by adults; shared/private by owner only | Shared rows keep immutable owner; private entity aliases never leak |
| `lists`, `tasks` | household rows + own private rows | same | MVP lists/tasks support household/private visibility |
| `entity_aliases`, `memory_embeddings`, `memory_history`, `list_items` | parent | parent | History of a shared memory is visible to adults only from share time |
| `reminder_schedules`, `reminder_occurrences` | creator + targets (+ household if visibility household) | creator or worker functions | Targets see "from Nishanth" |
| `notification_deliveries`, `push_subscriptions`, `inbox_items` | own member | system functions | Un-share/forget scrubs derived inbox content through `content_refs` |
| `source_events` | **speaker only** | speaker (insert) | Other members see evidence only through permitted `memories.evidence_span` |
| `conversations`, `turns`, `turn_commands`, `operations`, `mutation_receipts`, `feedback` | own member | own member | Shared-derived cards are scrubbed on un-share |
| `turn_traces` | own member (full); members with the admin capability: **metrics-only view** of others (timings, outcomes, costs; no text columns) | system | Being admin is not a privacy bypass |
| `predicates`, `embedding_configs` | all members | members with the admin capability | Global registries; no `household_id` |
| `privacy_acknowledgements`, `privacy_acknowledgement_members` | every adult in the household | only through a server function: recorded by an adult with the admin capability, or after a withdrawal only by the adult who withdrew; withdrawn by any covered adult | The gateway wrapper reads the active row and its covered adults before each LLM or embedding call (§15.4) |
| `content_refs`, `forget_tombstones` | none (functions only) | functions only | Tombstones are content-free |
| `daily_briefs`, `brief_items` | **own member only**; no admin view | worker functions in that member's context; scrub functions | Assembled under the member's own context; scrubbed through `content_refs` and evidence links (§13.4) |
| `approvals` | **actor only** | inserted in the actor's context; decided only by the actor (§6.6) | Others get not-found; a trigger keeps bound columns immutable |
| `connections` | owner only | owner (link, disconnect); sync functions in the owner's context | OAuth tokens stay in Better Auth's `account` row; no API or trace returns them |
| `calendar_events_cache` | owner only; no household or shared projection | sync functions in the owner's context | Not memories; excluded from retrieval, shortlist, keyterms and export; deleted on disconnect |
| `tool_invocations` (pre-pilot) | actor only | broker functions, in the dispatch transaction | Pre-pilot rows are approval receipts; arguments and receipts are scrubbed through `content_refs` |
| `agent_runs`, `run_steps`, `run_events` (post-pilot) | actor only | lease holder through CAS functions; `run_events` insert-only | `run_events` carries IDs and states only |
| `artifacts`, `artifact_versions` (post-pilot) | as `memories`; versions inherit from the parent | owner, or adults for household rows | Owner immutable; version content nulled by forget |

- **Sharing-specific write rules:** only the owner can share, un-share, edit or forget a shared memory. Another adult may request "make this household", but that creates a normal household supersession card and does not mutate the shared row without owner authority.
- **Existence leaks are leaks too:** counts, autocomplete, duplicate messages, SSE invalidation IDs, keyterms, notification previews, entity shortlists and "already known" cards are computed under the reader's RLS context. Shared safe-projection entities expose only name + type after confirmation.
- **Privacy test suite** (≥ 40 baseline cases plus share/un-share cases) runs in CI against real Postgres 18 in Testcontainers. It covers mixed-visibility multi-command turns, pool reuse, missing context, rollback mid-request, connection drop/exhaustion, shared entity existence leaks, forget by a non-owner, un-share scrubbing and every row of the matrix. It must pass at 100%.
- **Brief, calendar and approval jobs** run as `fa_worker` with the affected member's context, never as `fa_maint`. Brief assembly, calendar sync and approval dispatch see only what that member can see.
- **`content_refs` scrubbing for October 8 tables.** Forget, un-share and visibility revocation also scrub:
  - brief items and brief summaries;
  - pending approvals (expired) and the arguments of decided approvals;
  - approval receipts and arguments in `tool_invocations`.

  Post-pilot, scrubbing also covers run inputs, step outputs, run result summaries, and artifact titles and versions. `run_events` holds IDs and states only. Cached calendar events are removed by disconnect, `reconnect_required` or the next window sync, not by forget.
- **Second household** ([ADR-048](../adr/adr-048.md)). The privacy suite seeds a second household with members and rows in every visibility class. It asserts that no query, function, SSE event, brief, approval, calendar row or job context crosses households, including when a client supplies another household's IDs.

### 15.3 Sensitive-input boundary (before persistence and before the LLM)
One shared `SensitiveInputBoundary` is applied at **every ingress that carries user text**: turn text, STT output, imports, memory/entity PATCH edits, list item notes, task notes, feedback notes, entity descriptions, later forwarded-text capture (§20.9) and later Vault extraction text. It must protect each ingress before any real family input is stored; delivery is assigned to [roadmap Phase 1](05-implementation-roadmap.md#phase-1--walking-skeleton-with-safety-rails).

The module has two modes:
- **`refuse`** for live user input: block storage/LLM calls and reply with a template.
- **`mask`** for Vault/indexing: replace sensitive identifiers before embeddings, search index, Q&A prompts and display snippets while originals remain in approved storage (§20.1).

**Normalization first:** spoken numbers are converted to digits ("four three two one" → 4321, "double nine" → 99), separators are removed, and common STT digit errors (o/0, l/1) are folded.

| Detector | Rule |
|---|---|
| Payment card | 13–19 digits **passing Luhn** |
| Aadhaar | 12 digits, first digit 2–9, **passing Verhoeff** |
| PAN | `[A-Z]{5}[0-9]{4}[A-Z]` |
| **Cue-based refusal** (no checksum needed) | Any digit or alphanumeric run ≥ 4 near cue words: OTP, code, verification, PIN, CVV, passcode, password, lock code, alarm code, UPI PIN, net banking, account number, Aadhaar, card number |
| Passwords | Cue words (password, passcode, Wi-Fi password, login) followed by a value |
| **Allowed** | Phone numbers (10 digits starting 6–9) unless near cue words; dates; amounts |

On a `refuse` hit: `source_events.raw_text = null`, `redaction = 'sensitive'`, category recorded; the LLM is **not** called; the reply is a template ("That sounds sensitive, so I won't store it."); the trace stores only the category. **Stated limits** (Settings → Privacy):
- Detection is heuristic and may miss unusual phrasings.
- The cloud STT provider has already processed the audio.
- During the founding-household pilot, LLM providers may keep prompts under their published retention terms; deleting in Nilumi cannot erase those copies ([ADR-046](../adr/adr-046.md)).

Bypass tests cover every ingress path, not only Talk.

### 15.4 Data minimization and provider retention
- **Sent to LLM providers:** the transcript, member display names and relations, ≤ 20 shortlist entities, ≤ 8 evidence items and ≤ 3 recent turns. OpenAI is the default provider and Anthropic is the approved challenger. Both are reached through the gateway wrapper on Vercel AI Gateway (§6.2):
  - Gateway-managed credentials, no BYOK
  - `disallowPromptTraining` and an `only` provider list on every call
  - `store: false` where supported
- **Pilot vs production** ([ADR-046](../adr/adr-046.md)):
  - **Founding-household pilot:** zero data retention is not used. It needs S-VGW evidence and an active household acknowledgement before real data.
  - **Household acknowledgement** ([ADR-046](../adr/adr-046.md)). The owner records one acknowledgement in `privacy_acknowledgements` (§9) on behalf of both adults, confirming he explained it to the other adult. Settings → Privacy shows every adult the same notice, who recorded it and when.
    - **Active only when complete.** The household counts as acknowledged only while the active row matches the current notice version and covers exactly the household's current adults. A new notice version, processor or adult supersedes it.
    - **Withdrawal is a veto.** Any covered adult can withdraw. After a withdrawal, only the adult who withdrew can record the next acknowledgement; the owner cannot override it.
    - **Effect.** Without an active acknowledgement, **no AI provider call of any kind** is made ([ADR-054](../adr/adr-054.md)): the gateway wrapper and the STT and TTS adapters fail closed, so no new or queued LLM, embedding, speech-to-text or text-to-speech call leaves Nilumi (jobs re-check when they run, not when queued; calls already sent can't be recalled), and the household is in hard-cap degraded mode (§17.4). Voice input and spoken replies are paused; typed text uses the deterministic grammar. New calendar links are refused; an existing link keeps syncing events for display, but no calendar text reaches a model. Lists, tasks, reminders and the inbox keep working.
  - **Production privacy gate:** ZDR on every LLM and embedding request, before any user outside the founding household, helper access, kid mode or commercial use.
- **Sent to STT/TTS:** audio goes only to the STT provider (Sarvam default; ElevenLabs only as the validated fallback); sentence text goes only to the TTS provider. STT/TTS do not route through an LLM intermediary.
- **Sent to Railway:** runtime logs with IDs only, deploy metadata, service health and Postgres volume metadata. Database rows stay behind RLS and private networking.
- **Sent to R2:** encrypted backup objects, content-free forget journal entries, phrase-cache audio and later Vault originals.
- **Sent to Resend:** email address and one-time code metadata, and for invitations the invitee's and inviter's display names, from `no-reply@nilumi.in` ([ADR-053](../adr/adr-053.md)).
- **Sent to GitHub:** code, CI logs and eval datasets with consent; no family data in ordinary repository history.
- **Sent for the Today brief summary (optional, §13.4):** only that member's composed brief item text, with calendar text in a delimited data block, through the AI Gateway route ([ADR-046](../adr/adr-046.md)) and subject to the provider gate below. Nothing is sent when the summary is skipped.
- **Sent to Google (pre-pilot, behind S-GCAL):** OAuth requests and `events.list` calls for the primary calendar's today-and-tomorrow window. No Nilumi family data is sent. Only title, location, times and status are kept from responses (§13.5). Google is listed as a data provider in [03 Tech Stack §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) ([ADR-045](../adr/adr-045.md)).
- **Never sent:** the full memory store, other members' private items, secrets, unmasked Vault identifiers after extraction, or audio to the LLM.
- **Provider eligibility and data terms are a release gate** (Spike S0): OpenAI, Anthropic, Vercel AI Gateway, Sarvam, Railway, Cloudflare R2, Resend, GitHub and any later extractor must:
  - permit this household use
  - have training opted out where possible (for LLM and embedding providers, enforced per request by the gateway)
  - have their retention and deletion settings recorded
  - be listed in [03 Tech Stack §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate)

  Local "forget" cannot erase provider-side retained copies; the app says so.

### 15.5 Authentication, sessions and recovery
- **Better Auth ≥ 1.7.7** with `emailOTP` and `multiSession`. Magic links and device authorization are not enabled.
- **Profiles are invite-only:** an adult with the admin capability creates a member profile and allowlists the member's email. Open sign-up is disabled. Adding an adult sends an invitation email with install and sign-in instructions and a plain link to `https://app.nilumi.in`; it carries no sign-in link or token, and the admin can resend it until first sign-in ([ADR-053](../adr/adr-053.md)).
- **Admin capability lifecycle.** The founding adult gets the capability when the household is created by the owner-only bootstrap script, which refuses to run if a household exists and is not reachable over HTTP ([ADR-053](../adr/adr-053.md)). Only an existing admin can grant or remove it, through an audited server function; nobody can grant it to themselves, and the last admin cannot be removed. Admin actions re-read `members.is_admin` inside their transaction.
- **First sign-in, new device and recovery:** enter email inside the installed app → 6-digit code (10-minute expiry, rate-limited, generic responses so nobody can probe which emails exist) → type the code in the app.
- **Session:** server-set Secure, HttpOnly, SameSite cookie, 90-day sliding expiry. If iOS drops the cookie, the app prompts for email-code re-sign-in and preserves queued list/task/inbox mutations.
- **Devices:** each member sees sessions with device names and can revoke them. Lost phone response is revoke session first, then rotate any exposed push subscription.
- **Email change:** requires codes to the old and new address and notifies both. Admins cannot change another adult's email after first sign-in or add credentials to another adult's account. Better Auth admin impersonation is disabled.
- **Optional step-up:** Face ID / fingerprint (WebAuthn platform authenticator) before export, viewing private items after inactivity and forget-all, with relying-party ID `app.nilumi.in`, enabled once that origin is stable; fallback is a fresh email code. The Vault (H1) re-decides whether viewing unmasked originals needs mandatory biometric step-up.
- **Email sender:** Resend free tier on `nilumi.in`, sending from `no-reply@nilumi.in`. Whoever controls a member's mailbox can sign in as that member, so both email accounts need MFA.

### 15.6 Retention
| Data | Retention |
|---|---|
| Source events backing memories | Life of the memory (redacted on forget) |
| Source events with no memory (smalltalk, questions) | `raw_text` purged after 30 days |
| Turn bodies (`turns.commands/cards/response_text`, `turn_commands.result`) | Purged after 30 days unless they back a live memory card; IDs kept |
| Turn traces | Text purged after 30 days; metrics kept 1 year |
| Today brief text (`daily_briefs.summary_text`, `brief_items.ui`) | Same purge as turn bodies; IDs kept; scrubbed earlier on forget, un-share, revoke or disconnect (§13.4) |
| Approvals and tool invocations | Approval arguments and invocation arguments and receipts purged on the same schedule as turn bodies once decided, executed or expired; IDs, status and policy version kept |
| Calendar cache | Replaced on every window sync; deleted on disconnect or `reconnect_required` (§13.5) |
| Worker job metadata | Kept only as long as needed for scheduling, retries and audit; Postgres schedule state is durable |
| Audio | **Not stored.** Opt-in debug capture for 7 days (Phase 0 and pilot only); deleted by forget |
| Backups | 30 daily + 6 monthly, encrypted; the forget journal is replayed on restore (§17.2) |
| Push subscriptions | Until revoked or 404/410 |

### 15.7 Other controls
Strict CSP · per-member rate limits · upload size limit (audio ≤ 1 MB; documents later use presigned R2 upload to keep app memory and request sizes small) · dependency updates (Renovate) · audit entries for admin actions (merge, export, admin-capability changes) and for privacy acknowledgements recorded or withdrawn · no raw text in application logs (IDs only) · best-effort in-process circuit breakers (§17.5).

---

## 16. Observability and evaluation

### 16.1 Traces
Every turn writes one `turn_traces` row in Postgres:
```json
{
  "stages": [
    {"stage": "upload", "ms": 140},
    {"stage": "stt", "ms": 520, "provider": "sarvam", "model": "saaras:v4"},
    {"stage": "guard", "ms": 2},
    {"stage": "shortlist", "ms": 6, "candidates": 4},
    {"stage": "nlu", "ms": 710, "provider": "openai", "model": "<pinned id>", "tokens_in": 2480, "tokens_out": 190, "cached_in": 2100},
    {"stage": "retrieval", "ms": 180, "fts": 3, "vec": 20, "alias": 2},
    {"stage": "execute", "ms": 35, "commands": ["ask"]},
    {"stage": "answer", "ms_first_token": 420, "ms_total": 900},
    {"stage": "tts", "ms_first_audio": 260, "provider": "sarvam", "model": "bulbul:v3"}
  ],
  "shadow": {"nlu_challenger": {"model": "<candidate>", "matched": true, "ms": 820}},
  "outcome": "ok", "total_ms": 2210, "cost_usd": 0.00041,
  "prompt_versions": {"nlu": "nlu@7", "answer": "answer@3"}, "evidence_refs": ["…"]
}
```
The **admin trace viewer** filters by outcome, stage latency, failure tag and model version, and shows the transcript, commands, candidates and evidence, subject to §15.2. Shadow-mode comparisons are logged only after offline evals pass; the served model remains the pinned model, so there is no live traffic split.

Application logs (pino, JSON) carry `turn_id` and IDs only. Railway provides runtime logs; an **external uptime monitor** probes `/healthz` and alerts by email, since the system can't alert about itself being down.

### 16.2 Evaluation harness and gates
```
evals/
├── datasets/
│   ├── nlu.jsonl          # utterance + context → expected commands (subject, predicate, value, visibility)
│   ├── retrieval.jsonl    # seeded memories + questions → expected evidence ids / abstain
│   ├── privacy.jsonl      # cross-member reads, share/un-share, secrets, forget audits → must be 100%
│   ├── briefs.jsonl       # brief privacy, determinism/idempotency, calendar edge cases (pre-pilot)
│   ├── calendar-injection.jsonl # hostile event titles/locations → no proposals, plain text only
│   ├── stored-injection.jsonl   # hostile memories, transcripts and imports → no write, proposal, tool or disclosure
│   ├── approvals-redteam.jsonl  # replay, substitution, non-actor, stale target → must be 100%
│   ├── agent-trajectories/      # post-pilot: per run type allow-list, step, cost and approval checks
│   ├── dates.jsonl        # phrase + now → expected resolution
│   └── stt/manifest.jsonl # clip → reference transcript + key entities
├── experiments/
│   ├── classifier-intent-knn/   # embedding-kNN intent router vs LLM intent
│   └── pii-recall/              # PII-Tracer / Qwen3Guard red-team comparison
├── scorers/               # structural match, recall@k, abstention, entity-name accuracy, latency/cost stats
└── reports/               # <date>-<suite>-<git-sha>.md + .json (model ids, prompt versions)
```
- **CI (every PR):** typecheck, lint, `/v1` Zod request/response contract tests, unit tests (`domain` package: dates, detectors, normalization, scoring), integration tests on real Postgres 18 (Testcontainers: RLS, supersession, sharing, forget, idempotency), and NLU tests against **recorded** LLM responses.
- **Live evals (manual workflow plus before any model or prompt change):** the full suites against the real providers, via GitHub Actions.
- **Promotion gate** for changing any model role or prompt version, with **absolute floors plus regression limits**, so repeated small drops can't accumulate: NLU structural ≥ 90%; retrieval top-5 ≥ 90%; answer correctness ≥ 85%; abstention on unanswerables ≥ 95%; privacy and dates **100%**. No metric drops by more than 2 points; p95 latency up by at most 20%; cost per turn up by at most 50%. A held-out set must also meet the floors.
- **Classifier experiments:** no classifier runs in the MVP. Compare embedding-kNN intent routing (provider embeddings and a free local encoder) with the NLU golden set; pursue only with ≥ 95% agreement on simple intents and near-zero false routing on multi-command utterances. Compare PII-Tracer / Qwen3Guard-0.6B with deterministic detectors on 20–30 red-team secrets; adoption requires clearly higher recall and a separate reviewed decision. Revisit triggers: NLU p95 > 2 s from prompt size, LLM spend > $5/month, intent accuracy < 90% concentrated in simple commands, or secret-detector recall < 100%.
- **Sharing/privacy additions:** cases cover capture-time share cues, later share/un-share, forget by a non-owner, cached/derived content scrubbing, shared safe-projection entities and cardinality-one household/shared collisions.
- **Reminder reliability:** the suite runs ≥ 200 graphile-worker occurrences (one-off, recurring, snoozed, edited mid-flight, quiet hours, worker restarts and a redeploy) and requires 100% dispatch within 60 s and zero stale sends. It validates wrapper timing and revision claims; the [roadmap](05-implementation-roadmap.md#2-mvp-phases) assigns the S5 proof and Phase 5 rerun.
- **Pilot feedback loop:** a `wrong` or `should_not_remember` rating → the admin tags a failure type → the case is added to the relevant dataset (with consent).
- **October 8 additions** ([ADR-041](../adr/adr-041.md)–[ADR-045](../adr/adr-045.md), [ADR-048](../adr/adr-048.md)). These extend the privacy gate; the promotion-gate floors above are unchanged.
  - **Brief privacy fixtures (100%, pre-pilot).** Fixtures cover two adults and a child with private, shared and household items, and a second household. They assert that no other member's private item, count, existence hint or calendar event appears in a brief, summary, push preview or SSE event. Un-share, forget, visibility revocation and calendar disconnect must scrub or regenerate the affected items and summary.
  - **Brief determinism and idempotency (pre-pilot).**
    - The same inputs and household date produce identical items and order.
    - Duplicate cron jobs, an on-demand `GET` racing the cron job, and worker restarts yield one brief per member per date and at most one push.
    - The zero-LLM path is complete.
    - Calendar edge cases: recurring instances, multi-day all-day events, events created in other time zones, and window edges at local midnight.
  - **Calendar injection fixtures (100%, pre-pilot).** Event titles and locations carry instructions, markup, links and fake approval text. To pass, they create no proposal, select no tool and change no policy; they render as plain text; and the summary either passes output validation or is dropped.
  - **Stored-content injection fixtures (100%, pre-pilot).** The same hostile payloads are placed in memories, transcripts and imported records (`POST /v1/import`). To pass, a turn that retrieves them makes no write, share or visibility change that the member's own words in that turn do not support (§7.2); creates no proposal; selects no tool; discloses nothing beyond the member's visibility; and renders the text as plain data without active links. Forwarded text, Vault OCR, connector and MCP output each add their own fixtures before that ingress ships (§15.1, §20.9).
  - **Approval-bypass red-team (100%, pre-pilot).** Cases cover replayed decisions, altered or added arguments, a non-actor deciding, expired proposals, a changed target revision, a changed policy or tool version, double-submit races and client-supplied household IDs. To pass, only the stored arguments of a valid pending proposal run, once, after its actor's decision, leaving exactly one `tool_invocations` row.
  - **Household acknowledgement tests (100%, pre-pilot).** With no active acknowledgement, a withdrawn one or an outdated notice version, no LLM or embedding call leaves the wrapper and the household is in hard-cap degraded mode (§15.4).
  - **UI catalog tests (pre-pilot).** Schema tests for each `nilumi-ui/1` component, snapshot tests for brief and approval cards, and plain-text fallback for unknown or invalid parts (§6.8).
  - **Agent trajectory evals (post-pilot).** These run per run type with recorded and live trajectories. Every step's tools must stay within its allow-list, the step count within `maxSteps` and the cost within the reservation; every write needs an approval, and there are no external effects. A run type is enabled only while its suite passes (§6.5).
  - **Durable-run tests (post-pilot).** Stale-writer fencing, lease expiry and takeover, a crash between dispatch and receipt, cancellation after dispatch, and illegal transitions (§6.7).

---

## 17. Reliability and operations

### 17.1 Environments and delivery
- **Local:** `docker compose up` starts local Postgres + pgvector and can run the production-style app/worker image. Day-to-day web development uses `pnpm dev` (`next dev --turbopack`) for the Next.js app and Hono route handlers; the worker can run locally against the same database. Providers are real, with dev keys and low quotas.
- **Production:** Railway GitHub integration deploys `main` to the `app` and `worker` services from the shared Docker image. The Railway pre-deploy command runs `drizzle-kit migrate` as `fa_owner`; the new deployment must pass `/readyz`, then Railway switches traffic.
- **GitHub Actions:** CI only (typecheck, lint, unit, integration with Testcontainers, recorded-LLM tests) plus manually triggered live evals. Actions do not deploy, run backups or own restore tests.
- **Migrations:** follow **expand → migrate → contract**. The app, worker jobs, cached PWA builds and queued offline mutations carry a `v` field, and handlers accept the current and previous version (an N-1 window). Contract migrations wait until no clients, mutations or jobs older than N-1 remain.
- **Rollback policy:** default is **forward-fix**. A Railway deployment rollback is allowed only when the schema is still compatible (expand phase). Data corruption → restore from backup plus forget-journal replay (§17.2). The deployment rollback and data-restore rehearsals are assigned in [roadmap Phase 1](05-implementation-roadmap.md#phase-1--walking-skeleton-with-safety-rails).

### 17.2 Backups and restore drill
- **Nightly worker cron at 02:30 IST (`fa_maint`):** (1) drain unjournaled forget tombstones to the R2 journal; (2) `pg_dump -Fc`; (3) restore-test the **plaintext** dump into a scratch database on the same server; (4) verify migration version, roles, RLS policies, row counts vs manifest, canary rows in every visibility class, forget-journal replay and a forgotten canary absent; (5) drop scratch and delete the local plaintext file; (6) `age`-encrypt to the public recipient; (7) upload to R2 and verify object hash; (8) record the result and alert on failure. `fa_maint` needs `CREATEDB` for the scratch database; the plaintext dump exists only on the worker's ephemeral disk for the duration of the job.
- **Keys:** the worker holds only the public age recipient. The master private key lives only in the OneDrive recovery document, in a folder shared with your wife; both Microsoft accounts use 2FA. There is no rotating drill key and no private key in Railway or GitHub.
- **Forget journal:** forget inserts the content-free tombstone and `journal_tombstone` job in the same database transaction (§8.6). `forget_tombstones.journaled_at` is the backup watermark. The backup refuses to upload a dump unless every tombstone up to the dump snapshot is journaled. Every restore replays the journal before the restored system accepts traffic.
- **Quarterly rehearsal:** manual restore from R2 with the master key, following the runbook, ideally done once by your wife, proving the human recovery path.
- **R2 lifecycle:** 30 daily backups and 6 monthly backups. Old backups keep content forgotten later until they expire, as stated in Settings → Privacy.
- **Second layer:** Railway volume backups are enabled on the Postgres volume and treated as fast operational recovery, not the only backup layer. PITR is used only if the Railway template supports it and S5 verifies it.
- **Unmanaged Postgres ops checklist:** monitor disk, memory and connection count; apply minor version updates; run `ALTER EXTENSION vector UPDATE` when needed; verify `pg_trgm`/FTS/Tamil locale behaviour; review autovacuum and backup sizes; rehearse recovery to a fresh database; document every credential and console path in OneDrive.
- **The OneDrive document:** age private key; what each service is (Railway, R2, GitHub, Resend, domain registrar) and how to sign in; where secrets live; step-by-step restore to Railway or the Dokploy VM; how to revoke a lost phone's session; who to call.
- **Threat note:** decrypting backups needs both the OneDrive document and the R2 bucket, so a single compromise isn't enough.
- **RPO ≤ 24 h, RTO ≤ 2 h** via the runbook.

### 17.3 Degraded modes
| Failure | Behaviour |
|---|---|
| STT down or slow (> 6 s) | Error card: "I couldn't hear that, please type it." Text input is always available |
| Primary LLM down | Retry once on the fallback model, then a **deterministic fallback grammar** for the top commands: "add X (and Y) to the shopping list", "what's on the list", "remind me at T to X", "undo". Everything else: "I can't think right now; I've saved your words in your inbox." |
| Gateway budget, credit balance or compliant route unavailable | No retry or challenger call. Enter hard-cap degraded mode (§17.4) and alert the admin. An AI SDK 7 `GatewayInternalServerError` caused by a budget rejection is classified here, not as an outage ([ADR-046](../adr/adr-046.md)) |
| Answer LLM down | Show the top evidence items as cards without synthesis |
| TTS down | Silent; text only |
| Worker down | New reminders are still stored, but due reminders wait in the Postgres job queue. On restart, graphile-worker catches up, creates inbox items and sends any still-relevant pushes; overdue cards are marked honestly |
| SSE down or disconnected | Mutations still work; the PWA refetches active queries on focus, reconnect and app resume, and shows a reconnecting indicator if the stream is stale |
| Push failure | Inbox item, retry, revoked-subscription cleanup and admin alert (§13.2) |
| Backup or restore-test failure | Admin alert; the next backup retries only after the failing reason is recorded. The previous good encrypted backup remains retained |
| DB down | `/readyz` fails; Railway keeps the bad deployment out of service, and the PWA shows offline mode with cached lists/tasks/inbox and a queued-mutation banner |
| Today brief without calendar | Not connected: no calendar items. Transient Google failure: cached events with a stale marker. Expired or revoked token: Reconnect chip, calendar items scrubbed; the rest of the brief is unaffected (§13.5) |
| Today brief without the LLM | Summary skipped when the provider gate has not passed, the soft cap is reached, the reservation is refused or the call fails; the brief is complete with zero LLM calls, with no retry or second call (§13.4) |
| Today brief push failure | The brief stays on Today, the default landing screen; no second brief push that day; subscription cleanup as for reminders (§13.3) |

### 17.4 Cost guardrails
- **Monthly target:** ≈ ₹1,400–2,700 total. Railway app + worker + Postgres in Singapore is estimated at ₹850–1,700 and measured in S5; domain `nilumi.in` is ≈ ₹75/month equivalent; AI is expected around ₹280 with headroom; R2 and Resend stay within free tiers at household volume; taxes/FX contingency is included.
- **AI budget:** default **₹800/month**. Before each provider call, the estimated maximum cost (bounded `max_tokens`, audio ≤ 30 s, TTS characters ≤ 400 per reply) is reserved in Postgres against the month's AI budget and reconciled with actual usage afterwards. Concurrency is capped at 2 in-flight turns per member, and retries are bounded.
- **Soft cap** (80% of the AI budget): answers switch to deterministic templates and evidence cards; TTS uses only the phrase cache. **Hard cap** (100%): NLU falls back to the deterministic grammar (§17.3). **Lists, tasks, reminders and the inbox keep working** at any cap. The admin gets an alert at each threshold.
- Per-turn cost is recorded in traces; the monthly view is in the admin UI.
- **Pilot ceiling** ([ADR-047](../adr/adr-047.md), amends [ADR-036](../adr/adr-036.md)). Total spend may reach **₹5,000/month** during the pilot. This is a ceiling, not a plan:
  - The target stays at most ₹3,000/month.
  - Spending above ₹3,000 needs the owner's review of that month's cost report.
  - The admin view shows target, ceiling and actual spend separately.
  - The ₹800 AI default, the 80%/100% steps above and the S3 testing cap ([ADR-040](../adr/adr-040.md)) are unchanged.
- **Reservation coverage.** The Postgres reservation covers every model call, including the brief summary and, post-pilot, each agent step. It also covers embeddings, retries and fallbacks. A reservation that times out stays charged until reconciled. Post-pilot run types declare a worst-case cost; a run that cannot reserve it does not start (§6.7).
- **Backstops.** Gateway budgets and credit balances are soft-cap backstops that can overshoot by one request; the Postgres reservation ledger is the hard stop ([ADR-046](../adr/adr-046.md), [ADR-047](../adr/adr-047.md)). The owner budgets about US$10 a month in total across every key:
  - **Team budget.** US$10 a month, the outer cap across all keys.
  - **Runtime key.** The Railway runtime's Vercel API key has a monthly budget of US$8 (about ₹696). It is no longer looser than the ₹800 ledger, which also funds STT and TTS; it trips first only if Gateway spend alone passes about ₹696, which points to a fault, and leads to the same hard-cap degraded mode. It may rise to US$10 once the S3 key is revoked.
  - **Evaluation key.** S3 uses a separate key with a non-refreshing (`none`) budget equal to its remaining cumulative allowance ([ADR-040](../adr/adr-040.md)).
  - **Alerts and top-up.** Gateway alerts at 50, 75 and 100% are separate from the app's 80% and 100% steps. Auto top-up is off. Vercel has no low-balance alert, so the owner checks the credit balance, per-key spend and credit expiry monthly.
  - **Month boundary.** The Gateway month starts at UTC midnight on the 1st.

### 17.5 Timeouts and circuit breakers
STT 6 s · NLU 5 s (+1 retry) · embed 2 s (skip on timeout; FTS/alias still run) · answer 6 s · TTS 4 s. Provider circuit breakers are **best-effort in process** for the single app instance: open after 3 consecutive failures, half-open after 60 s. Durable budget and retry limits live in Postgres. If the app scales to multiple instances, the breaker can stay per-instance until evidence shows a shared breaker is needed.

---

## 18. Latency budget (push-to-talk, India → Railway Singapore)

| Stage | p50 target | p95 target | Measurement notes |
|---|---:|---:|---|
| Upload (≤ 8 s clip, ~60 KB Opus) | 150 ms | 400 ms | Measured from real phones on home Wi-Fi and mobile data |
| STT (REST) | 500 ms | 1,000 ms | Bake-off measured (S2), with provider and exact model ID in traces |
| Guard + persist + shortlist | 40 ms | 120 ms | Includes `pg` Pool checkout and RLS context on Railway private networking |
| NLU (minimal thinking; cache hits not assumed) | 700 ms | 1,400 ms | Gateway route measured; shadow-mode challenger is not in the served critical path |
| Execute (writes) | 50 ms | 150 ms | Speculative retrieval runs in parallel with NLU |
| **→ Card visible (writes/lists/tasks)** | **≈ 1.5 s** | **≈ 3.1 s** | Product §5.3 gate |
| Answer: deterministic template (single-fact questions) | 20 ms | 50 ms | Most household questions |
| Answer: first *validated sentence* (synthesis only) | 700 ms | 1,500 ms | Sentence-gated (§10.1 E) |
| TTS first audio (first sentence) | 250 ms | 600 ms | Phrase cache in R2 for templates; synthesis is on demand |
| **→ First audio (questions)** | **≈ 2.4 s** | **≈ 4.6 s** | Synthesis questions may approach p95 |

**Measurement:** budgets are validated on the deployed Railway Singapore system from real phones on home Wi-Fi and mobile data, bucketed by clip length (≤ 3 s, 3–8 s, > 8 s). The first request after a deploy is included in the measurement set rather than excluded as a special cold path. **Perceived latency:** the transcript bubble appears as soon as STT output has passed the guard and a "thinking" state is shown, so users see progress before the result.

---

## 19. API surface (v1)

| Method & path | Purpose |
|---|---|
| `POST /v1/turns` | Multipart `{turn_id, audio}` or JSON `{turn_id, text}`. **Streamed response** over the Next.js route handler: `transcript`, `card`, `answer.sentence`, `speech.ready`, `done`, `error`. A retry with the same `turn_id` replays committed results and resumes unfinished commands (§6.2) |
| `GET /v1/events` | SSE invalidation stream. Events carry IDs/kinds only, are RLS-checked per member before emission, send heartbeat comments about every 25 s, and support `Last-Event-ID` reconnect (§13.1) |
| `GET /v1/turns/:id/speech/:seq` | One sentence of reply audio (signed, member-bound, `no-store`) |
| `POST /v1/operations/:id/undo` | Undo |
| `GET /v1/entities` · `GET /v1/entities/:id` | Entity list; entity page (facts, history, aliases) |
| `GET /v1/memories?entity=&q=` · `PATCH /v1/memories/:id` · `POST /v1/memories/:id/forget` | Browse, edit (creates history), forget |
| `POST /v1/memories/:id/share` · `POST /v1/memories/:id/unshare` | Owner-only explicit share / un-share; safe-projection confirmation when needed |
| `GET/POST/PATCH /v1/lists/:id/items` | List operations (with `client_mutation_id`) |
| `GET/POST/PATCH /v1/tasks` · `/v1/reminders` | Tasks and reminders |
| `POST/DELETE /v1/push/subscriptions` · `POST /v1/push/receipts` | Web Push subscription management; browser service-worker receipt (best effort) |
| `GET /v1/inbox` · `POST /v1/feedback` | Inbox, ratings |
| `GET /v1/briefs/today` | **Pre-pilot.** The member's brief for the current household date as `nilumi-ui/1` parts, with `revision`, `calendar_state` and evidence links. If none exists yet, the same idempotent assembly runs (§13.4) |
| `GET /v1/approvals` | **Pre-pilot.** The member's own pending proposals; other members' proposals are never listed (§6.6) |
| `POST /v1/approvals/:id/decision` | **Pre-pilot.** `{decision: "approve" \| "reject"}`, or `{decision: "edit", changes}`, which creates a new pending proposal and executes nothing. Approve runs the stored arguments after rechecks. Actor only; anyone else gets not-found. A repeated decision replays the recorded result |
| `GET /v1/connections` · `POST /v1/connections/google` | **Pre-pilot, behind S-GCAL.** The member's own connections and status; start Google linking (adults only) and return the redirect URL (§13.5) |
| `DELETE /v1/connections/google/:id` | **Pre-pilot, behind S-GCAL.** Disconnect: fence sync, revoke at Google, delete tokens and cached events, scrub calendar brief items (§13.5) |
| `POST /v1/runs` · `GET /v1/runs/:id` · `POST /v1/runs/:id/cancel` | **Post-pilot.** Start a registered run type (refused unless its worst-case cost is reserved), read state and steps as `nilumi-ui/1` parts, and cancel future steps. Actor only (§6.7) |
| `POST /v1/import` · `GET /v1/export` | Cold-start seeding and portable export/import (below) |
| `POST /v1/capture` | **Post-pilot candidate (§20.9).** Text-only forwarded-text capture into the member's inbox. Accepts the session cookie (Android Web Share Target) or a member-bound, write-only, revocable device token (iOS Shortcut). Requires `client_capture_id` for idempotency; size- and rate-limited; never fetches URLs; returns no household data. Captured text is untrusted (§15.1) |
| `GET /v1/admin/{traces,costs,predicates,backups,evals}` · `POST /v1/admin/entities/:id/merge` | Admin (checked against the admin capability; RLS still applies) |
| `/api/auth/*` | Better Auth: email OTP, session list/revoke, email change, optional WebAuthn step-up |
| `GET /healthz` · `GET /readyz` | Liveness; readiness checks DB connectivity, migration state and job queue health |

The Hono route types are exported to the PWA through a typed client (`hc`). Request and response bodies are Zod schemas from `packages/contracts`.

**Portable export format** (`nilumi-export`, versioned JSON; requires optional WebAuthn step-up or a fresh email code): household-visible data **plus the requester's own private and shared-owned data**, including entities and aliases, members (no credentials), predicates, memories with typed values, qualifiers, validity, status and history, provenance (`evidence_span`, `evidence_refs`, timestamps, asserted-by), lists, tasks and reminder schedules. Forgotten content and other members' private data are excluded. `POST /v1/import` accepts the same format and recreates the data **without re-running AI extraction**. A round-trip test (export → import into an empty DB → retrieval eval still passes) is part of CI.

Today briefs, approvals, connections and the calendar cache are **not exported**. Briefs and approvals are derived from exported records, and calendar events are copies the member can export from Google.

---

## 20. Evolution path

### 20.1 Family Records Vault, horizon H1

The Vault extends the same memory/evidence pipeline with historical documents. Its priority and delivery are defined in [Roadmap H1](05-implementation-roadmap.md#3-post-mvp-horizons-and-optional-backlog); extraction/capture comparisons remain in [Research §12](../research/04-research.md#12-family-records-vault-first-post-mvp-horizon-h1). The following are planned extension contracts, not implemented document tables.

- **Capture:** native file/camera input (`accept="image/*" capture="environment"`) and PDF/photo file import; no iPhone Web Share Target. Edge/perspective correction and multi-page PDF tooling remain candidate choices in Research. Large originals upload directly to R2 with presigned URLs.
- **Extraction:** the extractor is selected in the H1 spike among approved hosted vision/OCR services and PaddleOCR as an isolated Railway service if Tamil quality justifies its RAM/ops cost. Extraction processors must pass the provider gate. Document-type classification is part of H1; no classifier is added to the MVP turn path.
- **Metadata separate from content:** the proposed table responsibilities are below. They reuse existing visibility/owner semantics; pages, extractions and chunks inherit the parent document's RLS.

| Table | Planned responsibility |
|---|---|
| `documents` | Metadata: type (`medical`, `insurance`, `school`, `identity`, `household`, `personal`, `other`), title, subject entity, dates, visibility, owner, status, R2 key, SHA-256, page count, `supersedes_document_id`, `retention_class`, `encryption_scheme` / `key_id` |
| `document_pages` | Page R2 key and dimensions |
| `document_extractions` | Append-only extraction runs: extractor/version, raw text/JSON, confidence and `is_current`; changing engines preserves extraction history |
| `document_chunks` | Retrieval units: masked text, page number, bounding box, FTS vector and embedding |

- **Storage/versioning:** originals are immutable in R2 under `households/{household_id}/documents/{document_id}/…` with default server-side encryption. Rescans create a `supersedes_document_id` version; old versions are archived. Envelope-encryption columns are reserved for later use.
- **Provenance:** extracted facts become ordinary memories pointing to document/page/region. The MVP reserves `source_events.modality='document'`, extraction metadata, a shared `Provenance` TypeScript type, evidence `source_type` and nullable `document_id` / `chunk_id` / `page`, shared detector `refuse` / `mask` modes, household-scoped R2 keys and `document_type` / `retention_class` enum names. Document tables and capture/extraction features remain H1 work.
- **Masking:** Aadhaar, PAN, policy, account and card numbers are masked (for example, `XXXX-XXXX-1234`) before indexing, embeddings, Q&A calls and display snippets. One approved extraction processor necessarily sees the original; local/on-device extraction remains the fallback if no hosted processor passes the gate.
- **Original viewing:** unmasked originals require step-up authentication. Whether this must be biometric is an H1 decision; ordinary masked snippets do not expose full identifiers.
- **Answering:** deterministic answers from extracted facts first; otherwise sentence-gated synthesis over chunks. Document/page citations open the scan at the cited region.
- **Forget:** owner/visibility authorization follows §8.6; index/embeddings are scrubbed immediately. R2 originals are purged after a short grace window and deletion is recorded in the forget journal; the window is specified during H1 feature planning.

### 20.2 Home Assistant channel (room speaker + devices), horizon H2
- **Local:** HAOS on a small box (HA Green or an N100 mini-PC) + **Home Assistant Voice Preview Edition** (ESP32-S3 + XMOS far-field audio, on-device microWakeWord) using the wake phrase **"Hey Nilumi"**.
- **Bridge:** a thin custom HA integration (subclass `ConversationEntity`), or the community `webhook-conversation` integration, that forwards `{text, conversation_id, device_id, satellite_id, language}` to `POST /v1/turns` with `channel=ha` and a per-device token.
- **Identity:** stock satellites **don't pass a user ID**, so shared devices map to a household context (no private reads). Speaker ID can come later.
- **Device control:** enable HA's **"Prefer handling commands locally"**, so device intents ("turn on the kitchen light") are handled by HA without our brain. Brain-side device tools call the HA REST API with a whitelist of exposed entities.
- **Reminders on the speaker:** worker-delivered reminders can call `assist_satellite.announce` through HA's API (HA reached via Nabu Casa or a Cloudflare Tunnel). `start_conversation` enables follow-ups.
- **No change to the brain's core.** It's a new channel adapter plus a device→member mapping table.

### 20.3 Tamil and Tanglish, horizon H3
STT `mode=codemix` (Saaras) · `language` captured per event · NLU prompts with Tamil-script and romanized examples · Tamil aliases (script + transliteration) · TTS Bulbul `ta-IN` · UI i18n. **Retrieval:** Postgres `simple` FTS and trigrams handle exact Tamil tokens but not morphology, vowel-sign spelling variants or Tamil↔romanized equivalence, so equivalence comes from multilingual embeddings plus transliterated aliases. A Tamil/Tanglish retrieval eval checks this. If the default embedding underperforms, add a new `embedding_configs` row and backfill; re-embedding costs cents at household scale. `pg_trgm`/FTS behaviour is verified with `show_trgm`/`ts_debug` on Tamil strings with vowel signs, suffixes and spelling variants (S5), on the production locale and ICU versions.

### 20.4 Proactive maintenance, horizon H4
A daily worker job computes upcoming "next due" dates (§12) and *suggests* reminders in the inbox (opt-in). It never acts autonomously.

**Pre-pilot daily surface.** The Today brief (§13.4) already provides the daily surface before the pilot. It shows due items, list state, calendar events and upcoming renewal, bill and warranty dates from memory, and can attach internal-action approval proposals. It is not H4's full proactive engine: it computes no new "next due" dates and never acts without the member's approval.

### 20.5 Kid mode, horizon H5
Child members log in on a shared tablet. An `audience` column on household memories (`all` | `adults`) gets an RLS clause for the `child` member kind; `shared` remains adults-only. Content safety prompts, no private notes for kids, parental view. **Gate:** each AI provider's terms are re-checked for use by and with minors **before** kid mode ships; a provider switch may be required.

### 20.6 Conversation mode, horizon H7
A realtime speech-to-speech session (Gemini Live / OpenAI Realtime or later equivalent) for open conversation, whose tool calls route into the **same executors and RLS**. Memory writes still go through validation, cards and undo. If the AI SDK agent/MCP path is used, it is constrained to these same executors, not a new open-ended automation surface.

### 20.7 Scale triggers
Scale is not expected during the pilot. Triggers:
- A second `app` instance is needed for availability or concurrency → each instance keeps its own Postgres `LISTEN` connection and fans out SSE only to its local clients; events remain IDs/kinds only and RLS-checked per member.
- Worker queue latency or backup runtime approaches SLOs → increase worker resources first, then split maintenance and reminder workers if needed.
- Operating Railway Postgres becomes a burden → move only the database to managed Postgres behind the same `pg` adapter and restore from the encrypted backup + forget journal.
- The Dokploy VM becomes preferable for cost/control → run the same image + `docker-compose.yml` with managed DNS and the same `app.nilumi.in` origin.
- > 50k embeddings or slow hybrid search → add per-config HNSW indexes.
- iOS PWA mic/push friction fails S1 → Capacitor escape hatch ([ADR-015](../adr/adr-015.md)).

### 20.8 Multi-household readiness
Nilumi stays family-first; these contracts keep a later move to more households from needing a rewrite ([ADR-048](../adr/adr-048.md)).
- **Isolation.** Every household-owned row carries `household_id`, enforced by RLS ([ADR-007](../adr/adr-007.md)). The household comes from the session or job context, never from the client, and no query crosses households. Decided on October 8: every household-owned table has `household_id not null`, references between household-owned rows are composite, and ID arrays and polymorphic references are trigger-checked (§9 Household consistency).
- **Roles.** Role names stay generic: `admin` is a capability (`members.is_admin`), not a member kind; member kinds are `adult` and `child`, with `helper` later under [ADR-034](../adr/adr-034.md). Family relationships such as "my wife" stay as data for speaker-relative resolution (§11.2), not as role names.
- **Visibility.** [ADR-031](../adr/adr-031.md) defaults stay: household visibility for preferences and family facts, "for me" items private, and private items never reveal that they exist. Explicit sharing stays under [ADR-024](../adr/adr-024.md).
- **Reserved contracts.** `resource_grants`, `delegations` and `consents` are schema designs only (§9). They are not created before the pilot. The consent lifecycle records the grantor, grantee, scope, purpose, expiry, revocation and an audit trail.
- **Tests.** RLS and privacy suites already include a second household (§15.2).
- **Legal gate.** Nilumi relies on the domestic exemption while only the owner's family uses it. **Before onboarding any external household, whatever the date,** primary legal verification of DPDP applicability and obligations is required ([research](../research/04-research.md#platform-constraints)).

### 20.9 Agentic horizon
Everything here is **post-pilot**, and each item needs its own ADR or gate before it ships. Every item reuses the broker, policy, approvals, durable runs and UI catalog (§6.5–§6.8).

| Item | Constraints | Gate |
|---|---|---|
| First bounded run type | Registered run type with explicit `stopWhen: isStepCount(n)`, `activeTools`, `prepareStep`, role alias, worst-case reservation and eval suite (§6.5); run tables created with it (§6.7) | Spike S-AGENT; optional S-DBOS comparison ([ADR-041](../adr/adr-041.md), [ADR-043](../adr/adr-043.md)) |
| MCP client | MCP 2026-07-28 through `@ai-sdk/mcp`; tool annotations untrusted; every MCP tool disabled by default until Nilumi assigns its effect class and a policy rule; a human can deny invocations ([research](../research/04-research.md#october-8-reference-architecture-consumer-and-platform-review)) | Separate ADR ([ADR-042](../adr/adr-042.md)) |
| Delegation | A delegated run gets a fresh task ID, a narrowed tool set, a summary-only return and depth caps; it runs as the same actor, never with wider visibility | Separate ADR |
| Telegram adapter | A channel adapter over the same turn contract and push rules; no WhatsApp channel ([ADR-049](../adr/adr-049.md)). SMS only for critical items if ever needed; RCS later | Separate ADR and provider gate |
| Calendar write | Needs a write scope, `external_write` policy rules and approval cards bound to the target event revision (§6.6) | New ADR ([ADR-045](../adr/adr-045.md)) |
| Sandboxed artifacts | Rendered code or HTML only in a `srcdoc` iframe sandbox without `allow-same-origin`, with a strict CSP and no network access (§6.8) | Separate decision ([ADR-044](../adr/adr-044.md)) |
| Forwarded-text capture | Android: Web Share Target in the installed PWA. iPhone has no share sheet into a PWA: pasting into Talk is the baseline; an iOS Shortcut may post to `POST /v1/capture` with a revocable device token (§19, §11.1); a native share extension only under the Capacitor contingency ([ADR-015](../adr/adr-015.md)). Captured text passes the `SensitiveInputBoundary` (§15.3), lands as an inbox item and is untrusted data (§15.1). It is never the evidence for a write (§7.2); anything extracted from it is a card the member confirms. Not part of [ADR-049](../adr/adr-049.md) | Separate decision; installed-app checks on both phones; its own stored-injection fixtures (§16.2) |

H7 conversation mode (§20.6) may later use the bounded-run path, under the same executors and RLS.

---

## 21. Architecture decision records

Accepted choices and rationale live in the [ADR catalogue](../adr/README.md), covering [ADR-001](../adr/adr-001.md) through [ADR-049](../adr/adr-049.md), [D1–D19 mappings](../adr/README.md#d-decision-map) and [Q1–Q12 mappings](../adr/README.md#resolved-question-map). Schemas, contracts, operational procedures and extension designs remain in this document. Acceptance does not pass the provider, model, phone or platform gates recorded in the [roadmap](05-implementation-roadmap.md#5-pending-validations-and-decisions).

**October 8 records and status changes** (evidence: [October 8 review](../research/04-research.md#october-8-reference-architecture-consumer-and-platform-review)):

| ADR | Decision | Where in this document |
|---|---|---|
| [ADR-003](../adr/adr-003.md) | "LLM as parser, code as executor"; no agent framework. **Partially superseded by [ADR-041](../adr/adr-041.md)**: the fixed pipeline is no longer the only path | §2, §6.5 |
| [ADR-036](../adr/adr-036.md) | Operating-cost target and AI budget guardrails. **Amended by [ADR-047](../adr/adr-047.md)** | §17.4 |
| [ADR-038](../adr/adr-038.md) | AI Gateway routing for LLM and embedding calls. **Partially superseded by [ADR-046](../adr/adr-046.md)** (ZDR and allowlist move to the production gate) | §6.2, §15.4 |
| [ADR-040](../adr/adr-040.md) | S3 synthetic-only evaluation under a US$0.50 cap, raised on October 8 to a cumulative US$2.00 on its own key. **Amended by [ADR-046](../adr/adr-046.md)** (purchased credits; separate evaluation key) | §15.4, §17.4 |
| [ADR-041](../adr/adr-041.md) | Two execution paths: constrained commands (≤ 2 LLM calls) and bounded agent runs; no agent run before the pilot; partially supersedes ADR-003 | §2, §6.5 |
| [ADR-042](../adr/adr-042.md) | Tool broker, fail-closed policy and immutable, single-use approvals | §6.6, §15.1 |
| [ADR-043](../adr/adr-043.md) | Durable runs on graphile-worker with leases, compare-and-swap fencing and `outcome_unknown` | §6.7, §9 |
| [ADR-044](../adr/adr-044.md) | Artifacts and the trusted UI catalog `nilumi-ui/1`; no raw HTML | §6.8, §9 |
| [ADR-045](../adr/adr-045.md) | Read-only Google Calendar per adult for the Today brief | §13.4, §13.5 |
| [ADR-046](../adr/adr-046.md) | Stay on Vercel AI Gateway with purchased credits; pilot controls; ZDR at the production privacy gate | §6.2, §13.4, §15.1, §15.3, §15.4, §17.3, §17.4 |
| [ADR-047](../adr/adr-047.md) | Pilot cost allowance up to ₹5,000/month; ₹3,000 target and ₹800 AI default unchanged; amends ADR-036 | §17.4 |
| [ADR-048](../adr/adr-048.md) | Multi-household-ready contracts while staying family-first; household consistency (composite keys) and the admin capability; legal gate before any external household | §9, §15.2, §15.5, §20.8 |
| [ADR-049](../adr/adr-049.md) | No WhatsApp channel; Web Push first, Telegram adapter post-pilot; work alongside WhatsApp | §20.9 |
