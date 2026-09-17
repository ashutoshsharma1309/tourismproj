import "server-only";

import { z } from "zod";

import { getCuratedStay } from "@/data/curated-stays";
import { publishedProperty } from "@/db/queries/partners";
import { getCapsuleStays, getHistory, getStories } from "@/lib/destinations/content";
import { isKnownDestination } from "@/lib/destinations/registry";
import { knowledge } from "@/lib/personalization/knowledge";
import { CLIENT_EVENT_TYPES, type ClientEventType } from "@/lib/account/activity";

/**
 * Server-side validation of proposed history events.
 *
 * A browser proposes "PLACE_VIEWED jaipur place:amber-fort"; it is stored only
 * if jaipur is a registered destination AND amber-fort is one of JAIPUR's own
 * experiences. The same slug under another destination is refused. This is
 * the destination-isolation rule applied to personal data: a history row can
 * never attribute a place, story or stay to the wrong destination.
 */

export const eventBatchSchema = z.object({
  events: z
    .array(
      z.object({
        clientEventId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
        type: z.enum(CLIENT_EVENT_TYPES),
        destinationId: z.string().max(40).nullable(),
        entityId: z.string().max(120).nullable(),
        /* Anonymous-session events carry when they happened; bounded below. */
        at: z.number().int().positive().optional(),
      }),
    )
    .min(1)
    /* The browser buffers at most 30; a batch never needs more. */
    .max(30),
});

export type EventBatch = z.infer<typeof eventBatchSchema>;

export interface ValidEvent {
  clientEventId: string;
  type: ClientEventType;
  destinationId: string | null;
  entityId: string | null;
  occurredAt: Date;
}

type Titled = { slug?: string; title?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function entityExists(type: ClientEventType, destinationId: string, entityId: string): Promise<boolean> {
  const separator = entityId.indexOf(":");
  if (separator <= 0) return false;
  const kind = entityId.slice(0, separator);
  const id = entityId.slice(separator + 1);
  if (!id) return false;

  switch (type) {
    case "PLACE_VIEWED": {
      if (!["place", "site", "culture"].includes(kind)) return false;
      const { coverage } = await knowledge();
      const entry = coverage.find((row) => row.destination.id === destinationId);
      return Boolean(entry?.experiences.some((experience) => experience.id === entityId));
    }
    case "STORY_VIEWED": {
      if (kind !== "story") return false;
      const stories = (await getStories(destinationId)) as Titled[];
      return stories.some((story) => story.slug === id);
    }
    case "HISTORY_VIEWED": {
      if (kind !== "history") return false;
      const events = (await getHistory(destinationId)) as Titled[];
      return events.some((event) => event.slug === id);
    }
    case "STAY_VIEWED": {
      if (kind === "stay") {
        if (destinationId === "sikkim") return Boolean(getCuratedStay(id));
        return (await getCapsuleStays(destinationId)).some((stay) => stay.id === id);
      }
      if (kind === "partner-stay") {
        /* Checked before the query: a non-uuid would be a database error. */
        if (!UUID.test(id)) return false;
        return Boolean(await publishedProperty(destinationId, id));
      }
      return false;
    }
    default:
      return false;
  }
}

/** Keep only events that name real records in the right destination. */
export async function validateEvents(batch: EventBatch, now = new Date()): Promise<ValidEvent[]> {
  const oldest = now.getTime() - 24 * 60 * 60 * 1000;
  const out: ValidEvent[] = [];
  for (const event of batch.events) {
    if (event.destinationId !== null && !isKnownDestination(event.destinationId)) continue;
    const needsDestination = event.type !== "AI_GUIDE_USED";
    if (needsDestination && event.destinationId === null) continue;
    if (event.type === "DESTINATION_VIEWED" || event.type === "CULTURE_VIEWED" || event.type === "AI_GUIDE_USED") {
      if (event.entityId !== null) continue;
    } else if (event.entityId !== null) {
      if (!(await entityExists(event.type, event.destinationId as string, event.entityId))) continue;
    } else if (event.type !== "HISTORY_VIEWED") {
      /* Only the history timeline is a destination-level view with no entity. */
      continue;
    }
    /* An anonymous-session event older than a day, or dated in the future,
       is not trusted: it is recorded as now, or dropped if implausibly old. */
    const at = event.at ?? now.getTime();
    if (at < oldest) continue;
    out.push({
      clientEventId: event.clientEventId,
      type: event.type,
      destinationId: event.destinationId,
      entityId: event.entityId,
      occurredAt: new Date(Math.min(at, now.getTime())),
    });
  }
  return out;
}
