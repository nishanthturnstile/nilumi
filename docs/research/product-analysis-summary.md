# Reference-project findings — October8, 2026

 Supporting analysis of the listed repositories as inspected in the October8 review. It is dated research, not an implementation plan or proof of Nilumi runtime behavior. External project behavior must be verified against its actual revision before reuse.

 ## Current relevance

 Persistent activities, reviewed results, explicit capability checks and media/application separation informed the current Home contracts. General run engines, delegation, procedures/skills, external actions and additional services remain deferred. Research recommendations for a separate Activity screen, custom A2UI runtime or autonomous work do not override the [current decisions](../adr/README.md).

 ## Reference project analysis


### 3.1 OpenClaw: runtime lifecycle, extensibility, and channel architecture

OpenClaw’s useful architectural idea is a **long-lived gateway coordinating sessions, tools, events, channels, and execution environments**. Its agent loop includes session serialization, streaming lifecycle events, and durable writer ownership. Selected implementation paths check lifecycle revisions and active writer IDs to reject stale session updates.

**Patterns identified in the dated review**

The review identified explicit run ownership, cancellation, bounded concurrency, lifecycle events and stale-worker protection for deferred runs. Keep channel adapters separate from household business logic so a later room speaker or messaging interface reaches the same authorized operations.

Its context organization is also useful inspiration: distinguish stable personal context, durable knowledge, and recent observations rather than continually appending everything to a prompt. Nilumi should adapt that layering without abandoning its structured memory authority. [OpenClaw](https://docs.openclaw.ai/concepts/memory)

**What requires caution**

OpenClaw now documents multi-user operation, but it explicitly describes people operating the same agent as a **shared trust boundary**. Session ownership and sidebar filtering are not isolation between their tools, credentials, and files. That is not equivalent to Nilumi’s requirement for private information inside a shared household. [OpenClaw](https://docs.openclaw.ai/concepts/multi-user)

Its UI is also richer than plain chat: `show_widget` supports sandboxed HTML and structured native dashboard reports, including persistent pinned results. Borrow persistent surfaces and explicit capabilities, but not generated HTML as Nilumi’s default rendering model.

**Verdict:** strong reference for runtime mechanics and extensibility; not a drop-in household privacy or UI architecture.

### 3.2 OpenDots: workspaces, reviewed artifacts, and voice/compute separation

OpenDots combines specialist agents, **Spaces**, editable pages, optional agent computers, connections, and conversations. Application documents and background-work metadata are separate from conversation persistence. Its frontend uses CopilotKit/AG-UI, while the documented compute path uses TanStack AI.

**Patterns identified in the dated review**

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

**Patterns identified in the dated review**

Separate three kinds of retained information:

| Kind | Nilumi treatment |
|---|---|
| Facts and preferences | Existing evidence-backed memory model |
| Working context | Bounded, temporary context for a conversation or run |
| Reusable procedures | Deferred versioned/reviewable workflow extension; no initial runtime |

A successful family workflow could produce a **suggested reusable procedure**, such as “prepare our weekly meal plan.” That is different from automatically rewriting permissions or treating every previous action as permanent consent.

**What not to copy**

Do not replace household RLS and structured provenance with profile files or session recall. Do not adopt autonomous skill modification before Nilumi has review, versioning, testing, and rollback.

Its Python core was not selected for household execution. The current isolated Python voice service is a separate media boundary under ADR-002.

**Dated interpretation:** context discipline and tool registration informed current contracts; delegation and procedural learning remain deferred.

### 3.4 OpenMuse: durable work as a first-class user experience

OpenMuse is the closest reference for the experience of **delegating work, leaving, returning, and continuing from a saved result**.

Its architecture includes a Hono server, task execution, persisted plans and receipts, a separate browser worker, and optional isolated computer capabilities. Its interface exposes activity, missing inputs, approvals, pause/resume/cancel/retry, documents, goals, and artifacts—not just responses.

The inspected task worker uses leases, compare-and-swap transitions, checkpoints, cancellation signals, and checks that a worker still owns the task before continuing. These are directly relevant to extending Nilumi’s existing durable operations.

**Patterns identified in the dated review**

The review identified these properties for any future delegated work object:

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

**Patterns identified in the dated review**

Separate **tool availability**, **account connection**, **resource access**, **action approval**, and **execution policy**. None substitutes for the others.

Its handoffs also offer useful ideas: structured task constraints, server-authored attribution, explicit grants, depth limits, durable delivery, and a named way to ask a person rather than endlessly delegate.

**What requires caution**

The documented policy engine fails closed, but the shipped startup policy permits everything unless replaced. Local single-user mode admits requests as one administrator. Those defaults are inappropriate for Nilumi’s family deployment.

The docs also acknowledge limits of proxy-based network controls and distinguish declared group metadata from actually enforced channel membership. Borrow the execution boundary, not assumptions that every declared control is effective.

**Verdict:** the best governance reference, but far more platform machinery than Nilumi presently needs.

---

## 4. Capability comparison matrix

The original gap labels and “now/next” priorities described an earlier design comparison. They are retired; this table records relevance under the current baseline without creating another schedule.

| Reference pattern | Current Nilumi disposition | Decision / delivery |
|---|---|---|
| Structured memory, attribution, history | Retain custom domain model | ADR-005/006; P4 |
| Member-scoped privacy | Enforce across records and derivatives | ADR-007/031/048; P1 onward |
| Conversation context | Active activity plus bounded permitted dialogue | ADR-003/057; P0/P2 |
| Trusted tools/approval | Server broker, exact internal proposals | ADR-042; foundations P1, domain P3, initiative P6 |
| Persistent generated results | Activities/presentations separate from transcripts | ADR-044/057; P0/P2 |
| Reminder reliability | Transactional schedules and stage-specific evidence | ADR-011/035; P5 |
| External accounts | Optional owner-only read-only calendar | ADR-045; P7 |
| General loops, leases and checkpoints | Deferred bounded runs | ADR-043; no initial migrations |
| Resource grants, external MCP, delegation | Deferred authority/eligibility extensions | ADR-034/048; deferred prerequisites |
| Reusable skills and recurring agents | Deferred; no implicit permission learning | Deferred prerequisites |
| Browser/computer execution | Deferred isolated execution decision | Deferred prerequisites |
| General knowledge graph or automatic code installation | No initial requirement | Custom relational memory/current reviewed deployment |

### The overall comparison

| Project | Most useful to Nilumi | Main reason not to adopt wholesale |
|---|---|---|
| OpenClaw | Runtime lifecycle, channels, extensibility | Shared-agent trust model differs from household privacy |
| OpenDots | Workspaces and reviewed, editable results | Conversation infrastructure dependency and template-specific assumptions |
| Hermes | Context, tools, skills, delegation | Learning/profile architecture is not household authorization |
| OpenMuse | Durable task UX and resumable work | Single-owner foundation; recorded live-service validation limits |
| OpenBot | Policy, tool governance, authority propagation | Enterprise complexity and unsafe-for-family development defaults |

---



 ## Evidence interpretation

 Reference patterns can explain a design tradeoff but cannot establish authorization, reliability or compatibility for Nilumi. [ADR-003](../adr/adr-003.md), [ADR-042](../adr/adr-042.md), [ADR-043](../adr/adr-043.md), [ADR-044](../adr/adr-044.md) and [ADR-057](../adr/adr-057.md) now contain the complete adopted/deferred choices. Alternative architecture proposals and prioritized roadmaps from this report were removed; [P0–P8](../plans/implementation-plan.md) is the sole active build sequence.
