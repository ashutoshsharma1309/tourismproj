"use client";

import { clearSignedInHint, hasSignedInHint } from "@/lib/account/hint";
import type { ProposedEvent } from "@/lib/account/activity";

/**
 * Browser-side account plumbing: the anonymous session buffer, sending
 * events, and the local keys cleared at sign-out.
 *
 * ANONYMOUS ACTIVITY
 * ------------------
 * A visitor who is not signed in keeps a short record of THIS TAB SESSION in
 * sessionStorage (30 entries at most). It never leaves the browser unless the
 * visitor signs in during that same session, in which case it is merged into
 * the account they just signed in to — the only history whose owner is not
 * a guess. Closing the tab discards it. Nothing from localStorage, and
 * nothing from another session, is ever merged.
 */

const BUFFER_KEY = "terrastory.session-activity.v1";
/**
 * Set when the visitor submits a log-in form in THIS tab. Only then is the
 * tab's anonymous activity merged: a session that arrived any other way (an
 * e-mail link opened here, say) is not proof that the person who browsed
 * anonymously is the account's owner.
 */
const MERGE_CONSENT_KEY = "terrastory.merge-on-login.v1";

export function allowMergeOnLogin() {
  try {
    window.sessionStorage.setItem(MERGE_CONSENT_KEY, "1");
  } catch {
    /* storage blocked: nothing to merge either */
  }
}

/** Forget this tab's anonymous activity (after clearing history, or at sign-out). */
export function clearSessionBuffer() {
  try {
    window.sessionStorage.removeItem(BUFFER_KEY);
    window.sessionStorage.removeItem(MERGE_CONSENT_KEY);
  } catch {
    /* storage blocked */
  }
}
const MAX_BUFFER = 30;
/** Set while this device's journey is the signed-in traveller's saved journey. */
export const JOURNEY_LINK_KEY = "terrastory.journey.linked.v1";
const LOCAL_KEYS_CLEARED_AT_SIGN_OUT = ["terrastory.journey.v1", JOURNEY_LINK_KEY, "sikkim-darshan:visits"];

export type BufferedItem =
  | ({ kind: "event"; clientEventId: string; at: number } & ProposedEvent)
  | { kind: "comparison"; clientEventId: string; at: number; destinationIds: string[] };

export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function readBuffer(): BufferedItem[] {
  try {
    const raw = window.sessionStorage.getItem(BUFFER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as BufferedItem[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(items: BufferedItem[]) {
  try {
    if (items.length === 0) window.sessionStorage.removeItem(BUFFER_KEY);
    else window.sessionStorage.setItem(BUFFER_KEY, JSON.stringify(items.slice(-MAX_BUFFER)));
  } catch {
    /* Storage blocked: anonymous activity is simply not kept. */
  }
}

const sameEvent = (a: BufferedItem, b: BufferedItem) =>
  a.kind === "event" && b.kind === "event"
    ? a.type === b.type && a.destinationId === b.destinationId && a.entityId === b.entityId
    : a.kind === "comparison" && b.kind === "comparison" && [...a.destinationIds].sort().join() === [...b.destinationIds].sort().join();

export function bufferItem(item: BufferedItem) {
  const items = readBuffer().filter((existing) => !sameEvent(existing, item));
  items.push(item);
  writeBuffer(items);
}

async function post(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    return null;
  }
}

/** Send an event for the signed-in traveller; returns false if not signed in. */
export async function sendEvent(event: ProposedEvent): Promise<boolean> {
  const response = await post("/api/account/events", {
    events: [{ clientEventId: newEventId(), ...event }],
  });
  if (response?.status === 401) {
    clearSignedInHint();
    return false;
  }
  return true;
}

export async function sendComparison(destinationIds: string[]): Promise<boolean> {
  const response = await post("/api/account/comparisons", { destinationIds });
  if (response?.status === 401) {
    clearSignedInHint();
    return false;
  }
  return true;
}

/**
 * Merge this tab session's anonymous activity into the account that just
 * signed in, then forget it. Replays are harmless: every event carries its
 * own id and the server ignores one it has already stored.
 */
export async function mergeSessionActivity(): Promise<void> {
  if (!hasSignedInHint()) return;
  let consented = false;
  try {
    consented = window.sessionStorage.getItem(MERGE_CONSENT_KEY) === "1";
  } catch {
    consented = false;
  }
  const items = readBuffer();
  if (!consented) {
    /* Signed in without logging in from this tab: the anonymous buffer is
       discarded rather than attributed to an account it may not belong to. */
    if (items.length > 0) writeBuffer([]);
    return;
  }
  try {
    window.sessionStorage.removeItem(MERGE_CONSENT_KEY);
  } catch {
    /* storage blocked */
  }
  if (items.length === 0) return;
  const events = items
    .filter((item): item is Extract<BufferedItem, { kind: "event" }> => item.kind === "event")
    .map(({ clientEventId, type, destinationId, entityId, at }) => ({ clientEventId, type, destinationId, entityId, at }))
    .slice(-30);
  if (events.length > 0) {
    const response = await post("/api/account/events", { events });
    if (!response || response.status === 401) return;
  }
  for (const item of items) {
    if (item.kind === "comparison") await sendComparison(item.destinationIds);
  }
  writeBuffer([]);
}

/** What signing out removes from this browser, so the next person sees nothing. */
export function clearLocalAccountData() {
  try {
    for (const key of LOCAL_KEYS_CLEARED_AT_SIGN_OUT) window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(BUFFER_KEY);
    window.sessionStorage.removeItem(MERGE_CONSENT_KEY);
  } catch {
    /* Storage blocked: nothing was stored. */
  }
  clearSignedInHint();
}
