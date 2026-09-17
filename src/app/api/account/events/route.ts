import { gate, json } from "@/lib/account/api";
import { eventBatchSchema, validateEvents } from "@/lib/account/events";
import { recordEvents } from "@/lib/account/store";
import { consumeQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Record meaningful exploration for the signed-in traveller: a batch of at
 * most 50 proposed events, each validated against the registry and the
 * destination's own records before it is stored. Idempotent per event id.
 */
export async function POST(request: Request) {
  const traveller = await gate(request, true);
  if (traveller instanceof Response) return traveller;

  /* Requests per minute per account; each request is at most 30 events. */
  const quota = await consumeQuota("account-events", 60, 60 * 1000, traveller.id);
  if (!quota.ok) return json({ error: "Slow down." }, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const parsed = eventBatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid events." }, 400);
  const { data: batch } = parsed;

  const valid = await validateEvents(batch);
  const stored = await recordEvents(traveller.id, valid);
  return json({ received: batch.events.length, accepted: valid.length, stored });
}
