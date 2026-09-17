import type { LanguageCode } from "./languages";

/**
 * The partner workspace, as message keys.
 *
 * WHY A SEPARATE CATALOGUE
 * ------------------------
 * `dictionary.ts` holds the traveller interface and requires every key in
 * every one of its twenty languages, which is the right rule for a surface
 * that already ships in all of them. The partner workspace is new and its
 * copy is still moving; demanding nineteen translations of each sentence
 * before it may exist would either block the work or invite machine output
 * nobody has read. So English is complete here, other languages are partial
 * by type, and a missing key falls back to English — never to the key.
 *
 * `{name}` placeholders are filled by `partnerTranslator`.
 */
const en = {
  /* shell */
  "nav.overview": "Overview",
  "nav.verification": "Verification",
  "nav.listings": "Listings",
  "nav.calendar": "Calendar",
  "nav.label": "Partner workspace",
  "shell.eyebrow": "Partner workspace",

  /* gates */
  "gate.codeTitle": "Sign in with a one-time code",
  "gate.codeBody": "The partner workspace opens with a code sent to your business e-mail, so only someone who can read that inbox reaches the property's records.",
  "gate.codeCta": "Send me a code",
  "gate.noneTitle": "No partnership request yet",
  "gate.noneBody": "No partnership request is linked to {email}. If you applied from a different address, sign in with that one; otherwise, list your property to begin.",
  "gate.noneCta": "List your property",
  "gate.unavailable": "The partner workspace needs a database, and this deployment has none.",

  /* vendor status */
  "vendor.PENDING": "Submitted",
  "vendor.UNDER_REVIEW": "Under review",
  "vendor.VERIFIED": "Verified",
  "vendor.APPROVED": "Approved",
  "vendor.REJECTED": "Not accepted",
  "vendor.SUSPENDED": "Suspended",
  "vendor.PENDING.detail": "Your organisation is in the review queue. A reviewer opens requests in order.",
  "vendor.UNDER_REVIEW.detail": "A reviewer is checking your organisation and property against public records and your official channels.",
  "vendor.VERIFIED.detail": "Your organisation is verified. You can add listings, set up rooms and manage your calendar.",
  "vendor.APPROVED.detail": "Your organisation is verified and approved. Approved listings can be published.",
  "vendor.REJECTED.detail": "Your organisation could not be verified. The reviewer's note says why; you can add documents and write to us.",
  "vendor.SUSPENDED.detail": "Your organisation is suspended, so none of its listings are shown to travellers. The reviewer's note says why.",

  /* listing status */
  "listing.PENDING": "Submitted",
  "listing.UNDER_REVIEW": "Under review",
  "listing.VERIFIED": "Verified",
  "listing.APPROVED": "Approved",
  "listing.PUBLISHED": "Published",
  "listing.UNPUBLISHED": "Unpublished",
  "listing.REJECTED": "Not accepted",
  "listing.PENDING.detail": "Your request is in the queue. A reviewer will open it in order.",
  "listing.UNDER_REVIEW.detail": "A reviewer is checking the property against public records and your official channels.",
  "listing.VERIFIED.detail": "The property, its address and its official channels have been confirmed. Approval is the next step.",
  "listing.APPROVED.detail": "The listing is approved. Publish it when you are ready for travellers to see it.",
  "listing.PUBLISHED.detail": "Travellers exploring your destination can see the property and reach your official channels from it.",
  "listing.UNPUBLISHED.detail": "The listing is verified but not currently shown. Publish it again when you are ready.",
  "listing.REJECTED.detail": "The property could not be verified. The reviewer's note says why, and you can write to us.",

  /* overview */
  "overview.title": "Overview",
  "overview.verification": "Organisation",
  "overview.manageVerification": "Verification and documents",
  "overview.listings": "Your listings",
  "overview.addListing": "Add a listing",
  "overview.addProperty": "Add another property",
  "overview.noListings": "No listings yet.",
  "overview.manage": "Manage listing",
  "overview.seePublic": "See it as travellers do",
  "overview.reviewerNote": "Reviewer's note:",
  "overview.inventory": "Rooms and calendar",
  "overview.noUnits": "No rooms set up yet.",
  "overview.unitsSummary": "{units} room types · open on {days} of the next 30 days",
  "overview.referrals": "Referral activity",
  "overview.noReferrals": "No referral activity yet.",
  "overview.referralsNote": "Outbound clicks to your channels, counted from real events. A click is not a booking.",
  "overview.click": "click",
  "overview.clicks": "clicks",
  "overview.terms": "Commercial terms",
  "overview.noTerms": "No commercial agreement is in place. Being listed costs nothing; commission or referral fees apply only under terms you sign. We will propose terms once the property is published.",
  "overview.commission": "{percent}% commission",
  "overview.fee": "{amount} per qualifying referral",
  "overview.validUntil": "valid until {date}",
  "overview.next": "What happens next",
  "overview.nextBody": "A reviewer verifies the property against public records and your official channels, then approves it. Travellers exploring your destination reach your own website, booking page or telephone from the page; TerraStory counts the click and takes nothing in between.",
  "event.OFFICIAL_WEBSITE": "Official website",
  "event.BOOKING_LINK": "Booking page",
  "event.CALL": "Telephone",
  "event.MAPS": "Map",

  /* verification */
  "verification.title": "Verification",
  "verification.lede": "TerraStory verifies the business before any of its listings is shown. This page is where you follow that review and supply what the reviewer needs.",
  "verification.steps": "Review steps",
  "verification.latest": "Latest decision",
  "verification.decidedOn": "Decided on {date}",
  "verification.noDecision": "No decision has been recorded yet.",
  "verification.registration": "Registration you gave",
  "verification.registrationNone": "No registration reference was given.",
  "verification.documents": "Supporting documents",
  "verification.documentsLede": "A tourism registration certificate or trade licence, and proof of your right to operate the property, speed the review. Files are stored privately and only reviewers can open them.",
  "verification.noDocuments": "No documents uploaded yet.",
  "verification.uploaded": "Uploaded {date}",
  "verification.history": "Decision history",
  "verification.noHistory": "Decisions appear here as reviewers make them.",
  "doc.GOVT_REG": "Tourism registration or trade licence",
  "doc.PROPERTY_PROOF": "Proof of right to operate the property",
  "doc.GST": "GST registration certificate",
  "doc.PAN": "Tax document",
  "doc.ID_PROOF": "Identity document",
  "doc.PHOTO": "Photograph",
  "docStatus.PENDING": "Awaiting review",
  "docStatus.APPROVED": "Accepted",
  "docStatus.REJECTED": "Not accepted",
  "upload.kind": "Document type",
  "upload.file": "File",
  "upload.hint": "PDF, JPEG or PNG, up to 4 MB.",
  "upload.submit": "Upload document",
  "upload.pending": "Uploading…",
  "upload.done": "Document uploaded. A reviewer will look at it with your request.",

  /* listings */
  "listings.title": "Listings",
  "listings.lede": "Each listing is one property travellers can find under its destination. Rooms and the calendar hang off a listing.",
  "listings.new": "New listing",
  "listings.empty": "You have no listings yet.",
  "listings.lockedTitle": "New listings open once you are verified",
  "listings.lockedBody": "Your organisation is {status}. Once a reviewer verifies it, you can add further properties here.",
  "listings.units": "{count} room types",
  "listings.noUnits": "No rooms set up",
  "listings.open": "Manage",
  "listings.newTitle": "New listing",
  "listings.newLede": "The listing goes to a reviewer before travellers can see it. Nothing here is published by saving it.",
  "listings.create": "Submit listing for review",
  "listings.creating": "Submitting…",

  /* listing detail */
  "detail.status": "Status",
  "detail.publish": "Publish",
  "detail.unpublish": "Unpublish",
  "detail.published": "Published. Travellers can now find the listing.",
  "detail.unpublished": "Unpublished. The listing is no longer shown to travellers.",
  "detail.publishLocked": "Publishing opens when your organisation is verified and a reviewer has approved this listing.",
  "detail.facts": "Verified facts",
  "detail.factsNote": "These were checked by a reviewer. To correct one, write to us and a reviewer will update it.",
  "detail.about": "About the property",
  "detail.save": "Save changes",
  "detail.saving": "Saving…",
  "detail.saved": "Saved.",
  "detail.units": "Rooms",
  "detail.unitsLede": "The kinds of room you offer, and how many of each. The calendar sets which of them are open on each date.",
  "detail.noUnits": "No rooms yet. Add the first room type below.",
  "detail.addUnit": "Add room type",
  "detail.adding": "Adding…",
  "detail.unitAdded": "Room type added.",
  "detail.unitSaved": "Room type updated.",
  "detail.unitDeleted": "Room type removed.",
  "detail.deleteUnit": "Remove",
  "detail.saveUnit": "Update",
  "detail.openCalendar": "Open calendar",
  "detail.notVisible": "Rooms and dates are private to you. Travellers do not see availability until direct booking is switched on.",

  /* fields */
  "field.name": "Property name",
  "field.type": "Accommodation type",
  "field.destination": "Destination",
  "field.address": "Full address",
  "field.area": "Area or neighbourhood",
  "field.mapsUrl": "Google Maps link",
  "field.officialWebsite": "Official website",
  "field.bookingUrl": "Official booking page",
  "field.description": "Description",
  "field.localCharacter": "Local or cultural character",
  "field.amenities": "Amenities",
  "field.amenitiesHint": "Comma-separated, e.g. breakfast, parking, rooftop.",
  "field.checkInFrom": "Check-in from",
  "field.checkOutBy": "Check-out by",
  "field.houseRules": "House rules",
  "field.cancellationTerms": "Cancellation terms",
  "field.cancellationHint": "In your own words, as you apply them today.",
  "field.unitName": "Room type",
  "field.unitNameHint": "For example: Standard room, Family suite, Dormitory bed.",
  "field.capacity": "Guests per room",
  "field.quantity": "Number of rooms",
  "field.notGiven": "Not given",
  "field.required": "required",
  "field.choose": "Choose…",

  /* calendar */
  "calendar.title": "Calendar",
  "calendar.lede": "Set how many rooms of each type are open on each date, or close dates altogether. Only you see this calendar.",
  "calendar.listing": "Listing",
  "calendar.unit": "Room type",
  "calendar.show": "Show",
  "calendar.prev": "Previous month",
  "calendar.next": "Next month",
  "calendar.noListings": "Add a listing and a room type first; the calendar belongs to a room type.",
  "calendar.noUnits": "This listing has no room types yet.",
  "calendar.addUnits": "Add room types",
  "calendar.legendNotSet": "Not set",
  "calendar.legendOpen": "Open",
  "calendar.legendClosed": "Closed",
  "calendar.legendPast": "Past",
  "calendar.legend": "Legend",
  "calendar.openOf": "{open} of {total} open",
  "calendar.closed": "Closed",
  "calendar.notSet": "Not set",
  "calendar.heldBooked": "{held} held · {booked} booked",
  "calendar.update": "Update dates",
  "calendar.from": "From",
  "calendar.to": "To",
  "calendar.action": "Action",
  "calendar.actionOpen": "Open rooms",
  "calendar.actionClose": "Close dates",
  "calendar.rooms": "Rooms open",
  "calendar.apply": "Apply",
  "calendar.applying": "Saving…",
  "calendar.applied": "Saved {days} dates.",
  "calendar.appliedOne": "Saved 1 date.",
  "calendar.weekdays": "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
  "calendar.dayLabel": "{date}: {state}",

  /* errors */
  "error.generic": "Something went wrong. Please try again.",
  "error.invalid": "Some details need attention.",
  "error.notFound": "That record is not yours or no longer exists.",
  "error.notVerified": "Your organisation must be verified first.",
  "error.rateLimited": "Too many changes in a short span. Please wait a minute and try again.",
  "error.duplicateListing": "You already have a listing with this name in this destination.",
  "error.duplicateUnit": "This listing already has a room type with that name.",
  "error.moveRefused": "That change is not available for this listing right now.",
  "error.quantityBelowCommitted": "Some dates already hold more rooms than that. Lower them in the calendar first.",
  "error.exceedsQuantity": "That is more rooms than this room type has.",
  "error.unitInUse": "This room type has held or booked dates and cannot be removed.",
  "error.range": "Choose a range of up to a year, starting today or later.",
  "error.file": "Choose a PDF, JPEG or PNG file of 4 MB or less.",
  "error.storage": "The document could not be stored. Please try again.",
  "error.name": "Enter a name of 2 to 160 characters.",
  "error.unitName": "Enter a room type of 2 to 80 characters.",
  "error.capacity": "Guests per room must be between 1 and 50.",
  "error.quantity": "Rooms must be between 1 and 500.",
  "error.rooms": "Rooms open must be between 0 and 500.",
  "error.time": "Use a 24-hour time such as 14:00.",
  "error.url": "Must be a full web address starting with http:// or https://",
  "error.address": "Enter the full address.",
  "error.destination": "Choose one of TerraStory's destinations.",
  "error.type": "Choose an accommodation type.",
  "error.long": "That is too long.",
} as const;

export type PartnerMessageKey = keyof typeof en;
type Catalogue = Partial<Record<PartnerMessageKey, string>>;

/* Hindi covers the workspace frame, statuses and navigation first: the words
   a partner reads on every visit. The rest falls back to English. */
const hi: Catalogue = {
  "nav.overview": "सारांश",
  "nav.verification": "सत्यापन",
  "nav.listings": "लिस्टिंग",
  "nav.calendar": "कैलेंडर",
  "nav.label": "पार्टनर कार्यक्षेत्र",
  "shell.eyebrow": "पार्टनर कार्यक्षेत्र",
  "vendor.PENDING": "जमा किया गया",
  "vendor.UNDER_REVIEW": "समीक्षा में",
  "vendor.VERIFIED": "सत्यापित",
  "vendor.APPROVED": "स्वीकृत",
  "vendor.REJECTED": "स्वीकार नहीं",
  "vendor.SUSPENDED": "निलंबित",
  "listing.PENDING": "जमा किया गया",
  "listing.UNDER_REVIEW": "समीक्षा में",
  "listing.VERIFIED": "सत्यापित",
  "listing.APPROVED": "स्वीकृत",
  "listing.PUBLISHED": "प्रकाशित",
  "listing.UNPUBLISHED": "अप्रकाशित",
  "listing.REJECTED": "स्वीकार नहीं",
  "calendar.legendOpen": "खुला",
  "calendar.legendClosed": "बंद",
};

const CATALOGUES: Partial<Record<LanguageCode, Catalogue>> = { en, hi };

export function partnerTranslate(
  key: PartnerMessageKey,
  language: LanguageCode,
  values?: Record<string, string | number>,
): string {
  const template = CATALOGUES[language]?.[key] ?? en[key];
  return values ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : template;
}

export function partnerTranslator(language: LanguageCode) {
  return (key: PartnerMessageKey, values?: Record<string, string | number>) => partnerTranslate(key, language, values);
}

export type PartnerT = ReturnType<typeof partnerTranslator>;

/** True for a string that names a key in this catalogue — for errors returned as keys. */
export function isPartnerMessageKey(value: string): value is PartnerMessageKey {
  return value in en;
}
