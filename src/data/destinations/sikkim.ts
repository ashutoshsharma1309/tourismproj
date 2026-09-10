import { MONASTERY_TRADITIONS, SIKKIM_DISTRICTS } from "@/types";
import type { Destination } from "@/types/destination";

/**
 * Sikkim — the reference implementation, and the only `deep` destination.
 *
 * This record describes what Sikkim IS. It deliberately holds no factual
 * tourism claims: no description, no highlights, no counts, no "best time to
 * visit". Those are assertions that must cite a source under §22, and they
 * already live in content modules that carry provenance. Identity, geography
 * and vocabulary are true regardless of how much has been researched, so they
 * are the only things a destination record owns.
 *
 * `divisions` and `taxonomies` are built from the tuples in @/types rather
 * than retyped, so the destination model and the Sikkim domain types cannot
 * drift apart. See the note on SIKKIM_DISTRICTS.
 */
export const sikkim: Destination = {
  id: "sikkim",
  name: "Sikkim",
  country: { code: "IN", name: "India" },
  region: { name: "Sikkim", kind: "region" },
  geography: {
    /*
     * Framing only — used to centre a map, never rendered as a claim about
     * where anything is. Individual sites carry their own sourced
     * coordinates, and a site without one is not plotted at all.
     */
    centre: { lat: 27.533, lng: 88.512 },
    bounds: [
      { lat: 27.07, lng: 88.0 },
      { lat: 28.13, lng: 88.92 },
    ],
    timezone: "Asia/Kolkata",
  },
  depth: "deep",
  divisions: SIKKIM_DISTRICTS.map((name) => ({
    id: name.toLowerCase(),
    name,
    kind: "district" as const,
  })),
  taxonomies: [
    {
      id: "buddhist-tradition",
      label: "Tradition",
      values: MONASTERY_TRADITIONS.map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        label: name,
      })),
    },
  ],
  /*
   * The twelve languages audio guides actually exist in — not a wish list.
   * 180 files = 15 sites x 12 languages, each script composed natively in
   * its language rather than translated at runtime.
   */
  languages: ["en", "hi", "ne", "bn", "ar", "de", "es", "fr", "ja", "ko", "ru", "zh"],
  /*
   * The card a shared Sikkim link shows. Same photograph the site-wide card
   * uses, but declared HERE rather than inherited from the root layout — so
   * it belongs to Sikkim and no other destination can pick it up by default.
   *
   * 1920x1280, landscape, close to the 1.91:1 platforms crop to. Bernard
   * Gagnon, CC BY-SA 4.0; the credit is rendered wherever the photograph
   * appears on the site itself. Path is literal rather than img("mon/rumtek")
   * to keep the registry free of a dependency on the image-credits payload —
   * qa:route-migration asserts the file exists in public/.
   */
  socialCard: {
    url: "/images/mon/rumtek.jpg",
    width: 1920,
    height: 1280,
    alt: "The main temple at Rumtek Monastery, Gangtok district, Sikkim",
  },
};
