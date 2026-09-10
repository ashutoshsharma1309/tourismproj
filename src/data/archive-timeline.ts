import { archiveItems } from "@/data/archive";
import type { ArchiveItem } from "@/data/archive";

/**
 * The archive, on a timeline.
 *
 * WHY ONLY PART OF IT IS ON THE TIMELINE
 * --------------------------------------
 * 34 of the 77 catalogued objects carry a date. The other 43 do not, and that
 * is not missing metadata to be filled in later: a photograph of gundruk, of a
 * chyabrung drum, of Gurudongmar Lake documents a practice or a place that has
 * no single moment. Assigning them a year to make the timeline look complete
 * would be inventing data, which is the one thing this archive does not do.
 *
 * So the dated objects are placed in time and the undated ones are presented as
 * what they are — living practice, continuously true — in their own group.
 * `UNDATED_COUNT` is published so the page can say so rather than quietly
 * showing two thirds of the collection.
 *
 * WHAT THE YEAR IS FOR
 * --------------------
 * Ordering, and nothing else. The label a visitor reads is always the curated
 * period string exactly as written — "Capital 1793 – 1894", "Founded late 19th
 * century", "Ceded 1835". The parsed year never replaces it, because "1793" on
 * its own would state something narrower than the record does.
 */

export type ArchiveEra =
  | "Before 1700"
  | "18th century"
  | "19th century"
  | "20th century"
  | "21st century";

export const ARCHIVE_ERAS: { id: ArchiveEra; span: string; blurb: string }[] = [
  {
    id: "Before 1700",
    span: "to 1699",
    blurb:
      "Founding-era material: the monasteries established in the first decades of the Namgyal kingdom, and the objects that belong to them.",
  },
  {
    id: "18th century",
    span: "1700 – 1799",
    blurb:
      "Expansion and invasion. The six great monasteries take shape while Gorkha and Bhutanese forces contest the kingdom's borders.",
  },
  {
    id: "19th century",
    span: "1800 – 1899",
    blurb:
      "The colonial encounter. Treaties, cessions and the first photographs of the region — most of them made by people who came to survey it.",
  },
  {
    id: "20th century",
    span: "1900 – 1999",
    blurb:
      "From protectorate to kingdom to Indian state, and the rebuilding of monasteries after the 1959 exodus from Tibet.",
  },
  {
    id: "21st century",
    span: "2000 –",
    blurb: "What has been built, opened or recognised inside living memory.",
  },
];

/** Stable anchor for an era heading, matching the history timeline's scheme. */
export function archiveEraAnchor(era: ArchiveEra): string {
  return `archive-era-${era.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * A sort year, or null when the period names none.
 *
 * Reads the FIRST four-digit year in the label, which is the one that matters
 * for placement: "Capital 1793 – 1894" belongs where the capital moved, and
 * "1642 – 1975" belongs at the founding of the kingdom rather than at its end.
 *
 * A bare century — "Founded late 19th century" — sorts to the middle of that
 * century. Sorting it to the century's first year would place it before every
 * dated object in the same era, which asserts an ordering the source does not
 * support; the middle is the least wrong point and nothing in the UI shows it.
 */
export function sortYearOf(period: string | null): number | null {
  if (!period) return null;

  const year = period.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (year?.[1]) return Number(year[1]);

  const century = period.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+century\b/i);
  if (century?.[1]) return (Number(century[1]) - 1) * 100 + 50;

  return null;
}

function eraOf(year: number): ArchiveEra {
  if (year < 1700) return "Before 1700";
  if (year < 1800) return "18th century";
  if (year < 1900) return "19th century";
  if (year < 2000) return "20th century";
  return "21st century";
}

/**
 * What the gutter prints beside a row, or null when nothing honest fits.
 *
 * Only an explicit four-digit year is shown as a year. "Founded late 19th
 * century" sorts to 1850 and must never be printed as 1850 — it becomes
 * "19th c." instead, which is what the source actually says. A period with
 * neither gets no marker rather than a guess.
 */
export function gutterLabelOf(period: string | null): string | null {
  if (!period) return null;
  const year = period.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (year?.[1]) return year[1];
  const century = period.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+century\b/i);
  if (century?.[1]) return `${century[1]}th c.`;
  return null;
}

export interface TimelineEntry {
  item: ArchiveItem;
  year: number;
  era: ArchiveEra;
  /** The rail marker: an explicit year, a century, or nothing. */
  gutter: string | null;
}

/** Every dated object, earliest first. */
export const archiveTimeline: TimelineEntry[] = archiveItems
  .map((item) => {
    const year = sortYearOf(item.period);
    return year === null
      ? null
      : { item, year, era: eraOf(year), gutter: gutterLabelOf(item.period) };
  })
  .filter((entry): entry is TimelineEntry => entry !== null)
  .sort((a, b) => a.year - b.year || a.item.title.localeCompare(b.item.title));

export interface TimelineEra {
  era: ArchiveEra;
  span: string;
  blurb: string;
  entries: TimelineEntry[];
}

/** The timeline grouped by era, oldest first. Empty eras are dropped. */
export const archiveTimelineByEra: TimelineEra[] = ARCHIVE_ERAS.map((era) => ({
  ...era,
  era: era.id,
  entries: archiveTimeline.filter((entry) => entry.era === era.id),
})).filter((group) => group.entries.length > 0);

/**
 * The objects with no date, grouped by what they document.
 *
 * Ordered so the material photographed in Sikkim leads. The rest are honest
 * stand-ins — a Ladakhi prayer wheel for a practice Sikkim shares — and they
 * belong at the end of their group rather than at the front of the page.
 */
export const undatedArchiveItems: ArchiveItem[] = archiveItems
  .filter((item) => sortYearOf(item.period) === null)
  .sort(
    (a, b) =>
      Number(b.sikkimSubject) - Number(a.sikkimSubject) ||
      a.category.localeCompare(b.category) ||
      a.title.localeCompare(b.title),
  );

export const TIMELINE_STATS = {
  dated: archiveTimeline.length,
  undated: undatedArchiveItems.length,
  total: archiveItems.length,
  eras: archiveTimelineByEra.length,
  earliest: archiveTimeline[0]?.year ?? null,
  latest: archiveTimeline[archiveTimeline.length - 1]?.year ?? null,
  /** Dated objects actually photographed in Sikkim. */
  datedInSikkim: archiveTimeline.filter((entry) => entry.item.sikkimSubject).length,
} as const;
