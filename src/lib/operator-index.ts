import { hotels, REGISTER_STATS } from "@/data/hotels";
import { AGENT_REGISTER_STATS, travelAgents } from "@/data/travel-agents";
import { LICENCE_CAVEAT, tallyLicences, type LicenceState } from "@/lib/licence";

/**
 * The licensed-operator directory's index, built on the server.
 *
 * Same rule as `guide-index.ts` and `search-index.ts`, and the same reason:
 * the directory is a client component, so whatever it imports statically ships
 * in the JavaScript of every route that mounts it.
 *
 * Here the arithmetic is unusually blunt. The two registers hold 2,763
 * establishments between them, and the full records — addresses, provenance
 * objects, caveat strings, Maps URLs — come to roughly a megabyte. Inlining
 * that into the HTML would make every visitor download the entire licensing
 * apparatus of the state of Sikkim in order to read a page about monasteries.
 *
 * So this trims each record to the nine short fields the directory can
 * actually filter or display, and it is served from a static route that is
 * fetched once, on demand, by the one page that needs it. The precedent is
 * `/api/guide`, which exists for exactly this reason and says so.
 *
 * NOTHING IS RANKED HERE. Order is district then name. The registers record a
 * grade for 92 of 2,763 entries, and an absent grade is carried as `null` all
 * the way to the DOM — the one thing this index must never do is let "no grade
 * recorded" render as a bad grade.
 */

export type OperatorKind = "hotel" | "agency";

export interface OperatorRecord {
  slug: string;
  name: string;
  kind: OperatorKind;
  district: string;
  /** Star category (hotels) or A/B/C grade (agencies). Null is the normal case. */
  grade: string | null;
  registrationNo: string | null;
  /** Telephone as the register prints it, slashes and all. */
  contact: string | null;
  licence: LicenceState;
  /** The validity date exactly as printed, for display beside the state. */
  validUpto: string | null;
}

export interface OperatorRegisterSummary {
  kind: OperatorKind;
  label: string;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  published: number;
  reportedTotal: number | null;
  withGrade: number;
  withContact: number;
  current: number;
  lapsed: number;
  undated: number;
}

export interface OperatorIndex {
  operators: OperatorRecord[];
  registers: OperatorRegisterSummary[];
  districts: string[];
  /** Assessment date for every licence state in `operators`. */
  assessedOn: string;
  licenceCaveat: string;
}

export function buildOperatorIndex(): OperatorIndex {
  const hotelRecords: OperatorRecord[] = hotels.map((h) => ({
    slug: h.slug,
    name: h.name,
    kind: "hotel",
    district: h.district,
    grade: h.category,
    registrationNo: h.registrationNo,
    /* The hotels register's telephone lives on the generated row rather than
       the published record, so OSM's number is the one available here. Where
       neither exists the field is null and the UI shows nothing — a directory
       entry without a phone number is still a true directory entry. */
    contact: h.osm?.phone ?? null,
    licence: h.licence.state,
    validUpto: h.licence.printed,
  }));

  const agencyRecords: OperatorRecord[] = travelAgents.map((a) => ({
    slug: a.slug,
    name: a.name,
    kind: "agency",
    district: a.district,
    grade: a.grade,
    registrationNo: a.registrationNo,
    contact: a.contact,
    licence: a.licence.state,
    validUpto: a.licence.printed,
  }));

  const hotelTally = tallyLicences(hotels.map((h) => h.licence));
  const agentTally = tallyLicences(travelAgents.map((a) => a.licence));

  const registers: OperatorRegisterSummary[] = [
    {
      kind: "hotel",
      label: "Registered hotels",
      sourceName: "Tourism & Civil Aviation Department, Government of Sikkim",
      sourceUrl: REGISTER_STATS.sourceUrl,
      retrievedAt: REGISTER_STATS.retrievedAt,
      published: REGISTER_STATS.published,
      reportedTotal: REGISTER_STATS.reportedTotal,
      withGrade: REGISTER_STATS.withCategory,
      withContact: hotelRecords.filter((r) => r.contact).length,
      current: hotelTally.current,
      lapsed: hotelTally.lapsed,
      undated: hotelTally.undated,
    },
    {
      kind: "agency",
      label: "Registered travel agencies",
      sourceName: AGENT_REGISTER_STATS.sourceName,
      sourceUrl: AGENT_REGISTER_STATS.sourceUrl,
      retrievedAt: AGENT_REGISTER_STATS.retrievedAt,
      published: AGENT_REGISTER_STATS.published,
      reportedTotal: AGENT_REGISTER_STATS.reportedTotal,
      withGrade: AGENT_REGISTER_STATS.withGrade,
      withContact: AGENT_REGISTER_STATS.withPhone,
      current: agentTally.current,
      lapsed: agentTally.lapsed,
      undated: agentTally.undated,
    },
  ];

  const operators = [...hotelRecords, ...agencyRecords].sort(
    (a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name),
  );

  return {
    operators,
    registers,
    districts: [...new Set(operators.map((o) => o.district))].sort(),
    assessedOn: REGISTER_STATS.retrievedAt,
    licenceCaveat: LICENCE_CAVEAT,
  };
}

/** Totals cheap enough to render on the server without the full index. */
export const OPERATOR_TOTALS = {
  hotels: hotels.length,
  agencies: travelAgents.length,
  all: hotels.length + travelAgents.length,
} as const;
