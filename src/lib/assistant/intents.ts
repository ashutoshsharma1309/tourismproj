import { isNextIntent } from "@/lib/personalization/guide";

import type { Intent } from "./types";

/**
 * What a question is asking for — decided by rules, before any model.
 *
 * The intent chooses the tools, and several intents need no model at all:
 * a distance is arithmetic on two coordinates, "near me" is a geographic
 * query, a permit answer is the department's own record. Classifying first is
 * what keeps "how far is Rumtek from Gangtok" a 30-millisecond lookup instead
 * of a model call, and what keeps the model out of answers it has no business
 * wording.
 */

const LANGUAGE_WORDS: [RegExp, string][] = [
  [/\b(english)\b/, "en"],
  [/\b(hindi)\b|हिंदी|हिन्दी/, "hi"],
  [/\b(nepali)\b|नेपाली/, "ne"],
  [/\b(bengali|bangla)\b|বাংলা/, "bn"],
  [/\b(tamil)\b|தமிழ்/, "ta"],
  [/\b(telugu)\b|తెలుగు/, "te"],
  [/\b(kannada)\b|ಕನ್ನಡ/, "kn"],
  [/\b(malayalam)\b|മലയാളം/, "ml"],
  [/\b(marathi)\b|मराठी/, "mr"],
  [/\b(gujarati)\b|ગુજરાતી/, "gu"],
  [/\b(punjabi)\b|ਪੰਜਾਬੀ/, "pa"],
  [/\b(odia|oriya)\b/, "or"],
  [/\b(japanese)\b/, "ja"],
  [/\b(korean)\b/, "ko"],
  [/\b(chinese|mandarin)\b/, "zh"],
  [/\b(arabic)\b/, "ar"],
  [/\b(russian)\b/, "ru"],
  [/\b(german)\b/, "de"],
  [/\b(french)\b/, "fr"],
  [/\b(spanish)\b/, "es"],
];

/** "Tell me this in Hindi" → "hi". Only when the question asks for a language. */
export function requestedLanguage(question: string): string | null {
  const q = question.toLowerCase();
  if (!/\b(in|into|translate|say|explain|tell|speak)\b|में/.test(q)) return null;
  for (const [pattern, code] of LANGUAGE_WORDS) if (pattern.test(q)) return code;
  return null;
}

/** "I have 3 hours", "90 minutes", "half a day" → minutes. */
export function availableMinutes(question: string): number | null {
  const q = question.toLowerCase();
  const hours = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/.exec(q);
  if (hours) return Math.round(Number(hours[1]) * 60);
  const minutes = /(\d+)\s*(?:minutes?|mins?)\b/.exec(q);
  if (minutes) return Number(minutes[1]);
  if (/\bhalf (a )?day\b/.test(q)) return 240;
  if (/\b(one|a|full|whole) day\b|\brest of (my|the) day\b/.test(q)) return 480;
  return null;
}

const RULES: [Intent, RegExp][] = [
  ["EMERGENCY", /\b(emergency|ambulance|police|accident|injured|injury|bleeding|heart attack|unconscious|lost my (passport|child)|help me urgently)\b/],
  ["TRANSLATE", /\b(translate|in (english|hindi|nepali|bengali|bangla|tamil|telugu|kannada|malayalam|marathi|gujarati|punjabi|odia|japanese|korean|chinese|arabic|russian|german|french|spanish))\b|में (बताओ|बताइए|समझाइए)/],
  ["AUDIO_GUIDE", /\b(audio guide|listen to (the )?guide|narrat)/],
  ["WHERE_AM_I", /\bwhere am i\b|\bwhat is this place\b(?! called)|\bwhere are we\b/],
  ["NEARBY", /\b(on the way|along the way|en route|on my way)\b/],
  ["WEATHER", /\b(weather|rain(ing)?|forecast|temperature|snow(ing)?|cold today|hot today)\b/],
  ["PERMIT", /\b(permits?|ilp|pap|inner line|protected area|restricted area)\b/],
  ["ADVISORY", /\b(advisor(y|ies)|road (closed|closure)|landslide|alerts?|is .* closed)\b/],
  ["DISTANCE", /\bhow far\b|\bdistance\b|\bkm (from|to)\b|\bhow long (does it take|to (get|drive|reach))\b/],
  ["ROUTE", /\bhow (do|can) i (get|go|reach)\b|\b(route|directions?|way to|drive to|get there)\b/],
  ["NEARBY", /\b(near me|nearby|near here|around (me|here)|close by|closest|nearest|what'?s near)\b/],
  ["NEXT", /\b(what|where|which) (should i|to) (visit|see|do|go) next\b|\bnext stop\b|\bvisit next\b|\bwhat next\b/],
  ["ITINERARY", /\b(plan|itinerary|schedule)\b|\bi have \d|\b(rest of (my|the) day|half a day|one day)\b/],
  ["STAY", /\b(stay|stays|hotel|hotels|homestay|accommodation|lodge|guest ?house|where (can|should) i sleep)\b/],
  ["FOOD", /\b(eat|food|dish|dishes|cuisine|restaurant|breakfast|lunch|dinner|snack|local food)\b/],
  ["HISTORY", /\b(history|historical|founded|built|established|when was|who built|dynasty|king|chogyal)\b/],
  ["CULTURE", /\b(culture|festival|festivals|tradition|craft|crafts|etiquette|customs?|ritual|dress code|respect)\b/],
  ["PLACE_INFO", /\b(tell me about|about this|what is special|why is .* (important|famous|special)|what should i (notice|look at)|what is (it|this))\b/],
];

export function classify(question: string): Intent {
  const q = question.toLowerCase();
  for (const [intent, pattern] of RULES) if (pattern.test(q)) return intent;
  /* The panel's existing "what next" phrasings, so both paths agree. */
  return isNextIntent(q) ? "NEXT" : "GENERAL";
}

/** Intents whose answer is complete without a language model. */
export const DETERMINISTIC: ReadonlySet<Intent> = new Set([
  "WHERE_AM_I",
  "NEARBY",
  "DISTANCE",
  "ROUTE",
  "PERMIT",
  "WEATHER",
  "ADVISORY",
  "STAY",
  "AUDIO_GUIDE",
  "EMERGENCY",
]);
