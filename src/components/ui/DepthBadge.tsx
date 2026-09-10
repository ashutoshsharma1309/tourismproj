import { Badge } from "@/components/ui/Badge";
import { DATA_DEPTH_LABEL } from "@/types/destination";
import type { DataDepth } from "@/types/destination";

/**
 * How well a destination is known, stated before the visitor commits to it.
 *
 * This is the navigation-level form of what /preservation already does for
 * Sikkim: publish the gaps rather than hide them. With destinations at
 * genuinely different depths, a reader who opens a thin one should have been
 * told beforehand — otherwise "less content" reads as "broken".
 */
const TONE: Record<DataDepth, "jade" | "info" | "marigold-soft" | "neutral"> = {
  deep: "jade",
  curated: "info",
  researched: "marigold-soft",
  /* Distinct from `planned` — a capsule HAS content — and quieter than the
     researched tier, which has a pipeline behind it. */
  capsule: "info",
  planned: "neutral",
};

export function DepthBadge({ depth }: { depth: DataDepth }) {
  return <Badge tone={TONE[depth]}>{DATA_DEPTH_LABEL[depth]}</Badge>;
}
