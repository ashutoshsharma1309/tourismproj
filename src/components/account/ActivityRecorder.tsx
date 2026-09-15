"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { comparisonIds, eventForLocation } from "@/lib/account/activity";
import { bufferItem, mergeSessionActivity, newEventId, sendComparison, sendEvent } from "@/lib/account/client";
import { hasSignedInHint } from "@/lib/account/hint";

/**
 * Records meaningful exploration — one event per destination, place, story,
 * history entry, culture shelf, stay or comparison opened — and nothing else.
 *
 * Signed in: the event goes to the account (the server validates and
 * de-duplicates it). Signed out: it waits in this tab session's buffer and
 * is merged only if the visitor signs in before the session ends.
 * Renders nothing.
 */
export function ActivityRecorder() {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams()?.toString() ?? "";

  /* Merge this session's anonymous activity as soon as a session appears. */
  useEffect(() => {
    void mergeSessionActivity();
  }, [pathname]);

  useEffect(() => {
    const record = () => {
      if (pathname.replace(/\/$/, "") === "/destinations/compare") {
        const ids = comparisonIds(search);
        if (ids.length < 2) return;
        if (hasSignedInHint()) void sendComparison(ids);
        else bufferItem({ kind: "comparison", clientEventId: newEventId(), at: Date.now(), destinationIds: ids });
        return;
      }
      const event = eventForLocation(pathname, window.location.hash);
      if (!event) return;
      if (hasSignedInHint()) {
        void sendEvent(event).then((ok) => {
          if (!ok) bufferItem({ kind: "event", clientEventId: newEventId(), at: Date.now(), ...event });
        });
      } else {
        bufferItem({ kind: "event", clientEventId: newEventId(), at: Date.now(), ...event });
      }
    };
    /* After the page has settled, so a redirect or 404 is not recorded. */
    const timer = window.setTimeout(record, 1200);
    window.addEventListener("hashchange", record);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", record);
    };
  }, [pathname, search]);

  return null;
}
