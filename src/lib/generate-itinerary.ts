import { TSD_FEE_PER_PERSON } from "@/lib/booking";
import type {
  Coordinates,
  GeneratedItinerary,
  ItineraryDayPlan,
  PlannerPreferences,
  SikkimDistrict,
} from "@/types";

/**
 * Rule-based itinerary generator — the mock "AI" behind /planner. Composes a
 * day-by-day route from real geography: anchor bases, drive-time-sane day
 * trips, hotels picked from the catalogue by budget and district. Phase 4
 * swaps the rules for a model; the return shape is the contract.
 */

interface Anchor {
  key: string;
  name: string;
  district: SikkimDistrict;
  coordinates: Coordinates;
  /** Day-trip descriptions by interest. */
  days: { title: string; morning: string; afternoon: string; evening: string; tags: string[] }[];
}

const ANCHORS: Anchor[] = [
  {
    key: "gangtok",
    name: "Gangtok",
    district: "Gangtok",
    coordinates: { lat: 27.3314, lng: 88.612 },
    days: [
      {
        title: "Arrive in Gangtok",
        morning: "Airport/NJP pickup and the climb into the hills; check in and acclimatise",
        afternoon: "Late lunch, then the ropeway over the town for first views",
        evening: "Stroll MG Marg — Sikkim's traffic-free promenade — for dinner",
        tags: ["any"],
      },
      {
        title: "Monasteries of the capital",
        morning: "Rumtek Monastery — the Karmapa's seat-in-exile, gold stupa and shedra",
        afternoon: "Lingdum (Ranka) Monastery's vast courtyard, then Enchey gompa",
        evening: "Tsuklakhang royal chapel walk and old-town momos",
        tags: ["Monasteries", "Culture"],
      },
      {
        title: "Tsomgo Lake day",
        morning: "Permit check, then the switchback drive to Tsomgo Lake (3,750 m)",
        afternoon: "Lakeside walk and yak-side photographs; roadside dhaba lunch",
        evening: "Return to Gangtok; thukpa and rest",
        tags: ["Lakes", "Adventure"],
      },
      {
        title: "Flavours of Gangtok",
        morning: "Lall Bazaar food walk — churpi, gundruk and mountains of chillies",
        afternoon: "Momo-making session with a local family kitchen",
        evening: "Tongba (millet beer) tasting and dinner above MG Marg",
        tags: ["Food", "Culture"],
      },
    ],
  },
  {
    key: "pelling",
    name: "Pelling",
    district: "Gyalshing",
    coordinates: { lat: 27.3016, lng: 88.2402 },
    days: [
      {
        title: "West to Pelling",
        morning: "Drive west along the Rangeet gorge (5–6 h) with tea stops",
        afternoon: "Check in; sunset from the helipad ridge over Kanchenjunga",
        evening: "Quiet dinner — the west sleeps early",
        tags: ["any"],
      },
      {
        title: "Pemayangtse and the holy west",
        morning: "Pemayangtse Monastery and the carved Zangdok Palri palace",
        afternoon: "Rabdentse palace ruins walk, then the Pelling skywalk",
        evening: "Forest path back; bonfire at the hotel",
        tags: ["Monasteries", "Culture", "Trekking"],
      },
      {
        title: "Khecheopalri wishing lake",
        morning: "Drive to Khecheopalri — the lake no leaf is allowed to touch",
        afternoon: "Waterfall circuit: Kanchenjunga and Rimbi falls",
        evening: "Village homestay dinner near the lake",
        tags: ["Lakes", "Nature", "Trekking"],
      },
    ],
  },
  {
    key: "lachung",
    name: "Lachung",
    district: "Mangan",
    coordinates: { lat: 27.689, lng: 88.743 },
    days: [
      {
        title: "North to Lachung",
        morning: "North Sikkim permits, then the Teesta road past Seven Sisters falls",
        afternoon: "Naga falls halt; reach Lachung by evening",
        evening: "Wood-stove dinner; early night at altitude",
        tags: ["any"],
      },
      {
        title: "Yumthang Valley of Flowers",
        morning: "Dawn drive into Yumthang — rhododendrons, yaks and the Lachung chu",
        afternoon: "Hot spring stop, then Lachung Monastery among the orchards",
        evening: "Return; millet beer by the stove",
        tags: ["Lakes", "Nature", "Adventure", "Trekking"],
      },
    ],
  },
  {
    key: "ravangla",
    name: "Ravangla",
    district: "Namchi",
    coordinates: { lat: 27.3066, lng: 88.3639 },
    days: [
      {
        title: "South ridge day",
        morning: "Buddha Park's 40-metre statue against the full range",
        afternoon: "Ralang Monastery — old gompa and the vast new institute",
        evening: "Maenam ridge sunset and Ravangla bazaar dinner",
        tags: ["Monasteries", "Culture", "Nature"],
      },
    ],
  },
];

/** Orders anchors and how many days each gets for a given trip length. */
function routePlan(duration: number, interests: PlannerPreferences["interests"]) {
  const wantsNorth = duration >= 6;
  const wantsWest =
    duration >= 5 || interests.includes("Monasteries") || interests.includes("Lakes");
  const plan: { anchor: Anchor; days: number }[] = [];
  const gangtok = ANCHORS[0]!;
  const pelling = ANCHORS[1]!;
  const lachung = ANCHORS[2]!;
  const ravangla = ANCHORS[3]!;

  if (duration <= 4) {
    plan.push({ anchor: gangtok, days: duration });
  } else if (!wantsNorth && wantsWest) {
    plan.push({ anchor: gangtok, days: duration - 3 }, { anchor: pelling, days: 3 });
  } else if (wantsNorth && duration < 8) {
    plan.push({ anchor: gangtok, days: duration - 2 }, { anchor: lachung, days: 2 });
  } else {
    const south = duration >= 10 ? 1 : 0;
    plan.push(
      { anchor: gangtok, days: duration - 5 - south },
      { anchor: lachung, days: 2 },
      ...(south ? [{ anchor: ravangla, days: 1 }] : []),
      { anchor: pelling, days: 3 },
    );
  }
  return plan;
}

export function generateItinerary(prefs: PlannerPreferences): GeneratedItinerary {
  const duration = Math.min(14, Math.max(3, prefs.duration));
  const interests = prefs.interests.length ? prefs.interests : ["Culture" as const];
  const plan = routePlan(duration, interests);

  const dayPlans: ItineraryDayPlan[] = [];
  let dayNumber = 1;
  for (const stop of plan) {
    // First matching day-templates for the traveller's interests, then rest.
    const ranked = [...stop.anchor.days].sort((a, b) => {
      const score = (d: (typeof stop.anchor.days)[number]) =>
        d.tags.includes("any") ? -1 : d.tags.some((t) => (interests as string[]).includes(t)) ? 1 : 0;
      return score(b) - score(a);
    });
    const arrivalFirst = [
      ...ranked.filter((d) => d.tags.includes("any")),
      ...ranked.filter((d) => !d.tags.includes("any")),
    ];
    for (let i = 0; i < stop.days && dayNumber <= duration; i++) {
      const template = arrivalFirst[i % arrivalFirst.length]!;
      dayPlans.push({
        day: dayNumber,
        title: template.title,
        morning: template.morning,
        afternoon: template.afternoon,
        evening: template.evening,
        location: stop.anchor.name,
        coordinates: stop.anchor.coordinates,
      });
      dayNumber++;
    }
  }

  /* No tariff feed is licensed, so the planner quotes only the one cost it
     can state exactly: the statutory ₹50 TSD entry fee. Accommodation and
     transport are deliberately not estimated. */
  const tsd = TSD_FEE_PER_PERSON * (prefs.travelStyle === "Solo" ? 1 : 2);

  const styleWord =
    prefs.travelStyle === "Luxury"
      ? "Grand"
      : prefs.travelStyle === "Budget"
        ? "Backpacker"
        : "Classic";

  return {
    name: `${duration}-Day ${styleWord} Sikkim`,
    days: duration,
    nights: duration - 1,
    travelStyle: prefs.travelStyle,
    interests,
    dayPlans,
    cost: { tsd },
  };
}

/** Monastery highlights matching the traveller's interests, for the result page. */
