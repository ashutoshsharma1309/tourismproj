/**
 * Sharper Google Maps destinations for the public properties.
 *
 * The register's own name plus its district is enough to build a Maps search
 * that resolves, and every one of them does. It is not always enough to
 * resolve to the RIGHT building. "Lemon Tree, Gangtok District, Sikkim" asks
 * Maps to disambiguate a national chain from the district name alone, and "The
 * Retreat, Soreng District" is barely a name at all.
 *
 * Two things fix that without inventing anything. The register publishes a
 * locality for every property — Sichey, Baiguney, Amdo Golai — which is the
 * detail a search needs. And where the media research established the
 * operator's own trading name for a property, that name is what a map knows it
 * by: the register's "The Retreat" is signed Simala Retreat, and its
 * "May Fair Resort" is the Mayfair Spa Resort & Casino.
 *
 * Both are recorded facts, not guesses. Anything not listed here keeps the
 * register-derived query, and a property with verified coordinates keeps its
 * pin, which is better than any search string.
 */

export interface MapsOverride {
  /** The name a map is most likely to hold, where it differs from the register. */
  tradingName?: string;
  /** The locality as the register prints it. */
  locality: string;
  /** Why this differs from the register name, where it does. */
  note?: string;
}

export const MAPS_OVERRIDES: Record<string, MapsOverride> = {
  "may-fair-resort": {
    tradingName: "Mayfair Spa Resort & Casino",
    locality: "Lower Samdur, Ranipool, Gangtok",
    note: "The register writes the brand as two words; the property signs itself Mayfair.",
  },
  "chumbi-mountain-retreat": {
    tradingName: "The Chumbi Mountain Retreat Resort & Spa",
    locality: "Naku, Pelling",
    note: "Operated by Club Mahindra, whose own page carries the fuller name.",
  },
  "denzong-regency": { locality: "Forest Colony, Gangtok" },
  "lemon-tree": {
    tradingName: "Lemon Tree Hotel Gangtok",
    locality: "Sichey, Gangtok",
    note: "A national chain — the town must be in the query or a map may answer with another city.",
  },
  "gangtok-drift": { tradingName: "Hotel Gangtok Drift", locality: "Bahai School Road, Tadong, Gangtok" },
  "golden-crest": { tradingName: "The Golden Crest", locality: "Amdo Golai, Gangtok" },
  "planter-s-home": { tradingName: "Hotel The Planters Home", locality: "Mangan" },
  "the-retreat": {
    tradingName: "Simala Retreat",
    locality: "Baiguney, Soreng",
    note: "Formerly The Retreat by Zuri, then Club Mahindra Baiguney; the register still holds the original name.",
  },
  "the-bamboo-retreat": { locality: "Sajong, Rumtek" },
};

/** The query string for a property, sharpened where we know more. */
export function mapsQuery(slug: string, registerName: string, district: string): string {
  const override = MAPS_OVERRIDES[slug];
  if (!override) return `${registerName}, ${district} District, Sikkim, India`;
  return `${override.tradingName ?? registerName}, ${override.locality}, Sikkim, India`;
}
