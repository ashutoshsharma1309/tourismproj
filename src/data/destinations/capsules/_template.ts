import type { DestinationCapsule } from "@/types/capsule";

/**
 * TEMPLATE — copy this file to `<destination-id>.ts` and fill it in.
 *
 * This file is not registered and renders nowhere. It exists so that adding a
 * destination is a filling-in exercise with the rules written next to the
 * fields, rather than an archaeology exercise across a dozen modules.
 *
 * THE RULES, IN THE ORDER YOU WILL MEET THEM
 * ------------------------------------------
 *  1. **Sources first.** Write the `sources` array before anything else. If
 *     you cannot cite it, you cannot write it. Every place, experience,
 *     history entry and story must name at least one source id from that
 *     array, and `validateCapsule` refuses the file otherwise.
 *
 *  2. **Coordinates only where a source publishes one.** Omit the field
 *     rather than approximating from a map. An omitted coordinate means the
 *     place is not plotted and no distance involving it is computed; an
 *     invented one means the map lies quietly.
 *
 *  3. **Images are vendored and described.** A site-root-relative path under
 *     `public/`, added by `npm run images:vendor`, with `imageAlt` saying
 *     what the photograph shows. No remote URLs. If there is no verified
 *     photograph, omit both fields — the card says so rather than borrowing
 *     someone else's picture.
 *
 *  4. **No practical data.** There is no field for opening hours, prices,
 *     tickets, availability, booking or ratings, and the validator rejects a
 *     file that grows one. Those facts belong to an official source and a
 *     verification pipeline, not to a hand-written capsule.
 *
 *  5. **No rankings.** "Most beautiful", "must-see", "top ten", "world
 *     famous" — the validator scans every text field for these and refuses
 *     the file. Describe what a place IS and let the reader decide.
 *
 *  6. **Claim type on every story.** Documented history, oral tradition and
 *     legend are never merged. If you are unsure which one a narrative is,
 *     that uncertainty is the answer: it is oral tradition or legend.
 *
 *  7. **Scope honestly.** `scope` states what this capsule covers. "The
 *     fortified city and its water architecture" is a scope; "everything
 *     about Jaipur" is a promise a capsule cannot keep.
 *
 * SIZE
 * ----
 * A capsule is meant to be small: roughly 5-15 places, 3-8 experiences, a
 * handful of history entries and stories. If it is growing past that, the
 * destination is asking to be a `researched` destination through the
 * pipeline, or a `deep` one through curation — not a bigger capsule.
 */
export const capsule: DestinationCapsule = {
  destinationId: "REPLACE-ME",
  scope: "What this capsule covers, in one line.",

  sources: [
    // {
    //   id: "unesco-whc-XXXX",
    //   title: "Name of the page or document",
    //   publisher: "UNESCO World Heritage Centre",
    //   url: "https://whc.unesco.org/en/list/XXXX/",
    //   retrievedAt: "2026-01-01",
    //   confidence: "high",
    //   retrievalMethod: "human-curated",
    // },
  ],

  places: [
    // {
    //   id: "some-place",
    //   name: "Some Place",
    //   category: "Fort",
    //   summary: "One or two sentences, drawn from the cited source.",
    //   coordinates: { lat: 0, lng: 0 },   // omit unless the source publishes it
    //   sourceIds: ["unesco-whc-XXXX"],
    // },
  ],

  experiences: [
    // {
    //   id: "some-experience",
    //   title: "What a visitor does or understands here",
    //   explanation: "Why it matters, in the source's own terms.",
    //   themes: ["heritage", "architecture"],
    //   placeIds: ["some-place"],
    //   sourceIds: ["unesco-whc-XXXX"],
    // },
  ],

  history: [
    // {
    //   id: "some-event",
    //   year: 1592,                        // omit where only a period is known
    //   period: "1592",
    //   title: "What happened",
    //   summary: "One or two sentences from the source.",
    //   placeIds: ["some-place"],
    //   sourceIds: ["unesco-whc-XXXX"],
    // },
  ],

  stories: [
    // {
    //   id: "some-story",
    //   title: "The narrative's name",
    //   summary: "Two or three sentences.",
    //   claimType: "oral tradition",
    //   placeIds: ["some-place"],
    //   sourceIds: ["unesco-whc-XXXX"],
    // },
  ],
  culture: [],
  stays: [],

  reviewedAt: "2026-01-01",
  reviewedBy: "your name",
};
