import { z } from "zod";

import { currentJourney } from "@/db/queries/account";
import { gate, json } from "@/lib/account/api";
import { saveCurrentJourney } from "@/lib/account/store";
import { consumeQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const journeySchema = z.object({
  destinationIds: z.array(z.string().max(40)).max(18),
  completedIds: z.array(z.string().max(40)).max(18),
  /* Places the traveller chose to remember; validated again in the store. */
  placeIds: z.array(z.string().max(160)).max(60).default([]),
});

const shape = (row: Awaited<ReturnType<typeof currentJourney>>) =>
  row
    ? { id: row.id, destinationIds: row.destinationIds, completedIds: row.completedIds, placeIds: row.placeIds, status: row.status, createdAt: row.createdAt, completedAt: row.completedAt }
    : null;

/** The signed-in traveller's journey in progress. */
export async function GET(request: Request) {
  const traveller = await gate(request, false);
  if (traveller instanceof Response) return traveller;
  return json({ journey: shape(await currentJourney(traveller.id)) });
}

/** Save the journey on this device as the traveller's current journey. */
export async function PUT(request: Request) {
  const traveller = await gate(request, true);
  if (traveller instanceof Response) return traveller;
  const quota = await consumeQuota("account-journey", 60, 60 * 1000, traveller.id);
  if (!quota.ok) return json({ error: "Slow down." }, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const parsed = journeySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid journey." }, 400);
  const { data: input } = parsed;
  const saved = await saveCurrentJourney(traveller.id, input);
  return json({ journey: shape(saved) });
}
