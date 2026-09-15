import { gate, json } from "@/lib/account/api";
import { isKnownDestination } from "@/lib/destinations/registry";
import { recommendDestinations, recommendPlaces } from "@/lib/personalization/engine";
import { knowledge } from "@/lib/personalization/knowledge";
import { hasAnySignal, signalsFor } from "@/lib/personalization/signals";

export const dynamic = "force-dynamic";

/**
 * Recommendations for the signed-in traveller, each with its reasons.
 *
 *   ?destination=jaipur  → places inside Jaipur only
 *   (none)               → destinations to explore next
 *
 * `hasSignal: false` means the traveller has chosen no interests and explored
 * nothing: the caller asks them to choose interests instead of showing a list.
 */
export async function GET(request: Request) {
  const traveller = await gate(request, false);
  if (traveller instanceof Response) return traveller;

  const destination = new URL(request.url).searchParams.get("destination");
  if (destination !== null && !isKnownDestination(destination)) return json({ error: "Unknown destination." }, 400);

  const [signals, known] = await Promise.all([signalsFor(traveller.id), knowledge()]);
  if (!hasAnySignal(signals)) return json({ hasSignal: false, destinations: [], places: [] });

  if (destination) {
    return json({ hasSignal: true, destinationId: destination, places: recommendPlaces(destination, signals, known, 4) });
  }
  return json({ hasSignal: true, destinations: recommendDestinations(signals, known, 4) });
}
