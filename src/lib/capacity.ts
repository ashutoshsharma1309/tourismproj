import { hotels } from "@/data/hotels";
import { monasteries } from "@/data/monasteries";
import { places } from "@/data/places";
import { travelAgents } from "@/data/travel-agents";
import { tallyLicences, type LicenceTally } from "@/lib/licence";
import { SIKKIM_DISTRICTS } from "@/types";
import type { SikkimDistrict } from "@/types";

/**
 * The capacity gap: where Sikkim's heritage is, against where its tourism
 * trade is registered.
 *
 * WHAT THIS COMPARES
 * ------------------
 * Two things the state itself publishes, joined on district — which nobody
 * currently publishes together:
 *
 *   1. Heritage this archive has catalogued and sourced (53 sites).
 *   2. The businesses licensed to receive visitors: 905 hotels and 1,858
 *      travel agencies, from the departmental registers.
 *
 * The result is stark enough to be worth stating carefully. Heritage runs
 * roughly 26 / 25 / 19 / 17 / 8 / 6 percent across the six districts.
 * Registered accommodation runs 75 / 2 / 11 / 6 / 1 / 5. Mangan holds very
 * nearly as much catalogued heritage as Gangtok and about a thirty-fourth of
 * its registered hotel supply.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not a recommendation, a forecast, or an investment case, and the UI
 * must never render it as one. Three limits are structural and travel with
 * every figure this module produces:
 *
 *   - **The heritage denominator is this archive, not Sikkim.** 53 catalogued
 *     sites is a sourced subset, not an inventory of everything in the state.
 *     A district's share here is a share of *what this project has catalogued*,
 *     which is itself shaped by what sources were available. `HERITAGE_CAVEAT`
 *     says so wherever the index appears.
 *   - **Thin supply is not necessarily neglect.** Mangan is North Sikkim. The
 *     October 2023 South Lhonak glacial-lake outburst destroyed thirteen
 *     bridges and much of the connectivity infrastructure along the Teesta
 *     (SOURCES["sikkim-glof-2023"]). Whether that shock explains any part of
 *     these figures is unsourceable — nobody publishes Mangan hotel supply or
 *     arrivals since — so a low figure may record damage rather than an
 *     opportunity, and this module will not distinguish the two.
 *   - **The registers may lag.** See `LICENCE_CAVEAT` in `lib/licence.ts`.
 *
 * So this is an *observation with candidate explanations*, offered to someone
 * who can go and check. That is the most it can honestly be, and it is still
 * more than anyone else currently publishes.
 */

export const HERITAGE_CAVEAT =
  "Heritage share is measured against the 53 sites this archive has catalogued and sourced, not against a complete inventory of Sikkim — no such public inventory exists. A district's share is therefore a share of what has been catalogued here.";

export const ACCESS_CAVEAT =
  "Low registered supply is not evidence of opportunity on its own. Mangan is North Sikkim, where the October 2023 South Lhonak glacial-lake outburst destroyed thirteen bridges and much of the connectivity infrastructure along the Teesta. Whether that shock explains any part of the figures here is not something this data can settle — no source we found reports hotel supply or arrivals in Mangan since — but a gap may record damage rather than an opening, and it should not be read as the latter by default.";

export interface DistrictCapacity {
  district: SikkimDistrict;
  /** Catalogued monasteries + places in this district. */
  heritageSites: number;
  monasteries: number;
  places: number;
  heritageShare: number;
  hotels: number;
  hotelShare: number;
  agents: number;
  agentShare: number;
  /**
   * Registered hotel share ÷ catalogued heritage share.
   *
   * 1.00 means the district carries the same share of the state's registered
   * accommodation as it does of the catalogued heritage. Below 1.00 means less
   * accommodation is registered there than its heritage share would match;
   * above 1.00 means more. It is a ratio of two shares and nothing more —
   * in particular it is not a score, and a low value is not a rating.
   */
  accommodationIndex: number | null;
  /** The same ratio for agencies. */
  agencyIndex: number | null;
  hotelLicences: LicenceTally;
  agentLicences: LicenceTally;
}

/* The six districts, from the destination record rather than a fifth copy
   of the same list. See SIKKIM_DISTRICTS in @/types. */
const DISTRICTS: SikkimDistrict[] = [...SIKKIM_DISTRICTS];

function share(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

function index(supplyShare: number, heritageShare: number): number | null {
  /* A district with nothing catalogued has no denominator, and dividing by
     zero here would print Infinity next to a real government figure. */
  if (heritageShare === 0) return null;
  return supplyShare / heritageShare;
}

const totalSites = monasteries.length + places.length;
const totalHotels = hotels.length;
const totalAgents = travelAgents.length;

export const districtCapacity: DistrictCapacity[] = DISTRICTS.map((district) => {
  const mon = monasteries.filter((m) => m.district === district).length;
  const plc = places.filter((p) => p.district === district).length;
  const sites = mon + plc;

  const districtHotels = hotels.filter((h) => h.district === district);
  const districtAgents = travelAgents.filter((a) => a.district === district);

  const heritageShare = share(sites, totalSites);
  const hotelShare = share(districtHotels.length, totalHotels);
  const agentShare = share(districtAgents.length, totalAgents);

  return {
    district,
    heritageSites: sites,
    monasteries: mon,
    places: plc,
    heritageShare,
    hotels: districtHotels.length,
    hotelShare,
    agents: districtAgents.length,
    agentShare,
    accommodationIndex: index(hotelShare, heritageShare),
    agencyIndex: index(agentShare, heritageShare),
    hotelLicences: tallyLicences(districtHotels.map((h) => h.licence)),
    agentLicences: tallyLicences(districtAgents.map((a) => a.licence)),
  };
}).sort((a, b) => b.heritageSites - a.heritageSites);

export const CAPACITY_TOTALS = {
  heritageSites: totalSites,
  monasteries: monasteries.length,
  places: places.length,
  hotels: totalHotels,
  agents: totalAgents,
  districts: DISTRICTS.length,
  heritageCaveat: HERITAGE_CAVEAT,
  accessCaveat: ACCESS_CAVEAT,
} as const;

/**
 * The districts carrying more catalogued heritage than registered supply.
 *
 * Sorted by how wide the gap is. Named `underRegistered` rather than
 * `opportunities` on purpose — the first is a description, the second is a
 * claim this data cannot support.
 */
export const underRegisteredDistricts = districtCapacity
  .filter((d) => d.accommodationIndex !== null && d.accommodationIndex < 1)
  .sort((a, b) => (a.accommodationIndex ?? 0) - (b.accommodationIndex ?? 0));

/** The single widest gap, for the summary line. Null if every district is at or above parity. */
export const widestGap: DistrictCapacity | null = underRegisteredDistricts[0] ?? null;
