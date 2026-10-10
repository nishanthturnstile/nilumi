# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installed PWA (Home Screen web app) on iPhone and Android is the primary surface; desktop browser (Admin, traces, occasional use) and iPad are secondary. One Nilumi identity on every device, with native *behaviours* per OS (sheet physics, gestures, safe areas, keyboard handling, OS text size). It does not mimic iOS or Material skins.

## Users

- **Two adults of one Chennai household** (the owner, Nishanth, and his wife), each on their own phone. Her voluntary, unprompted use is the primary success signal; the design is judged first through a mom's eyes, with children often looking at the screen alongside her.
- They use Nilumi in short, interrupted moments: at 7:30 am over coffee checking Today, while cooking, in a shop with poor signal ticking the list, in the car, and at night before bed.
- Children are subjects of facts and reminders (school, allergies, vaccinations), not users, in the MVP. Grandparents and household help are possible later users and may need Tamil.
- The owner also operates the system (Admin: traces, evals, costs, backups), mostly from a desktop browser.

## Product Purpose

Nilumi is a private household assistant: say or type what matters, see exactly what it understood, and trust that it will remember, remind, and admit when it doesn't know. Each morning, Today shows what needs attention, with the evidence behind every item. Success is a habit: each adult opens Today on most days, and the wife starts interactions without being asked to test.

## Positioning

Evidence-backed household follow-through. Briefs and answers come from the household's own corrected memory, every claim links to its source, privacy between members is enforced by the database (existence included), and Nilumi changes nothing it wasn't asked to change without approval. General assistants already ship daily briefs; the brief is not the advantage — the evidence, correction loop, per-member privacy and Indian household workflows are.

## Operating Context

- Tabs: Today (landing), Lists, Talk (centre, voice-first), Tasks, Memory; Inbox as a header bell; Settings and Admin in a profile menu. Tabs appear only as their phase ships, never disabled.
- Talk: hold-to-talk or tap-to-start/stop on one mic button (400 ms split), text box always available, transcript bubble, one result card per command, answers with evidence chips, optional spoken reply, a visible "Play reply" fallback when autoplay is blocked.
- Cards carry Undo/Edit (undo-first), Confirm (health facts, forget, revealing shares), Approve/Edit/Not now (suggestions), and Clarify (deterministic ambiguity only).
- Every memory card shows exactly one visibility badge: Household, Shared, or Private.
- Lists, Tasks and Inbox work offline with queued changes ("N changes waiting"); Today, Talk, Memory, Settings and Admin show an offline state. Realtime sync by SSE; "Reconnecting…" when stale.
- Degraded AI states are first-class: soft cap, hard cap ("AI features are paused"), acknowledgement inactive ("Voice is paused"), model outage (fixed command set, words saved to Inbox).
- Time is Asia/Kolkata; dates are day-first; vague times resolve to household defaults and the resolved time is always shown.
- One brief push per day; private items use generic lock-screen text.

## Capabilities and Constraints

- Stack (decided): Next.js 16 App Router + Turbopack, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query v5, Serwist, Zod 4, pnpm monorepo (`apps/web`, `packages/*`). Free OSS libraries only.
- Server-composed UI uses the trusted catalog `nilumi-ui/1` (`card`, `list`, `form`, `table`, `progress`, `approval`, `artifact`, `evidence-chip`); no raw HTML, model text fills text fields only.
- iPhone PWA capability is set by WebKit; S1 validated mic, push, offline shell and playback on both phones. "Relaunch to update" is accepted behaviour.
- Typography must be Tamil-ready from day one (Tamil names and words appear in transcripts and memory now; Tamil UI strings are a later "Could").
- Undecided: final assistant voice; Tamil UI timing; kid mode; Vault (documents) UI.

## Brand Commitments

- Name **Nilumi** (நிலுமி), coined from Tamil *nila* (moon) plus light; chosen to be warm, calm, easy for Indian-English and Tamil speakers and children.
- Voice of the product: plain, honest, short. Says "I don't know" rather than inventing; never describes something as done unless it was saved; "That sounds sensitive, so I won't store it."
- Anti-reference (owner): must not feel like a corporate SaaS dashboard — grey, dense, enterprise, or "complicated".
- Feel (owner, binding): built for a mom and her children. Spacious and uncongested; colourful; a little playful; subtle animation here and there, never overboard; professional and attractive, but not childish.

## Evidence on Hand

- Product plan, architecture, application flows (screens, scenarios, degraded modes) and 55 ADRs in `docs/`.
- S1 spike (`spikes/s1`) proves PWA mechanics on both phones; it has no visual identity (default create-next-app styling) and is not a visual authority.
- No logo, icon set, photography, illustrations or brand palette exist yet. Do not fabricate testimonials, metrics or household data; use clearly synthetic examples in specimens.

## Product Principles

1. Show, don't just say: the screen is the trust mechanism — what I heard, what I did, where it came from.
2. Undo beats asking; suggestions wait for approval; nothing is described as done unless it was saved.
3. Private stays private, including existence; visibility is always visible.
4. Faster than opening a notes app: capture must beat typing a note.
5. Calm by default: one push a day, no nagging, honest degraded states.

## Accessibility & Inclusion

- WCAG 2.2 AA baseline across light and dark themes.
- Support text up to 200% without loss of content or function, via an in-app Text size setting (OS text-size settings don't reach installed web apps today); never block browser zoom.
- Never rely on colour alone for state or visibility (badges carry icon + label).
- Respect reduced motion and reduced transparency.
- Tamil script legibility is a requirement, not an afterthought.
