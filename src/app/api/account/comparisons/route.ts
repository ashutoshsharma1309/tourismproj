import { z } from "zod";

import { gate, json } from "@/lib/account/api";
import { recordComparison } from "@/lib/account/store";
import { consumeQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const comparisonSchema = z.object({ destinationIds: z.array(z.string().max(40)).min(2).max(4) });

/** Remember a comparison the signed-in traveller made (2–4 registered destinations). */
export async function POST(request: Request) {
  const traveller = await gate(request, true);
  if (traveller instanceof Response) return traveller;
  const quota = await consumeQuota("account-comparisons", 30, 60 * 1000, traveller.id);
  if (!quota.ok) return json({ error: "Slow down." }, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const parsed = comparisonSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid comparison." }, 400);
  const { data: input } = parsed;
  return json({ recorded: await recordComparison(traveller.id, input.destinationIds) });
}
