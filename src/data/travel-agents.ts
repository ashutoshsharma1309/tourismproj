import generated from "@/data/generated/registered-travel-agents.json";
import { permitDestinations } from "@/data/permits";
import type { Provenance } from "@/data/sources";
import { licenceStatus, type LicenceStatus } from "@/lib/licence";
import { SIKKIM_DISTRICTS } from "@/types";
import type { SikkimDistrict } from "@/types";

/**
 * The state register of travel agencies.
 *
 * WHY THIS IS PUBLISHED AT ALL
 * ----------------------------
 * Because the department's own permit rules make it load-bearing. Read
 * `permitDestinations` and five of them — Nathula, Tsomgo–Baba Mandir,
 * Singalila, Green Lake and Maenam — state that the permit is applied for
 * *through a registered Travel Agency*. A visitor cannot legally reach Nathula
 * without one.
 *
 * The department publishes the list of those agencies. It publishes it as a
 * seventy-five-page paginated table inside an Angular bundle with no JSON API,
 * sorted by nothing a visitor cares about, with no search and no district
 * filter. So the register exists, and is simultaneously unusable by the person
 * whose trip depends on it — which is the whole reason this file is here.
 *
 * 1,858 agencies. The project did not select them, rank them or vet them; the
 * state did. This renders that work.
 *
 * WHAT IS NOT INVENTED
 * --------------------
 * No rating, no review, no price, no availability, no "recommended" flag. The
 * register records a grade for 70 of 1,858 and nothing for the rest, and an
 * absent grade is rendered as absent — never as a low one. Ordering is by
 * district then name, which is arbitrary but visibly arbitrary; any ranking
 * this project applied would be an editorial judgement it has no basis for.
 *
 * Refresh with `npm run ingest:tourism`, then `node scripts/promote-registers.mjs`.
 */

export interface TravelAgent {
  slug: string;
  name: string;
  district: SikkimDistrict;
  /** Address as the register prints it. Null where it prints none. */
  address: string | null;
  /**
   * Departmental grade — A, B or C — recorded for 70 of 1,858 entries. Null is
   * the normal case and means "the register states no grade", not "ungraded"
   * and certainly not "poor".
   */
  grade: string | null;
  registrationNo: string | null;
  /** Telephone as printed; often several numbers separated by slashes. */
  contact: string | null;
  email: string | null;
  website: string | null;
  issuedOn: string | null;
  licence: LicenceStatus;
  provenance: Provenance;
}

interface GeneratedAgent {
  slug: string;
  name: string;
  district: string | null;
  address: string | null;
  grade: string | null;
  registrationNo: string | null;
  contact: string | null;
  email: string | null;
  website: string | null;
  issuedOn: string | null;
  validUpto: string | null;
}

const DISTRICTS: SikkimDistrict[] = [...SIKKIM_DISTRICTS];

function asDistrict(value: string | null): SikkimDistrict | null {
  if (!value) return null;
  return DISTRICTS.find((d) => d.toLowerCase() === value.trim().toLowerCase()) ?? null;
}

/** The date the register was read — what every licence state is assessed against. */
export const AGENT_REGISTER_RETRIEVED_AT = generated.retrievedAt;

const REGISTER = generated.agents as GeneratedAgent[];

export const travelAgents: TravelAgent[] = REGISTER.flatMap<TravelAgent>((entry) => {
  const district = asDistrict(entry.district);
  if (!district) return [];

  return [
    {
      slug: entry.slug,
      name: entry.name,
      district,
      address: entry.address,
      grade: entry.grade,
      registrationNo: entry.registrationNo,
      contact: entry.contact,
      email: entry.email,
      website: entry.website,
      issuedOn: entry.issuedOn,
      licence: licenceStatus(entry.validUpto, AGENT_REGISTER_RETRIEVED_AT),
      provenance: {
        sourceId: "sikkim-tourism-registered-travel-agents",
        sourceUrl: generated.source.url,
        verifiedAt: generated.retrievedAt,
        confidence: "high",
        caveat:
          entry.grade === null
            ? "On the state register of travel agencies. The department records no grade for this agency, so none is shown."
            : "On the state register of travel agencies, with the grade the department records.",
      },
    },
  ];
}).sort((a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name));

/**
 * The destinations whose permits the department routes through an agency.
 *
 * Derived from the permit records rather than hardcoded, so if the department
 * changes a permit route the list here changes with it instead of going quietly
 * stale.
 */
export const AGENCY_ROUTED_PERMITS = permitDestinations
  .filter((d) => /registered\s+travel\s+agenc/i.test(d.authority))
  .map((d) => ({ slug: d.slug, name: d.name, region: d.region }));

export const AGENT_REGISTER_STATS = {
  published: travelAgents.length,
  reportedTotal: generated.reportedTotal ?? null,
  withGrade: travelAgents.filter((a) => a.grade !== null).length,
  withPhone: travelAgents.filter((a) => a.contact !== null).length,
  withEmail: travelAgents.filter((a) => a.email !== null).length,
  withWebsite: travelAgents.filter((a) => a.website !== null).length,
  retrievedAt: generated.retrievedAt,
  sourceUrl: generated.source.url,
  sourceName: generated.source.name,
  pagesRead: generated.pagesRead ?? null,
} as const;

export function travelAgentsByDistrict(district: SikkimDistrict): TravelAgent[] {
  return travelAgents.filter((a) => a.district === district);
}
