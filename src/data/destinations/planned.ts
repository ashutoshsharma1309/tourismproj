import type { Destination } from "@/types/destination";

/**
 * The fourteen destinations TerraStory is designed to reach.
 *
 * WHAT THESE RECORDS DELIBERATELY DO NOT CONTAIN
 * ----------------------------------------------
 * No descriptions. No attractions. No hotels. No highlights. No "best time to
 * visit". No counts. No imagery. Nothing that constitutes a tourism claim,
 * because none of it has been researched or sourced, and inventing it is the
 * single failure this project has already corrected once.
 *
 * Every field present here is verifiable identity or map geometry: the name,
 * the country, the local name for the region, an IANA timezone, and a centre
 * coordinate used to frame a map. A centre coordinate is not a claim about a
 * place — it is where a viewport points.
 *
 * These exist for one reason: to prove the architecture holds fifteen
 * destinations without fifteen codebases. A record that carries
 * `depth: "planned"` declares no divisions and no taxonomies and therefore
 * resolves to zero capabilities — so every destination-aware surface renders
 * it as "not yet available" rather than as an empty page pretending to be
 * content. NO destination is in that state today — Phase B gave Jaipur and
 * Kyoto catalogued places to go with the research they already held, so the
 * honest-absence path is exercised by an unregistered id and by the planner's
 * sparse-data branch rather than by a live destination.
 *
 * The rest now read `depth: "capsule"` — eight Indian cities from Phase 18,
 * four global ones from Phase 19. THE DEPTH IS THE ONLY FIELD THAT CHANGED.
 * Everything a capsule destination shows comes from
 * `src/data/destinations/capsules/<id>.ts` through the capability model; no
 * record here gained a description, an attraction or a count, because none of
 * those belong to identity.
 */
export const plannedDestinations: Destination[] = [
  {
    id: "delhi",
    name: "Delhi",
    country: { code: "IN", name: "India" },
    region: { name: "Delhi", kind: "region" },
    geography: { centre: { lat: 28.6139, lng: 77.209 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "jaipur",
    name: "Jaipur",
    country: { code: "IN", name: "India" },
    region: { name: "Rajasthan", kind: "region" },
    geography: { centre: { lat: 26.9124, lng: 75.7873 }, timezone: "Asia/Kolkata" },
    depth: "curated",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "varanasi",
    name: "Varanasi",
    country: { code: "IN", name: "India" },
    region: { name: "Uttar Pradesh", kind: "region" },
    geography: { centre: { lat: 25.3176, lng: 82.9739 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "agra",
    name: "Agra",
    country: { code: "IN", name: "India" },
    region: { name: "Uttar Pradesh", kind: "region" },
    geography: { centre: { lat: 27.1767, lng: 78.0081 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: { code: "IN", name: "India" },
    region: { name: "Maharashtra", kind: "region" },
    geography: { centre: { lat: 19.076, lng: 72.8777 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "kolkata",
    name: "Kolkata",
    country: { code: "IN", name: "India" },
    region: { name: "West Bengal", kind: "region" },
    geography: { centre: { lat: 22.5726, lng: 88.3639 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    country: { code: "IN", name: "India" },
    region: { name: "Telangana", kind: "region" },
    geography: { centre: { lat: 17.385, lng: 78.4867 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "kochi",
    name: "Kochi",
    country: { code: "IN", name: "India" },
    region: { name: "Kerala", kind: "region" },
    geography: { centre: { lat: 9.9312, lng: 76.2673 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "goa",
    name: "Goa",
    country: { code: "IN", name: "India" },
    region: { name: "Goa", kind: "region" },
    geography: { centre: { lat: 15.2993, lng: 74.124 }, timezone: "Asia/Kolkata" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: { code: "JP", name: "Japan" },
    /* Kyoto Prefecture — "prefecture", not "district". The vocabulary
       distinction this model exists to preserve. */
    region: { name: "Kyoto Prefecture", kind: "prefecture" },
    geography: { centre: { lat: 35.0116, lng: 135.7681 }, timezone: "Asia/Tokyo" },
    depth: "researched",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "paris",
    name: "Paris",
    country: { code: "FR", name: "France" },
    region: { name: "Île-de-France", kind: "region" },
    geography: { centre: { lat: 48.8566, lng: 2.3522 }, timezone: "Europe/Paris" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "rome",
    name: "Rome",
    country: { code: "IT", name: "Italy" },
    region: { name: "Lazio", kind: "region" },
    geography: { centre: { lat: 41.9028, lng: 12.4964 }, timezone: "Europe/Rome" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: { code: "TR", name: "Türkiye" },
    region: { name: "Istanbul Province", kind: "province" },
    geography: { centre: { lat: 41.0082, lng: 28.9784 }, timezone: "Europe/Istanbul" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
  {
    id: "new-york-city",
    name: "New York City",
    country: { code: "US", name: "United States" },
    region: { name: "New York", kind: "region" },
    geography: { centre: { lat: 40.7128, lng: -74.006 }, timezone: "America/New_York" },
    depth: "capsule",
    divisions: [],
    taxonomies: [],
    languages: [],
  },
];
