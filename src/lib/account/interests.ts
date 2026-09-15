import type { JourneyInterest } from "@/lib/planner/types";

/**
 * What each interest means on TerraStory, in the terms the records use
 * (lib/planner/candidates.ts maps record categories to these ten). There is
 * no separate "festivals" or "crafts" interest because no record is tagged
 * that way: festivals are counted under Culture, crafts under Art and
 * Culture — said here so the choice is not a mystery.
 */
export const INTEREST_DESCRIPTION: Record<JourneyInterest, string> = {
  heritage: "Forts, palaces, heritage sites and monuments",
  history: "Events, eras and the places they happened",
  architecture: "Temples, heritage buildings and how they were built",
  sacred: "Temples, monasteries, stupas and other places of worship",
  museums: "Museums and their collections",
  culture: "Festivals, food traditions, communities and crafts",
  art: "Crafts, painting, textiles and making",
  food: "Dishes and food traditions of each destination",
  nature: "Lakes, rivers, valleys, peaks and landscapes",
  local: "Towns, markets and everyday local life",
};
