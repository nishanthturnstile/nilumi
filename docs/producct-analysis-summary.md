# Nilumi: product and architecture review

Nishanth, **Nilumi has a strong foundation, but its current architecture is designed for a narrower product than the one in your new brief.**

My recommendation is to **retain the existing technology stack, memory model, privacy controls, and reliable household operations—and extend them with a bounded agent runtime, governed tools, durable work, and a persistent generative UI.** A framework rewrite or a collection of new microservices is not necessary.

The important shift is:

> **From:** a trustworthy household memory assistant that executes predefined commands.  
> **To:** a trustworthy multi-person assistant that can undertake broader work, while using the same permission-controlled operations and evidence-backed memory.

That preserves the identity you describe: an assistant for individuals, couples, families, and small groups—not a clone of any reference project. Pasted text Pasted text

**Review scope:** I reviewed Nilumi’s product, architecture, stack, roadmap, research, and decision records before examining the five references and selected implementation paths. This is a documentation and targeted source-code review as of **7 October 2026**, not an execution test or security certification. Where a repository records tests, I distinguish those recorded results from tests independently run.

---

## 1. Nilumi product understanding

### What the current product plan is solving

The current Nilumi plan addresses a concrete household problem: useful information and responsibilities are scattered across people, conversations, notes, and memory.

Its core experience is:

**Capture something naturally → store it with meaning and evidence → retrieve it accurately → correct or forget it → act on it through lists, tasks, and reminders.**

This includes household facts, relationships, preferences, maintenance information, shared shopping, reminders, and private information. The initial product is deliberately oriented around you and your wife, with everyday usefulness and unprompted adoption as important success criteria.  

### What your expanded vision adds

Your new brief introduces three substantial changes:

| Dimension | Existing emphasis | Expanded direction |
|---|---|---|
| Intelligence | Understand a bounded set of household commands | Plan and execute broader, multi-step work |
| Interaction | Voice/text with useful result cards and dedicated screens | Persistent, interactive task-specific interfaces |
| Participation | One household with an initial two-adult pilot | Individuals, couples, families, and small groups with selective sharing and delegation |

The expanded vision is not simply “add more tools.” It changes the responsibilities of the execution system, permissions, persistence, and frontend. Pasted text Pasted text

### Recommended product definition

> **Nilumi is a shared-life assistant that understands each person’s context, coordinates permitted work across people and services, and presents the right interface for completing that work.**

I would organize the experience around **remembering, coordinating, and completing work**, rather than around a roster of agents.

A meal plan should become an editable plan and shopping list. An appointment request should become availability options and a reviewable action. A document question should open the relevant evidence. Conversation initiates and guides these experiences; it does not have to contain the entire product.

**An important correction:** the existing plan is already more than a plain chatbot. It includes cards, lists, tasks, memory inspection, evidence, history, and an inbox. The gap is a **general, persistent agent-driven interaction model**, not the complete absence of structured UI.  

---

## 2. Current Nilumi architecture and implementation status

### What exists versus what is designed

The inspected repository root contains **documentation and spikes**, rather than the planned production application. Accordingly, “already supported” in this review generally means **already covered by an architectural contract**, not a shipped capability. 

The roadmap records PWA acceptance on both phones and owner approval of the speech-to-text choice. It also explicitly says the STT approval was based on manual validation, without a complete per-adult benchmark supplied to the repository. Other model, voice, and platform gates remain part of the planned validation sequence. These distinctions should remain visible in the project status. 

### Current architecture

The documented execution flow is approximately:

```text
Voice or text
    ↓
Transcription, when necessary
    ↓
Sensitive-input boundary
    ↓
Member-scoped context and entity shortlist
    ↓
Schema-constrained command extraction
    ↓
Validation and deterministic command executors
    ↓
PostgreSQL mutations or grounded retrieval
    ↓
Cards, evidence, answers, speech, and notifications
```

The command vocabulary is bounded. It covers operations such as remembering, correcting, sharing, forgetting, asking, inspecting, and manipulating lists or reminders. This is not yet an open-ended reasoning/tool loop.  

### Documented stack

| Layer | Current direction |
|---|---|
| Application | TypeScript, pnpm, Node.js; Next.js App Router PWA |
| Interface | React, Tailwind, shadcn/ui, TanStack Query, Serwist |
| API | Hono integrated with Next.js; shared Zod contracts |
| Database | PostgreSQL, Drizzle, `pg`, pgvector, full-text and trigram search |
| Authentication | Better Auth, email codes, session controls, optional step-up authentication |
| Background work | graphile-worker |
| Realtime | PostgreSQL LISTEN/NOTIFY feeding member-filtered SSE |
| AI | AI SDK model-role abstraction; separate speech adapters |
| Hosting/storage | Railway Singapore; Cloudflare R2; encrypted backup and restore procedures |

These are repository choices, not a recommendation to upgrade every dependency to whatever is newest. 

### Foundations worth preserving

**The memory model is a major strength.** It separates entities, predicates, typed values, attribution, ownership, visibility, validity, history, and evidence. Correction, supersession, sharing, and forgetting are explicitly modeled instead of being left to a model editing a text file. 

**Privacy is enforced below the model.** Member-scoped transactions and row-level security cover not only memory rows but also aliases, search, history, evidence, notifications, and existence leaks. Application administration is not intended to bypass another member’s private content. 

**Reliable operations are already taken seriously.** The design includes mutation receipts, resumable turns, version checks, transactional reminder scheduling, stale-job rejection, reconciliation, and explicit delivery stages. Those mechanisms are reusable foundations for agent work.  

### Two issues to resolve before implementation expands

**First, reconcile the AI routing documents explicitly.** ADR-038 supersedes the previous rejection of a hosted gateway and selects Vercel AI Gateway for LLMs and embeddings. Older architecture passages still describe direct-provider-only calls. Apply the accepted decision consistently to diagrams, processor records, configuration, and failure behavior.  

There is also a concrete configuration check: Vercel distinguishes gateway retention from provider-level ZDR enforcement, and its team-wide provider allowlist is documented as a Pro/Enterprise feature. Verify the actual account entitlement and effective settings rather than treating the ADR as proof that enforcement is active. [Vercel](https://vercel.com/docs/ai-gateway/security-and-compliance)

**Second, revise the threat model before adding external tools.** The current injection defenses partly rely on a closed command set without general external side effects. Adding email, calendars, browsers, MCP servers, or code execution changes that assumption. 

---

## 3. Reference project analysis

### 3.1 OpenClaw: runtime lifecycle, extensibility, and channel architecture

OpenClaw’s useful architectural idea is a **long-lived gateway coordinating sessions, tools, events, channels, and execution environments**. Its agent loop includes session serialization, streaming lifecycle events, and durable writer ownership. Selected implementation paths check lifecycle revisions and active writer IDs to reject stale session updates.  

**What Nilumi should adopt**

Use explicit run ownership, cancellation, bounded concurrency, lifecycle events, and stale-worker protection. Keep channel adapters separate from household business logic so a later room speaker or messaging interface reaches the same authorized operations.

Its context organization is also useful inspiration: distinguish stable personal context, durable knowledge, and recent observations rather than continually appending everything to a prompt. Nilumi should adapt that layering without abandoning its structured memory authority. [OpenClaw](https://docs.openclaw.ai/concepts/memory)

**What requires caution**

OpenClaw now documents multi-user operation, but it explicitly describes people operating the same agent as a **shared trust boundary**. Session ownership and sidebar filtering are not isolation between their tools, credentials, and files. That is not equivalent to Nilumi’s requirement for private information inside a shared household. [OpenClaw](https://docs.openclaw.ai/concepts/multi-user)

Its UI is also richer than plain chat: `show_widget` supports sandboxed HTML and structured native dashboard reports, including persistent pinned results. Borrow persistent surfaces and explicit capabilities, but not generated HTML as Nilumi’s default rendering model. 

**Verdict:** strong reference for runtime mechanics and extensibility; not a drop-in household privacy or UI architecture.

### 3.2 OpenDots: workspaces, reviewed artifacts, and voice/compute separation

OpenDots combines specialist agents, **Spaces**, editable pages, optional agent computers, connections, and conversations. Application documents and background-work metadata are separate from conversation persistence. Its frontend uses CopilotKit/AG-UI, while the documented compute path uses TanStack AI. 

**What Nilumi should adopt**

The most valuable pattern is:

**Agent prepares work → person reviews it → approved work becomes a persistent, editable application object.**

A family plan should survive outside the chat, have a stable destination, support revisions, and retain its source relationship.

OpenDots’ MCP approvals also contain useful mechanics: the server stores the exact connection, tool, and arguments; approval runs that stored request; and current tool availability is checked again. 

**What requires caution**

The inspected discovery implementation enables new tools by default and uses the server’s `readOnlyHint` to determine the initial approval requirement. Nilumi should instead use a reviewed local risk classification—especially because a “read” can still disclose private information to an external service. 

Conversations require CopilotKit Intelligence; SQLite is not a standalone conversation store. The README distinguishes hosted service, local evaluation, and licensed self-hosting. Do not adopt the entire template assuming every dependency is an unrestricted, locally owned subsystem. 

Its separate realtime speech and compute agents are an interesting later optimization, not a reason to replace Nilumi’s speech pipeline now.

**Verdict:** excellent product and artifact UX reference; selectively borrow patterns rather than its persistence topology.

### 3.3 Hermes Agent: tool organization, context management, and procedural learning

Hermes emphasizes an extensible agent loop, reusable skills, cross-session recall, scheduled work, and delegation. Its implementation has a central tool registry declaring schemas, handlers, toolsets, and availability rather than maintaining disconnected tool definitions.  

Its delegation implementation gives children fresh conversations and task identities, narrows inherited tools, and returns summaries rather than exposing every intermediate child interaction to the parent. Depth and role control delegation rather than allowing the model to grant itself arbitrary child capabilities. 

**What Nilumi should adopt**

Separate three kinds of retained information:

| Kind | Nilumi treatment |
|---|---|
| Facts and preferences | Existing evidence-backed memory model |
| Working context | Bounded, temporary context for a conversation or run |
| Reusable procedures | Versioned, reviewable skills or workflow templates |

A successful family workflow could produce a **suggested reusable procedure**, such as “prepare our weekly meal plan.” That is different from automatically rewriting permissions or treating every previous action as permanent consent.

**What not to copy**

Do not replace household RLS and structured provenance with profile files or session recall. Do not adopt autonomous skill modification before Nilumi has review, versioning, testing, and rollback.

The Python implementation is useful evidence, not a reason to introduce a second core application language.

**Verdict:** borrow context discipline, tool registration, and bounded delegation; adapt learning into a consented product feature.

### 3.4 OpenMuse: durable work as a first-class user experience

OpenMuse is the closest reference for the experience of **delegating work, leaving, returning, and continuing from a saved result**.

Its architecture includes a Hono server, task execution, persisted plans and receipts, a separate browser worker, and optional isolated computer capabilities. Its interface exposes activity, missing inputs, approvals, pause/resume/cancel/retry, documents, goals, and artifacts—not just responses. 

The inspected task worker uses leases, compare-and-swap transitions, checkpoints, cancellation signals, and checks that a worker still owns the task before continuing. These are directly relevant to extending Nilumi’s existing durable operations. 

**What Nilumi should adopt**

Make delegated work visible as a persistent object, including:

- Its objective, current status, next required input, and outcome.
- Reviewable external actions.
- Saved results that remain usable independently of the conversation.

Its documented handling of uncertain external writes is particularly important: an interrupted response does not establish whether an external action happened, and cancellation cannot necessarily recall an already-dispatched request. 

**What requires caution**

The recorded verification distinguishes local fixtures from live Google-account acceptance, and single-owner identity from multi-tenant security. Android bundle validation is also not the same as installed-device acceptance. These are good examples of honest release evidence, not proof that all reference capabilities are production-ready. 

Do not copy its single-owner access model or move to React Native merely because its UI is useful.

**Verdict:** the strongest reference for Nilumi’s durable task and result experience.

### 3.5 OpenBot: governed execution and delegated authority

OpenBot’s strongest architectural pattern is **one server-side action boundary** across browser, file, MCP, and component operations:

```text
Resolve the real target
    → evaluate policy
    → record the decision
    → execute or refuse
    → record the outcome
```

The inspected policy contract distinguishes mechanism from effect, uses server-resolved targets, and carries both the acting person and what initiated the run. That enables different rules for interactive and unattended work.  

**What Nilumi should adopt**

Separate **tool availability**, **account connection**, **resource access**, **action approval**, and **execution policy**. None substitutes for the others.

Its handoffs also offer useful ideas: structured task constraints, server-authored attribution, explicit grants, depth limits, durable delivery, and a named way to ask a person rather than endlessly delegate. 

**What requires caution**

The documented policy engine fails closed, but the shipped startup policy permits everything unless replaced. Local single-user mode admits requests as one administrator. Those defaults are inappropriate for Nilumi’s family deployment.  

The docs also acknowledge limits of proxy-based network controls and distinguish declared group metadata from actually enforced channel membership. Borrow the execution boundary, not assumptions that every declared control is effective. 

**Verdict:** the best governance reference, but far more platform machinery than Nilumi presently needs.

---

## 4. Capability comparison matrix

**Status definitions:**  
**A:** already covered adequately in Nilumi’s design. **I:** planned, but needs improvement. **M:** missing an explicit capability or contract. **X:** interesting, but unnecessary now.

These describe the inspected design baseline, not shipped production status.

### Core capabilities

| Capability | Status | Best reference | Adopt? / priority | Recommended approach |
|---|---|---|---|---|
| Structured household memory | A | Nilumi | Keep / now | Retain typed facts, attribution, history, evidence |
| Member-scoped privacy | A | Nilumi | Keep / now | Extend existing RLS to every new resource |
| Selective sharing beyond all adults | I | No complete substitute | Yes / foundation now | Explicit resource grants and audiences |
| Conversation/run context | I | Hermes, OpenClaw | Yes / now | Separate stable facts, recent context, task evidence |
| General iterative agent loop | M | OpenClaw, Hermes | Yes / now | Bounded loop beside the command path |
| Tool registry and execution broker | M | Hermes, OpenBot | Yes / now | One typed registry; one authorization boundary |
| External MCP connectivity | I | OpenDots, OpenBot | Yes / next | Bring forward the later concept through governed adapters |
| Per-person external accounts | M | OpenBot, OpenMuse | Yes / next | Account ownership, scopes, consent, revocation |
| Generic action approvals | I | OpenDots, OpenMuse | Yes / now | Extend existing confirmations into durable approval records |
| Reliable reminders and notifications | A | Nilumi | Keep / now | Reuse graphile-worker and occurrence revisions |
| Long-running agent work | M | OpenMuse | Yes / now | Runs, checkpoints, leases, resumable state |
| Durable agent events | I | OpenMuse, OpenClaw | Yes / now | Persist events; keep SSE delivery |
| Persistent generated artifacts | M | OpenDots, OpenMuse | Yes / now | Typed, versioned results independent of chat |
| General UI catalog and protocol | I | CopilotKit references | Yes / now | Evolve cards into trusted, versioned surfaces |
| Recurring agent workflows | I | OpenBot, Hermes | Yes / next | Extend scheduling with explicit execution policies |
| Reusable skills | M | Hermes, OpenBot | Yes / next | Reviewed instructions; no implicit permission grants |
| Bounded subagents | M | Hermes, OpenBot | Later | Task-scoped delegation, depth and budget ceilings |
| Browser/computer execution | M | OpenBot, OpenMuse | Conditional / later | Separate isolated execution service |
| General-purpose knowledge graph | X | Not needed to fill current gap | No | Use existing relational entities and relations |
| Autonomous skill/code installation | X | Technically possible elsewhere | No | Require review and controlled deployment |

The baseline classifications follow Nilumi’s closed command, memory, roadmap, and evolution contracts; the reference choices follow the implementations discussed above.    

### The overall comparison

| Project | Most useful to Nilumi | Main reason not to adopt wholesale |
|---|---|---|
| OpenClaw | Runtime lifecycle, channels, extensibility | Shared-agent trust model differs from household privacy |
| OpenDots | Workspaces and reviewed, editable results | Conversation infrastructure dependency and template-specific assumptions |
| Hermes | Context, tools, skills, delegation | Learning/profile architecture is not household authorization |
| OpenMuse | Durable task UX and resumable work | Single-owner foundation; recorded live-service validation limits |
| OpenBot | Policy, tool governance, authority propagation | Enterprise complexity and unsafe-for-family development defaults |

---

## 5. The genuinely missing capabilities

The largest gaps are **contracts**, not feature counts.

### A durable work contract

A conversation turn is not enough to represent “research this, ask me a question tomorrow, then complete the approved action.”

Introduce a run with an objective, actor, status, checkpoints, deadlines, budget, outputs, and required human decisions.

### A governed external-action contract

The existing executors need an outer contract describing the target account, required authority, risk, approval, retry safety, and execution receipt.

Without that, connecting more tools expands capability faster than control.

### A persistent result contract

A comparison, plan, dashboard, or filled form needs identity and versioning outside its originating message.

The planned Family Records Vault addresses source documents and evidence; it does not by itself define the lifecycle of all generated working artifacts. 

### A delegation and selective-sharing contract

“Visible to the household” is not the same as “permitted to act using this person’s account.”

This needs explicit modeling rather than interpretation from family relationships or remembered preferences.

### An agent-to-interface contract

Cards exist, but the expanded product needs stable component IDs, actions, revisions, streaming updates, authorization, and replay.

**These five additions unlock substantially more value than implementing a large collection of specialist agents.**

---

## 6. Concrete architecture changes

### Preserve the deployment shape

Continue with a **modular application plus worker**, backed by PostgreSQL.

Most architectural concepts in your brief should initially be responsibilities within that system:

| Module | Responsibility | Deployment |
|---|---|---|
| `agent-runtime` | Run lifecycle, planning, bounded iteration, checkpoints, cancellation | Shared app/worker module |
| `tool-runtime` | Registry, validation, policy checks, execution receipts, local/MCP adapters | Shared module |
| `policy` | Resource access, delegation, risk rules, approval decisions | Shared module |
| `context` | Assemble permitted facts, evidence, recent turns, and task context | Shared module |
| `artifacts` | Typed results, revisions, provenance, sharing | Shared module |
| `ui-protocol` | Surface schemas, action contracts, renderer compatibility | Shared contracts plus frontend |
| `integrations` | OAuth accounts, credential storage, webhooks, connection health | Shared module and worker jobs |

The existing memory, identity, retrieval, lists, tasks, reminder, voice, notification, and operational modules remain.

### Add data structures only as their capabilities ship

A useful starting set is:

```text
agent_runs
run_steps
tool_invocations
approvals
artifacts
artifact_versions
run_events
```

Add `connections`, `resource_grants`, and `delegations` with external accounts and selective sharing. Existing tables may cover some responsibilities; extend them rather than creating parallel ledgers.

Keep these distinctions:

**Conversation** = interaction history.  
**Household task** = a responsibility people track.  
**Agent run** = an execution attempt to accomplish an objective.  
**Artifact** = a persistent result.

### Do not add separate services for everything

Planner, orchestrator, executor, model gateway, context service, and UI engine do not each need a network service.

Similarly, retain PostgreSQL-backed jobs and SSE instead of adding Redis, Kafka, or a workflow platform preemptively. Nilumi already has transactional scheduling and reconnect/refetch behavior to build on. 

**One separation becomes important later:** browser and arbitrary-code execution must not share the trusted application’s database access, credentials, or maintenance privileges. Give that execution a distinct, restricted environment.

---

## 7. Useful user-facing additions

I would prioritize complete household journeys rather than a long feature menu.

| Journey | What the person sees | Why it strengthens Nilumi |
|---|---|---|
| Plan dinner | Preferences, options, missing information, editable meal plan | Combines memory with interactive decisions |
| Turn a plan into action | Reviewable shopping-list changes and assigned tasks | Moves beyond advice into completion |
| Coordinate an appointment | Consented availability, options, approval, receipt | Demonstrates multi-person coordination |
| Delegate research | Progress, sources, comparison, saved result | Demonstrates useful long-running work |
| Review pending decisions | One inbox for approvals, questions, failures | Makes agent activity manageable |
| Manage what Nilumi knows | Evidence, owner, audience, correction, forget | Preserves trust as capability grows |

Add a **Today/Home view**, a **Work/Activity view**, and an **Approvals inbox** around these journeys.

Do not make family members learn which specialist agent to choose before they can get help.

---

## 8. Recommended generative UI architecture

### Yes—the direction is architecturally sound

The safest version is:

```text
Intent
  → permitted tools and data
  → structured domain result
  → validated UI description
  → trusted application components
  → authorized user action
```

The agent can choose the presentation, but it cannot invent executable privileges.

### Separate transport, presentation, and authority

| Layer | Purpose | Recommendation |
|---|---|---|
| Agent event protocol | Messages, tool activity, state, lifecycle | Existing SSE initially; optional AG-UI adapter |
| UI description | Components, bindings, layout, actions | Small Nilumi-owned catalog |
| Application authority | Who may see or do what | Server-side policy and domain executors |
| Durable persistence | What survives reload or restart | PostgreSQL runs, artifacts, and events |

AG-UI and A2UI are complementary, not interchangeable. AG-UI standardizes agent/frontend interaction; A2UI provides a catalog-based UI description approach. A2UI explicitly supports application-specific catalogs matching an existing design system. [Agent User Interaction Protocol](https://docs.ag-ui.com/introduction)

**Recommendation:** borrow those boundaries now. Do not make Nilumi’s core data model dependent on a particular UI vendor or external thread service.

### Start with a small catalog

Initially support `card`, `form`, `table/comparison`, `task/progress`, `approval`, and `artifact`.

Add charts, calendars, timelines, maps, and dashboards when a concrete journey needs them. A “generative UI engine” can initially be a schema validator, a component registry, and a renderer—not an independent platform.

An illustrative **server-produced envelope**, rather than unrestricted model output:

```json
{
  "schemaVersion": "nilumi-ui/1",
  "surfaceId": "surface_meal_plan",
  "artifactId": "artifact_42",
  "revision": 3,
  "components": [
    {
      "id": "options",
      "kind": "comparison",
      "dataRef": "meal_options",
      "title": "Dinner options"
    },
    {
      "id": "next_action",
      "kind": "card",
      "text": "Review the ingredients before updating your shopping list.",
      "actions": [
        {
          "actionId": "action_91",
          "label": "Review shopping-list changes"
        }
      ]
    }
  ]
}
```

The server owns the artifact, action IDs, permitted data, and revision. The model may propose components and content, but cannot declare itself authorized.

### Safety and interaction rules

**Rendering:** validate on the server and client; allow only registered component kinds and bounded properties. No generated JavaScript, arbitrary HTML, executable expressions, or model-supplied API endpoints. Unknown components degrade to a safe fallback.

**Actions:** a click submits an opaque action ID, expected revision, and validated form input. The server resolves the operation and rechecks permissions. Viewing a button is not sufficient authority to execute its action.

**Streaming:** stream complete validated component updates, not half-formed actionable JSON. Use stable IDs and monotonic revisions. On reconnect, load a permitted snapshot and then resume updates.

**Persistence:** save domain data as the source of truth. Persist the artifact’s presentation state where useful, but do not turn a rendered table into a second, inconsistent copy of the household database.

**Privacy:** generate a reader-specific projection. A shared run does not justify broadcasting one unrestricted agent state to every family member.

**Mobile:** preserve accessible controls, draft form input, and a clear pending/committed distinction. Agent-triggered navigation should not discard edits or unexpectedly move someone away from the task.

The desired result is not “a prettier answer.” It is **a small working interface that remains useful after the answer finishes**.

---

## 9. Recommended agent runtime architecture

### Use two execution paths

#### Path A: constrained household commands

Keep the existing schema-extraction and deterministic-executor path for requests such as “add milk,” “correct the warranty date,” or “snooze this reminder.”

Those operations should not require a planner and multiple reasoning iterations. 

#### Path B: bounded agent work

Use an iterative path for research, comparisons, multi-source planning, and workflows requiring intermediate decisions.

```text
Create run with server-owned identity and limits
    ↓
Assemble permitted context
    ↓
Select the currently relevant tool subset
    ↓
Propose the next step
    ↓
Validate target, authority, risk, and budget
    ↓
Execute, request input, request approval, or stop
    ↓
Persist result and checkpoint
    ↓
Update artifact/UI
    ↓
Continue within limits
```

Both paths must reach the **same domain executors**. An agent must not gain a second, weaker way to edit memory or create reminders.

### Runtime boundaries

Give every run a maximum number of steps, elapsed-time limit, tool timeout, cost budget, and cancellation state. For an initial pilot, a small step ceiling is preferable to an unrestricted loop; tune it using actual task results.

AI SDK already provides loop controls, step preparation, and tool selection mechanisms. That is sufficient reason to prototype inside the existing stack before adopting another orchestration framework. It does not remove the need for Nilumi-owned durable state. [AI SDK](https://ai-sdk.dev/docs/agents/loop-control)

Useful states include:

```text
queued → running → completed
            ├── waiting_for_input
            ├── waiting_for_approval
            ├── paused
            ├── failed
            ├── cancelled
            └── outcome_unknown
```

### Tool registry and broker

Each registered tool should describe its input/output schemas, effect, required permissions, account binding, timeout, retry policy, idempotency support, and approval requirements.

Use the same interface for local domain functions and remote MCP tools. **Do not wrap every internal function in a networked MCP server.**

Treat discovered tools as candidates, not automatically trusted capabilities. MCP itself requires clients to treat annotations as untrusted unless they come from trusted servers. [GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx)

Keep credentials outside model context. Validate and bound tool results before reuse, and extend privacy handling to tool outputs, external documents, summaries, and traces.

### Approvals must authorize a specific action

Bind an approval to the actor, approver, tool/version, account, canonical arguments, relevant resource version, and expiry.

At execution, load the stored request and recheck current authority. Changed arguments, disconnected accounts, or materially changed resources require another decision.

This adapts the stored-request and review-binding patterns visible in OpenDots and OpenMuse.  

### Handle uncertain side effects explicitly

A local transaction cannot guarantee exactly-once execution across an arbitrary external service.

After a timeout on “send” or “book,” the action might have succeeded remotely. Record `outcome_unknown`, reconcile using a provider receipt or idempotency key where available, and do not blindly retry.

Likewise, distinguish **“stop future steps”** from **“undo an action already dispatched.”** OpenMuse’s documentation makes this distinction explicitly. 

### Memory, skills, and subagents

Do not automatically promote every tool result into permanent memory. Keep working evidence with the run; propose durable facts through the existing memory validation and provenance path.

Skills should initially be reviewed instructions plus declared tool requirements. A skill declaration does not grant permission—a useful distinction also present in OpenBot. 

Add subagents only when measured tasks benefit from parallelism. Give them restricted inputs, typed outputs, inherited limits, and no authority beyond the parent’s permitted scope. Present their work within the parent task rather than forcing users to navigate a new conversation for every delegation.

---

## 10. Multi-person and family architecture

### Retain the current foundation, extend the audience model

Nilumi already distinguishes the subject of a fact, who asserted it, who owns it, and who may see it. Its current `shared` visibility preserves owner control while allowing adult readers. That is a better starting point than merging everyone’s histories into one memory store. 

The limitation is that sharing is principally household-wide or adult-wide, rather than selectively granted.

Model:

```text
Authenticated person
    → membership in household/group
    → resource ownership and grants
    → connected accounts
    → optional explicit delegation
```

You do not need to rename every `household_id` column now. You do need to avoid embedding “exactly two adults” or “spouse means authorized” into new contracts.

### Authorization should be an intersection

For a proposed action, evaluate:

```text
Authenticated authority
    ∩ explicit delegation, when applicable
    ∩ agent/tool grants
    ∩ resource and account permissions
    ∩ current execution policy
```

The model does not supply the authoritative actor ID. A family relationship does not constitute delegation.

### How your example scenarios should work

| Request | Recommended interpretation |
|---|---|
| “Remind my wife about this.” | Create an attributed reminder addressed to her, subject to recipient preferences; do not access her private context |
| “Add this to our shopping list.” | Resolve the shared list and verify write access |
| “What appointments do we have?” | Read the shared calendar and individually consented projections; do not expose private event details by default |
| “Plan dinner for everyone.” | Use shared or explicitly permitted preferences; ask about unknown constraints rather than infer them |
| “Book after checking everyone’s calendar.” | Obtain permitted availability, propose the exact booking, and use a specifically authorized account after required review |

The current architecture already plans spouse-relative resolution, reminder attribution, and household-only access from shared speakers. Preserve those behaviors while adding narrower grants.  

### Consent must have a lifecycle

Represent consent as scope, purpose, grantor, grantee, expiry, and revocation—not a remembered sentence such as “my wife is okay with this.”

Revocation should affect future context assembly, pending actions, derived artifacts, notifications, and cached projections.

Extend Nilumi’s existing `content_refs` and forget/unshare model to agent summaries, task outputs, and generated UI. Otherwise, private facts can disappear from memory while surviving in an artifact or run transcript. 

Two boundaries deserve explicit product language:

**An agent profile is not a person.** A family can share an assistant configuration while each execution retains the correct human authority.

**Application privacy is not automatically privacy from the infrastructure operator.** RLS protects application access; it does not make stored plaintext cryptographically inaccessible to someone controlling the database or backups. Do not imply otherwise.

Child-facing use remains a separate policy and provider-eligibility decision, as the existing roadmap already recognizes. 

---

## 11. Technology stack recommendations

**Keep almost all of the stack.**

| Technology area | Recommendation |
|---|---|
| Next.js PWA | Keep; the repository records phone validation, and the proposed UI does not require native replacement |
| Hono and shared TypeScript contracts | Keep; preserve a clean API boundary for future clients |
| PostgreSQL and Drizzle | Keep; extend schema and RLS rather than add a second authority |
| pgvector and relational entities | Keep; no demonstrated need for a separate vector or graph database |
| graphile-worker | Keep; use it to dispatch resumable run steps and workflows |
| SSE and TanStack Query | Keep; add run snapshots and durable events |
| AI SDK | Keep; prototype bounded tool loops behind Nilumi interfaces |
| Better Auth | Keep; add domain authorization rather than replace authentication |
| R2 | Keep for files, artifact payloads, and existing recovery design |
| AG-UI/CopilotKit | Evaluate a narrow integration when it reduces frontend work; avoid adopting the whole reference platform |
| Dedicated workflow engine | Defer until complex durable orchestration exceeds the small state-machine approach |
| Browser/code sandbox | Add only for a validated need, as an isolated subsystem |

The existing PWA acceptance, stack decisions, and scale triggers support this incremental approach.   

Keep model selection role-based and evaluation-driven. A model suitable for command extraction is not automatically the best planner, summarizer, or tool user.

Also, **do not reuse the existing cost estimate as the budget for the expanded product**. The documented estimate belongs to a constrained voice/memory workload; iterative agents, research, persistent computers, and additional processors change the assumptions. Measure cost per completed journey and preserve per-run and household caps. 

---

## 12. Recommended target architecture

```text
People / household / small-group members
                     │
                     ▼
Next.js PWA
  Home • Conversation • Work • Memory • Approvals • Artifacts
  Trusted component registry + versioned UI renderer
                     │
                HTTPS + SSE
                     │
                     ▼
Hono API / authentication / authorized projections
                     │
            Server-owned execution context
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
Constrained command path   Bounded agent runtime
                           Plan • iterate • pause • resume
          │                      │
          └──────────┬───────────┘
                     ▼
Governed tool runtime
  Schema validation • permissions • approvals • budgets • receipts
          │              │                 │
          ▼              ▼                 ▼
Domain executors    Integration adapters   Isolated execution
Memory / lists      APIs / MCP / OAuth     Browser / code
Tasks / reminders                          [later, separate]
          │              │
          └───────┬──────┘
                  ▼
PostgreSQL
  Existing household data and RLS
  Runs • steps • approvals • grants • artifacts • events
                  │
                  ▼
graphile-worker
  Resume work • schedules • webhooks • notifications • reconciliation

Context builder ──► permitted memory, evidence, and run state
Model adapters ──► approved model and speech providers
Artifact storage ──► R2
Audit and metrics ──► every execution boundary
```

In this design:

**The agent chooses work; the tool runtime decides whether it may happen.**  
**The database records what happened; the UI presents an authorized view of it.**  
**The worker allows work to continue without depending on an open chat connection.**

That is the essential architecture—not the number of agents or services.

---

## 13. Prioritized roadmap

### Build now: establish the expanded product’s foundations

Keep the original privacy, recovery, and family-pilot gates. Amend the roadmap explicitly rather than silently replacing its memory-first scope. 

The first implementation slice should combine the existing trusted core with a **small amount of genuine agentic behavior**:

1. Implement member-scoped access, sensitive-input handling, receipts, memory/list operations, and restore safety.
2. Add the bounded run model, tool broker, approval primitive, artifact model, and a small trusted UI catalog.
3. Deliver one complete journey: **“Help us plan dinner, compare options, and review the shopping-list changes.”**

This journey can test personalization, missing information, structured UI, an approved mutation, persistence, and household sharing without introducing autonomous browsers or numerous connectors.

**Completion gate:** another member’s private data never appears in the result; reconnect restores the interface; repeated approval does not duplicate the mutation; stale edits are surfaced; the task has a durable outcome.

### Build next: external coordination and repeatable work

Introduce per-person account connections, consented calendar availability, reviewed calendar writes, durable research/comparison tasks, and an approvals/activity inbox.

Deliver the planned **Family Records Vault** using the existing provenance and masking direction, while keeping source documents distinct from generated artifacts. 

Then add a few reviewed workflow templates and opt-in recurring jobs. Test account disconnection, changed permissions, webhook duplicates, expired approvals, and uncertain external outcomes.

### Build later: capabilities justified by observed use

Consider bounded subagents, browser fallback for services without usable APIs, richer calendars/charts/maps, realtime conversational voice, Home Assistant channels, and broader group arrangements.

Treat learned procedures as proposals before considering automatic promotion. Keep child-facing interaction behind its separate consent, safety, and provider gates.

### Do not build yet

Avoid an agent marketplace, autonomous plugin installation, unrestricted code execution, a permanent computer for every member, autonomous purchases, elaborate multi-agent hierarchies, a separate knowledge graph, distributed event infrastructure, or a commercial multi-tenant control plane.

These do not solve the immediate architectural gap.

### Update the existing documentation rather than multiplying it

Revise the product plan, architecture, stack, and roadmap in place. Add focused decisions for the dual execution paths, tool/approval authority, persistent UI/artifacts, and selective sharing. Keep validation evidence separate from accepted intentions.

---

## Final assessment

**Is the current architecture sufficient for the original household memory MVP?**  
It is a strong design baseline, subject to the implementation and validation gates already recorded.

**Is it sufficient for the broader Nilumi in your brief?**  
Not yet. Its closed command model, limited sharing semantics, and turn-oriented outputs do not fully cover broad agent execution, external account authority, or persistent task-specific interfaces.

**Does that require replacing the stack?**  
No. The missing pieces fit naturally into the existing modular application, worker, and PostgreSQL architecture.

The most valuable combination is:

> **Nilumi’s evidence-backed memory and privacy**  
> **+ OpenClaw’s runtime discipline**  
> **+ Hermes’ context and tool organization**  
> **+ OpenMuse’s durable work experience**  
> **+ OpenDots’ persistent workspaces**  
> **+ OpenBot’s governed execution.**

My strongest recommendation is to **make one household workflow genuinely agentic, persistent, and safe before making Nilumi broadly autonomous**. That will test the product you actually want to build—without discarding the foundations that make it worth trusting.