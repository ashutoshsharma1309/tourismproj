# Architecture

Darshan — tourism supply-side OS + traveller marketplace.
Target: one Next.js 15 app, one Postgres database, three route-group surfaces.

---

## 1. Why the v1 architecture broke

v1 was a content site whose content lived in code. Fifteen monasteries were fifteen well-written modules and a set of route files. That is a perfectly reasonable way to ship an archive, and it is why the site looks good.

It breaks the moment you add the sixteenth thing, and it breaks catastrophically when you add a second *kind* of thing — a hotel, a taxi, a booking — because there is no shared identity for "a place" that both an essay and a room rate can hang off.

The reconstruction has one idea behind it:

> **Everything a user sees is a projection of a `Destination`.**
> Content, inventory, itineraries, permits and analytics are all scoped to a destination. Adding a destination is a row, not a release.

---

## 2. System shape

```
                        ┌─────────────────────────────┐
   Traveller  ─────────▶│                             │
                        │   Next.js 15 App Router     │
   Vendor     ─────────▶│   (RSC + server actions)    │◀──── Razorpay webhook
                        │   Vercel · bom1             │
   Tourism    ─────────▶│                             │◀──── Vercel Cron
   Department            └──────────────┬──────────────┘
                                        │
              ┌──────────────┬──────────┼──────────┬──────────────┐
              ▼              ▼          ▼          ▼              ▼
        Supabase        Supabase    Razorpay   MapTiler      OpenRouter
        Postgres        Storage      Route      tiles         (planner)
        (Drizzle)      (docs, img)  (split
                                     payouts)
```

Three route groups, one runtime, one auth session, one database:

- `(explore)` + `(book)` + `(plan)` — public, mostly Server Components, aggressively cached.
- `(partner)` — authenticated vendor SaaS, uncached, role `VENDOR_OWNER` / `VENDOR_STAFF`.
- `(console)` — authenticated govt console, role `GOV_OFFICER`.

---

## 3. Data model

Drizzle schema, split across four files under `src/db/schema/`. Column names are `snake_case` in Postgres; the TypeScript identifiers below are what you use in code.

### 3.1 Identity — `schema/identity.ts`

```ts
users
  id            uuid pk
  phone         text unique            // primary identifier in India
  email         text
  fullName      text
  locale        text default 'en'
  role          enum('TRAVELLER','VENDOR_OWNER','VENDOR_STAFF','GOV_OFFICER','ADMIN')
  createdAt     timestamptz

vendors
  id                 uuid pk
  ownerUserId        uuid → users.id
  type               enum('STAY','TRANSPORT','GUIDE','EXPERIENCE')
  businessName       text
  slug               text unique
  destinationId      uuid → destinations.id     // home base
  about              text
  contactPhone       text
  verificationStatus enum('DRAFT','SUBMITTED','VERIFIED','REJECTED','SUSPENDED')
  govtRegNo          text          // state tourism dept registration
  gstin              text
  panLast4           text          // never store the full PAN
  razorpayAccountId  text          // Route linked account
  commissionBps      int  default 500   // 5.00% — per-vendor override
  planTier           enum('FREE','GROWTH','PRO') default 'FREE'
  ratingAvg          numeric(2,1)
  createdAt          timestamptz

vendor_documents
  id          uuid pk
  vendorId    uuid → vendors.id
  kind        enum('GOVT_REG','GST','PAN','PROPERTY_PROOF','ID_PROOF','PHOTO')
  fileUrl     text
  status      enum('PENDING','APPROVED','REJECTED')
  reviewerId  uuid → users.id
  reviewNote  text
  reviewedAt  timestamptz
```

### 3.2 Content — `schema/content.ts`

This is where v1's archive lands.

```ts
destinations
  id             uuid pk
  slug           text unique
  name           text
  nameLocal      text          // in script — this is the hero, not decoration
  state          text
  region         text
  lat, lng       numeric
  altitudeM      int
  blurb          text
  bestMonths     int[]         // 1..12
  permitRequired boolean
  heroMediaId    uuid → media.id
  isPublished    boolean default false

sites                          // monastery, lake, viewpoint, trailhead, market
  id             uuid pk
  destinationId  uuid → destinations.id
  slug           text
  name           text
  category       enum('MONASTERY','LAKE','VIEWPOINT','TREK','MUSEUM','MARKET','SACRED_SITE')
  lat, lng       numeric
  summary        text
  body           text          // markdown
  foundedYear    int
  lineage        text          // Nyingma / Karma Kagyu / …
  visitMinutes   int           // used by the planner
  entryFeePaise  bigint
  openingHours   jsonb
  sourceRefs     jsonb[]       // { label, url, accessedAt } — REQUIRED, non-empty
  isPublished    boolean
  UNIQUE(destinationId, slug)

stories
  id             uuid pk
  destinationId  uuid → destinations.id
  siteId         uuid → sites.id  nullable
  slug           text unique
  title, dek     text
  body           text
  readMinutes    int
  communities    text[]        // 'Bhutia','Lepcha','Limbu'
  sourceRefs     jsonb[]
  publishedAt    timestamptz

media
  id          uuid pk
  ownerType   enum('DESTINATION','SITE','STORY','LISTING','VENDOR')
  ownerId     uuid
  url         text
  width, height int
  alt         text            // required
  credit      text            // required for archive images
  licence     text            // 'CC BY-SA 4.0' etc
  sourceUrl   text
  isFeatured  boolean
  sortOrder   int

audio_guides
  id          uuid pk
  siteId      uuid → sites.id
  locale      text
  url         text
  durationS   int
  transcript  text

translations                   // content i18n; UI chrome lives in messages/*.json
  id          uuid pk
  entityType  enum('DESTINATION','SITE','STORY')
  entityId    uuid
  locale      text
  field       text            // 'name' | 'summary' | 'body' | …
  value       text
  UNIQUE(entityType, entityId, locale, field)
```

### 3.3 Commerce — `schema/commerce.ts`

```ts
listings
  id                 uuid pk
  vendorId           uuid → vendors.id
  destinationId      uuid → destinations.id
  type               enum('STAY','TRANSPORT','GUIDE','EXPERIENCE')
  title, slug        text
  description        text
  lat, lng           numeric
  amenities          text[]
  basePricePaise     bigint
  maxGuests          int
  cancellationPolicy enum('FLEXIBLE','MODERATE','STRICT')
  status             enum('DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','DELISTED')
  ratingAvg          numeric(2,1)
  ratingCount        int
  CHECK: status='ACTIVE' only permitted when the owning vendor is VERIFIED

listing_units                  // room type · vehicle · guide slot · batch
  id            uuid pk
  listingId     uuid → listings.id
  name          text           // "Deluxe double", "Innova 6-seater", "Morning batch"
  capacity      int
  totalQuantity int

availability                   // ★ the booking engine
  id                 uuid pk
  listingUnitId      uuid → listing_units.id
  date               date
  unitsOpen          int
  unitsHeld          int default 0
  unitsBooked        int default 0
  pricePaiseOverride bigint nullable
  UNIQUE(listingUnitId, date)
  CHECK (unitsOpen >= 0)

bookings
  id             uuid pk
  code           text unique        // "DRS-7K4QX2" — what the user quotes
  userId         uuid → users.id
  status         enum('PENDING_PAYMENT','CONFIRMED','CANCELLED','EXPIRED','COMPLETED','REFUNDED')
  totalPaise     bigint
  guestCount     int
  contactPhone   text
  holdExpiresAt  timestamptz
  createdAt      timestamptz

booking_items
  id                uuid pk
  bookingId         uuid → bookings.id
  listingId         uuid → listings.id
  listingUnitId     uuid → listing_units.id
  vendorId          uuid → vendors.id
  startDate, endDate date
  qty               int
  unitPricePaise    bigint
  subtotalPaise     bigint
  platformFeePaise  bigint
  vendorPayoutPaise bigint
  status            enum('HELD','CONFIRMED','CANCELLED','COMPLETED')

payments
  id               uuid pk
  bookingId        uuid → bookings.id
  gateway          text default 'razorpay'
  gatewayOrderId   text unique
  gatewayPaymentId text unique
  amountPaise      bigint
  status           enum('CREATED','AUTHORIZED','CAPTURED','FAILED','REFUNDED')
  method           text
  raw              jsonb
  capturedAt       timestamptz

payouts
  id             uuid pk
  vendorId       uuid → vendors.id
  bookingItemId  uuid → booking_items.id
  amountPaise    bigint
  status         enum('PENDING','PROCESSING','SETTLED','FAILED')
  transferId     text
  settledAt      timestamptz

reviews
  id             uuid pk
  bookingItemId  uuid → booking_items.id unique   // no review without a stay
  listingId      uuid → listings.id
  userId         uuid → users.id
  rating         int CHECK (rating BETWEEN 1 AND 5)
  body           text
  status         enum('PUBLISHED','FLAGGED','REMOVED')
```

### 3.4 Trip + ops — `schema/trip.ts`, `schema/ops.ts`

```ts
trips
  id             uuid pk
  userId         uuid → users.id
  title          text
  destinationIds uuid[]
  startDate      date
  days           int
  partySize      int
  interests      text[]      // 'heritage','trek','food','photography','festival'
  pace           enum('EASY','BALANCED','PACKED')
  budgetTier     enum('SHOESTRING','MID','PREMIUM')
  status         enum('DRAFT','PLANNED','BOOKED','COMPLETED')

trip_days
  id                uuid pk
  tripId            uuid → trips.id
  dayIndex          int
  date              date
  baseDestinationId uuid → destinations.id

trip_stops
  id            uuid pk
  tripDayId     uuid → trip_days.id
  orderIndex    int
  kind          enum('SITE','STAY','TRANSFER','MEAL','EXPERIENCE')
  siteId        uuid → sites.id       nullable
  listingId     uuid → listings.id    nullable
  bookingItemId uuid → booking_items.id nullable   // ← makes the plan bookable
  startTime     time
  durationMin   int
  note          text
  CHECK: exactly one of siteId / listingId is non-null

permits
  id                 uuid pk
  destinationId      uuid → destinations.id
  type               enum('ILP','PAP','RAP','TREK')     // Inner Line / Protected Area
  appliesTo          enum('INDIAN','FOREIGN','ALL')
  requiredDocs       text[]
  processingHours    int
  feePaise           bigint
  issuerUrl          text
  notes              text

permit_applications
  id         uuid pk
  tripId     uuid → trips.id
  userId     uuid → users.id
  permitId   uuid → permits.id
  status     enum('DRAFT','SUBMITTED','APPROVED','REJECTED')
  docUrls    text[]
  refNo      text

advisories                     // road closed, festival crowd, weather
  id            uuid pk
  destinationId uuid → destinations.id
  severity      enum('INFO','WARNING','CRITICAL')
  title, body   text
  startsAt, endsAt timestamptz
  source        text

audit_logs
  id         uuid pk
  actorId    uuid → users.id
  action     text
  entityType text
  entityId   uuid
  before, after jsonb
  at         timestamptz
```

### 3.5 Indexes that matter

```sql
CREATE INDEX ON sites (destination_id) WHERE is_published;
CREATE INDEX ON listings (destination_id, type, status);
CREATE UNIQUE INDEX ON availability (listing_unit_id, date);
CREATE INDEX ON availability (date) WHERE units_open > 0;
CREATE INDEX ON booking_items (vendor_id, start_date);
CREATE INDEX ON bookings (status, hold_expires_at) WHERE status = 'PENDING_PAYMENT';
```

---

## 4. Core flows

### 4.1 Booking — hold, pay, confirm

The single most important piece of engineering in the project. Get this right and the demo is credible; get it wrong and a judge will find the double-booking bug in ninety seconds.

```
User picks dates + units
        │
        ▼
  createHold()  ── BEGIN TRANSACTION
        │         SELECT * FROM availability
        │           WHERE listing_unit_id = $1 AND date BETWEEN $2 AND $3
        │           FOR UPDATE                       ← row lock, blocks the racer
        │         assert every date has units_open >= qty
        │         UPDATE availability
        │           SET units_open = units_open - qty,
        │               units_held = units_held + qty
        │         INSERT bookings (status='PENDING_PAYMENT',
        │                          hold_expires_at = now() + interval '10 min')
        │         INSERT booking_items (status='HELD', fee split computed here)
        │        COMMIT
        ▼
  Razorpay order created for booking.totalPaise
        │
        ├──────── user pays ────────▶ Razorpay
        │                                 │
        │                          webhook: payment.captured
        │                                 ▼
        │                        verify HMAC signature
        │                        upsert payments ON CONFLICT (gateway_payment_id)
        │                        if booking.status = 'PENDING_PAYMENT':
        │                            availability: units_held -= qty, units_booked += qty
        │                            booking → CONFIRMED, items → CONFIRMED
        │                            payouts row per booking_item (PENDING)
        │                            audit_log
        │
        └──── user abandons ────▶ cron /api/cron/release-holds (every 5 min)
                                       for bookings PENDING_PAYMENT
                                         AND hold_expires_at < now():
                                       units_open += qty, units_held -= qty
                                       booking → EXPIRED
```

**Rules.**
- The webhook is the only thing that writes `CONFIRMED`. The browser redirect page polls `/booking/[code]` and shows a pending state until it flips.
- The webhook must be idempotent — Razorpay retries. Key on `gateway_payment_id`.
- Fee split is computed at hold time and frozen on the `booking_item`, so a later change to `vendor.commissionBps` never rewrites history.

### 4.2 Fee split

```
subtotalPaise      = unitPricePaise × qty × nights
platformFeePaise   = floor(subtotal × vendor.commissionBps / 10000)
vendorPayoutPaise  = subtotal - platformFeePaise
```

Razorpay Route transfers `vendorPayoutPaise` to the vendor's linked account on capture. Platform keeps the rest. Displayed to the vendor, itemised, in the partner dashboard — transparency is a selling point against OTA opacity.

### 4.3 AI itinerary planner

The planner is the demo showstopper, and it is also the easiest thing to make untrustworthy. The rule: **the model arranges, it does not invent.**

```
1. Intake form → trips row
     destinations, days, partySize, interests, pace, budgetTier

2. Server queries a CANDIDATE SET from Postgres:
     sites      WHERE destination_id = ANY(...) AND is_published
                ORDER BY relevance to interests   LIMIT 40
     listings   WHERE destination_id = ANY(...) AND status='ACTIVE'
                AND price within budgetTier       LIMIT 30
     permits, advisories for those destinations

3. Prompt the model with:
     - the candidate set as compact JSON, each item with a stable id
     - travel-time matrix between candidate coordinates (haversine × road factor 1.6)
     - pace rules: EASY ≤ 3 stops/day, BALANCED ≤ 5, PACKED ≤ 7

4. Structured output, Zod-enforced:
     z.object({ days: z.array(z.object({
       dayIndex: z.number(),
       stops: z.array(z.object({
         kind: z.enum(['SITE','STAY','TRANSFER','MEAL','EXPERIENCE']),
         refId: z.string(),            // MUST be an id from the candidate set
         startTime: z.string(),
         durationMin: z.number(),
         note: z.string().max(160),
       })),
     })) })

5. Validate every refId against the candidate set.
   Any hallucinated id → reject, retry once, then fall back to the
   deterministic greedy nearest-neighbour planner in lib/ai/fallback.ts.

6. Persist trip_days + trip_stops.

7. Render: itinerary on the left, the SAME MapLibre instance on the right,
   and a "Book this trip" button that turns every stop with a listingId
   into booking_items in one cart.
```

That last step is the whole pitch. Every other tourism project at the hackathon will produce an itinerary as *text*. This one produces an itinerary that is a **cart**.

### 4.4 Vendor onboarding

```
Sign up (phone OTP)
  → business details        vendors row, status DRAFT
  → upload documents        vendor_documents (GOVT_REG required)
  → Razorpay Route linked account created
  → submit                  status SUBMITTED
  → govt console reviews    APPROVED per document → vendor VERIFIED
  → listings may go ACTIVE
```

Time-to-first-listing is the metric that matters. Target under 8 minutes. A homestay owner in Pelling with a mid-range Android phone must be able to finish this.

### 4.5 Govt console analytics

Not vanity charts. Three questions a tourism secretary actually asks:

1. **Where is the money staying?** `SUM(vendor_payout_paise)` by destination and vendor type, versus what the same booking volume would have leaked to an out-of-state OTA. This is the "revenue retention" number and it is the strongest slide in the deck.
2. **Where is the pressure?** Bookings and confirmed arrivals per destination per day, against a configurable carrying capacity, so overtourism shows up before it happens rather than after.
3. **Who is real?** Verification queue, plus the count of unverified operators still transacting offline — the digitisation gap, quantified.

---

## 5. Caching and performance

| Surface | Strategy |
|---|---|
| Destination, site, story pages | Static with `revalidate: 3600`, tagged `destination:{slug}` |
| Search results | Dynamic, `revalidate: 60` on filter combinations |
| Listing detail | Static shell, availability fetched client-side |
| Availability calendar | Never cached |
| Partner + console | `dynamic = 'force-dynamic'`, no cache |

Images: `next/image` with AVIF, the destination hero gets `priority`, everything else lazy. Map: dynamic import, no SSR, loaded on interaction below 768px.

Budget: LCP under 2.0s on 4G, first load JS under 180kB for public routes.

---

## 6. Security

- **RLS on every Supabase table.** A vendor reads only rows where `vendor_id` resolves to their own vendor. Do not rely on the app layer alone.
- **Service role key** is used only in `src/db` and `src/lib/payments`, never imported into a client bundle. Add a lint rule.
- **Webhook** verifies the Razorpay HMAC before touching the database. Reject on mismatch, log, return 200 so it stops retrying a forged payload.
- **Vendor documents** in a private Storage bucket, served via short-lived signed URLs, never public.
- **PII:** store the last four of the PAN only. Phone numbers are masked in the console for non-admin officers.
- **Rate limits** on OTP send, booking hold creation and planner generation.
- **Audit log** on every verification decision, refund and role change.

---

## 7. Internationalisation

- UI chrome: `next-intl`, `messages/{locale}.json`, locale in a cookie rather than a URL segment so cached routes stay shared.
- Content: `translations` table, resolved at query time with a fallback chain `requested → en → source`.
- Ship day one: `en`, `hi`, `ne`, `bn`. The existing audio guides already cover twelve — expose the full list on site pages.
- Devanagari and Bengali fonts load per locale, not globally.

---

## 8. Offline (PWA)

Hills have no signal. This is not a checkbox feature here, it is a genuine differentiator that a judge from the region will immediately recognise.

- Service worker precaches: the user's active trip, its permits, its destination pages, and an offline map region.
- IndexedDB stores the trip payload; the itinerary page reads from it when `navigator.onLine` is false.
- Bookings made offline are queued and replayed via Background Sync. The UI is honest about it: "Saved. This will book when you're back online."

---

## 9. Business model

| Tier | Price | Take rate | For |
|---|---|---|---|
| Free | ₹0 | 5% | A single homestay or taxi getting online for the first time |
| Growth | ₹999/mo | 3% | Calendar sync, WhatsApp automation, analytics, priority placement |
| Pro | ₹2,499/mo | 2% | Multi-property, staff roles, API access, custom booking domain |
| Console licence | ₹ annual, per state | — | Tourism department verification + analytics access |

Unit economics to quote if asked: a Pelling homestay doing ₹1.2L GMV a month pays ₹999 + ₹2,400 = ₹3,399 to us, against roughly ₹21,600 at an 18% OTA commission. We are 6× cheaper than the incumbent and the vendor keeps the guest relationship.

---

## 10. Decisions on record

| # | Decision | Why | Alternative rejected |
|---|---|---|---|
| 1 | One `[destination]` route, DB-driven | v1 broke at 15 hardcoded destinations | Per-destination MDX — same failure, slower |
| 2 | Availability as one row per unit-day | Makes locking, pricing overrides and calendars trivial | Date-range rows — overlap maths is where booking bugs live |
| 3 | Razorpay Route | Split payouts are the business model | Manual settlement — unpitchable |
| 4 | Drizzle over Prisma | Faster cold starts, real SQL for the locking query | Prisma — `FOR UPDATE` is awkward |
| 5 | Planner selects from a candidate set | Hallucinated homestays destroy trust instantly | Free-form generation |
| 6 | MapLibre + MapTiler | No billing card, self-hostable tiles | Google Maps |
| 7 | Content and commerce separated | An essay and a room rate have nothing in common but a place | One `Place` god-table |
| 8 | Phone OTP as primary auth | Indian vendors have phones, not inbox habits | Email/password |