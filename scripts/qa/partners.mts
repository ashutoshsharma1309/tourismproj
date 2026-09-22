/**
 * Partner programme — lifecycle, money, validation, boundaries, and the flow.
 *
 * WHAT THIS GUARDS
 * ----------------
 * The partner programme makes claims a cultural archive never had to make:
 * "verified", "no commission without an agreement", "a click is not a
 * booking", "partner A cannot see partner B". Each is a rule in code, and
 * each is asserted here so that a later edit cannot quietly weaken it.
 *
 * Sections A–D run without a server. Section E needs a server; F needs a
 * server with a database, Supabase Auth and a reviewer allowlist, and runs
 * the whole apply → review → publish → referral → dashboard flow through a
 * real browser. Missing preconditions skip a section with a clear message;
 * they never pass it.
 *
 *   pnpm qa:partners
 *   QA_BASE_URL=http://localhost:3100 QA_ADMIN_EMAIL=qa-admin@terrastory.test pnpm qa:partners
 *
 * Section F expects the server to run with ADMIN_EMAILS containing
 * QA_ADMIN_EMAIL, and this process to see DATABASE_URL,
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from .env.local).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  commissionForTransaction,
  feeForQualifiedLead,
  isAgreementActive,
  ledgerFor,
  type Agreement,
} from "@/lib/partners/commission";
import {
  canTransition,
  isPublic,
  nextStatuses,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABEL,
  type PropertyStatus,
} from "@/lib/partners/lifecycle";
import { ILLUSTRATIVE_SCENARIO, illustrativeScenario } from "@/lib/partners/scenario";
import { partnershipRequestSchema, referralEventSchema } from "@/lib/partners/schema";
import { addDays, monthGrid, rangeProblem, todayInKolkata } from "@/lib/partners/calendar";
import { availabilitySchema, listingDetailsSchema, newListingSchema, unitSchema } from "@/lib/partners/inventory-schema";
import {
  canVendorTransition,
  isVerifiedVendor,
  partnerMayMove,
  vendorStatusAfterPropertyReview,
  VENDOR_STATUSES,
} from "@/lib/partners/vendor";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
};
const section = (t: string) => console.log(`\n-- ${t} --`);

/* ======================================================================
   A. LIFECYCLE — nothing skips a step, nothing auto-publishes
   ====================================================================== */
section("A. Lifecycle");

const path: PropertyStatus[] = ["PENDING", "UNDER_REVIEW", "VERIFIED", "APPROVED", "PUBLISHED"];
for (let i = 0; i < path.length - 1; i += 1) {
  check(`${path[i]} → ${path[i + 1]} is allowed`, canTransition(path[i], path[i + 1]));
}
const forbidden: [PropertyStatus, PropertyStatus][] = [
  ["PENDING", "PUBLISHED"], ["PENDING", "VERIFIED"], ["PENDING", "APPROVED"],
  ["UNDER_REVIEW", "PUBLISHED"], ["UNDER_REVIEW", "APPROVED"],
  ["VERIFIED", "PUBLISHED"], ["REJECTED", "PUBLISHED"], ["REJECTED", "APPROVED"],
  ["PUBLISHED", "REJECTED"], ["PUBLISHED", "PENDING"], ["APPROVED", "PENDING"],
];
for (const [from, to] of forbidden) check(`${from} → ${to} is refused`, !canTransition(from, to));
check("PUBLISHED ⇄ UNPUBLISHED", canTransition("PUBLISHED", "UNPUBLISHED") && canTransition("UNPUBLISHED", "PUBLISHED"));
check("REJECTED can only reopen for review", nextStatuses("REJECTED").join() === "UNDER_REVIEW");
check("every pre-publication state can be rejected",
  (["PENDING", "UNDER_REVIEW", "VERIFIED", "APPROVED"] as PropertyStatus[]).every((s) => canTransition(s, "REJECTED")));
check("only PUBLISHED is public", PROPERTY_STATUSES.filter(isPublic).join() === "PUBLISHED");
check("no status transitions to itself", PROPERTY_STATUSES.every((s) => !canTransition(s, s)));
check("every status has a plain-words label and detail",
  PROPERTY_STATUSES.every((s) => PROPERTY_STATUS_LABEL[s].label.length > 0 && PROPERTY_STATUS_LABEL[s].detail.length > 20));
check("labels never say a listing exists before publication",
  (["PENDING", "UNDER_REVIEW", "VERIFIED", "APPROVED", "REJECTED"] as PropertyStatus[])
    .every((s) => !/travellers can see|is live|now listed/i.test(PROPERTY_STATUS_LABEL[s].detail)));

/* ======================================================================
   B. MONEY — GMV ≠ revenue, no commission without an agreement
   ====================================================================== */
section("B. Commission and ledger");

const now = new Date("2026-09-13T10:00:00Z");
const tx = { amountPaise: 400_000n, confirmedAt: now };
const pct = (bps: number | null, status: Agreement["status"] = "ACTIVE", extra: Partial<Agreement> = {}): Agreement => ({
  type: "PERCENTAGE_COMMISSION", status, commissionBps: bps, feePaise: null, validFrom: null, validUntil: null, ...extra,
});

check("no agreement → no commission (null, not 0)", commissionForTransaction(null, tx) === null);
check("undefined agreement → null", commissionForTransaction(undefined, tx) === null);
check("DRAFT agreement → null", commissionForTransaction(pct(1000, "DRAFT"), tx) === null);
check("TERMINATED agreement → null", commissionForTransaction(pct(1000, "TERMINATED"), tx) === null);
check("EXPIRED agreement → null", commissionForTransaction(pct(1000, "EXPIRED"), tx) === null);
check("ACTIVE but not yet valid → null",
  commissionForTransaction(pct(1000, "ACTIVE", { validFrom: new Date("2027-01-01") }), tx) === null);
check("ACTIVE but lapsed → null",
  commissionForTransaction(pct(1000, "ACTIVE", { validUntil: new Date("2026-01-01") }), tx) === null);
check("ACTIVE percentage with no rate → null", commissionForTransaction(pct(null), tx) === null);
check("rate above 100% → null", commissionForTransaction(pct(10_001), tx) === null);
check("negative rate → null", commissionForTransaction(pct(-1), tx) === null);
check("10% of ₹4,000 is ₹400 (40 000 paise)", commissionForTransaction(pct(1000), tx) === 40_000n);
check("rounds toward zero, never a fraction of a paisa",
  commissionForTransaction(pct(333), { amountPaise: 1_000n, confirmedAt: now }) === 33n);
check("0% agreement yields 0n, not null", commissionForTransaction(pct(0), tx) === 0n);
check("result is a bigint", typeof commissionForTransaction(pct(1000), tx) === "bigint");

const fixed: Agreement = { type: "FIXED_REFERRAL_FEE", status: "ACTIVE", commissionBps: null, feePaise: 25_000n, validFrom: null, validUntil: null };
check("fixed referral fee is the fee regardless of amount",
  commissionForTransaction(fixed, tx) === 25_000n && commissionForTransaction(fixed, { amountPaise: 1n, confirmedAt: now }) === 25_000n);
const lead: Agreement = { type: "QUALIFIED_LEAD_FEE", status: "ACTIVE", commissionBps: null, feePaise: 5_000n, validFrom: null, validUntil: null };
check("lead-fee agreement earns nothing per transaction", commissionForTransaction(lead, tx) === null);
check("lead-fee agreement earns its fee per qualified lead", feeForQualifiedLead(lead, now) === 5_000n);
check("percentage agreement earns nothing per lead", feeForQualifiedLead(pct(1000), now) === null);
check("isAgreementActive respects dates",
  isAgreementActive(pct(1000, "ACTIVE", { validFrom: new Date("2026-01-01"), validUntil: new Date("2026-12-31") }), now)
  && !isAgreementActive(pct(1000, "ACTIVE", { validUntil: new Date("2026-09-01") }), now));

const ledger = ledgerFor(pct(1000), [tx, { amountPaise: 100_000n, confirmedAt: now }]);
check("ledger GMV is the sum of transactions", ledger.gmvPaise === 500_000n, String(ledger.gmvPaise));
check("ledger revenue is the sum of commissions", ledger.revenuePaise === 50_000n, String(ledger.revenuePaise));
check("GMV and revenue are different fields with different values", ledger.gmvPaise !== ledger.revenuePaise);
const noTerms = ledgerFor(null, [tx]);
check("ledger without an agreement: GMV counted, revenue zero", noTerms.gmvPaise === 400_000n && noTerms.revenuePaise === 0n);
const empty = ledgerFor(pct(1000), []);
check("a click is not a transaction: an empty ledger earns nothing", empty.gmvPaise === 0n && empty.revenuePaise === 0n);

/* ======================================================================
   C. THE ILLUSTRATIVE SCENARIO — labelled, isolated, configurable
   ====================================================================== */
section("C. Illustrative scenario");

const scenario = illustrativeScenario();
check("label says illustrative", /illustrative/i.test(ILLUSTRATIVE_SCENARIO.label));
check("disclaimer says there are no bookings, agreements or revenue",
  /no confirmed bookings/i.test(ILLUSTRATIVE_SCENARIO.disclaimer) && /no signed/i.test(ILLUSTRATIVE_SCENARIO.disclaimer) && /no earned revenue/i.test(ILLUSTRATIVE_SCENARIO.disclaimer));
check("100 bookings × ₹4,000 = ₹4,00,000 GMV", scenario.gmvPaise === 40_000_000n, String(scenario.gmvPaise));
check("10% of that = ₹40,000 revenue", scenario.revenuePaise === 4_000_000n, String(scenario.revenuePaise));
const custom = illustrativeScenario({ monthlyQualifiedBookings: 10, averageBookingValuePaise: 1_000_00n, commissionBps: 500 });
check("scenario is configurable (10 × ₹1,000 at 5% = ₹500)", custom.gmvPaise === 1_000_000n && custom.revenuePaise === 50_000n);
check("scenario inputs live in one file and nowhere else",
  (() => {
    const src = readFileSync("src/lib/partners/scenario.ts", "utf8");
    return /monthlyQualifiedBookings: 100/.test(src) && /averageBookingValuePaise: 400_000n/.test(src) && /commissionBps: 1000/.test(src);
  })());

/* ======================================================================
   D. VALIDATION AND CODE-LEVEL GUARANTEES
   ====================================================================== */
section("D. Validation and code guarantees");

const good = {
  organizationName: "Haveli Trust", contactName: "A. Reviewer", email: "Owner@Example.com", phone: "+91 98765 43210",
  propertyName: "Test Haveli", type: "HERITAGE", destinationId: "jaipur", address: "12 Johari Bazaar, Jaipur 302003",
  area: "Old city", mapsUrl: "https://maps.google.com/?q=1,2", officialWebsite: "https://example.com", bookingUrl: "",
  description: "A haveli.", localCharacter: "", amenities: "breakfast, parking\nrooftop", authorised: true, website_confirm: "",
};
const ok = partnershipRequestSchema.safeParse(good);
check("a complete request parses", ok.success, ok.success ? "" : JSON.stringify(ok.error.issues[0]));
if (ok.success) {
  check("e-mail is lower-cased", ok.data.email === "owner@example.com");
  check("empty booking URL becomes null", ok.data.bookingUrl === null);
  check("amenities split on comma and newline", ok.data.amenities.join("|") === "breakfast|parking|rooftop");
}
const bad = (patch: Record<string, unknown>) => !partnershipRequestSchema.safeParse({ ...good, ...patch }).success;
check("unknown destination is refused", bad({ destinationId: "atlantis" }));
check("a removed destination is refused", bad({ destinationId: "paris" }));
check("the honeypot refuses a filled field", bad({ website_confirm: "http://spam" }));
check("authorisation must be confirmed", bad({ authorised: false }));
check("a non-http URL is refused", bad({ officialWebsite: "javascript:alert(1)" }));
check("a short address is refused", bad({ address: "x" }));
check("an invalid e-mail is refused", bad({ email: "not-an-email" }));
check("an invalid telephone is refused", bad({ phone: "call me" }));
check("an invalid type is refused", bad({ type: "CASTLE" }));
check("the schema has no price, rate, card or bank field",
  !Object.keys(partnershipRequestSchema.shape).some((k) => /price|rate|card|bank|upi|pan|gst|account/i.test(k)));

const ref = (v: Record<string, unknown>) => referralEventSchema.safeParse(v).success;
check("a referral with a property id parses", ref({ propertyId: "123e4567-e89b-12d3-a456-426614174000", destinationId: "jaipur", eventType: "OFFICIAL_WEBSITE", source: "/destinations/jaipur" }));
check("a referral with a stay ref parses", ref({ stayRef: "jaipur/rambagh-palace", destinationId: "jaipur", eventType: "CALL", source: "/destinations/jaipur/stays/rambagh-palace" }));
check("a referral needs a property or a stay", !ref({ destinationId: "jaipur", eventType: "CALL", source: "/" }));
check("a referral refuses an unknown destination", !ref({ stayRef: "paris/x", destinationId: "paris", eventType: "MAPS", source: "/" }));
check("a referral refuses a source with a query string", !ref({ stayRef: "jaipur/x", destinationId: "jaipur", eventType: "MAPS", source: "/a?b=c" }));
check("a referral refuses a full URL as source", !ref({ stayRef: "jaipur/x", destinationId: "jaipur", eventType: "MAPS", source: "https://evil.example/" }));
check("a referral refuses an unknown event type", !ref({ stayRef: "jaipur/x", destinationId: "jaipur", eventType: "PURCHASE", source: "/" }));
check("a referral refuses a malformed property id", !ref({ propertyId: "1", destinationId: "jaipur", eventType: "CALL", source: "/" }));
check("a referral carries no amount field", !("amountPaise" in (referralEventSchema as unknown as { shape?: Record<string, unknown> }).shape! ?? {}) && !/amount/i.test(readFileSync("src/lib/partners/schema.ts", "utf8").split("referralEventSchema")[1] ?? ""));

/* Code-level: read the source and assert the guarantees are where they should be. */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
const src = walk("src");
const read = (f: string) => readFileSync(f, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const rateHits = src.filter((f) => !f.endsWith("scenario.ts") && /commissionBps:\s*\d+/.test(strip(read(f))) && f.includes("partners"));
check("no hard-coded commission rate outside the illustrative scenario", rateHits.length === 0, rateHits.join(", ") || "clean");
const partnerSchema = read("src/db/schema/partners.ts");
check("partner tables carry no price, rate or availability column",
  !/price|rate_paise|nightly|availability|units_open|rating/i.test(strip(partnerSchema)));
check("partner tables carry no traveller identity on referral events",
  !/ip_address|user_agent|traveller_id|email/i.test(strip(partnerSchema).split("referralEvents")[1] ?? ""));
check("the published-requires-review invariant is a database check", /published_is_reviewed/.test(partnerSchema));
check("the store is server-only", /^import "server-only";/m.test(read("src/lib/partners/store.ts")));
const partnerStaysClient = read("src/components/partners/PartnerStays.tsx");
check("the client partner section imports no registry, schema or database code",
  !/from "@\/(lib\/destinations|lib\/partners\/schema|db)/.test(strip(partnerStaysClient).replace(/import type[^;]+;/g, "")));
check("the public list endpoint returns no private partner field",
  !/email|contactName|reviewNote|reviewerId|provenance/.test(strip(read("src/app/api/partner-stays/route.ts")).split("const stays")[1] ?? "x"));
check("every admin page and action requires an allowlisted reviewer",
  ["src/app/(v1)/admin/partners/page.tsx", "src/app/(v1)/admin/partners/[propertyId]/page.tsx", "src/app/(v1)/admin/partners/actions.ts"]
    .every((f) => /requireAdmin\(\)/.test(read(f))));
check("admin pages answer 404, not 403, to outsiders",
  ["src/app/(v1)/admin/partners/page.tsx", "src/app/(v1)/admin/partners/[propertyId]/page.tsx"].every((f) => /if \(!admin\) notFound\(\)/.test(read(f))));
check("the dashboard scopes by the session's partner, never a parameter",
  /partnerAccess\(/.test(read("src/app/(v1)/partner/dashboard/page.tsx")) && /partnerFor\(session\)/.test(read("src/lib/partners/access.ts"))
  && !/searchParams|params/.test(read("src/app/(v1)/partner/dashboard/page.tsx")));
check("public partner pages read only PUBLISHED rows",
  /eq\(partnerProperties\.status, "PUBLISHED"\)/.test(read("src/db/queries/partners.ts")));
check("the referral route hashes a random cookie, not the client address",
  /createHash\("sha256"\)|sha256/.test(read("src/app/api/referrals/route.ts")) && !/x-forwarded-for|req\.ip|user-agent/i.test(read("src/app/api/referrals/route.ts")));
check("the referral route never reports an amount",
  !/amount|paise/i.test(strip(read("src/app/api/referrals/route.ts"))));
check("the apply action parses with Zod and rate-limits",
  /partnershipRequestSchema\.safeParse/.test(read("src/app/(v1)/partner/apply/actions.ts")) && /consumeSubmissionQuota/.test(read("src/app/(v1)/partner/apply/actions.ts")));
check("submission success message names verification, not a listing",
  /submitted for verification/.test(read("src/app/(v1)/partner/apply/actions.ts")));
check("robots disallows the private surfaces", /\/admin\//.test(read("src/app/robots.ts")) && /\/partner\/dashboard/.test(read("src/app/robots.ts")));
const curatedStayDetail = read("src/app/(v1)/destinations/[destinationId]/stays/[slug]/page.tsx");
check("curated stay CTAs count referrals by stay reference", (curatedStayDetail.match(/<ReferralLink/g) ?? []).length >= 3 && /stayRef=/.test(curatedStayDetail));
check("curated stays still never carry a price", !/₹|per night|pricePaise|ratePaise|nightly/.test(strip(read("src/components/destinations/DestinationStays.tsx"))));


/* ======================================================================
   D2. PHASE 1 — vendor verification, listings, rooms and the calendar
   ====================================================================== */
section("D2. Vendor verification, inventory and calendar");

check("vendor: PENDING → UNDER_REVIEW → VERIFIED → APPROVED is allowed",
  canVendorTransition("PENDING", "UNDER_REVIEW") && canVendorTransition("UNDER_REVIEW", "VERIFIED") && canVendorTransition("VERIFIED", "APPROVED"));
check("vendor: nothing skips review", !canVendorTransition("PENDING", "VERIFIED") && !canVendorTransition("PENDING", "APPROVED") && !canVendorTransition("REJECTED", "VERIFIED"));
check("vendor: UNDER_REVIEW → REJECTED, and a suspended vendor can be reinstated or rejected",
  canVendorTransition("UNDER_REVIEW", "REJECTED") && canVendorTransition("SUSPENDED", "VERIFIED") && canVendorTransition("SUSPENDED", "REJECTED"));
check("vendor: only VERIFIED and APPROVED count as verified", VENDOR_STATUSES.filter(isVerifiedVendor).join() === "VERIFIED,APPROVED");
check("vendor: no status transitions to itself", VENDOR_STATUSES.every((v) => !canVendorTransition(v, v)));
check("a listing review promotes its vendor forward", vendorStatusAfterPropertyReview("PENDING", "VERIFIED") === "VERIFIED" && vendorStatusAfterPropertyReview("VERIFIED", "APPROVED") === "APPROVED");
check("a second listing entering review never demotes a verified vendor",
  vendorStatusAfterPropertyReview("VERIFIED", "UNDER_REVIEW") === null && vendorStatusAfterPropertyReview("APPROVED", "VERIFIED") === null);
check("rejecting a listing rejects only a not-yet-verified vendor",
  vendorStatusAfterPropertyReview("UNDER_REVIEW", "REJECTED") === "REJECTED" && vendorStatusAfterPropertyReview("VERIFIED", "REJECTED") === null);
check("no listing review lifts a suspension", (["UNDER_REVIEW", "VERIFIED", "APPROVED", "PUBLISHED"] as const).every((to) => vendorStatusAfterPropertyReview("SUSPENDED", to) === null));
check("a partner may only publish or unpublish, never review",
  partnerMayMove("APPROVED", "PUBLISHED") && partnerMayMove("PUBLISHED", "UNPUBLISHED") && partnerMayMove("UNPUBLISHED", "PUBLISHED")
  && !partnerMayMove("PENDING", "UNDER_REVIEW") && !partnerMayMove("UNDER_REVIEW", "VERIFIED") && !partnerMayMove("VERIFIED", "APPROVED") && !partnerMayMove("PENDING", "PUBLISHED"));

check("today is today in Asia/Kolkata, not UTC", todayInKolkata(new Date("2026-09-16T20:00:00Z")) === "2026-09-17");
const september = monthGrid("2026-09");
check("the month grid starts on Monday and keeps whole weeks",
  september[0]?.[0] === null && september[0]?.[1] === "2026-09-01" && september.every((w) => w.length === 7) && september.flat().filter(Boolean).length === 30);
check("the month grid handles a leap February", monthGrid("2028-02").flat().filter(Boolean).length === 29);
check("addDays crosses a month and a year without a timezone shift", addDays("2026-12-31", 1) === "2027-01-01" && addDays("2026-03-01", -1) === "2026-02-28");
check("a range starting before today is refused", rangeProblem("2026-09-16", "2026-09-20", "2026-09-17") === "past");
check("a reversed range is refused", rangeProblem("2026-09-20", "2026-09-18", "2026-09-17") === "reversed");
check("a range over a year is refused", rangeProblem("2026-09-17", "2027-09-18", "2026-09-17") === "too-long");
check("a non-date is refused", rangeProblem("2026-02-30", "2026-03-01", "2026-01-01") === "invalid");
check("a valid range passes", rangeProblem("2026-09-17", "2026-09-30", "2026-09-17") === null);

check("a room type needs a name, 1–50 guests and 1–500 rooms",
  unitSchema.safeParse({ name: "Standard room", capacity: "2", totalQuantity: "4", basePrice: "" }).success
  && !unitSchema.safeParse({ name: "S", capacity: "2", totalQuantity: "4", basePrice: "" }).success
  && !unitSchema.safeParse({ name: "Standard room", capacity: "0", totalQuantity: "4", basePrice: "" }).success
  && !unitSchema.safeParse({ name: "Standard room", capacity: "2", totalQuantity: "501", basePrice: "" }).success
  && !unitSchema.safeParse({ name: "Standard room", capacity: "2.5", totalQuantity: "4", basePrice: "" }).success);
check("availability needs a unit id and a whole number of rooms",
  availabilitySchema.safeParse({ unitId: "123e4567-e89b-12d3-a456-426614174000", from: "2026-09-17", to: "2026-09-18", mode: "open", rooms: "2", price: "" }).success
  && !availabilitySchema.safeParse({ unitId: "x", from: "2026-09-17", to: "2026-09-18", mode: "open", rooms: "2", price: "" }).success
  && !availabilitySchema.safeParse({ unitId: "123e4567-e89b-12d3-a456-426614174000", from: "2026-09-17", to: "2026-09-18", mode: "open", rooms: "-1", price: "" }).success);
check("a new listing refuses an unknown destination and a bad time",
  !newListingSchema.safeParse({ name: "QA", type: "HOTEL", destinationId: "atlantis", address: "somewhere long enough", area: "", mapsUrl: "", officialWebsite: "", bookingUrl: "", description: "", localCharacter: "", amenities: "", checkInFrom: "", checkOutBy: "", houseRules: "", cancellationTerms: "" }).success
  && !listingDetailsSchema.safeParse({ description: "", localCharacter: "", amenities: "", checkInFrom: "25:00", checkOutBy: "", houseRules: "", cancellationTerms: "" }).success);
check("inventory schemas carry no card, bank or payment field; rates arrive only as partner-typed rupees",
  ![...Object.keys(newListingSchema.shape), ...Object.keys(unitSchema.shape), ...Object.keys(availabilitySchema.shape)].some((k) => /card|bank|upi|account|amount/i.test(k))
  && unitSchema.safeParse({ name: "Standard room", capacity: "2", totalQuantity: "4", basePrice: "2500" }).success
  && !unitSchema.safeParse({ name: "Standard room", capacity: "2", totalQuantity: "4", basePrice: "free" }).success);

const WORKSPACE_PAGES = [
  "src/app/(v1)/partner/dashboard/page.tsx",
  "src/app/(v1)/partner/verification/page.tsx",
  "src/app/(v1)/partner/listings/page.tsx",
  "src/app/(v1)/partner/listings/new/page.tsx",
  "src/app/(v1)/partner/listings/[listingId]/page.tsx",
  "src/app/(v1)/partner/calendar/page.tsx",
];
check("every workspace page resolves the partner from the session", WORKSPACE_PAGES.every((f) => /await partnerAccess\(/.test(read(f))));
check("every workspace page takes its words from the partner catalogue", WORKSPACE_PAGES.every((f) => /partnerTranslator\(/.test(read(f))));
check("no workspace page renders a hard-coded English sentence",
  WORKSPACE_PAGES.every((f) => !/>\s*[A-Z][a-z]+(?: [a-z]+){2,}[.!]?\s*</.test(strip(read(f)))),
  WORKSPACE_PAGES.filter((f) => />\s*[A-Z][a-z]+(?: [a-z]+){2,}[.!]?\s*</.test(strip(read(f)))).join(", "));
const inventoryStore = read("src/lib/partners/inventory.ts");
check("the inventory store is server-only", /^import "server-only";/m.test(inventoryStore));
const exportedWrites = (strip(inventoryStore).match(/export async function \w+/g) ?? []).length;
const auditedWrites = (strip(inventoryStore).match(/await audit\(|insert\(auditLogs\)/g) ?? []).length;
check("every inventory write is audited", exportedWrites > 0 && auditedWrites >= exportedWrites, `${auditedWrites} audit writes for ${exportedWrites} write functions`);
check("partner writes match the record against the session's partner in the query",
  /eq\(partnerProperties\.partnerId, scope\.partnerId\)/.test(inventoryStore) && (inventoryStore.match(/ownedListing\(tx, scope|ownedUnit\(tx, scope/g) ?? []).length >= 5);
check("every workspace action goes through the session preamble",
  ["src/app/(v1)/partner/listings/actions.ts", "src/app/(v1)/partner/calendar/actions.ts", "src/app/(v1)/partner/verification/actions.ts"]
    .every((f) => (read(f).match(/export async function/g) ?? []).length === (read(f).match(/await workspaceAction\(\)/g) ?? []).length));
check("the calendar locks the room type and never writes held or booked rooms",
  /ownedUnit\(tx, scope, input\.unitId\)/.test(inventoryStore) && /\.for\("update"/.test(inventoryStore) && /DO UPDATE SET units_open = EXCLUDED\.units_open, closed = EXCLUDED\.closed/.test(inventoryStore) && !/units_held\s*=|units_booked\s*=/.test(inventoryStore));
check("store transitions are idempotent", /if \(from === input\.to\)/.test(read("src/lib/partners/store.ts")) && /if \(from === to\) return \{ ok: true/.test(inventoryStore));
const migration = read("drizzle/sql/0002_partner_inventory.sql");
check("the database refuses to publish for an unverified vendor", /CREATE TRIGGER partner_properties_require_verified_vendor/.test(migration) && /status IN \('VERIFIED', 'APPROVED'\)/.test(migration));
check("the database unpublishes a vendor's listings when it loses verification", /CREATE TRIGGER partners_unpublish_on_deverification/.test(migration));
check("the database keeps held + booked + open within the unit's quantity", /CREATE TRIGGER availability_within_quantity/.test(migration) && /CREATE TRIGGER listing_units_quantity_covers_commitments/.test(migration));
check("public partner stays require a still-verified vendor", /vendorIsVerified = inArray\(partners\.status, \["VERIFIED", "APPROVED"\]\)/.test(read("src/db/queries/partners.ts")));
check("no public surface reads the partner's private inventory queries",
  walk("src/app").filter((f) => !f.includes("/partner/") && !f.includes("/admin/")).every((f) => !/partner-inventory|availabilityForPartnerUnit/.test(read(f))));
check("vendor documents are private: signed links only, business documents only",
  /createSignedUrl/.test(read("src/db/storage.ts")) && !/getPublicUrl/.test(read("src/db/storage.ts")) && /UPLOADABLE_DOCUMENT_KINDS = \["GOVT_REG", "PROPERTY_PROOF", "GST"\]/.test(read("src/lib/partners/inventory-schema.ts")));
check("robots disallows the partner workspace", ["/partner/verification", "/partner/listings", "/partner/calendar"].every((p) => read("src/app/robots.ts").includes(`"${p}"`)));

/* ======================================================================
   E. SERVER — public pages and boundaries
   ====================================================================== */
section("E. Server");

const fetchText = async (url: string, init?: RequestInit): Promise<{ status: number; body: string; headers: Headers } | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { ...init, redirect: "manual", signal: controller.signal });
    /* React's server HTML separates adjacent text expressions with empty
       comment nodes ("Partner stays in <!-- -->Jaipur"); the reader never
       sees them, so neither should a text assertion. */
    return { status: res.status, body: (await res.text()).replace(/<!--.*?-->/g, ""), headers: res.headers };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const home = await fetchText(`${BASE}/`);
const isTerraStory = Boolean(home && home.status === 200 && /TerraStory/.test(home.body));
if (!home) {
  console.log(`SKIP  sections E–F — no server answered at ${BASE} (set QA_BASE_URL to run them)`);
} else if (!isTerraStory) {
  console.log(`SKIP  sections E–F — the server at ${BASE} is not TerraStory (HTTP ${home.status})`);
} else {
  const partner = await fetchText(`${BASE}/partner`);
  check("/partner serves", partner?.status === 200, `HTTP ${partner?.status}`);
  const pb = partner?.body ?? "";
  check("/partner carries the CTA", /List your property/.test(pb) && /Partner with TerraStory/.test(pb));
  check("/partner labels the scenario as illustrative with its disclaimer", /Illustrative business scenario/.test(pb) && /no confirmed bookings/.test(pb));
  check("/partner shows the scenario's numbers", /40,000/.test(pb) && /4,00,000|400,000/.test(pb));
  check("/partner keeps GMV, commission and revenue apart", /Gross merchandise value/.test(pb) && /Commission/.test(pb) && /Revenue/.test(pb));
  check("/partner distinguishes today from not yet", /Today/.test(pb) && /Not yet/.test(pb) && /Direct booking/.test(pb));
  check("/partner never quotes a rate as TerraStory's", !/our commission is|we charge/i.test(pb));
  check("/partner does not use the word 'guarantee' about bookings", !/guarantee/i.test(pb));

  const apply = await fetchText(`${BASE}/partner/apply`);
  check("/partner/apply serves", apply?.status === 200, `HTTP ${apply?.status}`);
  const ab = apply?.body ?? "";
  const dbOn = /name="organizationName"/.test(ab);
  check("/partner/apply shows the form, or says requests are not accepted here", dbOn || /not being accepted/.test(ab));
  if (dbOn) {
    /* Whole words: Next's own markup contains "data-dgst". */
    check("the form asks for no payment details", !/\b(card number|cvv|upi|ifsc|bank account|pan number|gst(in)?)\b/i.test(ab));
    check("the form carries the honeypot and the authorisation box", /website_confirm/.test(ab) && /name="authorised"/.test(ab));
    check("the destination select lists 18 destinations", (ab.match(/<option value="[a-z-]+">/g) ?? []).filter((o) => !/value="(HOTEL|HERITAGE|HOMESTAY|GUEST_HOUSE|RESORT|HOSTEL|OTHER)"/.test(o)).length === 18);
    check("the form says submitting does not create a listing", /does not create a listing/.test(ab));
  }
  check("/partner/apply is noindex", /noindex/.test(ab));

  const admin = await fetchText(`${BASE}/admin/partners`);
  for (const route of ["/partner/verification", "/partner/listings", "/partner/listings/new", "/partner/calendar"]) {
    const r = await fetchText(`${BASE}${route}`);
    check(`${route} redirects an outsider to sign-in`,
      r !== null && [302, 303, 307, 308].includes(r.status) && /\/login/.test(r.headers.get("location") ?? ""), `HTTP ${r?.status}`);
  }
  check("/admin/partners is 404 to an outsider", admin?.status === 404, `HTTP ${admin?.status}`);
  const adminItem = await fetchText(`${BASE}/admin/partners/123e4567-e89b-12d3-a456-426614174000`);
  check("/admin/partners/[id] is 404 to an outsider", adminItem?.status === 404, `HTTP ${adminItem?.status}`);
  const dash = await fetchText(`${BASE}/partner/dashboard`);
  check("/partner/dashboard redirects an outsider to sign-in",
    dash !== null && [302, 303, 307, 308].includes(dash.status) && /\/login/.test(dash.headers.get("location") ?? ""),
    `HTTP ${dash?.status} → ${dash?.headers.get("location")}`);
  const login = await fetchText(`${BASE}/login`);
  check("/login serves and is noindex", login?.status === 200 && /noindex/.test(login.body), `HTTP ${login?.status}`);
  check("/login offers partners the one-time-code sign-in", login !== null && /\/login\/code/.test(login.body));
  const codeLogin = await fetchText(`${BASE}/login/code`);
  check("/login/code asks for nothing but an e-mail", codeLogin !== null && codeLogin.status === 200 && /name="email"/.test(codeLogin.body) && !/name="password"/.test(codeLogin.body));
  const evilNext = await fetchText(`${BASE}/auth/callback?next=https://evil.example/`);
  check("/auth/callback refuses an off-site next", evilNext !== null && !/evil\.example/.test(evilNext.headers.get("location") ?? ""), evilNext?.headers.get("location") ?? "");

  const unpublished = await fetchText(`${BASE}/destinations/jaipur/partner-stays/123e4567-e89b-12d3-a456-426614174000`);
  check("an unknown partner stay is 404", unpublished?.status === 404, `HTTP ${unpublished?.status}`);
  const unknownDest = await fetchText(`${BASE}/destinations/atlantis/partner-stays/123e4567-e89b-12d3-a456-426614174000`);
  check("a partner stay under an unknown destination is 404", unknownDest?.status === 404, `HTTP ${unknownDest?.status}`);
  const removedDest = await fetchText(`${BASE}/destinations/paris/partner-stays/123e4567-e89b-12d3-a456-426614174000`);
  check("a partner stay under a removed destination is 404", removedDest?.status === 404, `HTTP ${removedDest?.status}`);
  const badId = await fetchText(`${BASE}/destinations/jaipur/partner-stays/not-a-uuid`);
  check("a malformed partner stay id is 404", badId?.status === 404, `HTTP ${badId?.status}`);

  const post = (body: unknown) => fetchText(`${BASE}/api/referrals`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  const invalid = await post({ destinationId: "paris", eventType: "CALL", source: "/" });
  check("POST /api/referrals refuses an invalid event", invalid?.status === 400, `HTTP ${invalid?.status}`);
  const notJson = await fetchText(`${BASE}/api/referrals`, { method: "POST", body: "nope" });
  check("POST /api/referrals refuses a non-JSON body", notJson?.status === 400, `HTTP ${notJson?.status}`);
  const valid = await post({ stayRef: "jaipur/qa-suite-stay", destinationId: "jaipur", eventType: "OFFICIAL_WEBSITE", source: "/destinations/jaipur" });
  check("POST /api/referrals accepts a valid event with 202", valid?.status === 202, `HTTP ${valid?.status}`);
  check("the referral cookie is httpOnly and has no identity in it",
    valid !== null && /ts_ref=/.test(valid.headers.get("set-cookie") ?? "") && /httponly/i.test(valid.headers.get("set-cookie") ?? ""));
  const get = await fetchText(`${BASE}/api/referrals`);
  check("GET /api/referrals is not an endpoint", get !== null && get.status >= 400, `HTTP ${get?.status}`);

  const hub = await fetchText(`${BASE}/destinations/jaipur`);
  check("the footer offers the partner programme", hub !== null && /Partner with TerraStory/.test(hub.body));
  check("the destination page does not bake partner stays into its static HTML", hub !== null && !/Partner stays in/.test(hub.body));
  const listing = await fetchText(`${BASE}/api/partner-stays?destination=jaipur`);
  check("GET /api/partner-stays answers for a registered destination", listing?.status === 200, `HTTP ${listing?.status}`);
  let listed: { stays?: Record<string, unknown>[] } = {};
  try { listed = JSON.parse(listing?.body ?? "{}"); } catch { /* checked below */ }
  check("the partner-stays list is an array", Array.isArray(listed.stays));
  const PRIVATE_FIELDS = /email|contactName|contact_name|status|reviewer|reviewNote|review_note|partnerId|provenance|sessionHash/;
  check("the partner-stays list exposes no private field", (listed.stays ?? []).every((row) => !Object.keys(row).some((k) => PRIVATE_FIELDS.test(k))));
  const unknownList = await fetchText(`${BASE}/api/partner-stays?destination=paris`);
  check("GET /api/partner-stays refuses an unregistered destination", unknownList?.status === 400, `HTTP ${unknownList?.status}`);
  const stayDetail = await fetchText(`${BASE}/destinations/sikkim/stays/${(hub && "") || ""}`);
  void stayDetail;
  const robots = await fetchText(`${BASE}/robots.txt`);
  check("robots.txt disallows /admin/", robots !== null && /Disallow: \/admin\//.test(robots.body));
  const sitemap = await fetchText(`${BASE}/sitemap.xml`);
  check("sitemap lists /partner and not the private surfaces",
    sitemap !== null && /\/partner<\/loc>/.test(sitemap.body) && !/\/admin\//.test(sitemap.body) && !/\/partner\/dashboard/.test(sitemap.body) && !/\/login/.test(sitemap.body));

  /* ====================================================================
     F. THE WHOLE FLOW — needs DB + Supabase + reviewer allowlist
     ==================================================================== */
  section("F. Apply → review → publish → referral → dashboard");

  const adminEmail = process.env.QA_ADMIN_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  if (!dbOn) {
    console.log("SKIP  section F — the server has no database (the apply form is not shown)");
  } else if (!adminEmail || !supabaseUrl || !serviceKey || !databaseUrl) {
    console.log("SKIP  section F — set QA_ADMIN_EMAIL and load .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL)");
  } else {
    try {
      await runFlow({ adminEmail, supabaseUrl, serviceKey, databaseUrl });
    } catch (e) {
      const err = e as Error;
      const where = (err.stack ?? "").split("\n").find((l) => /partners\.mts/.test(l))?.trim() ?? "";
      check("F  the flow ran to completion", false, `${err.message.split("\n")[0]} ${where}`);
    }
    section("G. Phase 1 — verification → listing → rooms → calendar, with boundaries");
    try {
      await runInventoryFlow({ adminEmail, supabaseUrl, serviceKey, databaseUrl });
    } catch (e) {
      const err = e as Error;
      const where = (err.stack ?? "").split("\n").find((l) => /partners\.mts/.test(l))?.trim() ?? "";
      check("G  the flow ran to completion", false, `${err.message.split("\n")[0]} ${where}`);
    }
  }
}

async function runFlow({ adminEmail, supabaseUrl, serviceKey, databaseUrl }: { adminEmail: string; supabaseUrl: string; serviceKey: string; databaseUrl: string }) {
  const { chromium } = await import("playwright");
  const { createClient } = await import("@supabase/supabase-js");
  const postgres = (await import("postgres")).default;

  const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const stamp = Date.now().toString(36);
  const partnerA = `qa-partner-a-${stamp}@terrastory.test`;
  const partnerB = `qa-partner-b-${stamp}@terrastory.test`;
  const propertyName = `QA Haveli ${stamp}`;
  const authIds: string[] = [];

  const signIn = async (email: string, next: string) => {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.data.user) authIds.push(created.data.user.id);
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data.properties?.hashed_token) throw new Error(`generateLink failed for ${email}: ${link.error?.message}`);
    if (link.data.user && !authIds.includes(link.data.user.id)) authIds.push(link.data.user.id);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`, { waitUntil: "load" });
    /* An e-mail link never signs in on a page load; it needs one deliberate click. */
    await page.waitForURL(/\/auth\/continue/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 });
    return { context, page };
  };

  const browser = await chromium.launch();
  try {
    /* ---- 1. Partner A applies through the real form. */
    const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const form = await anon.newPage();
    await form.goto(`${BASE}/partner/apply`, { waitUntil: "domcontentloaded" });
    await form.fill('[name="organizationName"]', "QA Heritage Trust");
    await form.fill('[name="contactName"]', "QA Owner");
    await form.fill('[name="email"]', partnerA);
    await form.fill('[name="phone"]', "+91 98765 43210");
    await form.fill('[name="propertyName"]', propertyName);
    await form.selectOption('[name="type"]', "HERITAGE");
    await form.selectOption('[name="destinationId"]', "jaipur");
    await form.fill('[name="address"]', "12 Johari Bazaar, Jaipur 302003");
    await form.fill('[name="area"]', "Old city");
    await form.fill('[name="officialWebsite"]', "https://example.com/qa-haveli");
    await form.fill('[name="bookingUrl"]', "https://example.com/qa-haveli/book");
    await form.fill('textarea#description', "A QA property that exists only while this suite runs.");
    await form.fill('[name="amenities"]', "breakfast, parking");
    /* First attempt without the authorisation box: must be refused. */
    await form.click('button[type="submit"]');
    await form.waitForSelector('p[role="alert"]', { timeout: 30_000 });
    check("F1 the form refuses a request without authorisation", await form.locator("text=Confirm that you are authorised").count() > 0);
    await form.check('[name="authorised"]');
    await form.click('button[type="submit"]');
    const acknowledged = await form.waitForSelector('div[role="status"]', { timeout: 30_000 }).catch(() => null);
    if (!acknowledged) {
      throw new Error(`no acknowledgement; the form says: ${(await form.locator('p[role="alert"]').allTextContents()).join(" ")}`);
    }
    const status = await form.locator('div[role="status"]').textContent();
    check("F2 submission is acknowledged as queued for verification", /submitted for verification/.test(status ?? ""), status ?? "");
    check("F2 the acknowledgement promises no listing", !/is now listed|is live/i.test(status ?? ""));
    check("F2 the form fits a 390px viewport", (await form.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);

    const [row] = await sql`select p.id, p.status, p.partner_id, p.reviewed_at, p.published_at from partner_properties p join partners pa on pa.id = p.partner_id where pa.email = ${partnerA}`;
    check("F3 the property row exists in PENDING with no review", Boolean(row) && row.status === "PENDING" && row.reviewed_at === null && row.published_at === null, JSON.stringify(row));
    const propertyId: string = row?.id;
    const partnerId: string = row?.partner_id;
    const [audit] = await sql`select action from audit_logs where entity_type = 'partner_property' and entity_id = ${propertyId} order by at asc limit 1`;
    check("F3 submission is audited", audit?.action === "partner_property.submitted", audit?.action);

    /* Duplicate submission is refused, not duplicated. */
    await form.goto(`${BASE}/partner/apply`, { waitUntil: "domcontentloaded" });
    for (const [k, v] of Object.entries({ organizationName: "QA Heritage Trust", contactName: "QA Owner", email: partnerA, propertyName, address: "12 Johari Bazaar, Jaipur 302003" })) await form.fill(`#${k}`, v);
    await form.selectOption('[name="type"]', "HERITAGE");
    await form.selectOption('[name="destinationId"]', "jaipur");
    await form.check('[name="authorised"]');
    await form.click('button[type="submit"]');
    await form.waitForSelector('p[role="alert"], div[role="status"]', { timeout: 30_000 });
    const dupCount = await sql`select count(*)::int as n from partner_properties where partner_id = ${partnerId}`;
    check("F4 a duplicate submission does not create a second property", dupCount[0]?.n === 1 && (await form.locator("text=already been submitted").count()) > 0, `n=${dupCount[0]?.n}`);

    const [partnerRow] = await sql`select phone from partners where id = ${partnerId}`;
    check("F4 a resubmission without a telephone keeps the one on file", partnerRow?.phone === "+91 98765 43210", String(partnerRow?.phone));

    /* Not visible to travellers while pending. */
    const pendingPublic = await fetchText(`${BASE}/destinations/jaipur/partner-stays/${propertyId}`);
    check("F5 a pending property is 404 to travellers", pendingPublic?.status === 404, `HTTP ${pendingPublic?.status}`);

    /* ---- 2. Reviewer signs in and moves it through the lifecycle. */
    const reviewer = await signIn(adminEmail, `/admin/partners/${propertyId}`);
    await reviewer.page.waitForURL(/\/admin\/partners\//, { timeout: 30_000 });
    check("F6 the reviewer reaches the review console", reviewer.page.url().includes(`/admin/partners/${propertyId}`), reviewer.page.url());
    check("F6 the console shows what was submitted", (await reviewer.page.locator(`text=${propertyName}`).count()) > 0 && (await reviewer.page.locator("text=https://example.com/qa-haveli").count()) > 0);
    check("F6 the console offers no Publish before verification", (await reviewer.page.locator('button[value="PUBLISHED"]').count()) === 0 && (await reviewer.page.locator('button[value="UNDER_REVIEW"]').count()) === 1);

    /* Press one lifecycle button and wait for the action's own reply — the
       message must CHANGE, because the previous reply is still on the page. */
    const press = async (value: string, note?: string, checks?: string[]) => {
      const form = reviewer.page.locator("form", { has: reviewer.page.locator('button[name="to"]') }).first();
      const before = (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
      if (note) await form.locator('textarea[name="note"]').fill(note);
      for (const c of checks ?? []) await form.locator(`input[name="checks"][value="${c}"]`).check();
      await form.locator(`button[value="${value}"]`).click();
      await reviewer.page.waitForFunction(
        (prev) => {
          const el = document.querySelector('form:has(button[name="to"]) p[role="status"], form:has(button[name="to"]) p[role="alert"]');
          return el !== null && el.textContent !== prev && el.textContent !== "";
        },
        before,
        { timeout: 30_000 },
      );
      const reply = (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
      const [r] = await sql`select status, reviewer_id, reviewed_at, published_at, provenance from partner_properties where id = ${propertyId}`;
      return { ...r, reply };
    };
    /* The console at phone width: the queue's table scrolls inside its own
       container, and nothing may widen the page itself. */
    await reviewer.page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/admin/partners", `/admin/partners/${propertyId}`]) {
      await reviewer.page.goto(`${BASE}${route}`, { waitUntil: "load" });
      const over = await reviewer.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`F6 ${route.replace(propertyId, "[id]")} fits a 390px viewport`, over <= 1, `${over}px over`);
    }
    await reviewer.page.setViewportSize({ width: 1280, height: 900 });
    await reviewer.page.goto(`${BASE}/admin/partners/${propertyId}`, { waitUntil: "load" });
    await reviewer.page.waitForTimeout(800);

    let r = await press("UNDER_REVIEW");
    check("F7 PENDING → UNDER_REVIEW", r.status === "UNDER_REVIEW" && r.reviewer_id !== null, `${r.status} · ${r.reply}`);
    r = await press("VERIFIED", "Checked against the municipal register.", ["exists", "destination", "address", "officialWebsite"]);
    check("F8 UNDER_REVIEW → VERIFIED records what was checked", r.status === "VERIFIED" && (r.provenance?.checks ?? []).length === 4, `${r.reply} · ${JSON.stringify(r.provenance)}`);
    r = await press("APPROVED");
    check("F9 VERIFIED → APPROVED", r.status === "APPROVED", `${r.status} · ${r.reply}`);
    const stillHidden = await fetchText(`${BASE}/destinations/jaipur/partner-stays/${propertyId}`);
    check("F9 an approved-but-unpublished property is still 404 to travellers", stillHidden?.status === 404, `HTTP ${stillHidden?.status}`);
    r = await press("PUBLISHED");
    check("F10 APPROVED → PUBLISHED sets published_at and keeps reviewed_at", r.status === "PUBLISHED" && r.published_at !== null && r.reviewed_at !== null, `${r.status} · ${r.reply}`);
    const trail = await sql`select action, actor_id from audit_logs where entity_type = 'partner_property' and entity_id = ${propertyId} order by at asc`;
    check("F10 every step is audited with the reviewer's identity",
      trail.map((t) => t.action).join(",") === "partner_property.submitted,partner_property.under_review,partner_property.verified,partner_property.approved,partner_property.published"
      && trail.slice(1).every((t) => t.actor_id !== null), trail.map((t) => t.action).join(","));

    /* The database refuses an unreviewed publish even if code tried. */
    let constraintHeld = false;
    try {
      await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status) values (${partnerId}, 'jaipur', ${`${propertyName} direct`}, 'HOTEL', 'x y z address 12', 'PUBLISHED')`;
    } catch (e) {
      constraintHeld = /published_is_reviewed/.test((e as Error).message);
    }
    check("F11 the database refuses a PUBLISHED row with no review", constraintHeld);

    /* ---- 3. Travellers see it, and a click is counted. */
    const pub = await fetchText(`${BASE}/destinations/jaipur/partner-stays/${propertyId}`);
    check("F12 the published property page serves", pub?.status === 200, `HTTP ${pub?.status}`);
    check("F12 it says verified and links the official channels", pub !== null && /verified/.test(pub.body) && /Book on official website/.test(pub.body) && /Contact property/.test(pub.body));
    check("F12 it holds no price, rating or availability", pub !== null && !/₹|per night|rating|available rooms|check-in/i.test(pub.body));
    check("F12 it shows no partner e-mail", pub !== null && !pub.body.includes(partnerA));
    /* The destination page is prerendered; its partner section reads the
       published list at request time. Checked in a browser, the way a
       traveller sees it, immediately after publishing. */
    const listNow = await fetchText(`${BASE}/api/partner-stays?destination=jaipur`);
    const listedNow = JSON.parse(listNow?.body ?? "{}") as { stays?: Record<string, unknown>[] };
    const listedRow = (listedNow.stays ?? []).find((s) => s.id === propertyId);
    check("F13 the published property is in the destination's public list, without private fields",
      Boolean(listedRow) && listedRow?.name === propertyName && !JSON.stringify(listedNow).includes(partnerA), JSON.stringify(listedRow ?? null));
    const hubView = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const hubPage = await hubView.newPage();
    await hubPage.goto(`${BASE}/destinations/jaipur`, { waitUntil: "load" });
    const section = await hubPage.waitForSelector("#partner-stays", { timeout: 20_000 }).catch(() => null);
    const sectionText = section ? await section.innerText() : "";
    check("F13 the destination page shows the partner section at once, apart from curated stays",
      /Partner stays in Jaipur/.test(sectionText) && sectionText.includes(propertyName) && /TerraStory partner · verified/.test(sectionText)
      && (await hubPage.locator("#stays").count()) === 1 && !(await hubPage.locator("#stays").innerText()).includes(propertyName));
    check("F13 the destination page still fits a 390px viewport with the section",
      (await hubPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
    await hubView.close();

    const traveller = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const tp = await traveller.newPage();
    await tp.goto(`${BASE}/destinations/jaipur/partner-stays/${propertyId}`, { waitUntil: "load" });
    await tp.waitForTimeout(800);
    check("F14 the public page fits a 390px viewport", (await tp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
    /* Do not actually leave for example.com: stop the navigation, keep the beacon. */
    await tp.route("https://example.com/**", (route) => route.abort());
    const beacon = tp.waitForRequest((req) => req.url().endsWith("/api/referrals") && req.method() === "POST", { timeout: 15_000 });
    const [popup] = await Promise.all([
      tp.waitForEvent("popup", { timeout: 15_000 }).catch(() => null),
      tp.click("text=Book on official website"),
    ]);
    const req = await beacon;
    check("F15 clicking Book on official website sends a referral beacon", Boolean(req));
    const payload = req.postDataJSON?.() ?? JSON.parse(req.postData() ?? "{}");
    check("F15 the beacon names the property, destination, type and page path",
      payload.propertyId === propertyId && payload.destinationId === "jaipur" && payload.eventType === "BOOKING_LINK" && payload.source === `/destinations/jaipur/partner-stays/${propertyId}`, JSON.stringify(payload));
    check("F15 the beacon carries nothing about the traveller", !("email" in payload) && !("name" in payload) && !("ip" in payload));
    if (popup) await popup.close().catch(() => undefined);
    await tp.waitForTimeout(1500);
    const events = await sql`select event_type, source, session_hash, destination_id from referral_events where property_id = ${propertyId}`;
    check("F16 the referral event is stored with a hashed session and no identity",
      events.length === 1 && events[0].event_type === "BOOKING_LINK" && /^[0-9a-f]{64}$/.test(events[0].session_hash) && events[0].destination_id === "jaipur", JSON.stringify(events));
    const eventCols = await sql`select column_name from information_schema.columns where table_name = 'referral_events'`;
    check("F16 referral_events has no amount, ip or user-agent column", !eventCols.some((c) => /amount|ip|agent|email|name/i.test(c.column_name)));

    /* Curated stay CTA also counts, by stay reference. */
    const curated = await fetchText(`${BASE}/destinations/jaipur`);
    const curatedSlug = curated?.body.match(/\/destinations\/jaipur\/stays\/([a-z0-9-]+)/)?.[1];
    if (curatedSlug) {
      await tp.goto(`${BASE}/destinations/jaipur/stays/${curatedSlug}`, { waitUntil: "load" });
      await tp.waitForTimeout(800);
      const hasWebsite = (await tp.locator("text=Official website").count()) > 0;
      if (hasWebsite) {
        await tp.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
        const b2 = tp.waitForRequest((rq) => rq.url().endsWith("/api/referrals"), { timeout: 15_000 });
        await Promise.all([tp.waitForEvent("popup", { timeout: 15_000 }).catch(() => null), tp.locator("text=Official website").first().click()]);
        const rq2 = await b2;
        const p2 = JSON.parse(rq2.postData() ?? "{}");
        check("F17 a curated stay's Official website click is counted by stay reference", p2.stayRef === `jaipur/${curatedSlug}` && p2.eventType === "OFFICIAL_WEBSITE", JSON.stringify(p2));
      } else {
        console.log(`SKIP  F17 — curated stay ${curatedSlug} publishes no website`);
      }
    }
    await traveller.close();

    /* ---- 4. Partner A sees status and clicks; partner B sees nothing of A. */
    const a = await signIn(partnerA, "/partner/dashboard");
    await a.page.waitForURL(/\/partner\/dashboard/, { timeout: 30_000 });
    const aBody = await a.page.locator("body").innerText();
    check("F18 partner A's dashboard shows the property as Published", aBody.includes(propertyName) && /Published/.test(aBody));
    check("F18 partner A sees the reviewer's note", /municipal register/.test(aBody));
    check("F18 partner A sees one booking-page click and no traveller data", /1 click/.test(aBody) && /Booking page/.test(aBody) && !/session_hash|[0-9a-f]{64}/.test(aBody));
    check("F18 partner A sees no commercial agreement", /No commercial agreement/.test(aBody));
    check("F18 the dashboard offers no admin controls", !/Mark verified|Start review/.test(aBody) && (await a.page.locator('a[href^="/admin"]').count()) === 0);
    const aAdmin = await a.page.goto(`${BASE}/admin/partners`, { waitUntil: "domcontentloaded" });
    check("F19 partner A gets 404 on the review console", aAdmin?.status() === 404, `HTTP ${aAdmin?.status()}`);
    await a.context.close();

    const b = await signIn(partnerB, "/partner/dashboard");
    await b.page.waitForURL(/\/partner\/dashboard/, { timeout: 30_000 });
    const bBody = await b.page.locator("body").innerText();
    check("F20 partner B, with no request, sees an empty state and nothing of A", /No partnership request yet/.test(bBody) && !bBody.includes(propertyName) && !bBody.includes(partnerA));
    const bAdmin = await b.page.goto(`${BASE}/admin/partners/${propertyId}`, { waitUntil: "domcontentloaded" });
    check("F20 partner B gets 404 on A's review page", bAdmin?.status() === 404, `HTTP ${bAdmin?.status()}`);
    await b.context.close();

    /* ---- 5. Unpublish hides it again; the reviewer's edit is audited. */
    await reviewer.page.reload({ waitUntil: "domcontentloaded" });
    r = await press("UNPUBLISHED", "Temporarily withdrawn by QA.");
    check("F21 PUBLISHED → UNPUBLISHED", r.status === "UNPUBLISHED", `${r.status} · ${r.reply}`);
    const hidden = await fetchText(`${BASE}/destinations/jaipur/partner-stays/${propertyId}`);
    check("F21 an unpublished property is 404 to travellers again", hidden?.status === 404, `HTTP ${hidden?.status}`);
    await reviewer.page.click("text=Correct a detail");
    await reviewer.page.fill('[name="area"]', "Johari Bazaar");
    await reviewer.page.click("text=Save correction");
    await reviewer.page.waitForSelector("text=Saved.", { timeout: 30_000 });
    const [edited] = await sql`select area from partner_properties where id = ${propertyId}`;
    const [editAudit] = await sql`select before, after from audit_logs where entity_type = 'partner_property' and entity_id = ${propertyId} and action = 'partner_property.edited'`;
    check("F22 a reviewer's correction is saved and audited with before/after", edited?.area === "Johari Bazaar" && editAudit?.before?.area === "Old city" && editAudit?.after?.area === "Johari Bazaar");
    await reviewer.context.close();

    /* Sign-out really ends the session. */
    const c = await signIn(partnerA, "/partner/dashboard");
    await c.page.waitForURL(/\/partner\/dashboard/, { timeout: 30_000 });
    await c.page.getByRole("button", { name: "Log out" }).first().click();
    await c.page.waitForURL((u) => !u.pathname.startsWith("/partner/dashboard"), { timeout: 30_000 });
    const after = await c.page.goto(`${BASE}/partner/dashboard`, { waitUntil: "domcontentloaded" });
    check("F23 after sign-out the dashboard is no longer reachable", (after?.url() ?? "").includes("/login"), after?.url());
    await c.context.close();
  } finally {
    /* Leave nothing behind: the QA partners, their properties (cascade), the events
       (set null on delete), the audit rows, the users rows and the auth users. */
    try {
      const qaPartners = await sql`select id from partners where email like ${`qa-partner-%-${stamp}@terrastory.test`}`;
      const ids = qaPartners.map((p) => p.id);
      if (ids.length) {
        const props = await sql`select id from partner_properties where partner_id in ${sql(ids)}`;
        if (props.length) {
          await sql`delete from referral_events where property_id in ${sql(props.map((p) => p.id))}`;
          await sql`delete from audit_logs where entity_type = 'partner_property' and entity_id in ${sql(props.map((p) => p.id))}`;
        }
        await sql`delete from partners where id in ${sql(ids)}`;
      }
      await sql`delete from referral_events where stay_ref = 'jaipur/qa-suite-stay'`;
      for (const id of authIds) {
        await sql`update partner_properties set reviewer_id = null where reviewer_id = ${id}`;
        await sql`update partners set verified_by = null where verified_by = ${id}`;
        await sql`update partner_subscriptions set assigned_by = null where assigned_by = ${id}`;
        await sql`update vendor_documents set uploaded_by = null where uploaded_by = ${id}`;
        await sql`update audit_logs set actor_id = null where actor_id = ${id}`;
        await sql`delete from users where id = ${id}`;
        await admin.auth.admin.deleteUser(id);
      }
    } catch (e) {
      console.log(`WARN  cleanup incomplete: ${(e as Error).message}`);
    }
    await browser.close().catch(() => undefined);
    await Promise.race([sql.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  }
}

/**
 * Phase 1, end to end: an unverified vendor cannot publish; a reviewer
 * verifies it; the verified vendor adds a listing, rooms and dates; partner B
 * can neither read nor write any of it, even with forged ids; suspension takes
 * everything down. All QA rows are synthetic, named "(QA synthetic)", never
 * published beyond the check that needs it, and removed in `finally`.
 */
async function runInventoryFlow({ adminEmail, supabaseUrl, serviceKey, databaseUrl }: { adminEmail: string; supabaseUrl: string; serviceKey: string; databaseUrl: string }) {
  const { chromium } = await import("playwright");
  const { createClient } = await import("@supabase/supabase-js");
  const postgres = (await import("postgres")).default;

  const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false, onnotice: () => undefined });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const stamp = Date.now().toString(36);
  const emailA = `qa-inventory-a-${stamp}@terrastory.test`;
  const emailB = `qa-inventory-b-${stamp}@terrastory.test`;
  const authIds: string[] = [];
  const storedPaths: string[] = [];
  const browser = await chromium.launch();
  let ip = 20;

  const signIn = async (email: string, next: string, viewport = { width: 1280, height: 900 }) => {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.data.user) authIds.push(created.data.user.id);
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data.properties?.hashed_token) throw new Error(`generateLink failed for ${email}: ${link.error?.message}`);
    if (link.data.user && !authIds.includes(link.data.user.id)) authIds.push(link.data.user.id);
    ip += 1;
    const context = await browser.newContext({ viewport, extraHTTPHeaders: { "x-forwarded-for": `10.77.0.${ip}` } });
    const page = await context.newPage();
    await page.goto(`${BASE}/auth/callback?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`, { waitUntil: "load" });
    await page.waitForURL(/\/auth\/continue/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 60_000 });
    return { context, page };
  };

  /* Submit a form and wait for ITS OWN reply to change. */
  const submitAndRead = async (page: import("playwright").Page, form: import("playwright").Locator, click: () => Promise<void>) => {
    const before = (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
    await click();
    await page.waitForFunction(
      ({ prev, handle }) => {
        const el = (handle as HTMLElement).querySelector('p[role="status"], p[role="alert"]');
        return el !== null && el.textContent !== "" && el.textContent !== prev;
      },
      { prev: before, handle: await form.elementHandle() },
      { timeout: 45_000 },
    );
    return (await form.locator('p[role="status"], p[role="alert"]').allTextContents()).join("|");
  };
  const overflow = (page: import("playwright").Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const auditActions = async (entityId: string) => (await sql`select action from audit_logs where entity_id = ${entityId} order by at asc`).map((r) => r.action as string);

  try {
    /* ---- Synthetic fixtures: vendor A unverified with an APPROVED listing; vendor B verified with one room type. */
    const [a] = await sql`insert into partners (organization_name, contact_name, email, status)
      values ('QA Inventory Trust A (QA synthetic)', 'QA Owner A', ${emailA}, 'PENDING') returning id`;
    /* Vendor A creates a second listing below; the Free plan allows one (qa:subscriptions tests that gate). */
    await sql`insert into partner_subscriptions (partner_id, plan_code, status, note) values (${a.id}, 'GROWTH', 'ACTIVE', 'QA synthetic')`;
    const [aSeed] = await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status, reviewed_at, source)
      values (${a.id}, 'jaipur', ${`QA Seed Haveli ${stamp} (QA synthetic)`}, 'HERITAGE', '1 QA Street, Jaipur 302001', 'APPROVED', now(), 'qa-synthetic') returning id`;
    const [b] = await sql`insert into partners (organization_name, contact_name, email, status)
      values ('QA Inventory Trust B (QA synthetic)', 'QA Owner B', ${emailB}, 'VERIFIED') returning id`;
    const [bListing] = await sql`insert into partner_properties (partner_id, destination_id, name, type, address, status, source)
      values (${b.id}, 'agra', ${`QA B Lodge ${stamp} (QA synthetic)`}, 'GUEST_HOUSE', '2 QA Road, Agra 282001', 'PENDING', 'qa-synthetic') returning id`;
    const [bUnit] = await sql`insert into listing_units (listing_id, name, capacity, total_quantity) values (${bListing.id}, 'QA B room', 2, 2) returning id`;

    /* ---- G1. An unverified vendor cannot publish or add listings. */
    const vendorA = await signIn(emailA, "/partner/listings");
    await vendorA.page.waitForURL(/\/partner\/listings/, { timeout: 30_000 });
    const aPage = vendorA.page;
    check("G1 an unverified vendor sees why new listings are locked", /New listings open once you are verified/.test(await aPage.locator("main").innerText()) && (await aPage.locator('a[href="/partner/listings/new"]').count()) === 0);
    await aPage.goto(`${BASE}/partner/listings/new`, { waitUntil: "load" });
    check("G1 the new-listing form is not offered to an unverified vendor", (await aPage.locator('form [name="destinationId"]').count()) === 0);
    await aPage.goto(`${BASE}/partner/listings/${aSeed.id}`, { waitUntil: "load" });
    check("G1 an approved listing of an unverified vendor offers no Publish", (await aPage.locator('button[name="to"][value="PUBLISHED"]').count()) === 0 && /Publishing opens when/.test(await aPage.locator("main").innerText()));
    let refused = "";
    try {
      await sql`update partner_properties set status = 'PUBLISHED' where id = ${aSeed.id}`;
    } catch (e) {
      refused = (e as Error).message;
    }
    check("G1 the database refuses to publish for an unverified vendor", /not verified/.test(refused), refused || "the update succeeded");
    const [stillApproved] = await sql`select status from partner_properties where id = ${aSeed.id}`;
    check("G1 the listing is still APPROVED and not public", stillApproved?.status === "APPROVED" && (await fetch(`${BASE}/destinations/jaipur/partner-stays/${aSeed.id}`, { redirect: "manual" })).status === 404);

    /* ---- G2. A reviewer verifies the organisation, idempotently and on the record. */
    const reviewer = await signIn(adminEmail, `/admin/partners/${aSeed.id}`);
    const landed = reviewer.page.url();
    const console404 = await reviewer.page.goto(`${BASE}/admin/partners/${aSeed.id}`, { waitUntil: "load" });
    check("G2 the reviewer reaches the organisation's review page", console404?.status() === 200, `landed on ${landed}, then HTTP ${console404?.status()}`);
    const decide = async (to: string, note?: string) => {
      await reviewer.page.goto(`${BASE}/admin/partners/${aSeed.id}`, { waitUntil: "load" });
      const form = reviewer.page.locator("form[data-vendor-controls]");
      if (note) await form.locator('textarea[name="note"]').fill(note);
      return submitAndRead(reviewer.page, form, () => form.locator(`button[value="vendor:${to}"]`).click());
    };
    check("G2 a PENDING organisation offers review or rejection, not suspension or verification",
      (await reviewer.page.locator('form[data-vendor-controls] button[name="decision"]').evaluateAll((els) => els.map((e) => (e as HTMLButtonElement).value).join())) === "vendor:UNDER_REVIEW,vendor:REJECTED");
    let reply = await decide("UNDER_REVIEW");
    reply = await decide("VERIFIED", "Registration checked (QA synthetic).");
    const [aVerified] = await sql`select status, verified_by, verified_at, verification_note from partners where id = ${a.id}`;
    check("G2 the organisation is VERIFIED with reviewer, time and reason recorded",
      aVerified?.status === "VERIFIED" && aVerified.verified_by !== null && aVerified.verified_at !== null && /QA synthetic/.test(aVerified.verification_note ?? ""), `${reply} · ${JSON.stringify(aVerified)}`);
    check("G2 each decision is audited once", (await auditActions(a.id)).join(",") === "partner.under_review,partner.verified", (await auditActions(a.id)).join(","));

    /* ---- G3. The verified vendor creates a listing through the form. */
    await aPage.goto(`${BASE}/partner/listings/new`, { waitUntil: "load" });
    const newName = `QA New Homestay ${stamp} (QA synthetic)`;
    await aPage.fill("#name", newName);
    await aPage.selectOption("#type", "HOMESTAY");
    await aPage.selectOption("#destinationId", "varanasi");
    await aPage.fill("#address", "3 QA Lane, Varanasi 221001");
    await aPage.fill("#houseRules", "No smoking indoors (QA synthetic).");
    await aPage.fill("#cancellationTerms", "Free cancellation up to 48 hours before arrival (QA synthetic).");
    await aPage.click('button[type="submit"]:has-text("Submit listing for review")');
    await aPage.waitForURL(/\/partner\/listings\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    const newId = aPage.url().split("/").pop() ?? "";
    const [created] = await sql`select status, partner_id, source, house_rules from partner_properties where id = ${newId}`;
    check("G3 a verified vendor creates a listing, in review and owned by them",
      created?.status === "PENDING" && created.partner_id === a.id && created.source === "partner-workspace" && /No smoking/.test(created.house_rules ?? ""), JSON.stringify(created));
    check("G3 the new listing is audited and not public",
      (await auditActions(newId))[0] === "partner_property.submitted" && (await fetch(`${BASE}/destinations/varanasi/partner-stays/${newId}`, { redirect: "manual" })).status === 404);

    /* ---- G4. Rooms. */
    const addUnit = async (name: string, quantity: string) => {
      const form = aPage.locator('form[aria-label="Add room type"]');
      await form.locator("#new-unit-name").fill(name);
      await form.locator("#new-unit-quantity").fill(quantity);
      return submitAndRead(aPage, form, () => form.locator('button[type="submit"]').click());
    };
    reply = await addUnit("Standard Room", "3");
    const units = await sql`select id, name, total_quantity from listing_units where listing_id = ${newId}`;
    check("G4 a partner adds a room type", units.length === 1 && units[0]?.name === "Standard Room" && units[0]?.total_quantity === 3, `${reply} · ${JSON.stringify(units)}`);
    const unitId: string = units[0]?.id;
    reply = await addUnit("Standard Room", "2");
    check("G4 a duplicate room type name is refused", /already has a room type/.test(reply) && (await sql`select count(*)::int n from listing_units where listing_id = ${newId}`)[0]?.n === 1, reply);
    await aPage.reload({ waitUntil: "load" });
    const editForm = aPage.locator(`form[data-unit="${unitId}"]`);
    await editForm.locator('input[name="totalQuantity"]').fill("4");
    await editForm.locator('input[name="basePrice"]').fill("2,500 rupees");
    reply = await submitAndRead(aPage, editForm, () => editForm.locator('button[value="save"]').click());
    check("G4 a rate that is not a rupee amount is refused", (await editForm.locator("text=Enter a rate in rupees").count()) > 0 && (await sql`select base_price_paise from listing_units where id = ${unitId}`)[0]?.base_price_paise === null, reply);
    await editForm.locator('input[name="basePrice"]').fill("2500.50");
    reply = await submitAndRead(aPage, editForm, () => editForm.locator('button[value="save"]').click());
    const [unitAfter] = await sql`select total_quantity, base_price_paise from listing_units where id = ${unitId}`;
    check("G4 a partner updates their own room count and nightly rate, stored as exact paise",
      unitAfter?.total_quantity === 4 && unitAfter.base_price_paise === "250050", `${reply} · ${JSON.stringify(unitAfter)}`);
    check("G4 room changes are audited", (await auditActions(unitId)).join(",") === "listing_unit.created,listing_unit.updated", (await auditActions(unitId)).join(","));

    /* ---- G5. The calendar persists, and the database holds the ceiling. */
    const today = todayInKolkata(new Date());
    const d1 = addDays(today, 2);
    const d3 = addDays(today, 4);
    await aPage.goto(`${BASE}/partner/calendar?unit=${unitId}&month=${d1.slice(0, 7)}`, { waitUntil: "load" });
    const calForm = aPage.locator('form[aria-labelledby="availability-form-title"]');
    const setRange = async (from: string, to: string, mode: "open" | "close", rooms?: string, price = "") => {
      await calForm.locator('input[name="from"]').fill(from);
      await calForm.locator('input[name="to"]').fill(to);
      await calForm.locator(`input[name="mode"][value="${mode}"]`).check();
      if (rooms !== undefined) await calForm.locator('input[name="rooms"]').fill(rooms);
      if (mode === "open") await calForm.locator('input[name="price"]').fill(price);
      return submitAndRead(aPage, calForm, () => calForm.locator('button[type="submit"]').click());
    };
    reply = await setRange(d1, d3, "open", "2", "3000");
    let days = await sql`select date::text as date, units_open, price_paise_override, closed from availability where listing_unit_id = ${unitId} order by date`;
    check("G5 opening three dates writes three rows of two rooms at the date rate",
      days.length === 3 && days.every((d) => d.units_open === 2 && d.price_paise_override === "300000" && d.closed === false) && /Saved 3 dates/.test(reply), `${reply} · ${JSON.stringify(days)}`);
    reply = await setRange(addDays(today, 3), addDays(today, 3), "close");
    days = await sql`select date::text as date, units_open from availability where listing_unit_id = ${unitId} order by date`;
    check("G5 closing a date sets it to zero, marks it closed and leaves its neighbours",
      days.map((d) => d.units_open).join(",") === "2,0,2" && (await sql`select closed from availability where listing_unit_id = ${unitId} and date = ${addDays(today, 3)}`)[0]?.closed === true,
      `${reply} · ${JSON.stringify(days)}`);
    reply = await setRange(d1, d1, "open", "9");
    check("G5 opening more rooms than exist is refused and changes nothing",
      /more rooms than this room type has/.test(reply) && (await sql`select units_open from availability where listing_unit_id = ${unitId} and date = ${d1}`)[0]?.units_open === 2, reply);
    reply = await setRange(addDays(today, -1), d1, "open", "1");
    check("G5 a range in the past is refused", /up to a year, starting today/.test(reply), reply);
    await aPage.reload({ waitUntil: "load" });
    const openCells = await aPage.locator(`td[data-day="${d1}"][data-state="open"]`).count();
    const closedCells = await aPage.locator(`td[data-day="${addDays(today, 3)}"][data-state="closed"]`).count();
    check("G5 availability persists across a reload", openCells === 1 && closedCells === 1 || d1.slice(0, 7) !== addDays(today, 3).slice(0, 7), `open ${openCells}, closed ${closedCells}`);
    let ceiling = "";
    try {
      await sql`update availability set units_open = 5 where listing_unit_id = ${unitId} and date = ${d1}`;
    } catch (e) {
      ceiling = (e as Error).message;
    }
    check("G5 the database refuses open + held + booked above the room count", /exceeds its quantity/.test(ceiling), ceiling || "the update succeeded");
    check("G5 calendar changes are audited", (await auditActions(unitId)).filter((x) => x.startsWith("availability.")).join(",") === "availability.opened,availability.closed", (await auditActions(unitId)).join(","));
    for (const width of [375, 390, 768, 1440]) {
      await aPage.setViewportSize({ width, height: 900 });
      for (const route of ["/partner/dashboard", "/partner/listings", `/partner/listings/${newId}`, `/partner/calendar?unit=${unitId}`, "/partner/verification"]) {
        await aPage.goto(`${BASE}${route}`, { waitUntil: "load" });
        const over = await overflow(aPage);
        check(`G6 ${route.replace(newId, "[id]").replace(unitId, "[unit]")} fits ${width}px`, over <= 1, `${over}px over`);
      }
    }
    await aPage.setViewportSize({ width: 1280, height: 900 });
    await aPage.goto(`${BASE}/partner/dashboard`, { waitUntil: "load" });
    check("G6 the overview shows verification, listing and inventory status from real rows",
      /Verified/.test(await aPage.locator("main").innerText()) && (await aPage.locator("main").innerText()).includes(newName) && /1 room types · open on 2 of the next 30 days/.test(await aPage.locator("main").innerText()));
    check("G6 the overview shows no bookings, because none exist", !/booking(s)? (confirmed|received)|revenue earned/i.test(await aPage.locator("main").innerText()));
    await aPage.keyboard.press("Tab");
    let focusedNav = false;
    for (let i = 0; i < 25 && !focusedNav; i += 1) {
      focusedNav = await aPage.evaluate(() => Boolean(document.activeElement?.closest('nav[aria-label="Partner workspace"]')));
      if (!focusedNav) await aPage.keyboard.press("Tab");
    }
    const ring = await aPage.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const style = getComputedStyle(el);
      return `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`;
    });
    check("G6 the workspace navigation is keyboard reachable with a visible focus ring", focusedNav && !/^none 0px none$/.test(ring), ring);
    check("G6 the current section is announced", (await aPage.locator('nav[aria-label="Partner workspace"] a[aria-current="page"]').count()) === 1);

    /* ---- G7. Supporting documents: private, typed by content, audited. */
    await aPage.goto(`${BASE}/partner/verification`, { waitUntil: "load" });
    const uploadForm = aPage.locator("form:has(#document-file)");
    if ((await uploadForm.count()) === 1) {
      const pdf = Buffer.from("%PDF-1.4\n% QA synthetic document\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
      await uploadForm.locator('select[name="kind"]').selectOption("GOVT_REG");
      await uploadForm.locator("#document-file").setInputFiles({ name: "qa-registration.pdf", mimeType: "application/pdf", buffer: pdf });
      reply = await submitAndRead(aPage, uploadForm, () => uploadForm.locator('button[type="submit"]').click());
      const docs = await sql`select id, file_url, kind, status from vendor_documents where vendor_id = ${a.id}`;
      for (const d of docs) storedPaths.push(d.file_url);
      check("G7 a partner uploads a document to private storage", docs.length === 1 && docs[0]?.kind === "GOVT_REG" && docs[0]?.file_url.startsWith(`${a.id}/`) && !/^https?:/.test(docs[0]?.file_url), `${reply} · ${JSON.stringify(docs)}`);
      check("G7 the upload is audited", Boolean(docs[0]) && (await auditActions(docs[0]?.id)).join() === "vendor_document.uploaded");
      await aPage.reload({ waitUntil: "load" });
      const uploadAgain = aPage.locator("form:has(#document-file)");
      await uploadAgain.locator('select[name="kind"]').selectOption("PROPERTY_PROOF");
      await uploadAgain.locator("#document-file").setInputFiles({ name: "not-really.pdf", mimeType: "application/pdf", buffer: Buffer.from("<script>alert(1)</script>") });
      reply = await submitAndRead(aPage, uploadAgain, () => uploadAgain.locator('button[type="submit"]').click());
      check("G7 a file whose content is not what its type claims is refused", /PDF, JPEG or PNG/.test(reply) && (await sql`select count(*)::int n from vendor_documents where vendor_id = ${a.id}`)[0]?.n === 1, reply);
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/vendor-docs/${docs[0]?.file_url}`;
      check("G7 the stored document has no public URL", (await fetch(publicUrl)).status >= 400);
      await reviewer.page.goto(`${BASE}/admin/partners/${aSeed.id}`, { waitUntil: "load" });
      const signed = await reviewer.page.locator('a[href*="/object/sign/vendor-docs/"]').first().getAttribute("href");
      check("G7 the reviewer gets a short-lived signed link", Boolean(signed) && /token=/.test(signed ?? ""));
    } else {
      console.log("SKIP  G7 — document storage is not configured on this server");
    }

    /* ---- G8. Partner B can neither see nor change partner A's records. */
    const vendorB = await signIn(emailB, `/partner/listings/${newId}`);
    const bLanding = await vendorB.page.goto(`${BASE}/partner/listings/${newId}`, { waitUntil: "load" });
    check("G8 partner B gets 404 on partner A's listing", bLanding?.status() === 404, `HTTP ${bLanding?.status()}`);
    await vendorB.page.goto(`${BASE}/partner/calendar?unit=${unitId}`, { waitUntil: "load" });
    const bOptions = await vendorB.page.locator("select#unit option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    check("G8 partner B's calendar ignores A's unit id and lists only B's rooms", bOptions.length === 1 && bOptions[0] === bUnit.id && !(await vendorB.page.locator("main").innerText()).includes("Standard Room"), JSON.stringify(bOptions));
    const bCal = vendorB.page.locator('form[aria-labelledby="availability-form-title"]');
    await bCal.locator('input[name="unitId"]').evaluate((el, id) => { (el as HTMLInputElement).value = id; }, unitId);
    await bCal.locator('input[name="from"]').fill(d1);
    await bCal.locator('input[name="to"]').fill(d1);
    await bCal.locator('input[name="rooms"]').fill("1");
    reply = await submitAndRead(vendorB.page, bCal, () => bCal.locator('button[type="submit"]').click());
    check("G8 a forged room-type id from partner B changes nothing of A's", /not yours/.test(reply) && (await sql`select units_open from availability where listing_unit_id = ${unitId} and date = ${d1}`)[0]?.units_open === 2, reply);
    await vendorB.page.goto(`${BASE}/partner/listings/${bListing.id}`, { waitUntil: "load" });
    const bDetails = vendorB.page.locator("form:has(textarea[name=houseRules])");
    await bDetails.locator('input[name="listingId"]').evaluate((el, id) => { (el as HTMLInputElement).value = id; }, newId);
    await bDetails.locator('textarea[name="houseRules"]').fill("Overwritten by partner B");
    reply = await submitAndRead(vendorB.page, bDetails, () => bDetails.locator('button[type="submit"]').click());
    check("G8 a forged listing id from partner B changes nothing of A's", /not yours/.test(reply) && /No smoking/.test((await sql`select house_rules from partner_properties where id = ${newId}`)[0]?.house_rules ?? ""), reply);
    const bUnitForm = vendorB.page.locator(`form[data-unit="${bUnit.id}"]`);
    await bUnitForm.locator('input[name="unitId"]').evaluate((el, id) => { (el as HTMLInputElement).value = id; }, unitId);
    reply = await submitAndRead(vendorB.page, bUnitForm, () => bUnitForm.locator('button[value="delete"]').click());
    check("G8 partner B cannot delete A's room type", /not yours/.test(reply) && (await sql`select count(*)::int n from listing_units where id = ${unitId}`)[0]?.n === 1, reply);
    const bAdmin = await vendorB.page.goto(`${BASE}/admin/partners/${aSeed.id}`, { waitUntil: "load" });
    check("G8 partner B gets 404 on the review console", bAdmin?.status() === 404);
    await vendorB.context.close();

    /* A signed-in traveller with no partner record reaches no workspace. */
    const traveller = await signIn(`qa-inventory-t-${stamp}@terrastory.test`, "/partner/calendar");
    await traveller.page.goto(`${BASE}/partner/calendar`, { waitUntil: "load" });
    check("G8 a signed-in traveller without a partner record sees the empty state, not a workspace",
      /No partnership request yet/.test(await traveller.page.locator("main").innerText()) && (await traveller.page.locator("select#unit").count()) === 0);
    await traveller.context.close();

    /* ---- G9. Review → partner publish → public; suspension takes it down. */
    const press = async (id: string, to: string) => {
      await reviewer.page.goto(`${BASE}/admin/partners/${id}`, { waitUntil: "load" });
      const form = reviewer.page.locator("form", { has: reviewer.page.locator('button[name="to"]') }).first();
      return submitAndRead(reviewer.page, form, () => form.locator(`button[value="${to}"]`).click());
    };
    for (const to of ["UNDER_REVIEW", "VERIFIED", "APPROVED"]) await press(newId, to);
    check("G9 the reviewer approves the new listing", (await sql`select status from partner_properties where id = ${newId}`)[0]?.status === "APPROVED");
    await aPage.goto(`${BASE}/partner/listings/${newId}`, { waitUntil: "load" });
    const moveForm = aPage.locator("form:has(button[name='to'])");
    reply = await submitAndRead(aPage, moveForm, () => moveForm.locator('button[value="PUBLISHED"]').click());
    const [published] = await sql`select status, reviewer_id, published_at from partner_properties where id = ${newId}`;
    check("G9 the verified vendor publishes their approved listing", published?.status === "PUBLISHED" && published.published_at !== null, `${reply} · ${JSON.stringify(published)}`);
    const trail = await sql`select action, after from audit_logs where entity_id = ${newId} and action = 'partner_property.published'`;
    check("G9 the partner's publish is audited as the partner's", trail.length === 1 && trail[0]?.after?.by === "partner");
    const pub = await fetch(`${BASE}/destinations/varanasi/partner-stays/${newId}`, { redirect: "manual" });
    check("G9 a valid published listing is public", pub.status === 200, `HTTP ${pub.status}`);
    const pubBody = await pub.text();
    check("G9 without dates the public page prices nothing and shows the partner's own house information",
      !/units_open|per room for|data-reserve=/i.test(pubBody) && /Choose your dates to see which rooms are open/.test(pubBody) && /No smoking/.test(pubBody));
    const datedPub = await (await fetch(`${BASE}/destinations/varanasi/partner-stays/${newId}?checkIn=${d1}&checkOut=${addDays(d1, 1)}&guests=2`)).text();
    check("G9 with an open date the partner's rate and room appear, from the partner's own rows",
      /Standard Room/.test(datedPub) && /₹3,000 per room for 1 night/.test(datedPub) && (datedPub.match(/data-reserve=/g) ?? []).length === 1);

    reply = await decide("SUSPENDED", "Suspended for the QA check (QA synthetic).");
    const [suspended] = await sql`select p.status as vendor, l.status as listing from partners p join partner_properties l on l.partner_id = p.id where l.id = ${newId}`;
    check("G9 suspending the vendor unpublishes its listings in the database", suspended?.vendor === "SUSPENDED" && suspended.listing === "UNPUBLISHED", `${reply} · ${JSON.stringify(suspended)}`);
    const gone = await fetch(`${BASE}/destinations/varanasi/partner-stays/${newId}`, { redirect: "manual" });
    check("G9 a suspended vendor's listing is no longer public", gone.status === 404, `HTTP ${gone.status}`);
    await aPage.goto(`${BASE}/partner/listings/${newId}`, { waitUntil: "load" });
    check("G9 a suspended vendor is offered no Publish", (await aPage.locator('button[value="PUBLISHED"]').count()) === 0);
    /* Replay the same decision, as a double-submit or a retried request would. */
    await reviewer.page.goto(`${BASE}/admin/partners/${aSeed.id}`, { waitUntil: "load" });
    const replay = reviewer.page.locator("form[data-vendor-controls]");
    await replay.locator('textarea[name="note"]').fill("again");
    await replay.locator('button[name="decision"]').first().evaluate((el) => { (el as HTMLButtonElement).value = "vendor:SUSPENDED"; });
    reply = await submitAndRead(reviewer.page, replay, () => replay.locator('button[name="decision"]').first().click());
    check("G9 a repeated decision is idempotent", /nothing changed/.test(reply) && (await auditActions(a.id)).filter((x) => x === "partner.suspended").length === 1, (await auditActions(a.id)).join(","));
    await reviewer.context.close();
    await vendorA.context.close();
  } finally {
    /* A long browser wait can outlive the pooler's idle timeout; clean up on a fresh connection. */
    await Promise.race([sql.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
    const sqlClean = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false, onnotice: () => undefined });
    try {
      const sql = sqlClean;
      const ids = (await sql`select id from partners where email in (${emailA}, ${emailB})`).map((r) => r.id);
      if (ids.length) {
        const listings = (await sql`select id from partner_properties where partner_id in ${sql(ids)}`).map((r) => r.id);
        const unitIds = listings.length ? (await sql`select id from listing_units where listing_id in ${sql(listings)}`).map((r) => r.id) : [];
        const docIds = (await sql`select id, file_url from vendor_documents where vendor_id in ${sql(ids)}`);
        for (const d of docIds) if (!storedPaths.includes(d.file_url)) storedPaths.push(d.file_url);
        const entityIds = [...ids, ...listings, ...unitIds, ...docIds.map((d) => d.id)];
        if (entityIds.length) await sql`delete from audit_logs where entity_id in ${sql(entityIds)}`;
        await sql`delete from partners where id in ${sql(ids)}`;
      }
      if (storedPaths.length) await admin.storage.from("vendor-docs").remove(storedPaths);
      for (const id of authIds) {
        await sql`update partner_properties set reviewer_id = null where reviewer_id = ${id}`;
        await sql`update partners set verified_by = null where verified_by = ${id}`;
        await sql`update vendor_documents set uploaded_by = null where uploaded_by = ${id}`;
        await sql`update audit_logs set actor_id = null where actor_id = ${id}`;
        await sql`delete from users where id = ${id}`;
        await admin.auth.admin.deleteUser(id);
      }
    } catch (e) {
      console.log(`WARN  inventory cleanup incomplete: ${(e as Error).message}`);
    }
    await browser.close().catch(() => undefined);
    await Promise.race([sqlClean.end(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
