import { SOURCES } from "@/data/sources";
import type { Provenance } from "@/data/sources";

/**
 * Verified Sikkim tourism statistics (§20, §21).
 *
 * Every metric carries value, period, geography and source. Nothing is
 * displayed that cannot be traced. An earlier revision reported 21,47,892
 * arrivals for 2025 and a ₹12.5 Cr TSD total — both were invented and have
 * been replaced with published figures or removed outright.
 */

export interface VerifiedMetric {
  id: string;
  label: string;
  /** Null when no trustworthy figure exists — the UI shows "Data not available". */
  value: number | null;
  unit: "people" | "count" | "inr";
  period: string;
  geography: string;
  provenance: Provenance;
  /** Prior-period value for a change indicator, when published. */
  previousValue?: number;
  previousPeriod?: string;
}

const arrivalsProvenance: Provenance = {
  sourceId: "sikkim-arrivals-2025",
  sourceUrl: SOURCES["sikkim-arrivals-2025"]!.url,
  verifiedAt: "2026-08-14",
  confidence: "medium",
  caveat: "Press reporting of departmental figures; awaiting the official handbook.",
};

export const TOURISM_METRICS: VerifiedMetric[] = [
  {
    id: "arrivals-total-2025",
    label: "Tourist arrivals",
    value: 1_712_360,
    unit: "people",
    period: "2025",
    geography: "Sikkim",
    provenance: arrivalsProvenance,
    previousValue: 1_625_241,
    previousPeriod: "2024",
  },
  {
    id: "arrivals-domestic-2025",
    label: "Domestic arrivals",
    value: 1_635_650,
    unit: "people",
    period: "2025",
    geography: "Sikkim",
    provenance: arrivalsProvenance,
    previousValue: 1_540_421,
    previousPeriod: "2024",
  },
  {
    id: "arrivals-foreign-2025",
    label: "Foreign arrivals",
    value: 61_710,
    unit: "people",
    period: "2025",
    geography: "Sikkim",
    provenance: arrivalsProvenance,
    previousValue: 84_820,
    previousPeriod: "2024",
  },
  {
    id: "tsd-collected",
    label: "TSD Fund collected",
    value: null,
    unit: "inr",
    period: "since March 2025",
    geography: "Sikkim",
    provenance: {
      sourceId: "sikkim-tourist-trade-rules-2025",
      sourceUrl: SOURCES["sikkim-tourist-trade-rules-2025"]!.url,
      verifiedAt: "2026-08-14",
      confidence: "unverified",
      caveat:
        "The fund exists and its ₹50 mechanism is documented, but no collection total has been published. Deliberately shown as unavailable rather than estimated.",
    },
  },
];

export function getTourismMetrics(): VerifiedMetric[] {
  return TOURISM_METRICS;
}

export function getMetric(id: string): VerifiedMetric | undefined {
  return TOURISM_METRICS.find((m) => m.id === id);
}
