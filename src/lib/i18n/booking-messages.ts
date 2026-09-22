import type { LanguageCode } from "./languages";

/**
 * Search, booking and checkout, as message keys. Same arrangement as
 * partner-messages.ts: English complete, other languages partial by type,
 * English fallback per key. `{name}` placeholders are filled here.
 */
const en = {
  /* search */
  "search.title": "Find a verified stay",
  "search.lede": "Stays run by TerraStory partners whose organisation and property a reviewer has verified. Rooms and rates are the property's own; nothing here is estimated.",
  "search.destination": "Destination",
  "search.anyDestination": "Any destination",
  "search.checkIn": "Arrival",
  "search.checkOut": "Departure",
  "search.guests": "Guests",
  "search.type": "Kind of stay",
  "search.anyType": "Any kind",
  "search.amenities": "Amenities",
  "search.submit": "Search",
  "search.clear": "Clear",
  "search.results": "{count} verified stays",
  "search.resultsOne": "1 verified stay",
  "search.empty": "No verified partner stay matches. Try another destination, fewer amenities or other dates.",
  "search.emptyDates": "No verified partner stay has rooms open for these dates. Try other dates or another destination.",
  "search.chooseDates": "Choose arrival and departure dates to see which rooms are open and what they cost.",
  "search.availableFrom": "Rooms open for your dates, from {amount} for the stay",
  "search.bookable": "Book rooms directly once you choose dates",
  "search.notBookable": "Book through the property's own channels",
  "search.hiddenUnavailable": "{count} more verified stays have no rooms open for these dates.",
  "search.view": "View stay",
  "search.verified": "Verified partner",
  "search.nights": "{count} nights",
  "search.night": "1 night",

  /* stay problems */
  "stay.invalid-date": "Choose real dates.",
  "stay.past": "Arrival can't be in the past.",
  "stay.order": "Departure must be after arrival.",
  "stay.too-long": "Stays can be up to 30 nights.",
  "stay.too-far": "Rooms can't be reserved that far ahead yet.",

  /* listing booking panel */
  "book.title": "Rooms and rates",
  "book.lede": "Rooms, rates and dates are set by the property. Reserving holds rooms for 10 minutes while you check out.",
  "book.notConfigured": "Direct booking is not set up for this property yet. Use the property's own channels above.",
  "book.chooseDates": "Choose your dates to see which rooms are open.",
  "book.update": "Show rooms",
  "book.sleeps": "Sleeps {count} per room",
  "book.roomsOpen": "{count} rooms left for these dates",
  "book.roomOpen": "1 room left for these dates",
  "book.perRoom": "{amount} per room for {nights}",
  "book.rooms": "Rooms",
  "book.reserve": "Reserve",
  "book.reserving": "Holding rooms…",
  "book.holdNote": "Rooms are held for 10 minutes. Nothing is charged.",
  "book.reason.not-open": "Not open for these dates",
  "book.reason.closed": "Closed on some of these dates",
  "book.reason.not-priced": "Not bookable online for these dates",
  "book.reason.sold-out": "Not enough rooms left for your party",
  "book.noneOpen": "No room type is open for all of these dates.",
  "book.houseInfo": "House information",
  "book.checkInFrom": "Check-in from",
  "book.checkOutBy": "Check-out by",
  "book.houseRules": "House rules",
  "book.cancellation": "Cancellation terms",
  "book.cancellationNote": "As stated by the property.",
  "book.photos": "The property has not published photographs here yet.",

  /* hold errors */
  "hold.error.invalid-date": "Choose real dates.",
  "hold.error.past": "Arrival can't be in the past.",
  "hold.error.order": "Departure must be after arrival.",
  "hold.error.too-long": "Stays can be up to 30 nights.",
  "hold.error.too-far": "Rooms can't be reserved that far ahead yet.",
  "hold.error.rooms": "Choose between 1 and 10 rooms.",
  "hold.error.guests": "Choose between 1 and 50 guests.",
  "hold.error.capacity": "That many guests need more rooms of this type.",
  "hold.error.not-found": "That room type no longer exists.",
  "hold.error.not-bookable": "This property is not taking bookings right now.",
  "hold.error.not-open": "These rooms are not open for all of your dates.",
  "hold.error.closed": "The property has closed some of your dates.",
  "hold.error.not-priced": "These rooms can't be booked online for your dates.",
  "hold.error.sold-out": "Someone else just took those rooms. Fewer rooms or other dates may still be open.",
  "hold.error.busy": "Too many people are booking at once. Please try again.",
  "hold.error.rateLimited": "That is a lot of reservations in a short time. Please wait a few minutes.",

  /* checkout */
  "checkout.title": "Checkout",
  "checkout.code": "Reservation {code}",
  "checkout.held": "Your rooms are held",
  "checkout.heldUntil": "Held until {time} (India time).",
  "checkout.remaining": "Time left",
  "checkout.expiredTitle": "This hold has expired",
  "checkout.expiredBody": "The rooms have been released for other travellers. They may still be open: choose your dates again.",
  "checkout.cancelledTitle": "You released these rooms",
  "checkout.cancelledBody": "Nothing was charged. The rooms are open for other travellers again.",
  "checkout.backToStay": "Back to the stay",
  "checkout.stay": "Your stay",
  "checkout.property": "Property",
  "checkout.roomType": "Room type",
  "checkout.dates": "Dates",
  "checkout.datesValue": "{checkIn} to {checkOut}, {nights}",
  "checkout.guests": "Guests",
  "checkout.rooms": "Rooms",
  "checkout.breakdown": "Price breakdown",
  "checkout.night": "Night of {date}",
  "checkout.nightLine": "{rooms} × {price}",
  "checkout.total": "Total",
  "checkout.noExtras": "The property has set no taxes or fees on top of this rate.",
  "checkout.contact": "Contact telephone",
  "checkout.contactHint": "The property uses this to reach you about your stay.",
  "checkout.saveContact": "Save telephone",
  "checkout.contactSaved": "Telephone saved.",
  "checkout.contactInvalid": "Enter a telephone number with country code, e.g. +91 98765 43210",
  "checkout.payment": "Payment",
  "checkout.testState": "Test state",
  "checkout.paymentNotConnected": "Online payment is not connected yet. Nothing will be charged, and this reservation is not a confirmed booking: the rooms are only held until the time above.",
  "checkout.payDisabled": "Pay {amount}",
  "checkout.release": "Release these rooms",
  "checkout.releasing": "Releasing…",
  "checkout.notYours": "That reservation is not yours or no longer exists.",
} as const;

export type BookingMessageKey = keyof typeof en;
type Catalogue = Partial<Record<BookingMessageKey, string>>;

const hi: Catalogue = {
  "search.title": "सत्यापित ठहरने की जगह खोजें",
  "search.destination": "गंतव्य",
  "search.checkIn": "आगमन",
  "search.checkOut": "प्रस्थान",
  "search.guests": "मेहमान",
  "search.submit": "खोजें",
  "book.reserve": "आरक्षित करें",
  "checkout.title": "चेकआउट",
  "checkout.total": "कुल",
};

const CATALOGUES: Partial<Record<LanguageCode, Catalogue>> = { en, hi };

export function bookingTranslator(language: LanguageCode) {
  return (key: BookingMessageKey, values?: Record<string, string | number>) => {
    const template = CATALOGUES[language]?.[key] ?? en[key];
    return values ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : template;
  };
}

export type BookingT = ReturnType<typeof bookingTranslator>;
