import { z } from "zod";

/**
 * The TerraStory Guide's contract — what a traveller may send and the only
 * shape the interface will render back.
 *
 * WHY A SCHEMA ON BOTH SIDES
 * --------------------------
 * The server builds the reply from records, tool results and (sometimes) a
 * language model. The model's output never reaches the browser as-is: it is
 * parsed into this schema, its citations and places are checked against what
 * was actually retrieved, and anything that fails is replaced by the
 * deterministic answer. The client parses again before rendering, so a
 * malformed reply cannot become UI. Nothing here carries HTML.
 */

export const INTENTS = [
  "WHERE_AM_I",
  "NEARBY",
  "DISTANCE",
  "ROUTE",
  "PLACE_INFO",
  "HISTORY",
  "CULTURE",
  "FOOD",
  "STAY",
  "PERMIT",
  "WEATHER",
  "ADVISORY",
  "ITINERARY",
  "NEXT",
  "AUDIO_GUIDE",
  "TRANSLATE",
  "EMERGENCY",
  "GENERAL",
] as const;
export type Intent = (typeof INTENTS)[number];

const coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof coordinates>;

export const assistantRequestSchema = z.object({
  question: z.string().trim().min(1).max(600),
  /** Where the traveller is in the product: resolved from the URL, never guessed. */
  destinationId: z.string().trim().max(40).nullable().optional(),
  /** A place page's slug, when the traveller is on one. */
  placeSlug: z.string().trim().max(120).nullable().optional(),
  /** Only when the traveller granted geolocation in this session. */
  location: coordinates.extend({ accuracyM: z.number().min(0).max(100_000).optional() }).nullable().optional(),
  language: z.string().trim().min(2).max(5).default("en"),
  mode: z.enum(["chat", "guide"]).default("chat"),
  /** Short-term memory: the last few turns, held by the browser, never stored. */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1200) }))
    .max(8)
    .default([]),
  /** The traveller's own journey, from their device. */
  journey: z
    .object({
      destinations: z.array(z.string().max(40)).max(20),
      places: z.array(z.string().max(160)).max(60).default([]),
    })
    .nullable()
    .optional(),
  /**
   * What the previous answer was about, by record id — so "how do I get
   * there?" and "what's on the way?" know what "there" and "the way" are.
   * Held by the browser for this conversation only; every id is re-checked.
   */
  focus: z
    .object({
      placeId: z.string().max(160).nullable().optional(),
      routeFromId: z.string().max(160).nullable().optional(),
      routeToId: z.string().max(160).nullable().optional(),
    })
    .nullable()
    .optional(),
  /** Minutes the traveller says they have, when they said so. */
  availableMinutes: z.number().int().min(15).max(24 * 60).nullable().optional(),
});
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export const citationSchema = z.object({
  /** The record the claim came from. */
  recordId: z.string().max(160),
  label: z.string().max(200),
  /** The source the record itself cites. Never generated. */
  sourceName: z.string().max(200).nullable(),
  sourceUrl: z.string().url().max(500).nullable(),
  /** The record's page inside TerraStory. */
  href: z.string().max(300),
});
export type Citation = z.infer<typeof citationSchema>;

export const placeCardSchema = z.object({
  recordId: z.string().max(160),
  destinationId: z.string().max(40),
  name: z.string().max(200),
  kind: z.string().max(40),
  category: z.string().max(80).nullable(),
  summary: z.string().max(400).nullable(),
  href: z.string().max(300),
  coords: coordinates.nullable(),
  /** Straight-line kilometres from the traveller or the reference place. */
  distanceKm: z.number().min(0).nullable(),
});
export type PlaceCard = z.infer<typeof placeCardSchema>;

export const routeSchema = z.object({
  from: z.object({ name: z.string().max(200), coords: coordinates, recordId: z.string().max(160).nullable() }),
  to: z.object({ name: z.string().max(200), coords: coordinates, recordId: z.string().max(160).nullable() }),
  straightLineKm: z.number().min(0),
  /** Present only when a routing service answered. Never estimated. */
  road: z
    .object({
      distanceKm: z.number().min(0),
      durationMinutes: z.number().min(0),
      provider: z.string().max(60),
      fetchedAt: z.string().max(40),
    })
    .nullable(),
  geometry: z.array(coordinates).max(2000).nullable(),
});
export type RouteCard = z.infer<typeof routeSchema>;

export const itineraryStopSchema = z.object({
  recordId: z.string().max(160),
  name: z.string().max(200),
  href: z.string().max(300),
  /** Straight-line km from the previous stop (or the traveller). */
  legKm: z.number().min(0).nullable(),
  /** Road minutes from the previous stop, only if a router gave them. */
  legRoadMinutes: z.number().min(0).nullable(),
  why: z.string().max(300).nullable(),
});

export const audioGuideSchema = z.object({
  placeName: z.string().max(200),
  language: z.string().max(8),
  languageLabel: z.string().max(60),
  url: z.string().max(300),
  transcript: z.string().max(6000),
});

export const weatherSchema = z.object({
  placeName: z.string().max(200),
  provider: z.string().max(60),
  fetchedAt: z.string().max(40),
  temperatureC: z.number().nullable(),
  precipitationProbability: z.number().min(0).max(100).nullable(),
  summary: z.string().max(200),
});

export const assistantReplySchema = z.object({
  intent: z.enum(INTENTS),
  language: z.string().max(5),
  message: z.string().min(1).max(4000),
  /** Clean text for speech: no markdown, links or citation markers. */
  speech: z.string().max(4000),
  citations: z.array(citationSchema).max(12),
  places: z.array(placeCardSchema).max(12),
  route: routeSchema.nullable(),
  itinerary: z.array(itineraryStopSchema).max(10).nullable(),
  audioGuide: audioGuideSchema.nullable(),
  weather: weatherSchema.nullable(),
  /** A suggestion the traveller must accept with a click. Never applied by the server. */
  journeySuggestion: z
    .object({ destinationId: z.string().max(40), recordId: z.string().max(160).nullable(), label: z.string().max(200) })
    .nullable(),
  /** Follow-up questions, as text the traveller can send. */
  suggestions: z.array(z.string().max(120)).max(6),
  /** Plain statements about what could not be done, shown with the answer. */
  notices: z.array(z.string().max(300)).max(6),
  /** "records": from TerraStory records only. "model": worded by the language model over those records. */
  answeredBy: z.enum(["records", "model"]),
  /** When the reply used the traveller's location. */
  usedLocation: z.boolean(),
});
export type AssistantReply = z.infer<typeof assistantReplySchema>;
