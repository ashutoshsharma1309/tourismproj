/**
 * The bands a destination's timeline is grouped into.
 *
 * WHY NOT NAMED PERIODS
 * ---------------------
 * Sikkim's six eras — "The Namgyal Kingdom", "The Colonial Encounter",
 * "Political Transformation" — are Sikkim's own periodisation, written by
 * someone who read its history. Applying those names to Kyoto would be the
 * "Monasteries for Paris" defect in a new place, and inventing fourteen more
 * sets of names would be fourteen unsourced historical judgements.
 *
 * These are the conventional historiographic bands instead. They are claims
 * about the calendar, not about the destination: nothing here asserts that
 * anything in particular happened to Rome in 1500. A band appears only when
 * the destination has events inside it, so a city whose record starts in the
 * twelfth century shows no Ancient heading rather than an empty one.
 *
 * A destination that later earns a real, sourced periodisation should get it
 * — the same way Sikkim has one — and this is the honest default until then.
 */

export interface Era {
  id: string;
  label: string;
  /** Inclusive lower bound; -Infinity for the first band. */
  from: number;
  /** Exclusive upper bound; Infinity for the last. */
  to: number;
  /** Shown under the heading so the band is never mistaken for a claim. */
  range: string;
}

export const ERAS: Era[] = [
  { id: "ancient", label: "Ancient", from: -Infinity, to: 500, range: "to AD 500" },
  { id: "medieval", label: "Medieval", from: 500, to: 1500, range: "500 – 1500" },
  { id: "early-modern", label: "Early modern", from: 1500, to: 1800, range: "1500 – 1800" },
  { id: "modern", label: "Modern", from: 1800, to: 1945, range: "1800 – 1945" },
  { id: "contemporary", label: "Contemporary", from: 1945, to: Infinity, range: "since 1945" },
];

/* The bands are exhaustive over the number line, so this cannot miss; the
   fallback exists to satisfy `noUncheckedIndexedAccess`, not a real case. */
const LAST = ERAS[ERAS.length - 1] as Era;

export function eraOf(year: number): Era {
  return ERAS.find((era) => year >= era.from && year < era.to) ?? LAST;
}

/** Group events into the bands that actually contain any. */
export function groupByEra<T extends { year: number }>(events: readonly T[]) {
  return ERAS.map((era) => ({
    era,
    events: events
      .filter((event) => event.year >= era.from && event.year < era.to)
      .sort((a, b) => a.year - b.year),
  })).filter((band) => band.events.length > 0);
}

/**
 * How a year should be written.
 *
 * A negative sortYear is BCE, and the minus sign is a storage detail no
 * reader should ever be shown — Varanasi's earliest record is 528 BCE, not
 * "-528". Precision is never added: a year is a year, and nothing here
 * invents a month for it.
 */
export function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `AD ${year}`;
}
