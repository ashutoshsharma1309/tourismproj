# Partner inventory — Phase 1

Vendor onboarding → verification → listing → room types → availability calendar.

This document records what Phase 1 built, the one structural decision it
made, and what is deliberately not there yet.

## The decision: one supply model

Before Phase 1 the repository described the same hotels twice:

| | Partner programme (`partners.ts`) | Commerce schema (`identity.ts`, `commerce.ts`) |
|---|---|---|
| Organisation | `partners` — ownership, status, audit | `vendors` — never written by any code |
| Place to stay | `partner_properties` — review lifecycle, registry destination ids | `listings` — FK to the Sikkim-district `destinations` table, never written |
| Inventory | none | `listing_units`, `availability` → `listings` |

Only the partner model had working onboarding, review, ownership and an audit
trail, and only it could belong to a registry destination such as `jaipur`.
So inventory now hangs off it:

- **vendor** = a `partners` row
- **listing** = a `partner_properties` row
- `listing_units.listing_id`, `booking_items.listing_id`, `reviews.listing_id`,
  `trip_stops.listing_id` → `partner_properties.id`
- `booking_items.vendor_id`, `payouts.vendor_id`, `vendor_documents.vendor_id` → `partners.id`

Column names were kept, so no rename and no data migration was needed; every
table touched was empty.

`vendors` and `listings` are marked `@deprecated` and are **not dropped**: the
build already deployed on the shared database still counts `listings` on the
district hub and reads `vendors` during account deletion. Nothing in this
build reads them. Drop both, together with their 0001 triggers, once the
deployment runs this build.

## Database

`drizzle/sql/0002_partner_inventory.sql` (idempotent) adds:

- `partners`: `vendor_type` (STAY / TRANSPORT / GUIDE / EXPERIENCE),
  `registration_info`, `verified_by`, `verified_at`, `verification_note`
- `partner_properties`: `check_in_from`, `check_out_by`, `house_rules`, `cancellation_terms`
- `listing_units`: `created_at`, `updated_at`, `UNIQUE (listing_id, name)`, range CHECKs
- `availability`: `updated_at`
- `vendor_documents`: `file_name`, `content_type`, `size_bytes`, `uploaded_by`, `created_at`

Invariants enforced in Postgres, not only in code:

| Trigger | Rule |
|---|---|
| `partner_properties_require_verified_vendor` | A listing cannot be `PUBLISHED` unless its vendor is `VERIFIED` or `APPROVED` |
| `partners_unpublish_on_deverification` | A vendor leaving `VERIFIED`/`APPROVED` unpublishes all its listings |
| `availability_within_quantity` | `units_open + units_held + units_booked ≤ listing_units.total_quantity` |
| `listing_units_quantity_covers_commitments` | A room count cannot drop below rooms already held or booked; open rooms above it are trimmed |

Apply order: `pnpm db:push` (dev), then `pnpm db:constraints`, which runs every
`drizzle/sql/NNNN_*.sql` file in order.

## Lifecycles

**Vendor** (`src/lib/partners/vendor.ts`):

```
PENDING → UNDER_REVIEW → VERIFIED → APPROVED
PENDING / UNDER_REVIEW → REJECTED → UNDER_REVIEW
VERIFIED / APPROVED → SUSPENDED → VERIFIED | REJECTED
```

Reviewing a vendor's property promotes the vendor, but only forward and never
out of `SUSPENDED`. The old rule copied the property's status onto the
partner, so a second listing entering review would have dragged a verified
vendor back to "under review".

**Listing**: unchanged (`src/lib/partners/lifecycle.ts`). A reviewer makes
every review move. The partner may only publish an `APPROVED` or `UNPUBLISHED`
listing, or unpublish a `PUBLISHED` one, and only while the vendor is verified.

Every decision records reviewer, timestamp and note, and writes an audit row.
Repeating a decision the record already holds changes nothing and writes
nothing.

## Routes

| Route | Who | What |
|---|---|---|
| `/partner` | anyone | programme page (unchanged) |
| `/partner/apply` | anyone | onboarding form; now also asks for a registration reference |
| `/partner/dashboard` | partner | overview: organisation status, listing status, rooms and calendar coverage, referrals, terms |
| `/partner/verification` | partner | review steps, latest decision, registration, document upload, decision history |
| `/partner/listings` | partner | listings; new listings only for a verified vendor |
| `/partner/listings/new` | verified partner | listing form; the listing enters review |
| `/partner/listings/[listingId]` | owner | status and publish control, verified facts (read-only), details, room types |
| `/partner/calendar?unit=&month=` | partner | month grid per room type; open or close a date range |
| `/admin/partners/[propertyId]` | reviewer allowlist | adds the organisation panel: vendor status, signed document links, rooms, decision controls |

Signed-out visitors are redirected to sign-in. A session that has not proved
its inbox is asked for a one-time code. A signed-in person with no
partnership request sees the empty state. A listing or room-type id belonging
to another partner answers 404 on pages and "not yours" from actions: the
query itself is scoped to the session's partner (`src/lib/partners/access.ts`,
`src/db/queries/partner-inventory.ts`, `src/lib/partners/inventory.ts`).

## Documents

Business documents only (registration or trade licence, proof of right to
operate, GST certificate). They are stored in the private `vendor-docs`
bucket under the vendor's id with a random name, and their type is checked
against the file's first bytes, with a 4 MB limit. Reviewers open them through
signed links that expire in five minutes. No personal identity document is
requested.

## Language

The workspace takes its words from `src/lib/i18n/partner-messages.ts`, where
English is complete and Hindi covers the frame and statuses; every other key
falls back to English. The language is taken from the browser's
`Accept-Language`. The review console remains English.

## Tests

`pnpm qa:partners` (see its header for the environment) adds:

- **D2** — vendor lifecycle, promotion rules, calendar arithmetic, schemas, and code guarantees: session scoping, audit coverage, triggers present, no hard-coded sentences, and no public reader of rooms or availability.
- **G** — a live flow on synthetic rows marked "(QA synthetic)":
  - Unverified vendor: cannot add or publish listings; the database refuses the publish too.
  - A reviewer verifies the vendor, with the audit and idempotency checked.
  - The verified vendor creates a listing, rooms and calendar dates, which persist and respect the ceiling.
  - Every page fits 375, 390, 768 and 1440 px, and the keyboard focus ring is visible.
  - Documents are private and typed by content.
  - Partner B's forged ids change nothing.
  - A signed-in traveller reaches no workspace.
  - Partner publish shows the listing publicly; suspension takes it down.

Everything is removed afterwards.

## Not in Phase 1

- **Prices and booking.** Added in Phase 2 (`docs/booking.md`): nightly rates per room type, date rates and closed dates in the calendar, and public rooms for travellers who choose dates.
- **Listing photographs.** No upload path exists yet; partner photographs need a licence statement and moderation before they can appear.
- **Other vendor types.** Taxi, guide and experience operators share the vendor, unit and calendar model, but onboarding asks only for stays.
- **Per-document review.** Reviewers see documents but record decisions for the organisation, not for each file.
- **Rate limiting.** The per-partner write quota is in memory and per process, as elsewhere (`docs/accounts.md`).
