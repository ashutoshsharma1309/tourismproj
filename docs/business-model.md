# TerraStory business model, hotel partnerships and monetization

How TerraStory sustains itself, what of that is built, and what is not.
This document is the reference for `/partner`, the partner programme
(`src/lib/partners`, `src/db/schema/partners.ts`) and the claims the
product makes about money. Every figure a page shows either comes from a
counted event or is labelled as an illustration; this document says which.

## 1. Position

TerraStory is a cultural discovery platform for eighteen Indian
destinations, not a booking marketplace. It does not hold rates,
availability or inventory, takes no payment and is not party to any
booking. The commercial layer follows the traveller's own path and stops
at the property's door:

    traffic → destination discovery → stay and experience discovery
            → qualified referral → partner conversion
            → commission or referral fee under a signed agreement

The value exchanged at each step:

| Who | What they get |
|---|---|
| Travellers | Free, sourced cultural discovery; verified places to stay reached through the property's own channels; no account needed |
| Partners (hotels, homestays, heritage properties) | Visibility to travellers already exploring their destination; qualified referrals to their own website, booking page or telephone; a verified listing; counted referral activity |
| Destinations | Digital cultural discovery across every state and union territory covered; an honest picture of what is documented |
| TerraStory | Referral and commission revenue under signed agreements now; institutional and B2B licensing of verified destination knowledge later |

## 2. Three numbers that are kept apart

| Term | Meaning | Whose money |
|---|---|---|
| **GMV** (gross merchandise value) | The value of transactions guests complete at partners | The partner's |
| **Commission** | What one qualifying transaction yields TerraStory under one active agreement | TerraStory's, per transaction |
| **Revenue** | The sum of commissions and fees actually earned | TerraStory's |

A page visit and an outbound click carry no amount and earn nothing. The
arithmetic in `src/lib/partners/commission.ts` takes an agreement as an
argument and returns `null` — not zero, not a default — when there is no
agreement, when it is not active on the date, or when its type does not
apply to the case. There is no hard-coded rate anywhere in production code.

`ledgerFor(agreement, transactions)` reports GMV and revenue as separate
fields and never adds them. `qa:partners` §B asserts all of this.

## 3. Commercial agreements

A `partner_agreements` row carries the terms a partner has signed. Four
types are modelled; none is assumed:

| Type | Terms | Earns on |
|---|---|---|
| `PERCENTAGE_COMMISSION` | `commission_bps` (basis points, 0–10 000) | a confirmed transaction: `amount × bps ÷ 10 000`, rounded toward zero |
| `FIXED_REFERRAL_FEE` | `fee_paise` | a confirmed transaction: the fee |
| `QUALIFIED_LEAD_FEE` | `fee_paise` | a qualified lead, not a transaction |
| `EXPERIENCE_PARTNERSHIP_FEE` | `fee_paise` | a partnership arrangement, not a transaction |

An agreement is `DRAFT`, `ACTIVE`, `EXPIRED` or `TERMINATED` and may carry
`valid_from` / `valid_until`. Only `ACTIVE` within its dates counts.

**Today there are no agreements.** The partner dashboard says "No
commercial agreement is in place" and the partner page says being listed
costs nothing. No page anywhere quotes a rate as TerraStory's.

## 4. The illustrative scenario

`/partner` shows one worked example, labelled *Illustrative business
scenario* with a disclaimer that TerraStory has no confirmed bookings, no
signed agreements and no earned revenue. Its inputs live in one file,
`src/lib/partners/scenario.ts`, and are computed through the same
commission function a real agreement would use:

| Input | Value |
|---|---|
| Qualified bookings per month | 100 |
| Average booking value | ₹4,000 |
| Commission | 10 % (1 000 bps) |
| → Illustrative GMV | ₹4,00,000 |
| → Illustrative platform revenue | ₹40,000 |

Change the inputs there and the page and the tests follow. Nothing in
production business logic reads these values.

## 5. The partner programme as built

### 5.1 Data model (`src/db/schema/partners.ts`)

| Table | Holds | Never holds |
|---|---|---|
| `partners` | organisation, contact name, business e-mail and telephone, status, owning user | payment details, bank details, documents |
| `partner_properties` | name, type, destination (validated against the registry), address, area, coordinates, map / website / booking URLs, description, local character, amenities, lifecycle status, reviewer, note, provenance (what was checked, when) | rates, rooms, availability, ratings |
| `partner_agreements` | type, commission bps, fee paise, status, validity, notes | — |
| `referral_events` | property or curated stay reference, destination, event type, source path, hashed session id, timestamp | IP address, user agent, traveller identity, amount |

Nothing reuses the priced `listings` / `availability` / `bookings` tables
of the v2 commerce schema. Those remain for the direct-booking extension
(§7) and are untouched.

### 5.2 Verification lifecycle (`src/lib/partners/lifecycle.ts`)

    PENDING → UNDER_REVIEW → VERIFIED → APPROVED → PUBLISHED ⇄ UNPUBLISHED
    any pre-publication state → REJECTED → UNDER_REVIEW (reopen)

Nothing skips a step and nothing auto-publishes. A submission becomes
visible to travellers only after a reviewer moved it through
`VERIFIED` and `APPROVED` to `PUBLISHED`. The database holds the same
invariant as a check constraint (`partner_properties_published_is_reviewed`:
a published row has a `reviewed_at`), so a bug in application code cannot
publish an unreviewed property. Every transition, edit and submission
writes an `audit_logs` row with the actor.

### 5.3 Surfaces

| Route | Who | What |
|---|---|---|
| `/partner` | public | value proposition, how it works, business model, illustrative scenario, today-vs-not-yet, CTA |
| `/partner/apply` | public | the onboarding form — property information only; Zod-validated; rate-limited; honeypot; never creates a listing |
| `/login` | partners, reviewers | e-mail one-time code; no password; travellers never need it |
| `/partner/dashboard` | the signed-in partner | profile, per-property status in plain words, reviewer notes, referral clicks by type or "No referral activity yet.", agreements or "No commercial agreement is in place" |
| `/admin/partners`, `/admin/partners/[id]` | allowlisted reviewers (`ADMIN_EMAILS`) | queue; everything submitted; lifecycle controls with verification checklist and note; corrections (audited); audit trail; referral counts. Everyone else gets a 404 |
| `/destinations/[id]` | public | "Partner stays in …" section, only when a published partner exists, kept apart from curated stays. Fetched after load from `/api/partner-stays`, because the prerendered destination page cannot be regenerated on demand (a Next.js `dynamicParams = false` limitation measured on the production build) |
| `/api/partner-stays?destination=` | public | the published partner stays of one registered destination, traveller-facing fields only; 400 for any other destination |
| `/destinations/[id]/partner-stays/[propertyId]` | public | one published property; 404 for any other status |

Existing curated stays (register and capsule) are untouched in data and
presentation. Their "Official website", "Call" and map actions now also
count referrals, keyed by `destination/slug`, so the referral picture is
whole from day one.

### 5.4 Referral tracking (`/api/referrals`, `ReferralLink`)

An outbound click on "Book on official website", "Contact property",
"Official website", "Call" or a map link sends a beacon with the property
id or stay reference, destination id, event type and the page path. The
server adds a timestamp and a session hash — SHA-256 of a random cookie
value that identifies nothing about the person — and stores the event.
The beacon never blocks or redirects the click; if it fails, the traveller
notices nothing. No IP address, user agent or identity is stored, and the
partner sees counts by type, never the traveller.

### 5.5 Security and privacy boundaries

- A partner's dashboard reads only rows scoped by the partner id the
  session resolved to (`owner_user_id`, or e-mail match on first sign-in).
  No page takes a partner or property id from a form to decide what to show.
- Reviewer status comes from the `ADMIN_EMAILS` allowlist in the
  environment, checked on the server for every admin page and action.
  Non-reviewers, signed in or not, receive a 404.
- Every server action begins with a Zod parse; the apply form and sign-in
  share the site's submission rate limit (5 per 10 minutes per client).
- The apply form collects no payment details and no documents. Travellers'
  data is never shown to partners: the dashboard shows counts only.
- Partner contact e-mail and name appear only on the partner's own
  dashboard and the review console; the public page shows the property's
  business telephone (the form says so) and its own URLs.

## 6. Current state versus future extension

| | Implemented today | Future extension |
|---|---|---|
| Discovery | Curated stays on every destination; verified partner stays where published | Experiences, guides and transport partners on the same lifecycle |
| Referral | Outbound clicks counted per property / stay and per type | Attribution of confirmed bookings (partner-reported or via booking-engine callbacks) |
| Agreements | Modelled and configurable; none active | Signed agreements activated by an operator; invoicing per period |
| Revenue | None earned; none reported | Commission on confirmed transactions; qualified-lead fees; experience partnership fees |
| Booking | None; the property's own channels | Direct booking on a verified property using the existing `listings` / `availability` / `bookings` schema and Razorpay Route split payouts |
| B2B / B2G | — | Licensing verified destination knowledge to tourism boards and institutions; analytics for destination management |

The data model is built so direct booking can be added to a verified
property later without changing the platform underneath: a partner
property already has an identity, a verified address and channels, and an
agreement; a listing would hang off it.

## 7. What the product deliberately does not do

- No fake bookings, inventory, availability, prices or ratings.
- No fabricated hotel partners or testimonials.
- No auto-publishing of submissions.
- No commission quoted without an agreement.
- No traveller personal data collected for the partner programme.
- No payment collection from partners or travellers.

## 8. Turning it on in a deployment

Without a database the partner surfaces degrade honestly: `/partner`
renders, `/partner/apply` says requests are not being accepted, no partner
section appears, and referral clicks are silently not stored. To enable the
programme:

1. Set `DATABASE_URL` (Supabase transaction pooler), `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `ADMIN_EMAILS` in the host's
   environment. Never commit them.
2. Apply the schema: `pnpm db:push` against `DIRECT_URL`, then re-apply
   `drizzle/sql/0001_constraints.sql`, because `drizzle-kit push` drops the
   hand-written constraints and partial indexes it cannot express.
3. In Supabase Auth → URL Configuration, add `<site>/auth/callback` to the
   redirect allowlist. For the typed six-digit code, the "Magic Link" e-mail
   template must include `{{ .Token }}`; the link in the same e-mail works
   either way.
4. `prepare: false` in `src/db/index.ts` is required on the transaction
   pooler. With prepared statements on, a long-lived server's second
   transaction was acknowledged but never committed.

## 9. Verification

`pnpm qa:partners` (also in `qa:final`) asserts: every lifecycle
transition allowed and refused; commission arithmetic and GMV ≠ revenue;
no commission without an active agreement; nothing earned from a click;
the illustrative scenario's numbers and configurability; Zod validation
including destination scope and the honeypot; the absence of hard-coded
rates and price columns; and, against a running server, the public pages,
the 404 on admin routes, the redirect on the dashboard, referral API
validation, and — when a database and Supabase are configured — the full
apply → review → publish → referral → dashboard flow with ownership
isolation between two partners.
