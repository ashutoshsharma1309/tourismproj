# Subscriptions and feature gating — Phase 4

Plans, what each one allows, and where that is enforced. No payment gateway is
connected and nothing is charged.

## Plans are data

`plans` holds one row per plan: its name, summary, proposed monthly price in
paise, trial length and an `entitlements` JSON of `features` and `limits`.
The three seeded rows come from the business analysis
(`docs/sih-ppt-content.md`, "Viability / business model") and are inserted by
`drizzle/sql/0004_subscriptions.sql`:

| Plan | Proposed price | Listings | Room types per listing | Team | Features |
|---|---|---|---|---|---|
| Free (default) | ₹0 | 1 | 3 | 0 | add listings, rooms/rates/calendar |
| Growth | ₹999/month | 5 | 20 | 0 | + analytics, 14-day trial |
| Pro | ₹2,499/month | 50 | 50 | 10 | + team members, exportable reports, 14-day trial |

`price_status` is `PROPOSED` on every row and `price_source` names the
document. Nothing reads the price to charge anyone; the workspace says so
wherever a price appears. Changing a plan's shape is an update to these rows,
not a code change.

## One place decides

`src/lib/subscriptions/entitlements.ts` is the only module that knows about
plan codes. Everything else asks:

```ts
can(entitlements, "viewAnalytics")
withinLimit(entitlements, "listings", currentCount)
```

`resolveEntitlements(plans, subscription, now)` returns the plan that applies
**now**:

| Subscription status | Applies |
|---|---|
| `TRIALING` | until `trial_ends_at` |
| `ACTIVE` | until `current_period_end`, or open-ended when there is none |
| `PAST_DUE` | for 7 days after the period end, then not |
| `CANCELLED` / cancel-at-period-end | until the period ends |
| `EXPIRED`, unknown plan, no subscription | never — the default plan applies |

Expiry is computed from dates on every check, so a lapsed subscription
restricts immediately without any sweep job. `qa:subscriptions` asserts that no
file outside that module compares a plan code.

## Where gates are enforced

Server-side, inside the transaction that does the write — never only by hiding
a button:

| Gate | Where |
|---|---|
| Add a listing (feature + `listings` limit) | `createListing` in `src/lib/partners/inventory.ts`, and `createPartnershipRequest` in `store.ts` so the public apply form cannot get around it |
| Room types (feature + `roomTypesPerListing` limit) | `createUnit` |
| Change rooms or the calendar | `updateUnit`, `deleteUnit`, `setAvailability` |
| Analytics | `/partner/analytics` resolves the gate before it queries anything |
| Exportable reports | `/partner/reports/reservations` returns 403 |
| Team members (feature + `teamMembers` limit, owner only) | `addTeamMember` |

Removing a team member is never gated: a partner whose plan lapses can always
shrink their team.

**Restriction never destroys.** A plan change writes only the subscription row.
Listings, room types, availability, holds and bookings are untouched, and a
partner over a limit keeps everything and simply cannot add more.

## Subscriptions and teams

- `partner_subscriptions`: one row per partner, with plan, status, trial end, period, `cancel_at_period_end`, who assigned it and a note. Assignments are idempotent and audited (`subscription.assigned`, `subscription.ended`).
- `partner_members`: a person who works in a partner's workspace. They sign in with the same account system, are matched on their proven e-mail and linked on first sign-in. A database trigger stops a member's address from being an organisation owner's, and a unique index keeps a person in one organisation. `partnerFor` returns the partner with a role of `OWNER` or `STAFF`.

## Workspace

| Route | What |
|---|---|
| `/partner/plan` | Current plan and why it applies, usage against each limit, included features, and every plan with its proposed price and the note that billing is not enabled |
| `/partner/analytics` | Growth and above: clicks to the partner's channels, reservations started and released, and room-nights open, held and booked over the next 30 days — all counts of real rows. It says plainly that revenue appears only once payments are connected |
| `/partner/reports/reservations` | Pro: CSV of reservations on the partner's listings, with no traveller identity |
| `/partner/team` | Pro: the owner adds and removes staff; members see the list read-only |
| `/admin/partners/[propertyId]` | Reviewers assign a plan (active or trial, with an optional end date), end it now or at period end, and see which plan actually applies |

Locked sections explain which plan includes the feature and link to the plan
page, rather than disappearing.

## Tests (`pnpm qa:subscriptions`)

- **A:** the entitlement rules — default fallback, trials, period ends, past-due grace, cancellation, unknown plans, limits, and that a catalogue without a default plan throws rather than silently allowing.
- **B:** code guarantees — no plan-code comparisons outside the module, each gate present in the store it protects, a plan change writing only the subscription row, the CSV route checking the plan and carrying no traveller identity, and analytics not querying before the gate.
- **C:** the seeded plans — three rows, one default, prices in paise marked proposed, features known to the code.
- **D:** the workspace, in a browser:
  - A free partner: no New listing, no form, analytics and team locked, CSV 403.
  - A reviewer assigns Growth; a second identical assignment changes nothing.
  - Analytics opens with the real counts; reports stay locked.
  - **A form rendered while allowed is still refused after the plan lapses** — the server decides.
  - A trial allows a second listing.
  - Pro opens the CSV (own reservations only, no traveller identity) and team members; a member reaches the workspace, cannot manage the team, and shares the plan.
  - Another partner sees none of it.
  - Ending the subscription restricts at once while listings, rooms and the held booking stay exactly as they were; a removed member loses access.
  - Pages fit 375 and 1440 px.

## Not in Phase 4

- **Billing.** No gateway, no invoices, no self-service upgrade: a reviewer assigns plans. The plan page says so where a price is shown.
- **Usage metering.** Limits are counted at the moment of the write; there is no monthly usage record.
- **Roles beyond staff.** A member has the same workspace rights as the owner except team management.
- **Plan change requests.** A partner cannot ask for a plan in the product yet.
