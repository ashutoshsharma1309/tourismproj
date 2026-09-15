# Accounts, travel history and personalization

TerraStory remembers a signed-in traveller's meaningful activity and uses it,
with the interests they choose, to recommend what to explore next. Every
recommendation explains itself. Nothing is required: every page works
without an account.

    login → travel history → interests → personalization → journey continuity

## 1. Authentication

Supabase Auth, extended rather than replaced. The partner programme already
used it for one-time codes. Travellers use e-mail and password.

| Route | Purpose |
|---|---|
| `/signup` | Name, e-mail, password (min 8). Supabase sends a confirmation link. |
| `/login` | "Welcome back." E-mail and password. Links to Forgot password and Create account. |
| `/login/code` | One-time e-mail code, for hotel partners and reviewers. |
| `/forgot-password` → e-mail → `/auth/callback` → `/auth/continue` → `/reset-password` | Choose a new password. |
| Log out | Profile page, and the partner dashboard. |

- **Passwords** are stored by Supabase as bcrypt hashes; this codebase never
  sees one.
- **Sessions** live in cookies set only by the server: `HttpOnly`,
  `SameSite=Lax`, `Secure` in production, at most 30 days
  (`src/lib/auth/cookies.ts`). Access tokens are short-lived; the refresh
  token rotates.
- **`src/proxy.ts`** refreshes the session on account, sign-in, partner and
  review pages only. Destination, story and home pages stay prerendered.
- **Signed-in hint.** Prerendered pages cannot read an HttpOnly session, so a
  separate `ts_signed_in=1` cookie tells their small client islands whether
  to call `/api/account/*`. It holds no identity and grants nothing; every
  endpoint checks the real session, and a stale hint is dropped on 401.
- **No account enumeration.** A failed sign-in has one message for every
  cause. Password reset answers "if … has an account" for any address, even
  when sending fails (logged instead). Sign-up says so plainly when Supabase
  refuses an address or the project's e-mail sending limit is reached,
  because the traveller must know no account was created. That limit is
  project-wide, so it reveals nothing about any one address.
- **Rate limits** (`consumeQuota` in `src/lib/rate-limit.ts`):

  | Action | Per client address | Per e-mail address | Per account |
  |---|---|---|---|
  | Sign-in | 10 per 10 min | 10 per 10 min | — |
  | Sign-up | 5 per hour | 3 per hour | — |
  | Reset | 5 per hour | 3 per hour | — |
  | Activity | — | — | 60 requests per minute, each at most 30 events |
  | Settings | — | — | 30 per 10 min |

  In-memory per server process: a deterrent, not a distributed guarantee.
- **E-mail links.**
  - A PKCE `code` link is exchanged at once, because only the browser that
    asked holds its verifier.
  - A `token_hash` link works in any browser, so a page load only shows
    **Continue**; a same-origin POST completes it. A hidden image or
    redirect therefore cannot sign a visitor into someone else's account.
  - Anonymous activity merges only after a log-in form submitted in that
    same tab.
- **Privileged areas need inbox proof.** Reviewer rights (`ADMIN_EMAILS`)
  and partner records open only to a confirmed address signed in with a
  one-time code or e-mail link (`amr` = `otp`). A password alone never
  reaches them, which defeats pre-registering someone else's address.
- **Password change** needs inbox proof from the last 15 minutes, meaning a
  reset link or code. Afterwards every other session is signed out. Supabase
  records a reset link as `otp`.
- **`next`** is validated in one place (`src/lib/account/next.ts`). It rejects
  `//`, backslashes, control characters and anything resolving off-site.
- **CSRF.** Server actions carry Next's Origin check. JSON write routes call
  `isSameOrigin` first (`src/lib/account/origin.ts`) and refuse a foreign
  `Origin` with 403.

## 2. Data model (`src/db/schema/travel.ts`)

The existing `users` table is reused: `full_name` is the name, `locale` the
preferred language, and a new `history_enabled` flag lets travellers pause
recording.

| Table | One row per | Holds |
|---|---|---|
| `user_interests` | traveller × interest | the interests they chose (weight 1) |
| `travel_events` | meaningful event | type, destination id, entity id (`place:…`, `story:…`, `stay:…`), time, client event id |
| `destination_affinity` | traveller × destination | first explored, last explored, number of explorations |
| `user_journeys` | journey | ordered destination ids, completed ids, status (IN_PROGRESS / COMPLETED / ARCHIVED), created, completed |
| `user_comparisons` | traveller × set of destinations | ids, times compared, first and last compared |

Every table cascades from `users`. The v2 `trips` table is not reused: it
keys destinations by UUIDs of the Sikkim-district table and models booked
itineraries with dates and budgets. A journey here is an ordered choice
among the 18 registry ids.

**Event types:** `DESTINATION_VIEWED`, `PLACE_VIEWED`, `STORY_VIEWED`,
`HISTORY_VIEWED`, `CULTURE_VIEWED`, `STAY_VIEWED`, `JOURNEY_STARTED`,
`JOURNEY_COMPLETED`, `COMPARISON_CREATED`, `AI_GUIDE_USED`.

**Not stored:** searches, guide question text, scroll, hover, clicks, IP
addresses, devices, locations.

**Writes are set-based:** one read of recent repeats, one insert, one aggregate
upsert per destination touched, and one prune. A `history_cleared_at` stamp
on `users` refuses events that happened before the last clear.

**Retention:** detailed events 180 days and at most 1,000 per traveller, pruned
as new ones arrive. The destination aggregate survives until the traveller
clears history.

**Destination isolation.** A proposed event is stored only if its destination
is in the registry and its entity is one of THAT destination's own records
(`src/lib/account/events.ts`). A Jaipur place id under Varanasi is refused.
The engine resolves entities inside the destination they were recorded under.

## 3. Travel history

`ActivityRecorder` (mounted once in the layout) maps page views to events
with `eventForLocation` (`src/lib/account/activity.ts`): destination hubs in
any language, place, monastery, story, history, culture, stay and
partner-stay pages, and a capsule destination's `discover#place-…`. A
comparison page with two or more ids records a comparison. A page counts once
it has been open for about a second, so a redirect or a page skipped straight
past is not "explored". Repeats within 30 minutes are one exploration.
Nothing is sent while history is paused.

**Anonymous visitors.** Activity waits in this tab's `sessionStorage` (30
entries). If the visitor logs in during that same session it is merged into
that account, deduplicated by event id, then forgotten. Nothing from another
session or from `localStorage` is ever merged.

**Pages.**
- `/account`: "Welcome back" with Continue exploring, Recently explored,
  Recommended for you, Your journey and Recent comparisons. A new account
  instead sees "Welcome to TerraStory", Choose interests and Explore 18
  Indian destinations, never invented history.
- `/account/history`: Recently explored, Destinations explored (first, last,
  count), Places, stories and stays explored (40 most recent), Journeys,
  Comparisons.
- `/account/profile`: name, e-mail, member since, preferred language,
  activity summary, interests, privacy notice and controls, log out.
- `/account/interests`: the ten interests; skippable at onboarding.

## 4. Journeys and comparisons

The journey on the device (`localStorage`, `JourneyProvider`) stays the
working copy; `JourneyAccountSync` keeps it in step with the account.

| Situation | What happens |
|---|---|
| Account has a journey, device is empty | loaded onto the device |
| Device empty, nothing saved | linked; the journey is saved as it grows |
| Device journey already linked | changes saved (debounced) |
| Device journey built before log-in | nothing automatic; the account page asks: Save to my account, or Keep on this device only |

Completion is recorded (`completed_at`) only when every destination in the
journey is marked done. Clearing the device journey archives the saved one;
it never marks it complete. Logging out removes the journey, visit list and
session buffer from the device.

## 5. Personalization (`src/lib/personalization/engine.ts`)

Deterministic and explainable. The three signals:

1. **Explicit interests.** `user_interests`.
2. **Travel history.** Explored destinations and viewed places.
3. **Context.** The destination currently open.

The knowledge is the same coverage `/discover` ranks with:
- per-destination interest coverage counted from records
- per-place interests with evidence
- shared themes from claims and records

There is no popularity signal. The engine works as follows:

- **Demonstrated interest.** An interest counts only with two independent
  observations: two explored destinations that rank it among their three
  strongest, or two viewed places that carry it. It is never written to
  `user_interests`.
- **Destination recommendations.** Unexplored destinations that cover an
  explicit interest (weight 3), a demonstrated interest (weight 2), or share
  a theme with an explored destination (1.5), plus a small depth term. Each
  carries reasons:
  - "Based on your interest in architecture — 14 documented places for
    architecture."
  - "You explored Jaipur, Agra and Varanasi, destinations strong in
    heritage."
  - "Shares royal and palace heritage with Jaipur, which you explored."

  A destination with no such reason is not returned. With no signal at all
  the page asks for interests.
- **Place recommendations.** A destination's own experiences, not yet
  viewed, matching explicit or demonstrated interests. They appear on the
  destination page ("Recommended for you in …") and under Continue
  exploring.

Nothing derived is cached, so changing interests or clearing history changes
the next recommendation immediately.

## 6. The guide

The guide is retrieval over TerraStory records in the browser; it does not
call a language model at runtime (Claude is used only by the offline research
pipeline). A signed-in traveller asking "What should I explore next?", "where
should I go next", or "recommend … for me" gets the account's own
recommendations: names, links and the reasons above. The question text is
never sent. Ordinary questions ("what should I see in Jaipur") are still
answered from records. Signed out, the guide says it will not guess what the
visitor likes and offers log-in. Guide use is recorded as `AI_GUIDE_USED`
(where, not what).

## 7. Privacy controls

- **Pause recording.** Profile, "Remember what I explore while signed in".
- **Clear travel history.** Deletes all events, destination aggregates,
  comparisons and past journeys. Interests and the journey in progress stay,
  as the page states.
- **Delete account.**
  - Detaches partner, vendor-document and audit references.
  - Deletes the traveller's trips, permit applications and reviews.
  - Deletes the `users` row, which cascades to all history, then the
    Supabase sign-in.
  - An account holding a booking or an operator business is refused with an
    explanation, so financial records are never erased by one click.
- **Partners and reviewers** never read traveller tables. `/api/account/*`
  answers only for the session's own user.

## 8. Language

`users.locale` persists the preferred language. Destination links from the
account open `/l/<lang>/destinations/<id>` where the traveller chose a
non-English language. Account pages and record text are in English; the
profile page says so.

## 9. Turning it on in a deployment

1. Environment: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (account
   deletion only), `NEXT_PUBLIC_SITE_URL`.
2. Schema: `pnpm db:push`, then re-apply `drizzle/sql/0001_constraints.sql`.
3. Supabase Auth → URL configuration: add `<site>/auth/callback`.
4. Supabase's built-in mailer sends only a few messages an hour; production
   sign-up and reset need custom SMTP.

## 10. Verification

`pnpm qa:accounts` (in `qa:final`) runs 199 checks.

- **A. Engine.** Runs on real knowledge for all 18 destinations: no signal
  means no list, reasons match signals, determinism, destination scoping.
- **B. Event mapping.**
- **C. Code guarantees.** Session gate, same-origin writes, no user id from
  requests, cookie flags, proxy scope, service-role key location.
- **D. Signed out.** Redirects, 401s, cross-site 403, hint grants nothing,
  log-in and sign-up forms, robots and sitemap.
- **E. Browser flows against Supabase and Postgres.**
  - Sign-up validation; unconfirmed log-in refused.
  - Anonymous merge.
  - New-account honesty.
  - Interests; exploration recorded and refused under the wrong destination.
  - Journey and comparison persist across log-out.
  - Recommendations change with interests; the guide's personal answer.
  - User A cannot read or write user B; partner and admin surfaces.
  - Clear history; pause.
  - Enumeration and rate limit.
  - Password reset.
  - 320 and 390px layouts and tap targets.
  - Account deletion.

## 11. Current versus future

| Implemented | Future extension |
|---|---|
| E-mail and password, confirmation, reset, one-time codes for partners | Google sign-in (not configured on the project); multi-factor |
| History, journeys, comparisons, interests, pause, clear, delete | Export of personal data as a file |
| Deterministic, explained recommendations for destinations and places | "More or less like this" feedback, using the existing `weight` column |
| Guide answers "what next" from account signals | A runtime language model composing answers over the same retrieval |
| In-memory rate limits per server process | Shared rate limiting (for example Redis) across serverless instances; per-address limits can currently be used to delay one account's sign-in |
| Supabase built-in mailer | Custom SMTP; response-time differences between known and unknown addresses are not equalised |
| Multiple past journeys listed; one in progress | Named journeys and several in progress |
