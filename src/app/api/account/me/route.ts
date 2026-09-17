import { exploredDestinations, interestsFor, profileFor } from "@/db/queries/account";
import { gate, json } from "@/lib/account/api";
import { getDestination } from "@/lib/destinations/registry";

export const dynamic = "force-dynamic";

/**
 * Who is signed in, for the prerendered pages' small account islands: name,
 * chosen interests, language, whether history is on, and the three most
 * recently explored destinations. Nothing else leaves this route.
 */
export async function GET(request: Request) {
  const traveller = await gate(request, false);
  if (traveller instanceof Response) return traveller;
  const [profile, interests, recent] = await Promise.all([
    profileFor(traveller.id),
    interestsFor(traveller.id),
    exploredDestinations(traveller.id, 3),
  ]);
  return json({
    signedIn: true,
    name: profile?.fullName ?? null,
    locale: profile?.locale ?? "en",
    historyEnabled: profile?.historyEnabled ?? true,
    interests,
    recent: recent
      .map((row) => ({ destinationId: row.destinationId, name: getDestination(row.destinationId)?.name ?? null, lastExploredAt: row.lastExploredAt }))
      .filter((row) => row.name !== null),
  });
}
