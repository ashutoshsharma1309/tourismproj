/**
 * The one way to open the trip guide from outside it.
 *
 * WHY AN EVENT AND NOT A SHARED STORE
 * -----------------------------------
 * The guide (`components/guide/TripGuide.tsx`) is mounted once in the (v1)
 * layout and owns its own `open` state. The header, the "How TerraStory
 * works" strip and anything else that wants to open it should not reach into
 * that state — the search palette solved the same problem with a module-level
 * listener set (`openSearch()`), and a DOM event is the same idea without a
 * module the guide has to import from.
 *
 * This file imports nothing, so a client component that only wants
 * `openGuide()` pulls nothing else into its bundle.
 *
 * THE GUIDE MUST SUBSCRIBE. Inside `TripGuide`:
 *
 *   useEffect(() => onGuideOpen(() => setOpen(true)), []);
 *
 * Until it does, `openGuide()` dispatches an event nobody hears and the
 * header control is inert.
 */
export const GUIDE_OPEN_EVENT = "terrastory:guide:open";

/** Ask the mounted guide to open. Safe to call during SSR — it does nothing there. */
export function openGuide(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GUIDE_OPEN_EVENT));
}

/** Subscribe to open requests. Returns the unsubscribe, for `useEffect`. */
export function onGuideOpen(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(GUIDE_OPEN_EVENT, listener);
  return () => window.removeEventListener(GUIDE_OPEN_EVENT, listener);
}
