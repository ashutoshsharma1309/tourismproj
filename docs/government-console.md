# Government console — Phase 5

A surface for tourism authorities: verification, supply visibility, advisories
and operational analytics — each limited to the destinations the authority
governs.

## Roles

| Role | Where it comes from | May |
|---|---|---|
| Platform admin | `ADMIN_EMAILS` allowlist + inbox proof | the review console at `/admin/partners` (unchanged) |
| Government manager | `gov_members.role = MANAGER` | everything a reviewer may, plus publish advisories and manage the authority's officers |
| Government reviewer | `gov_members.role = REVIEWER` | the verification queue, decisions, clarifications, analytics; read advisories |
| Partner owner | `partners.owner_user_id` / email | the partner workspace (Phase 1–4) |
| Partner staff | `partner_members` | the same workspace except team management |
| Traveller | any signed-in account | the public surfaces and their own account |

A platform admin is **not** automatically a government officer, and an
officer is not a platform admin. Capability lists live in
`src/lib/government/permissions.ts`; nothing else decides what a role may do.

The database keeps the seats apart: a trigger refuses a government officer
whose address owns or belongs to a partner organisation, and the reverse
trigger refuses a partner member who is a government officer. One officer
belongs to one authority (unique email).

## Jurisdiction

`gov_organisations` carries a scope: `NATIONAL` (every destination the
registry knows) or `DESTINATIONS` (exactly the registry ids on its row, at
least one). `permittedDestinations()` resolves it, an inactive organisation
resolves to nothing, and every console read takes that list as its first
argument and filters on it in SQL. So:

- a record outside the jurisdiction is never selected, and its URL answers 404;
- the overview counts only the officer's own destinations;
- a verification decision re-checks the jurisdiction **inside the partner store's transaction**, so a forged id cannot decide another state's application.

## What the console does

| Route | Who | What |
|---|---|---|
| `/government` | any officer | operators registered and verified, listings published and awaiting verification, room types, room-nights open over 30 days, reservations started over 30 days, advisories in force — and the same figures per destination |
| `/government/queue` | reviewer, manager | applications oldest first, filtered to those awaiting a decision or all; operator, destination, vendor type, submitted date, status, document count, and whether clarification is outstanding |
| `/government/queue/[propertyId]` | reviewer, manager | everything the operator submitted, its documents through five-minute signed links, the record of decisions, and the decision controls |
| `/government/advisories` | manager writes, reviewer reads | draft, publish and withdraw advisories for permits, weather, closures and restrictions |
| `/government/team` | manager writes, reviewer reads | the authority's officers and their roles |
| `GET /api/advisories?destination=` | travellers | published advisories in force, with the issuing authority named |

Decisions reuse the existing property lifecycle
(`src/lib/partners/lifecycle.ts`) — no new states were invented, and a
decision promotes the operator's own verification exactly as a platform
reviewer's does. **Request clarification** writes the note and
`clarification_requested_at` and audits it, without moving the lifecycle: a
record waiting on its applicant stays in the state the machine put it in, and
the partner sees the note on their listing.

Every write is audited with the organisation that made it (`after.orgId`), and
repeating a decision or a publication changes nothing.

## Advisories

`advisories` already existed and was never written to, so it was reused rather
than replaced. Its destination column moved from the Sikkim-district uuid
table to registry ids (as in 0002), and it gained a kind, a publication state,
an issuing organisation, an author and timestamps.

- Drafting and publishing are separate acts. A draft reaches no traveller.
- A published advisory must name its authority and carry a publication time (database check), and its window must end after it starts.
- Travellers see only published advisories inside their window, on the destination page, with the authority's name. The officer who wrote it is never exposed.
- Nothing seeds advisories: an advisory exists only because an authority wrote it.

## Traveller data

The console holds none. There is no query in `src/db/queries/government.ts`
that selects a traveller's name, contact details or history, and no
capability names one. Reservations are **counted** for supply analytics and
never listed. Payment and revenue figures are absent because no payment has
been taken; the overview says so.

## Tests (`pnpm qa:government`)

- **A:** roles and jurisdiction — capability lists, national vs state scope, inactive organisations, unknown destinations, exact membership.
- **B:** code guarantees — every page resolving the officer from the session, every read filtered by jurisdiction, no join to traveller data, every write checking capability and jurisdiction, the partner store refusing an out-of-jurisdiction decision, clarification not inventing a state, audits carrying the organisation, and the console linked from no public page.
- **C:** database invariants — officers and partners kept apart, one authority per officer, a scoped organisation naming a destination, a published advisory attributed and dated, an advisory window ordered.
- **D:** the console in a browser:
  - A signed-out visitor, a traveller and a partner are all told only that the console is for authorities, and a queue URL tells them nothing.
  - A reviewer sees its own applications and not another state's; an outside id is 404; the overview counts only its own destinations and states that it holds no traveller data and claims no revenue.
  - A reviewer cannot publish advisories or manage the team.
  - Decisions work, record what was checked, are audited against the organisation, promote the operator, and are idempotent.
  - Clarification records a note without moving the lifecycle, and is audited.
  - An officer of another state gets 404, and a forged property id changes nothing.
  - A manager drafts an advisory (attributed, invisible to travellers), publishes it (travellers see it with the authority named, only for its destination), and withdraws it (it disappears); all three acts are audited. The destination picker offers only the jurisdiction.
  - A manager adds and removes an officer.
  - Pages fit 375 and 1440 px, and the navigation is keyboard reachable.

A bug this suite caught: the first version of the scope check used
`array_length(destination_ids, 1) >= 1`, which is NULL for an empty array —
and a NULL check passes, so an organisation with no destinations was allowed.
It is now `coalesce(array_length(...), 0) >= 1`.

## Not in Phase 5

- **No authority is seeded.** An organisation and its first manager are inserted by whoever operates the deployment; there is no self-service sign-up, and no fake department exists.
- **No arrivals, occupancy or revenue-retention analytics.** Those need confirmed bookings and payments (Phase 3), and inventing them would be fabrication. The console shows supply and verification only.
- **No permits module.** Advisories can carry permit information as text; there is no permit application flow here.
- **No CSV export or advisory editing after drafting.** An advisory is drafted, published and withdrawn; correcting one means drafting another.
- **Translation.** English is complete; Hindi covers the frame, roles and statuses, and every other key falls back to English.
