# Nilumi implementation plan

One active detailed application plan, baseline 2026-10-10. This records future work; this documentation revision does not implement it. Application status: **unimplemented**. Existing tokens/helpers and spike implementations are retained; evidence acceptance is scoped to those experiments.

## Authority and execution rules

Read [Product](../core/01-product-plan.md), [ADRs](../adr/README.md), [Stack](../core/03-tech-stack.md), [Architecture](../core/02-architecture.md), [Flows](../core/28-application-flows.md) and [Design](../design/29-design-system.md) before work. This plan owns sequence/work packages/exit evidence; [Roadmap](../core/05-implementation-roadmap.md) is its concise index. Preserve identifiers when updating requirements.

Each package produces a reviewable behavior/contract and evidence in its phase record. Builder is accountable for implementation, automated checks and evidence integrity; both adults assess installed-phone usefulness and speech; owner approves processor/budget/release changes. A failed gate blocks its stated traffic/capability, not unrelated synthetic/manual work. No calendar/Vault/agent prerequisite should delay P0 Home.

Phases run P0→P1→P2→P3→P4→P5→P6→P7→P8. Complete prerequisites before dependent work. P7 calendar can be recorded deferred while completing safe Home fallback/lifecycle tools; core P8 pilot then excludes calendar explicitly. No automatic native fallback, additional channel or general run engine.

### Shared contract and safety requirements

Activity, Presentation, TurnContext, ActionRequest/Receipt, VoiceSession and ResponseEnvelope are [planned contracts](../core/02-architecture.md#68-activity-and-presentation-contracts). Fixtures first, strict versioned schemas second; TS and Python validate the same JSON boundary. Authoritative services bind actor/household, revisions, policy and idempotency. Model composition and spoken replies cannot authorize actions.

Household records, personal activities, derived layouts and transcripts have independent lifecycle. Drafts are not facts/tasks. Presentation changes preserve IDs/checked state; touch/text/voice share context. Late output/audio is fenced by turn sequence, focus epoch, revisions and connection generation. Interruption never undoes committed actions. Privacy/forget applies to every derivative and offline projection.

Keep current financial restrictions: total target≤₹3,000/month, ceiling₹5,000 with review above target; AI default₹800 including speech; 80/100% degradation; Gateway team US$10/runtime US$8 while evaluation key exists; no BYOK, pilot fallback or auto top-up. Existing experiment spending does not authorize new paid runs. Family data requires current processor review and exact-adult acknowledgement; all AI pauses on withdrawal. ZDR/legal/negative-policy gates apply before wider use.

### Evidence format

Future phase records are planned paths such as docs/validation/p0/acceptance.md; they do not exist yet and are intentionally not linked. Each includes build/lockfile hashes, exact environment/model/voice/transport, sample/corpus provenance, device/browser/network/language, timestamps, all failures/exclusions, actual vs reserved spend, automated outputs, owner observations and gate disposition. Keep secrets/raw family identifiers out of committed artifacts. Use scoped terms: implemented, validated within a stated scope, selected for prototype, planned for MVP, deferred.

<a id="p0"></a>
## P0 — Voice and Home prototype

**Objective:** prove the connected hands-occupied experience before constructing production foundations. **Prerequisites:** current baseline, synthetic-only scenario set, isolated fixture storage, retained tokens, eligible processor/transport evidence for any future test and separately authorized bounded spending before paid calls. Existing S4 allowance/results cannot be treated as a new blanket authorization.

### Ordered work packages

1. **P0.1 — Scenarios and wire fixtures.** Author synthetic cooking→shopping, school preparation and interrupted shopping journeys. Define Activity/Presentation/TurnContext/ActionReceipt/VoiceSession/ResponseEnvelope examples, ownership, stable IDs, revisions, focus epochs and fake authoritative receipts. Include English/Tamil/Tanglish names/quantities, partial failure, topic switch and expired dialogue. Record which contract fields become production schemas later.
2. **P0.2 — Home shell and trusted renderer.** Build an isolated Next.js/React prototype using the existing tokens. Add persistent voice/text composer, focused activity and Recent. Implement Nilumi-owned checklist, table, timeline, text and simple-diagram components through a bounded json-render catalogue/AI SDK adapter. Reject unsupported layouts/actions and provide accurate deterministic fallback. Use synthetic persistence sufficient for reload/restoration; no production database required.
3. **P0.3 — Foreground media bridge.** Pin released Pipecat/Python/Sarvam/client versions; verify Saaras v4 support against source (v1.11.0 verified floor), select actual audio/VAD/endpointing settings and local SmallWebRTC transport with an HTTPS prototype origin/signaling path reachable by both installed phones. Verify the actual pinned Sarvam TTS processor supports Bulbul v3/Ritu; if it does not, use a narrow streaming adapter and test it before claiming compatibility. Stream final recognition into the authoritative prototype turn service; send validated response text to Bulbul v3 Ritu. Do not add a second LLM/tool loop. Enforce test-session duration/cost limits, disconnect and provider-failure behavior.
4. **P0.4 — Connected correction and interruption.** Add text/touch desired-state operations and voice follow-ups over the same active item refs. Implement stop/mute/replay/end, barge-in flush, late-event fencing, topic focus/Recent restoration and view-only presentation changes. Persist draft vs domain fixture changes separately. Keep focused controls stable while patches arrive.
5. **P0.5 — Installed-phone evaluation.** Run the connected journeys on installed iPhone and Android, multiple languages, quiet/kitchen noise and representative networks. Record recognition/target/quantity errors, correction effort, endpointing, end-of-speech→visible/firstaudio/complete latency p50/p95, interruptions, permission/background/playback failures and billed session duration/characters. Capture perceived usefulness with both adults. Use synthetic speech unless separately approved family clips are necessary.

**Interfaces/data:** strict prototype envelopes with fixture revisions, activity/presentation separation and no production family data. Lock json-render/Pipecat compatible dependencies when implemented; selection alone is not a pin. Prototype storage may be local synthetic storage but cannot establish the production privacy/cache policy.

**User behavior:** speak once, receive visible+spoken response, interrupt/correct, switch shopping/school activity and return with checked state intact. Audio ending never removes the checklist.

**Failure/recovery:** unsupported layout→known view/text; STT/TTS unavailable→text/touch; permission denied→clear status; transport loss/background→release media and deliberate reconnect; generation from old topic→discard; action committed before interruption→retain receipt. No old audio autoplay after reconnect.

**Checks/device evaluation:** contract/adapter fixtures, fake-receipt idempotency, focus preservation, desired-state check/uncheck, draft safety and stale ordering. Both-phone matrix is mandatory. Existing synthetic700ms first-audio tests are comparison evidence only; full-turn latency includes endpointing.

**Completion evidence/exit:** G-VOICE, G-RENDER and G-COST-P0 close with connected journey on both phones and English/Tamil/Tanglish quality/latency/cost results. Document failed conditions and any release-blocking shortcomings before moving to production. If unacceptable, iterate this phase and update evidence/decision rather than selecting native fallback.

**Deferred:** production identity/database/RLS/hosting, real household writes, offline private data, push/calendar, general agent runs and full Tamil UI localization.

<a id="p1"></a>
## P1 — Production foundations

**Objective:** create safe application/backend/voice boundaries and operable deployment. **Prerequisites:** P0 exit and selected compatible contracts/runtime, review of actual costs and transport requirements. No family traffic until production media and privacy gates pass.

### Ordered work packages

1. **P1.1 — Workspace/tooling.** Add planned apps/web, apps/worker, services/voice and shared packages in this repo; extend packages/ui in place. Pin Node/pnpm/dependencies from supported reviewed versions. Pin Biome with committed biome.json for supported files, preserve project-specific lint checks and use pinned Python tooling. Resolve UI/S1 React peer mismatch deliberately. Add clean install/type/lint/build/contract/schema checks in CI; keep spikes runnable references.
2. **P1.2 — Shared contracts and response authority.** Publish strict TS schemas/JSON Schema/Python validators, error taxonomy and stream fixtures. Implement authenticated turn/action boundary with actor-scoped idempotency, per-command ledger and response coordinator. Scope focus/turn ordering to the authenticated client context; separate devices must not cancel each other's input. No household memory/list feature is implied by foundation echo/fixture verification. Server action refs are bound to target/capability/revision; renderer/payload bounds fail closed.
3. **P1.3 — PostgreSQL integrity/roles and identity.** Create foundational identity (including minimal member entities), source/operation/content-reference and receipt tables only, composite household refs and RLS role separation. Owner-only household bootstrap, invite email, OTP/multi-session, Devices/revoke/email change and step-up. Validate newest-code OTP semantics, expiry, rate limit, canonical origin, pooled context and admin capability boundaries; no owner credentials in runtime.
4. **P1.4 — Provider policy and budget controls.** Port reviewed acknowledgement/withdrawal/reservation/halt controls from spike behavior into new production schemas. Bind exact adult/current notice/processors, veto renewal and queued rechecks. Extend all-provider pause to STT/TTS streams. Enforce managed OpenAI-only/no-training/store/receipt/catalog controls and reserved cost. Document failed negative-policy exception scope; no automatic migration of staging acknowledgement or canary keys.
5. **P1.5 — Production origins and voice hosting proof.** Deploy isolated staging-app.nilumi.in and app.nilumi.in with host-only cookies, dedicated keys/databases and appropriate marketing separation. Verify signaling/TLS/media/TURN reachability, mobile networks, Python process lifetime/capacity/session authentication/expiry, disconnect cleanup and runtime cost. Choose approved self-hosted or eligible managed transport with dated decision and dependency pins. Do not assume Railway public media support or buy/provision a vendor during documentation work.
6. **P1.6 — Worker, backup and recovery skeleton.** Establish restricted worker/maintenance roles, idempotent job interface, logs/health/budget metrics, encrypted backups and a versioned content-free deletion/revocation journal with snapshot watermarks. Put human recovery material/runbook in the approved shared location and rehearse staging recovery. Future domain migrations extend this foundation instead of precreating all later tables.

**Interfaces/data:** foundation identity/household/acknowledgement/budgets/turn receipts and contract versions; narrow voice service grant, no domain DB credential. Declare migration compatibility and rollback rules. Future run/extraction/grant schemas remain documentation only.

**User behavior:** invited adults sign in/recover/revoke devices, inspect Privacy and record production acknowledgement explicitly. AI paused still offers authorized manual controls as they ship. No misleading saved-memory/list claims before those features exist.

**Failure/recovery:** expired/revoked session closes media and blocks action; stale notice/adult/processor pauses AI; quota/credit/unknown route/cost halts with no fallback; DB retry returns receipts; migration/deploy fails safely; backup failure alerts. Revoke cannot wipe an offline device before contact.

**Checks/device evaluation:** clean CI/build, cross-language compatibility, session/OTP/device/email/step-up, canonical-origin/CSRF checks, second-household/RLS/context/composite-key tests, concurrent reservation/withdrawal/queued-stream checks, verified actual transport on both installed phones and staging restore. Test without paid providers where fixtures suffice.

**Completion evidence/exit:** G-FOUNDATION, G-POLICY, G-MEDIA and G-RECOVERY-P1 close. Production hosting/transport and processor controls must be verified before any family session. Clean CI/isolation/session evidence, operating role inventory and cost forecast recorded.

**Deferred:** durable Home/domain modules, offline writes, general agent run tables, production push/calendar, wider users and full localization.

<a id="p2"></a>
## P2 — Home and persistent activities

**Objective:** implement the reusable responsive canvas and durable activities. **Prerequisites:** P1 production boundaries and media/policy gates; P0 interaction findings.

### Ordered work packages

1. **P2.1 — Accessible shell and real components.** Implement customized primitives plus Home header/composer/status/Recent/receipt/evidence shell. Supporting Settings/Inbox/Admin entry points replace domain tab growth. Initialize theme/text100–200% and inherited portal tokens before paint. Component specimens now use actual exports; existing static references remain distinguishable.
2. **P2.2 — Activities/revisions and retention.** Create activity/ref/presentation storage and owner RLS, current pointers and bounded recovery versions. Implement create/focus/archive/delete/Recent/restore with explicit data refs and draft provenance. Restoration rechecks current visibility and refreshes projections; conversation expiry does not delete activities. Register generated text/spec source refs from the outset. Reauthorize restored controls; saved presentations never retain executable bearer grants. Activity deletion journals opaque IDs so recovery cannot resurrect deleted drafts.
3. **P2.3 — Registry and shared response stream.** Integrate bounded trusted component catalogue and validated patches, coordinated receipt/text/presentation/speech events and authenticated resume cursors. Use stable IDs/focus epoch/turn sequence/revision; old receipts remain history without old output stealing focus. Preserve interactive focus during layout updates; fallback to current authorized view/text.
4. **P2.4 — Production voice lifecycle.** Integrate authenticated media grants/service bridge with the same turn service. Listening/processing/speaking/interrupted/disconnected/AIpaused states; permission, expiry, revoke, barge-in, mute/stop/replay/end and foreground reconnect. Recheck policy and reserve stream segments. Text/touch remains the same context; late provider events cannot create duplicate final turns.
5. **P2.5 — PWA and recovery interaction.** Precache shell/fonts only, deliberately exclude private API/screens. Update flow preserves activity and pending state before reload; background/lock/call release media and resume intentionally. Implement unsynced-switch safeguards ready for P3 queues. Validate safe areas/keyboard/Back/dark/Tamil/200%/screen-reader semantics on actual phones.

**Interfaces/data:** Activity/Presentation refs and current revisions; stream sequence/resume; authenticated VoiceSession generation/expiry; current+seven-day recovery presentation retention. No persisting raw transcript as a layout loophole.

**User behavior:** one Home, current useful output, Recent restoration, view changes with state preserved and voice/text/touch shared context. Manual restoration works when AI is paused; arbitrary private screens are online only.

**Failure/recovery:** invalid/late spec→retain accurate fallback; stale/revoked refs→scrub/refresh; connection loss→receipt resume; app close→restore current activity; focused control→defer replacement; PWA update→preserve state/no old replay.

**Checks/device evaluation:** schema bounds/action-ref security, cross-member activity/recent access, transcript-expiry restoration, event dedupe/out-of-order/audio fencing, focus stability, keyboard/Back/safe-area, PWA/cache/font/update and all voice lifecycle transitions. Repeat connected multilingual journey from P0 on the new production architecture with approved scope.

**Completion evidence/exit:** G-HOME/G-DEVICE-P2 close; voice/text/touch share context and restoration/focus/interruption/stale-output recovery pass both phones. No layout reorders a touched item or leaks private cache.

**Deferred:** shopping/domain writes, general transcript search/offline conversation, autonomous runs, full localization.

<a id="p3"></a>
## P3 — Shopping and routine checklists

**Objective:** first useful shared household workflow with minimal entry. **Prerequisites:** P2 activities/context/receipts; policy/privacy foundation.

### Ordered work packages

1. **P3.1 — List projections and requested actions.** Add lists/items, normalized names, quantities/units, deduplication, add/edit/remove/read. Link domain list to member-owned activities; both adults see permitted shared changes, not each other's private draft text. Use server action refs and receipts.
2. **P3.2 — Desired check/uncheck and Undo.** Implement checked boolean/expected version/idempotency; opening a checked item preserves identity and clears completion attribution. Validate compatible no-op and conflict policy, remove/restore and 24-hour version-safe Undo. No toggle/completion-only merge.
3. **P3.3 — Offline approved projections/queue.** Persist only allowed list/task/Inbox categories as they ship. Partition member/household/device cache and queue; preserve keys/revisions through restart. Show pending, failed and conflict states; block account switch until sync or explicit discard. Never cache arbitrary generated Home/private memory or raw saved-request/health/evidence/calendar fields inside otherwise allowed categories. Rebind fresh scoped controls on reconnect while keeping target/revision/desired state/idempotency.
4. **P3.4 — Two-phone synchronization.** Implement filtered SSE invalidation/refetch, reconnect refresh and same-item ordered queue reconciliation. Test offline duplicate adds, opposite checked states, quantity/removal conflicts and lost session. No silent discard or forced completion.
5. **P3.5 — Routine drafts and connected use.** Generate school/cooking routine checklists as labelled activity drafts, editable by voice/text/touch. Applying a routine to domain work is explicit; task creation waits for P5. Evaluate shopping/routine usefulness with both adults.

**Interfaces/data:** list/item versions, mutation receipts and approved offline projection schema; Activity domainRefs refer to shared canonical list. Model-generated routine steps stay draft IDs, not household tasks.

**User behavior:** say items/quantities, check/uncheck at the shop offline, see pending status, resolve conflicts and find the same list in Recent on return. Other phone receives actual authorized state.

**Failure/recovery:** network/app/session loss retains same-member queue; opposite stale edit returns current state plus resolution; deleted target returns safe unavailable receipt; switching member cannot reuse queue; rejected operation stays visible; retry never duplicates/inverts.

**Checks/device evaluation:** meaningful idempotent desired-state, dedupe, revision/Undo and isolation tests; two installed phones online/offline/opposite edits/restart. Check UI focus/Tamil quantities and renderer checklist↔table state invariance.

**Completion evidence/exit:** G-LISTS closes: both adults create/use list, offline corrections synchronize without duplicates or silent data loss. Include pending/conflict evidence and permitted-cache inventory.

**Deferred:** external helpers, advanced custom lists, auto-created tasks from routines, memory/calendar offline caching.

<a id="p4"></a>
## P4 — Household memory and evidence

**Objective:** trusted household facts and evidence across all Home modalities. **Prerequisites:** P3 common action/receipt/context/sync behavior and P1 privacy/policy. Existing synthetic S3 selection does not bypass new held-out/latency requirements.

### Ordered work packages

1. **P4.1 — Capture and entity resolution.** Implement typed predicates, sources/affirmed spans, aliases, speaker-relative subjects, cardinality and private/household/shared defaults. Scan final text and other ingress before persistence/downstream generation; disclose that STT already receives microphone audio under its approved policy. Health facts await explicit confirmation; pending is excluded from retrieval. Keep draft explanations separate.
2. **P4.2 — Retrieval and inspection.** Implement structured lookup, FTS/trigram/eligible embeddings, temporal history and top-k retrieval. Deterministic single facts; optional sentence-gated synthesis. Evidence chips/sheets/activities show permitted spans, dates and attribution. Missing fact abstains across text/presentation/speech.
3. **P4.3 — Correction and sharing.** Correct wrong vs changed-world values with history/provenance/Undo; share/unshare owner-private facts explicitly, safe private-entity projection and share-time history. Household singleton cannot be overwritten by sharing. Only the original asserter may restrict household memory visibility; stale corrections return conflicts without silent rebase.
4. **P4.4 — Forget and derivative invalidation.** Atomically redact source/history/embeddings/operation copies and enqueue tombstone journal. Scrub activity drafts/presentations/versions/brief refs/queued speech/offline projections; source visibility changes invalidate restore/export and journal restrictive transitions for older-backup replay. Backup watermark and restore replay protect against resurrection. Run forget audit; disclose provider/backup limits.
5. **P4.5 — Seeding and evaluation.** Add practical form/CSV seeding for appliances/contacts/facts with import provenance; no document extraction. Extend frozen NLU/retrieval/privacy suites with active activity references, mixed visibility, languages, presentation changes and corrections. Record new blind holdout separately from observed regression corpus; validate complete-turn latency/cost on phones.

**Interfaces/data:** entities/aliases/predicates, source events, bi-temporal memories/history, embeddings config, operations/content refs and forget tombstones. Every derivative records source identity/revision and owner visibility; restored presentation must resolve all sources again.

**User behavior:** remember/ask/inspect/correct/share/forget directly on Home with truthful receipt/evidence/spoken response; unknown questions do not invent facts; visible drafts do not become memory implicitly.

**Failure/recovery:** uncertain subject/date→clarify; insufficient source→abstain; health confirmation pending→exclude; revoked/forgotten source→scrub even open view/audio; failed model→evidence/manual view; partial commands→individual outcomes. Tombstone journal delay blocks backup upload rather than silently accepting stale recovery.

**Checks/device evaluation:** ≥90% structural overall/held-out, top5≥90%, answer≥85%, abstain≥95%, privacy 100% including existence/cross-household/leaked alias/audio/spec/cache/export, secret refusal and complete forget audit. Re-run corrected/forgotten/unshared retrieval and restored activities, actual mixed-language names and correction effort.

**Completion evidence/exit:** G-MEMORY and G-DERIVED close; J1–J6/J10–J13/J17 pass through new Home/voice/presentation paths with original privacy/correctness floors. Backup recovery includes new derivatives. Application model selection claims name their exact scope and missing proofs.

**Deferred:** Vault/OCR/extraction, classifier runtime, bulk lifecycle tools (P7), shared displays/child/helper audience and generalized learning/runs.

<a id="p5"></a>
## P5 — Tasks and reminders

**Objective:** reliable schedules with Home follow-through. **Prerequisites:** P4 domain/evidence/privacy and P1 worker/recovery; installed identity/push baseline rerun on final origin.

### Ordered work packages

1. **P5.1 — Scheduling contracts/domain.** Add tasks, schedules and occurrences with timezone/precision/recurrence, explicit creator/recipient authority and activity refs. Relative time anchors original occurred_at; past/ambiguous requires clarification. Save schedule and enqueue transactionally.
2. **P5.2 — Worker dispatch and revisions.** Implement idempotent occurrence claim, restart/catch-up, edit/cancel revision checks and duplicate suppression. No stale schedule sends; honest overdue/failure states. Distinguish internal commit from uncertain external push outcome.
3. **P5.3 — Recipient controls and quiet hours.** Personal Done/Snooze applies only to recipient; household task completion closes related occurrences as specified; creator controls reschedule/edit/cancel. Per-member quiet 22:00–07:00 defaults and household time edits are audited.
4. **P5.4 — Push, Inbox and Home deep links.** Per-device subscriptions, preview privacy, Inbox regardless of push, receipt-stage instrumentation,404/410 cleanup and safe replay. Push/evidence tap authorizes target then restores Home schedule activity. Explicitly saved unsupported requests may enter Inbox with original time and retry choice, never claim they executed.
5. **P5.5 — Reliability and phone evaluation.** Run ≥200 automated occurrences including recurrence, edit mid-flight, quiet hours, retries/restarts and failures; measure dispatch separately from phone receipts. Real installed push on both phones, notifications closed/backgrounded, deep-link expired/deleted/private target and personal snooze.

**Interfaces/data:** schedules/occurrences/delivery states/jobs; task/list/inbox approved projections; receipt action refs and revision-fenced external dispatch. Queue metadata is content-minimized.

**User behavior:** request combined list/reminder actions, see separate actual receipts, schedule timeline and concrete dates, receive Inbox/push and Done/Snooze in context.

**Failure/recovery:** push accepted but phone silent→Inbox/health stage; subscription revoked→cleanup; worker restart→idempotent current occurrence; old revision→cancel stale send; provider/AIpause→manual reminders still dispatch; missed deadline→overdue/catch-up explicitly, never false on-time result.

**Checks/device evaluation:** 100%≥200 dispatches within 60 seconds/no stale sends prepilot; per-recipient permission, exactly-once receipts, recurrence/calendar math and device deep links. Pilot floor≥99% dispatch; delivery-stage distinction preserved.

**Completion evidence/exit:** G-REMINDERS closes with automated results plus real-device push acceptance/receipt observations and truthful receipts. Existing S5 acceptance is an input, not application sign-off.

**Deferred:** alarm-grade delivery guarantee, external messaging, calendar writes and autonomous scheduling.

<a id="p6"></a>
## P6 — Briefs and approved suggestions

**Objective:** useful resting Home assembled from authorized existing capabilities. **Prerequisites:** P5 domain/reminder data, evidence/visibility and shared action broker. Calendar section can remain unavailable until P7.

### Ordered work packages

1. **P6.1 — Deterministic brief.** Assemble per member/local date with unique key, available reminders/list/renewal/bill data and current evidence. Default 07:30 IST, attention+today / tomorrow+ahead tiers,30-day lookahead; current source revisions drive refresh/scrub. No invented calendar data or duplicate brief.
2. **P6.2 — Optional speech/summary.** Reserve at most one optional grounded summary call per brief; validated text may be spoken on request/voice context. Failure/cap leaves deterministic items. At most one generic preview push outside quiet hours; skip if viewed that day.
3. **P6.3 — Internal proposal records.** Store immutable member/action/arguments/hash/source/target revision/expiry without run or calendar foreign-key dependencies; proposals expire end of household day. No autoexec from model/layout/brief job. Bind voice and touch approval to exact proposal.
4. **P6.4 — Approval/edit/reject and refresh.** Recheck permission, source/target revision, expiry and budget before one execution. Edit creates a new proposal; reject closes; stale target explains changed condition with no effect. Receipts and history reflect outcome; repeat tap/reconnect cannot reuse approval.
5. **P6.5 — Brief/initiative evaluation.** Seed available domains, test reruns/quiet hours/source forget/unshare/private calendar placeholder and generated visuals/audio. Evaluate usefulness of suggestions, rejection/edit/correction effort and voluntary Home visits rather than notification count.

**Interfaces/data:** daily_briefs/brief_items/approvals/bounded action-invocation receipts, content_refs and activity projections. No agent-run or optional-calendar tables are prerequisites for P6.

**User behavior:** resting Home has useful current brief, spoken on request, evidence-linked items and exact Approve/Edit/Reject. Current activity remains accessible; no unsolicited layout focus takeover.

**Failure/recovery:** summary fails→deterministic brief; push fails→Home still available; source revoked→scrub summary/item/proposal; stale/expired proposal→no action; restart/rerun→same brief/push ledger; AIwithdrawal→no speech/generation, manual view remains.

**Checks/device evaluation:** privacy/exactly-once100%, one brief/member/day and≤one push; stale revision/approval replay/edit/expiry, evidence/derived scrubbing, speech validation and both-phone brief/deep-link use. Pilot readiness goal≥99% ready.

**Completion evidence/exit:** G-BRIEF closes; approved initiative never becomes a hidden autonomous action. Record recommendation usefulness and failures.

**Deferred:** autonomous/general proactive runs, delegation, external effects and uncontrolled repeated proposal generation.

<a id="p7"></a>
## P7 — Optional calendar and lifecycle tools

**Objective:** optional read-only context and safe data/account lifecycle. **Prerequisites:** P6 Home brief, P4 scrubbing and P1 step-up/recovery. OAuth-specific prerequisites block calendar only.

### Ordered work packages

1. **P7.1 — Calendar eligibility/OAuth prerequisites.** Verify primary Google scopes/consent/publication/refresh-token behavior, exact supported libraries and redirect origins. Close the eligibility prerequisite before connection migration/live tests; close G-CALENDAR only after P7.2/P7.3 acceptance. Publish eligible static homepage/privacy policy on nilumi.in with cost-reviewed hosting. Explain warning if unverified; linking requires current acknowledgement. No new Nilumi user created via Google.
2. **P7.2 — Per-adult read-only connection.** Connect own primary calendar, private cache, versioned sync and fresh/stale/reconnect marker. Home timeline/brief uses owner visibility only; no calendar writes, CalDAV or household auto-sharing. Optional failures leave existing activities useful.
3. **P7.3 — Disconnect/deletion races.** Revoke OAuth, cancel inflight sync, fence late results and scrub tokens/events/brief/activity/presentation/speech refs. Retry cleanup safely with visible outcome; no obsolete calendar event survives cache/restore/export.
4. **P7.4 — Export/import/history.** Step-up versioned nilumi-export JSON includes household plus own private/shared-owned data and authorized activities/current presentations/provenance. Reimport into empty authorized household only with no AI re-extraction. Rebind/validate refs/catalogue and never restore stale action grants. User history shows corrections/receipts without other member private text.
5. **P7.5 — Account/data lifecycle.** Implement own-data forget-all with explicit step-up/irreversible confirmation, activity archive/delete distinctions, retention status and documented membership-removal procedure. Revoke sessions/grants/queues and invalidate acknowledgement on adult changes. Maintain no admin takeover; reconcile reminders/shares and journal-backed recovery.

**Interfaces/data:** connections/calendar cache, expiry/revision/sync fencing, versioned export schema and lifecycle receipts. Deletion extends existing content_refs rather than a competing store.

**User behavior:** optional calendar adds private useful schedule; disconnect removes it. Export/history/delete choices explain archive vs delete activity vs underlying forget. Original recorded times/ownership/provenance survive allowed import.

**Failure/recovery:** OAuth denied/expired→core Home works; refresh/disconnect race→late data refused; partial export/import→versioned validation error/no hidden partial application; missing source/action ref→safe text/fresh projection; member removal→current-adult acknowledgement inactive and private derivatives scrubbed.

**Checks/device evaluation:** calendar privacy/disconnect/reconnect/sync races/timezone/all-day/recurrence, expired consent, export isolation/no secrets, empty-household import roundtrip and forgotten-data restore. Step-up/email/browser return on both phones and desktop. Recovery from a pre-deletion/pre-unshare snapshot must apply the latest lifecycle journal before enabling any affected activity/session.

**Completion evidence/exit:** G-CALENDAR closes if enabled; otherwise documented deferred status and unavailable-state checks. G-LIFECYCLE closes for release. No optional integration failure blocks core Home.

**Deferred:** writable calendars, multiple calendars/CalDAV, broad imports into live household, Vault originals and mailbox-independent recovery.

<a id="p8"></a>
## P8 — Family pilot readiness

**Objective:** establish scoped release evidence and measure voluntary household use. **Prerequisites:** P0–P6 gates and P7 lifecycle; optional calendar enabled only if its gate passes. No external household expansion.

### Ordered work packages

1. **P8.1 — Full connected regression.** Re-run J1–J26 and flow catalogue with installed iPhone/Android plus desktop, English/Tamil/Tanglish, noisy/interrupted/offline use. Accessibility includes screen reader/keyboard, reduced motion,200% text, Tamil, focus stability and diagrams/tables alternatives. Review source/deletion/approval/privacy across every modality/cache.
2. **P8.2 — Cost and operations reconciliation.** Reconcile actual sessions/tokens/characters/reservations/provider bills, Python idle/concurrent/media costs, hosting/storage/email/tax/forex against₹800 AI/₹3,000 target/₹5,000 ceiling. Test80/100% pause and quota errors without relaxing controls. Record acknowledgement/processor versions and allowed pilot scope.
3. **P8.3 — Recovery rehearsal.** Manual human-key offsite restore to fresh environment with journal replay, current membership/reference validation, suppress old push/audio/jobs and verify RPO≤24h/RTO≤2h. Walk through household recovery material; evidence includes actual scope/time/failures. Do not treat prior synthetic reset as production host-loss proof.
4. **P8.4 — Degraded-mode/observability.** Exercise model/STT/TTS/media/DB/push/calendar failure, withdrawal/revoke, queue conflicts, deployment rollback and PWA update. Confirm manual paths and honest partial receipts. Content-free telemetry captures end-to-end latency/cost/error and stage-specific delivery.
5. **P8.5 — Scoped pilot release and instrumentation.** Owner reviews release evidence and unresolved exclusions; both adults use real household workflows voluntarily. Record useful completed activities with little manual entry, corrections, recognition quality, repeated voluntary use and rejected suggestions. Add consented failures to regression corpus. Prioritize iteration from observed friction rather than an old horizon order.

**Interfaces/data:** release evidence manifest, measured gate status and minimized pilot analytics. No broadened users/providers automatically.

**User behavior:** ordinary household tasks work through Home with trusted results, recoverable manual paths and clear limitations. Users can stop/withdraw without losing authorized lists/tasks.

**Failure/recovery:** any privacy leak blocks release; unreliable dispatch, restore, session or stale speech blocks its affected release scope. Low usefulness/correction quality triggers iteration; metrics cannot be labelled acceptance merely because a framework was selected.

**Checks/device evaluation:** full product absolute floors, zero leaks, multilingual/phone/accessibility matrix, reminder reliability, cost reconciliation and real manual recovery. Pilot floors structural≥85%, hallucinations≤2%, dispatch≥99%, brief ready≥99%; offline/recovery invariants remain hard requirements.

**Completion evidence/exit:** G-PILOT closes with signed scoped release manifest, all blocking gates closed and explicit optional exclusions. The first household-use review records actual behavior and voluntary adoption; further implementation depends on that evidence. No new paid tier/processor/public rollout is implied.

**Deferred:** every capability below until usefulness, authority/privacy and cost prerequisites justify its own decision.

<a id="coverage-map"></a>
## Coverage map

| Product journeys | Flow scenarios | Contracts/decisions | Ordered packages |
|---|---|---|---|
| J1 store; J3 correct | MEM/VOICE, CANVAS-P5 | Turn/Receipt/Evidence;003/005/006/018 | P1.2 → P4.1/P4.3/P4.5 |
| J2 retrieve; J5 inspect; J6 unknown | ASK/MEM | Presentation/Response/Evidence;019/031 | P2.3 → P4.2/P4.5 |
| J4 forget; J17 share/unshare | MEM/CANVAS-E3 | Activity/Presentation refs;007/014/024/030/032 | P2.2 → P4.3/P4.4 → P8.3 |
| J7 shopping; J26 shared context | LIST/VOICE/CANVAS-P5 | Desired-state Action/Receipt;018/033/057 | P0.4 → P2.3 → P3.1–P3.4 |
| J8 reminder; J14 maintenance | TASK/NOTIF | Turn/Receipt/schedule;011/029/035 | P4.1 → P5.1–P5.5 |
| J9 multi-command | VOICE/TASK/LIST | Context/Receipt/Response;003/018 | P1.2 → P3.1 → P5.1 |
| J10 secrets; J11 private memory | ACK/VOICE/MEM/ASK/HOME/CANVAS-E7 | All contracts;007/017/031/048 | P1.3/P1.4 → P4.1/P4.5 → P8.1 |
| J12 seeding; J13 family references/health | BOOT/SET/MEM/ASK | Typed memory/provenance;006/037/053 | P1.3 → P4.1/P4.5 |
| J15 lost phone | AUTH/SEC/ACK/CANVAS-E6 | VoiceSession/identity;023/053 | P1.3/P1.4 → P2.4 → P8.4 |
| J16 export | SET/SEC | Activity/Presentation refs/export;030/031/032 | P4.4 → P7.4/P7.5 |
| J18 brief; J20 suggestions | HOME/APPR/NOTIF | Presentation/Proposal/Receipt;019/042/044 | P5.4 → P6.1–P6.5 |
| J19 optional calendar | CAL/SET/HOME | Private refs/sync;016/017/045 | P7.1–P7.3 |
| J21 conversation; J22 interruption | VOICE/CANVAS-P1/E1/E5/X2 | VoiceSession/Response;001/002/008/009/027/028 | P0.3–P0.5 → P1.5 → P2.4 |
| J23 topic; J24 view; J25 return | CANVAS-P2/P3/P4/E2/X1 | Activity/Presentation/Context;044/056/057 | P0.1/P0.2/P0.4 → P2.1–P2.5 |

BOOT/AUTH/ONB/SEC/ACK are P1 foundations; SET/ADMIN evolve by feature, with P7 lifecycle and P8 operations. All retained ADRs are indexed with delivery owner in the [catalogue](../adr/README.md); deferred records026/034/043/049 do not add initial work packages. Every scenario is implemented/evaluated with its owning feature; cross-cutting CANVAS cases repeat in P8.

<a id="validation-register"></a>
## Validation register

All rows below are **pending for the new application**, despite historical spike acceptance. Builder owns evidence; owner owns scope/release decisions; both adults assess phone/speech/usefulness. Phases define the required measurements, not arbitrary future deadlines.

| Gate | Phase / accountable owner | Required evidence | Blocking scope |
|---|---|---|---|
| G-VOICE | P0 / builder + both adults | Pinned processor/client/transport; connected English/Tamil/Tanglish journeys, recognition/corrections/latency/interruption/failure samples on both phones | P0 exit and voice selection for production |
| G-RENDER | P0 / builder | All five trusted layouts, bounds/action refs, stable IDs/focus, draft safety, Recent restoration | P0 exit |
| G-COST-P0 | P0 / builder + owner | Billed connected/silent time, TTS characters, token usage, actual/reserved costs and scenario projection | P0 exit; unbounded/paid session tests |
| G-FOUNDATION | P1 / builder | Clean CI/build, schemas/TS-Python parity, auth/bootstrap/session/email/device and isolation tests | Production foundation release |
| G-POLICY | P1 / builder + owner | Processor inventory, exact-adult production acknowledgement/veto/all-AI pause, managed routing/reservation/receipt controls; historical exception disclosed | Every family AI call |
| G-MEDIA | P1 / builder + owner | Actual host/transport/media reachability/lifetime/TLS/auth/limits, mobile recovery and hosting/media cost | Production family voice traffic |
| G-RECOVERY-P1 | P1 / builder + owner | Backup role/key separation, journal watermark, staging restore and shared human runbook | Durable production data |
| G-HOME | P2 / builder | Durable activities/visibility/revisions, stream order/resume/stale fences, transcript expiry and focus restoration | P2 exit |
| G-DEVICE-P2 | P2 / builder + both adults | Installed-phone QA keyboard/Back/safe areas/dark/Tamil/200%/offline fonts/update/media recovery | Home production usability |
| G-LISTS | P3 / builder + both adults | Desired-state/idempotency/conflicts/Undo, two-phone offline queues without duplicate/lost changes | Shared shopping release |
| G-MEMORY | P4 / builder | New held-out structural/retrieval/answer/abstention floors, secret/health/evidence gates, privacy 100% | Memory/answers release |
| G-DERIVED | P4 / builder | Forget/unshare/visibility invalidation across spec/history/audio/cache/export/restore; audit and zero leaks | Memory-derived output release |
| G-REMINDERS | P5 / builder + both adults | ≥200 dispatches≤60s/no stale sends, recipient permissions, installed push stage/deep-link checks | Reliable reminder release |
| G-BRIEF | P6 / builder + both adults | Deterministic/one brief/push, source visibility/dedup, exact approval/expiry/stale target and summary evidence | Brief/suggestion release |
| G-CALENDAR | P7 / builder + owner | Primary scopes/OAuth/eligibility, private sync/disconnect races and fallback tests | Optional calendar only |
| G-LIFECYCLE | P7 / builder + owner | Step-up/export/import/history/delete/retention/membership procedure and restoration privacy | Lifecycle tools/pilot scope |
| G-PILOT | P8 / owner, builder evidence, both adults use | Full phone/language/accessibility/privacy, actual cost, manual RPO/RTO restore, degraded-mode and scoped release manifest | Founding-household release |
| G-WIDER | Deferred / owner | Primary legal verification, approved ZDR every LLM/embedding call, explicit negative routing proof, eligible new audience/processor/consent | Any external user/helper/child login/commercial use |

Marketing hosting and Google library/consent uncertainties belong to G-CALENDAR; OTP newest-code behavior belongs to G-FOUNDATION; per-adult voice alternatives belong to later voice evaluation. Navigation, tap-once conversation and first-prototype multilingual evaluation are settled choices, not open gates.

<a id="deferred-capabilities"></a>
## Deferred capabilities and prerequisites

| Capability | Prerequisites before a separate delivery decision |
|---|---|
| Shared displays / room microphone / wake word | Useful pilot, device identity, visible/private display policy, foreground/background authority, eligible speech and measured cost |
| Family Records Vault / extraction | Source/masking/region provenance, approved processor/retention, deletion/export/original access and accuracy/cost proof |
| Helpers | List-only scoped grants/expiry/revoke, G-WIDER, consent and private-existence evaluation |
| Child access | Age/guardian/processor/legal policy, audience controls, separate privacy/evidence tests and G-WIDER |
| Bounded runs / delegation | Approved bounded use case, broker/approval budgets, leases/fencing, cancellation/uncertain effects and grant lifecycle |
| External writes/integrations | Explicit capability/effect approval, eligible processors, idempotency or reconciliation and honest outcome_unknown handling |
| Additional channels | Terms/eligibility, auth/privacy/receipt adapters, observed need and operating cost; WhatsApp not planned |
| Full Tamil UI localization | Complete string inventory, translator review, accessibility and mixed-script/device regression; speech already evaluated from P0 |

These are prerequisites, not ordered horizons. No initial migration or work package is required merely to reserve future capability names.
