# Application Flows

Current behavior specification 2026-10-10, **planned for MVP**. The application is unimplemented. [Product journeys](01-product-plan.md#6-core-journeys), [architecture contracts](02-architecture.md#68-activity-and-presentation-contracts) and [implementation coverage](../plans/implementation-plan.md#coverage-map) own related requirements. Historical TODAY/TALK scenario identifiers become HOME/VOICE with the same suffixes; this document provides the current outcomes.

## 1. Screen map

 ```mermaid
 flowchart TD
   SignIn[Email-code sign-in] --> Home[Home: brief / composer / focused activity]
   Home --> Recent[Recent picker]
   Recent --> Home
   Home --> Evidence[Contextual evidence / history / correction]
   Evidence --> Home
   Home --> Inbox[Inbox and reminder deliveries]
   Inbox --> Home
   Home --> Settings[Appearance / Devices / Privacy / Connections / Data]
   Home --> Admin[Members / metrics / evaluations / recovery]
   Push[Notification or evidence link] --> Resolve[Authenticate and authorize target]
   Resolve --> Home
```

No separate Today/Talk/list/task/memory navigation is required. Contextual activities show domain details on Home; Settings/Inbox/Admin retain conventional supporting screens. Back closes the current overlay before navigating away; closing Recent preserves activity and focus.

## 2. Home states and transitions

| State | Visible behavior | Transition/recovery |
|---|---|---|
| Resting | Brief, current/saved activity, composer and Recent | Tap microphone → listening; text/touch → processing |
| Listening | Persistent mic/session indicator and provisional transcript | Final input → processing; End releases media; permissions failure → resting/text |
| Processing | Current usable activity plus bounded progress/stop | Receipts and validated results update context; optional speech → speaking |
| Speaking | Visible result, speaking indicator, Mute/Stop/Replay | Barge-in → interrupted/listening; finish → listening while session active or resting |
| Interrupted | Old audio flushed, committed state retained | New turn uses current activity; late old output fenced |
| Disconnected | Connection reason, Retry/End and usable current result | Reauth/new grant then current activity and receipt resume; no duplicate action |
| AI paused | Reason and authorized manual controls/limited typed grammar; no provider microphone activity | Budget/policy/eligibility restored → explicit fresh session, never automatic old playback |

Mute changes output preference only; Stop stops playback; End conversation releases mic/media. These are separately labelled controls. Text remains available in every state where the authorized application is usable.

## 3. Connected household flows

Cooking: tap once → ask for a routine → inspect generated steps → interrupt with a correction → request shopping items → focus shopping → switch back through Recent. School preparation: a checklist persists when audio ends; check/uncheck manually and ask about a specific visible item. Shopping: use approved cached list offline, mark pending state, reconnect and reconcile shared changes. Interrupted use: reopen the activity after backgrounding or the next day without recovering an expired transcript.

A presentation change (“show it as a table”) keeps record IDs and checked state. Draft outputs do not create memory/tasks; applying a draft is an explicit requested action. A touch action sends desired state/version/idempotency and uses the same receipts as voice/text. Topic changes create/select an activity, change focus epoch and suppress late prior presentation/audio.

## 4. Trust interactions and permissions

Requested reversible changes display Undo (24 hours, only if intervening revisions permit). Clarify visible ambiguity for five minutes on Home. Health facts need Confirm and remain excluded from answers while pending. Forget is explicitly irreversible. Suggestion Approve/Edit/Reject binds the exact member/action/target revision/expiry; edit creates a new proposal. Evidence opens inline/sheet with source and correction history; it never exposes private source text beyond the permitted span.

Household records can be edited by adults; shared private memory remains owner-controlled. Original transcripts remain the speaker's. Admin sees permitted operational metrics rather than other members' private Home, connections or text. Private existence is hidden in Recent, deep links, counts, generated visuals and speech. A household fact's author may restrict it to private with a warning that it was already visible; scrub other members' derivatives.

## 5. Scenario catalogue

### BOOT: Bootstrap and membership

Delivery: P1. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| BOOT-P1 | Owner runs the script on an empty database | Household and admin created; the owner signs in with an email code ([AUTH](#auth-email-code-sign-in)) |
| BOOT-P2 | Admin adds the spouse with email and relation "spouse" | She receives the invitation email, installs from `app.nilumi.in` and signs in with a code; "my wife" and "my husband" resolve |
| BOOT-P3 | Admin adds two children | They appear as people facts and reminders can be about; they can't sign in |
| BOOT-P4 | Admin grants admin to the other adult | Both hold admin; both see Admin |
| BOOT-N1 | Script is run again when a household exists | Refused; nothing changes |
| BOOT-N2 | A non-admin opens an Admin link | Not found; Admin isn't shown in navigation |
| BOOT-N3 | The only admin removes their own admin capability | Refused: "There must be at least one admin." |
| BOOT-N4 | An adult tries to give themselves admin | Not possible: only an existing admin can grant it |
| BOOT-N5 | Admin enters an email another member already uses | Refused |
| BOOT-N6 | Admin tries to change another adult's email after that adult has signed in | Refused, with an explanation that the member changes it themselves |
| BOOT-E1 | A new adult is added after the household acknowledgement was recorded | The acknowledgement no longer covers every adult, so model features pause for the household until it is recorded again ([ACK-E2](#ack-privacy-acknowledgement)) |
| BOOT-E2 | No spouse relationship is set and someone says "my wife prefers…" | The reference can't resolve; Home asks who is meant and suggests an admin sets the relationship |
| BOOT-E3 | An invited adult never signs in | The profile stays; the admin can correct the email and resend the invitation |
| BOOT-E4 | Admin corrects the email of an adult who hasn't signed in yet | A fresh invitation goes to the new address; the old address can no longer be used to sign in |
| BOOT-X1 | The invitation email can't be sent | The member is still saved; Members shows "Invitation not sent" with Resend |

### AUTH: Email-code sign-in

Delivery: P1. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| AUTH-P1 | First sign-in on the installed app | Signed in; onboarding starts |
| AUTH-P2 | App reopened days later | Still signed in; the 90-day period restarts with use |
| AUTH-P3 | Sign in on a second phone or laptop | Both sessions active and listed in Devices |
| AUTH-P4 | Session is lost (for example, iOS drops the cookie) and the **same** adult signs in again | Local lists, tasks, inbox and queued changes are kept and sync once |
| AUTH-P5 | Sign out | This device's local data is wiped; Sign in is shown |
| AUTH-N1 | Unregistered email | Same generic reply; no code is sent; nothing reveals whether the email exists |
| AUTH-N2 | Wrong code | "That code didn't work." Repeated failures are rate-limited with a generic message |
| AUTH-N3 | Code older than 10 minutes | "That code has expired. Request a new one." |
| AUTH-N4 | Too many code requests | "Too many attempts. Try again in a few minutes." |
| AUTH-N5 | A **different** adult signs in on this device | The previous adult's local data is wiped first. If they have unsynced changes, see current defaults below |
| AUTH-E1 | The user switches to the mail app and comes back | The code still works within 10 minutes |
| AUTH-E2 | Two codes requested | Only the latest code works (current defaults below) |
| AUTH-E3 | Session lost while offline | Cached lists, tasks and inbox stay usable and changes queue; Sign in is offered when back online |
| AUTH-E4 | A new app version is available | The session is kept; the app offers to reload; queued changes from the previous version are still accepted |
| AUTH-E5 | This device's session is revoked from another device | At the next server contact the app signs out and wipes local data (current defaults below) |
| AUTH-E6 | Signed in from a browser tab instead of the installed app | Works; iPhone push and reliable audio need the installed app ([ONB](#onb-progressive-onboarding)). Desktop use is current defaults below |
| AUTH-X1 | The email service fails | "We couldn't send a code right now. Try again." No account information is revealed |

### ONB: Progressive onboarding

Delivery: P1/P2/P5. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| ONB-P1 | P1 first sign-in with the acknowledgement active | Privacy status → install check → Home placeholder |
| ONB-P2 | First open after P5 ships | One-time notification step; a test push arrives |
| ONB-N1 | Notification permission denied | Reminders still appear in Inbox; Settings explains how to turn notifications on |
| ONB-N2 | iPhone, not installed to the Home Screen | Notifications can't be enabled; the app explains how to install |
| ONB-E1 | Every optional step is skipped | Defaults apply; Settings shows each item |
| ONB-E2 | Acknowledgement not active at first sign-in | Onboarding completes; Home shows the "AI paused" banner ([degraded behavior](#6-failure-and-degraded-behavior)) |

### SEC: Devices, email change and step-up

Delivery: P1/P7. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| SEC-P1 | J15: wife's phone is lost; she signs in on a new phone and revokes the old session | The old phone is signed out at its next server contact; no admin is involved |
| SEC-P2 | Email change with both codes | New email active; both addresses notified |
| SEC-P3 | Face ID enabled; export requested | Face ID prompt, then export |
| SEC-N1 | An admin tries to view or revoke the other adult's sessions | Not possible; each adult manages only their own |
| SEC-N2 | New email already belongs to another member | Refused |
| SEC-N3 | Step-up fails | Falls back to an email code; if that also fails, the action doesn't run |
| SEC-E1 | The lost phone is offline when revoked | It keeps cached lists until it next connects, then wipes them. Devices says this can't be done remotely while the phone is offline |
| SEC-E2 | The lost phone still receives reminder pushes | Stops when its session is revoked (P5 push cleanup) |
| SEC-E3 | Someone gains access to the adult's mailbox | They could sign in. The honest limit is stated in Settings → Privacy; both adults should use two-factor sign-in on email. An unfamiliar device appears in Devices and can be revoked |
| SEC-E4 | The adult permanently loses access to their mailbox | **Accepted MVP limitation:** they can't sign in again, and admins can't change the email. Recovery means regaining the mailbox; a better recovery path is backlog (current defaults below) |
| SEC-X1 | Step-up attempted offline | Not available offline |

### ACK: Privacy acknowledgement

Delivery: P1. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| ACK-P1 | Owner records the acknowledgement for both adults | Exact current adults/notice/processors covered; AI available only for implemented, eligible capabilities |
| ACK-P2 | Wife withdraws | Banner for both adults: AI features paused. Voice input and spoken replies stop; typed text works in the fixed command set; lists, tasks, reminders and inbox keep working |
| ACK-P3 | Wife records again after her own withdrawal | Active again |
| ACK-N1 | A non-admin tries to record the first acknowledgement | Not allowed; Privacy explains an admin records it after explaining the notice |
| ACK-N2 | The owner tries to record again after the wife withdrew | Refused: only the adult who withdrew can record again |
| ACK-E1 | Withdrawal happens while a turn is in progress | Close provider streams and buffered speech; stop undispatched steps; show committed receipts and unfinished outcomes on Home. Saving an unfinished request to Inbox is explicit, only after P5 |
| ACK-E2 | A new notice version, a new processor, or an adult is added or removed | The acknowledgement becomes inactive until it is recorded again; both adults see "Review the updated notice" |
| ACK-E3 | Calendar while inactive | New connections are refused; an existing connection keeps showing events, but no calendar text reaches a model |
| ACK-E4 | P1 app replaces the spike | The app starts on a new origin and database ([ADR-016](../adr/adr-016.md)), so the owner records the acknowledgement once in the new app after re-explaining the notice (current defaults below) |
| ACK-X1 | The acknowledgement status can't be read | Treated as inactive (fails closed) |

### HOME: Home brief

Delivery: P6. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| HOME-P1 | P1 foundation sign-in completes | Greeting, Privacy/install status and honest Home placeholder; domain actions unavailable until their phases ship |
| HOME-P6 | P2–P5: adult opens the placeholder | Available authorized activities appear as their phases ship: lists from P3, memory from P4, tasks from P5. Selection focuses the activity on Home; no separate domain tabs |
| HOME-N3 | P2–P5: the other adult has private tasks | Counts include only items this adult can see |
| HOME-P2 | J18: 7:30 push "Your Home brief is ready", tap → Home → tap the insurance item's evidence chip | Home opens; the chip opens the source memory |
| HOME-P3 | Adult marks a reminder Done from Home | Item updates; no new push |
| HOME-P4 | Home opened at 06:45 before the 07:30 brief time | Brief built on demand. Whether the 07:30 push is still sent is current defaults below |
| HOME-P5 | Nothing due | "Nothing needs your attention today", with list status if any |
| HOME-N1 | The other adult has private reminders today | Nothing about them appears: no item, count or hint |
| HOME-N2 | An admin tries to view the other adult's brief | Not possible; no admin view exists |
| HOME-E1 | Calendar not connected | No calendar items; the brief is otherwise complete |
| HOME-E2 | Google temporarily unavailable | Cached events with a stale marker and their fetch time |
| HOME-E3 | Calendar token revoked or expired | Calendar items removed; Reconnect chip; rest unaffected |
| HOME-E4 | Brief time falls inside quiet hours | Push moves to the end of quiet hours |
| HOME-E5 | Summary unavailable (soft cap, acknowledgement inactive, model failure) | No summary line; brief complete; no retry |
| HOME-E6 | Push fails or isn't seen | The brief is still on Home; no second push that day |
| HOME-E7 | Scheduled build and on-demand build race | One brief, at most one push |
| HOME-E8 | A source was forgotten while Home was open | After refresh the item is gone; tapping a stale chip says "No longer available" |
| HOME-E9 | Offline | Offline state; Lists, Tasks and Inbox remain available (current defaults below) |
| HOME-E10 | App left open across midnight | Refreshes to the new date's brief |
| HOME-X1 | The scheduled build fails | Opening Home builds it; admin is alerted |

### APPR: Proposal approval

Delivery: P6. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| APPR-P1 | Approve "Add a renewal reminder on 1 Mar?" | Reminder created once; card shows Done with Undo |
| APPR-P2 | Edit the time to 2 Mar, then approve the new card | The original is replaced; only the edited suggestion runs |
| APPR-P3 | Not now | Card disappears; the decision is recorded in the item's history |
| APPR-N1 | The other adult tries to open or decide it | Not found; they can't tell it exists |
| APPR-N2 | Double tap, or the same decision sent twice | Runs once; the second shows the same result |
| APPR-E1 | Expired before the adult acts | Card says it expired; nothing runs |
| APPR-E2 | The task changed after the suggestion was made | Card says what changed; nothing runs |
| APPR-E3 | The source memory was forgotten or un-shared | Suggestion expires and disappears |
| APPR-E4 | Approve while offline | Not available offline; the card says to try when online |
| APPR-X1 | The action fails while running | Card shows the failure; nothing is described as done |

### VOICE: Foreground conversation

Delivery: P0/P2; domain effects P3–P5. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| VOICE-P1 | P0 synthetic continuing input; P2 authenticated production turn | Correct final input and activity context, visible actual outcome; P1 foundations do not claim a memory write |
| VOICE-P2 | Text turn | Text reply only (auto mode) |
| VOICE-P3 | J9: "Add dishwashing liquid and remind me tomorrow evening to check the purifier" | Two cards; each succeeds or fails independently |
| VOICE-P4 | Voice question | Short spoken answer plus the screen |
| VOICE-P5 | "Undo that" | The last change is reversed, under the Undo rules in [MEM](#mem-memory-lifecycle) |
| VOICE-N1 | J10: "My ATM PIN is 4321" | "That sounds sensitive, so I won't store it." Nothing stored; the transcript is shown redacted |
| VOICE-N2 | Out-of-scope request ("book a cab", "turn on the lights") | "I can't do that." Nothing stored |
| VOICE-N3 | Microphone permission denied | Explains how to allow it; the text box stays available |
| VOICE-N4 | Tap once to begin conversation | Session starts without a hold gesture; permission and microphone state are visible |
| VOICE-N5 | A third turn while two are still in progress | "Still working on your last request." |
| VOICE-E1 | Network drops during upload | The app retries the same turn; nothing is duplicated |
| VOICE-E2 | App backgrounded mid-turn | On return, the committed cards are shown |
| VOICE-E3 | The phone blocks autoplay | A Play reply button appears |
| VOICE-E4 | "Remind me about the washing machine" with two washing machines | "The Bosch or the LG?" The next turn's answer completes the original request |
| VOICE-E5 | Clarification unanswered for five minutes | Contextual question expires on Home; ask again, no Inbox clarification item |
| VOICE-E6 | A name is misheard | The adult taps Edit on the card or says the correction |
| VOICE-E7 | The adult leaves Home mid-reply | Audio stops; saved changes remain, with Undo |
| VOICE-E8 | One sentence mixes a private note and a household item | Each card has its own badge; the other adult sees only the household item |
| VOICE-E9 | Offline | Provider conversation unavailable; approved cached Home list/task/Inbox projections remain usable |
| VOICE-X1 | Final recognition fails or exceeds the 6-second post-endpoint deadline | "I couldn't hear that, please type it." |
| VOICE-X2 | Model outage or hard cap | No pilot fallback; manual controls and limited typed grammar remain usable. Saving an unsupported request to Inbox is explicit and available only after P5 |
| VOICE-X5 | Household acknowledgement inactive | All provider calls stop including STT/TTS; microphone shows AI paused; manual authorized actions remain usable |
| VOICE-X3 | One command fails to save | A failure card for that command; the others are unaffected |
| VOICE-X4 | Speech output fails | Visible result retained with concise speech-unavailable status and gesture Replay; no unsolicited retry |

### MEM: Memory lifecycle

Delivery: P4. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| MEM-P1 | J1: "Our washing machine warranty expires on March 15, 2028" | 🏠 card with subject, fact, date, Undo and Edit |
| MEM-P2 | J3: "That's wrong, make it April 15" | Card shows 15 Mar 2028 → 15 Apr 2028; the old value stays in history as a correction |
| MEM-P3 | "Our plumber is Kumar now" | Ravi is kept in history as a past plumber; Kumar is current |
| MEM-P4 | J4: "Forget the washing machine warranty date" | Confirmation says it can't be undone; then forgotten everywhere for both adults; later questions get "I don't know" |
| MEM-P5 | J11: (wife) "Note for me: anniversary gift ideas" | 🔒 card; nothing reaches the other adult |
| MEM-P6 | J13: "My husband is allergic to cashews" | Card asks for Confirm; after Confirm it is active and visible to the household; Discard removes it |
| MEM-P7 | J17: "Diwali gift budget ₹5,000, share it with my husband" | 👥 card; both adults can read; only she can change it |
| MEM-P8 | J17: "Stop sharing the gift budget note" | Warns it may already have been seen; removed from his views, derived cards and inbox within one sync; related suggestions expire |
| MEM-P9 | Owner taps Share on a private card | Becomes 👥 Shared |
| MEM-N1 | The other adult tries to edit, forget or un-share a shared memory | "Only the person who shared this can change it." They can create a separate household value |
| MEM-N2 | "Forget the warranty" matches two appliances | Asks which one |
| MEM-N3 | Forget or correct something the adult can't see | "I don't have that." No hint that it exists |
| MEM-N4 | "The purifier is not under warranty" or "maybe we should buy a dryer" | Negations and hypotheticals aren't saved as facts; Nilumi asks or explains |
| MEM-N5 | A secret typed into Edit | Refused; nothing changes |
| MEM-N6 | No share cue, but the request implies the spouse should know | Stays private; only an explicit cue or the Share action makes it shared |
| MEM-E1 | Undo after 24 hours | Undo isn't offered; Edit still is |
| MEM-E2 | Undo after the other adult changed the fact | Conflict card; nothing is overwritten |
| MEM-E3 | Undo a correction | The previous value returns |
| MEM-E4 | Forget after a change that could still be undone | The undo is cancelled; forget wins |
| MEM-E5 | A shared value and a household value answer the same question | Both shown with attribution, with "Make this the household value" |
| MEM-E6 | Sharing a memory about a private entity | Asks to confirm that the entity's name and type become visible; its other details stay private |
| MEM-E7 | Saying something already known | "Already known." No duplicate |
| MEM-E8 | Part of a turn can't be validated | An "incomplete" card says what couldn't be saved; nothing is silently dropped |
| MEM-E9 | A health fact is never confirmed | See current defaults below |
| MEM-E10 | Changing a household memory to private from its card | See current defaults below |
| MEM-E11 | Both adults correct the same fact at the same time | Revision-bound correction wins once; the other returns conflict/current permitted value and requires a fresh deliberate request |
| MEM-X1 | Saving fails | Failure card; nothing is described as saved |

### ASK: Questions and evidence inspection

Delivery: P4. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| ASK-P1 | J2: "When does the washer warranty end?" | One-sentence answer with an evidence chip that opens the source |
| ASK-P2 | J5: "What do you remember about the water purifier?" | Entity page with active facts, dates and aliases; up to three spoken |
| ASK-P3 | J6: "Which year did we buy the purifier?" | "I don't have the purifier's purchase date." Offers to remember it; no guessing from other facts |
| ASK-P4 | "Who fixes leaking taps?" | Finds plumber Ravi |
| ASK-P5 | Health question | Answer says "based on what's recorded"; never advice |
| ASK-P6 | P4: "What was the warranty date before I changed it?" | Answer from history |
| ASK-P7 | J14: "When is the purifier filter due?" | Next due date from the last service plus the interval |
| ASK-N1 | Asking about the other adult's private note | Same reply as when nothing exists |
| ASK-N2 | Ambiguous entity | Clarification |
| ASK-N3 | Opening evidence for a memory the other adult said | Shows the memory and its evidence span, not their whole turn |
| ASK-E1 | Soft cap or answer model failure | Top evidence shown as cards without a written answer |
| ASK-E2 | The fact was forgotten | "I don't know" |
| ASK-E3 | Memory activity opened offline | Offline state; memory is never stored on the device |
| ASK-E4 | Viewing own private items after inactivity | Step-up first (current defaults below) |
| ASK-E5 | "When is it due?" without a recorded service | "I don't have the last service date." |
| ASK-X1 | Search partly fails (for example, similarity search times out) | Exact and keyword matching still answer; if nothing is found, honest "I don't know" |

### LIST: Shopping activity

Delivery: P3. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| LIST-P1 | J7: add two items by voice | Two items; the other phone updates |
| LIST-P2 | Check or uncheck with no signal | Desired state appears optimistically with pending mark; original revision/idempotency queued and reconciled on reconnect |
| LIST-P3 | Add "rice" when rice is already on the list | Merged; the quantity is updated if one was given |
| LIST-P4 | Remove an item | Removed on both phones |
| LIST-N1 | A secret typed into an item note | Refused |
| LIST-N2 | Remove an item the other adult already removed | Treated as done; no error |
| LIST-E1 | Both adults add "milk" while offline | One item after sync; nothing duplicated |
| LIST-E2 | Both edit the same item's quantity, one offline | The conflict is shown and the adult chooses; nothing is silently lost |
| LIST-E3 | Check/uncheck races with another edit | Server verifies expected revision; compatible no-op or visible conflict; never silently forces completion |
| LIST-E4 | iPhone app closed with changes waiting | They sync next time the app opens; a banner shows "N changes waiting" |
| LIST-E5 | Session lost while offline | Changes are kept and sync after the same adult signs in again (AUTH-P4) |
| LIST-E6 | Realtime connection stale | "Reconnecting…"; the list refreshes on focus and reconnect |
| LIST-X1 | The server rejects a queued change | That change shows as failed, with the reason; never silently dropped |

### TASK: Tasks and reminders

Delivery: P5. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| TASK-P1 | J8 as above | Dispatches within a minute to both recipients; Inbox entries for both. Phone receipt/presentation measured separately and may be delayed |
| TASK-P2 | "Remind my wife to call the school at 4" | Only she receives it; it shows "from Nishanth" |
| TASK-P3 | Snooze one occurrence of a weekly reminder | Only that occurrence moves |
| TASK-P4 | Complete a task that has reminders | Future reminders for it stop |
| TASK-P5 | J14: "The purifier filter needs changing every 6 months" | Interval saved; next due date shown once a service date is known |
| TASK-N1 | "Remind me to pay the electricity bill" without a time | "When should I remind you?" |
| TASK-N2 | "Remind me at 7" said at 19:30 | Asks whether tomorrow at 07:00 or 19:00 is meant |
| TASK-N3 | A target tries to edit or cancel a reminder someone else created | Not allowed; what targets can do is current defaults below |
| TASK-N4 | "Remind me on 3/4" | Read as 3 April and shown on the card; if Nilumi's two date readings disagree, it asks |
| TASK-E1 | A reminder is edited just as it fires | The card explains that a notification already on its way can't be recalled |
| TASK-E2 | The reminder service was down at the due time | Fires when service resumes and is marked late; the inbox shows it honestly |
| TASK-E3 | Due time falls in one adult's quiet hours | That adult's push waits until quiet hours end; the other adult's push goes now; both get inbox items |
| TASK-E4 | Phone offline or in Focus mode | Delivery may be delayed by the phone; the inbox has it |
| TASK-E5 | Task marked done offline | The reminder may still fire until the change syncs |
| TASK-E6 | One adult hasn't allowed notifications | That adult gets the inbox item only |
| TASK-E7 | Private reminder | Lock screen shows "You have a private reminder" |
| TASK-X1 | A device's push subscription is no longer valid | Removed automatically; the inbox item remains; device health shows it |
| TASK-X2 | Push fails for another reason | Retried; admin alerted if it keeps failing |

### NOTIF: Push and Inbox

Delivery: P5. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| NOTIF-P1 | Enable notifications and send a test | The test arrives; health shows accepted and received times |
| NOTIF-P2 | Open Inbox after a missed push | The reminder is there with Done and Snooze |
| NOTIF-P3 | Retry a saved request after the outage ends | Runs once; cards show the outcome |
| NOTIF-N1 | Permission denied | Inbox still works; Settings explains how to re-enable |
| NOTIF-N2 | iPhone not installed to the Home Screen | Notifications can't be enabled; install guidance shown |
| NOTIF-E1 | The same reminder arrives twice | The phone collapses it into one notification |
| NOTIF-E2 | Accepted by the push service but no receipt from the phone | Health shows "accepted, not confirmed received"; this isn't treated as an error |
| NOTIF-E3 | Inbox opened offline | Cached items shown; Done and Snooze queue |
| NOTIF-X1 | Notification service down | Inbox items are still created; admin is alerted |

### SET: Settings and lifecycle

Delivery: P2/P4/P7. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| SET-P1 | J12: add the washing machine with warranty date | Entity and facts created; Home can answer about it |
| SET-P2 | J16: export after step-up | JSON downloaded with sources and history |
| SET-P3 | P7: forget all own private/shared-owned data | Step-up plus irreversible confirmation; scrub derivatives/journal and preserve unrelated household records |
| SET-P4 | Archive then restore an activity | Hidden from Recent until explicitly restored; content retained and visibility rechecked |
| SET-P5 | Delete an activity | Owned draft/layout removed; referenced household records remain; source forget is a separate confirmed action |
| SET-N1 | Export without passing step-up | Not exported |
| SET-N2 | Home item already exists | "Already known"; no duplicate |
| SET-E1 | Seeding form with a card number in a note | That field is refused; the rest of the form can be saved |
| SET-X1 | Export fails part-way | No partial file; retry offered |

### CAL: Optional read-only calendar

Delivery: P7. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| CAL-P1 | Connect and grant read-only access | Connected; Home includes events |
| CAL-P2 | Disconnect | Access revoked; cached events and calendar items deleted |
| CAL-N1 | Adult grants less (or more) access than requested | The link is undone; "Nilumi needs read-only calendar access"; no connection |
| CAL-N2 | Adult cancels on Google's screen | Back to Not connected; nothing stored |
| CAL-N3 | Connecting while the household acknowledgement is inactive | Refused, with the reason |
| CAL-N4 | The Google account isn't one Nilumi knows | Allowed: it only links a calendar and never creates a Nilumi account (current defaults below) |
| CAL-E1 | Access removed from the Google side | At the next sync: Reconnect needed |
| CAL-E2 | All-day, multi-day, repeating and other-time-zone events | Shown on the right Asia/Kolkata days |
| CAL-E3 | The other adult uses Nilumi | They can't see the events or tell that a calendar is connected |
| CAL-E4 | An event title contains instructions or links | Shown as plain text; it never creates suggestions or actions |
| CAL-X1 | Revoking at Google fails during disconnect | Local deletion still completes; the app says so and links to Google account permissions |

### ADMIN: Administration

Delivery: P1–P8. Entry is Home, or the supporting destination named in the scenario followed by Home restoration.

| ID | Scenario | Outcome |
|---|---|---|
| ADMIN-P1 | Admin filters traces by slow speech recognition | Matching turns with stage timings |
| ADMIN-P2 | Admin merges "Aquagard" into "Aquaguard" | One entity; the alias is kept |
| ADMIN-N1 | Admin opens one of the other adult's traces | Timings and outcome only, no text |
| ADMIN-N2 | Admin tries to merge an entity that is private to the other adult | Not visible, so it can't be merged |
| ADMIN-E1 | AI spend reaches 80% | Alert; the household enters soft cap ([degraded behavior](#6-failure-and-degraded-behavior)) |
| ADMIN-X1 | Nightly backup fails | Alert; the previous good backup is kept |


### CANVAS: activity lifecycle and continuous input

| ID | Scenario | Outcome |
|---|---|---|
| CANVAS-P1 | Continuing English/Tamil/Tanglish conversation | One tap, multiple final turns; visible and spoken results with recorded recognition/corrections |
| CANVAS-P2 | Switch topic while speaking | New activity focused; old audio stopped; prior activity retained in Recent |
| CANVAS-P3 | Checklist → table → checklist | IDs, quantities and checked state preserved; no new domain write |
| CANVAS-P4 | Reopen after transcript expiry/app close | Current authorized activity restored independently of conversation lifetime |
| CANVAS-P5 | Voice/text/touch correction | Same active refs/receipts and revision semantics |
| CANVAS-E1 | Late generation/audio from prior turn | Discarded for current focus; committed receipt remains available in its activity |
| CANVAS-E2 | Layout patch arrives while checkbox focused | Data updates safely; stable target/focus, replacement deferred if needed |
| CANVAS-E3 | Private source unshared/forgotten | Affected activity/presentation/speech refs scrubbed, no hidden existence leak |
| CANVAS-E4 | Mic permission granted after UI state changed | Start only with current explicit session intent; never begin unexpected capture |
| CANVAS-E5 | Background/lock/call interrupts media | Release/suspend media; preserve committed result; explicit resume with fresh grant |
| CANVAS-E6 | Device revoked during conversation | End media, refuse new actions, wipe local data at server contact |
| CANVAS-E8 | Same adult opens two devices | Independent focus/turn epochs per authenticated client context; shared domain revisions invalidate both without cancelling the other session |
| CANVAS-E9 | Saved/offline presentation has expired action references | Resolve fresh authorized controls on restore/reconnect; preserve original mutation identity/desired state; reject changed targets visibly |
| CANVAS-E7 | Cached generated private screen | Never persist arbitrary screen; offline reconstruct only approved projections |
| CANVAS-X1 | Invalid/unsupported presentation | Last authorized component/text fallback; user can still act manually |
| CANVAS-X2 | TTS/playback error or blocked autoplay | Visible result retained and gesture Replay; no unsolicited repeat on reconnect |
| CANVAS-X3 | Speech duration/budget exhausted | End provider stream and explain limit; manual result remains usable |

## 6. Failure and degraded behavior

Offline permits approved list/task/Inbox projections and queued desired-state changes; conversation, private memory/calendar, settings mutations and Admin require connectivity. Model outage has no restricted-pilot fallback. At 80% budget prefer templates/shorter optional speech; at 100% stop all provider calls. Inactive acknowledgement pauses STT/TTS as well as generation; existing manual records remain useful. Unknown provider/cost halts the role.

Receipt loss resumes from authoritative ledger, never repeats commit. Reminder-service delay marks overdue/catches up subject to current schedule revision; push failure retains Inbox. Calendar failure is a stale/reconnect marker. PWA update waits for an appropriate boundary, preserving pending queue and current activity before reload. Backup failure alerts Admin without falsely reporting a recent successful recovery.

## 7. Settled product defaults

| Area | Current choice |
|---|---|
| Home entry | Brief/resting activity and persistent composer; Recent restores state; no domain tab growth |
| Context | Activity-bound refs persist; unanchored conversation references expire after 30 minutes; app restart refreshes permitted context |
| Unsynced account switch | Warn and block switch until sync or explicit discard; never submit prior member queue as new member |
| Clarifications/health | Clarification stays Home and expires after 5 minutes; pending health confirmation has no expiry and appears in Inbox once P5 exists |
| Reminders | Recipient Done/Snooze is personal; household task completion applies globally; schedule creator edits/reschedules/cancels |
| Membership removal | No MVP removal UI; documented admin procedure first, scrub private/shared derivatives, recipients and acknowledgement |
| Forget-all | Own private/shared-owned data only, step-up/irreversible confirmation, P7 lifecycle tool; P4 implements single-resource forget |
| Brief | 07:30 IST; quiet 22:00–07:00; skip push if viewed today; attention+today and tomorrow+ahead presentation tiers |
| Suggestions | Expire end of household day; ahead looks 30 days; approval exact snapshot |
| Step-up | Private inactivity 24 hours; fresh privileged proof 10 minutes |
| Import | Versioned import into empty authorized household only; normal additions use seeding; no AI re-extraction |
| Saved-request retry | Resolve relative times from original occurred_at, ask if now past; only save to Inbox with explicit user choice |
| Voice | Household Ritu default; per-adult choice optional after evidence; typed input quiet in auto mode |
| Time defaults | Either adult may change household defaults, with history |
| Desktop | Same invite-only identity, responsive Home/Admin; desktop push not required |
| Recovery | Email mailbox remains primary MVP recovery; better mailbox-independent path deferred |
| Marketing/calendar | Static homepage/privacy policy at nilumi.in before OAuth; hosting choice verified for cost/eligibility in P7 |

## 8. Validation ownership

Latest-code OTP behavior, streaming transport, multilingual accuracy, focus/media recovery, keyboard/safe areas, cost and calendar consent are empirical gates, not unresolved product navigation questions. Each has phase, accountable owner, evidence and blocking scope in the [validation register](../plans/implementation-plan.md#validation-register). Scenarios here drive meaningful checks; [Device QA](../design/31-device-qa.md) records installed-phone observations.
