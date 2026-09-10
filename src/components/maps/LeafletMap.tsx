"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMapInstance, Marker } from "leaflet";

import { cn } from "@/lib/cn";
import type { Coordinates } from "@/types";

export interface MapMarker {
  /** Stable id — required for selection and for diffing between renders. */
  id?: string;
  position: Coordinates;
  title: string;
  subtitle?: string;
  /** Rendered as a "View details" button in the popup. Omit when the caller
   *  handles selection itself through `onSelect`. */
  href?: string;
  /** Dot colour — defaults to forest ridge. */
  color?: string;
  /** Larger, ringed marker: used for the site a page is about. */
  emphasis?: boolean;
}

export interface LeafletMapProps {
  markers: MapMarker[];
  center?: Coordinates;
  zoom?: number;
  /** Optional route line (trip planner). */
  polyline?: Coordinates[];
  className?: string;
  /** Id of the currently selected marker — drawn larger with a ring. */
  selectedId?: string;
  /** Called when a marker is clicked. Suppresses the built-in popup. */
  onSelect?: (id: string) => void;
  /** Off by default so the map never hijacks page scrolling. */
  scrollWheelZoom?: boolean;
  /** Re-fit the viewport whenever the marker set changes. */
  fitToMarkers?: boolean;
  /** Accessible name for the map region. */
  ariaLabel?: string;
}

const SIKKIM_CENTER: Coordinates = { lat: 27.55, lng: 88.45 };
const DEFAULT_COLOUR = "#43614d";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

/** Marker glyph. Selected and emphasised markers are bigger and ringed, so
 *  state is carried by size and stroke rather than by colour alone. */
function markerIcon(marker: MapMarker, selected: boolean) {
  const colour = marker.color ?? DEFAULT_COLOUR;
  const size = selected ? 30 : marker.emphasis ? 24 : 18;
  const ring = selected
    ? `box-shadow:0 0 0 4px rgba(255,252,245,0.95),0 0 0 7px ${colour}66,0 2px 10px rgba(12,31,38,0.45)`
    : `box-shadow:0 1px 4px rgba(12,31,38,0.4)`;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;` +
      `background:${colour};border:3px solid #fffcf5;${ring};` +
      `transition:width .18s ease,height .18s ease"></span>`,
  });
}

function popupHtml(marker: MapMarker): string {
  return [
    `<strong style="font-size:14px">${escapeHtml(marker.title)}</strong>`,
    marker.subtitle
      ? `<div style="color:#5d5647;margin-top:2px">${escapeHtml(marker.subtitle)}</div>`
      : "",
    marker.href
      ? `<a href="${escapeHtml(marker.href)}" style="display:inline-block;margin-top:8px;padding:6px 14px;` +
        `border-radius:9999px;background:#43614d;color:#fff;text-decoration:none;font-weight:500">View details</a>`
      : "",
  ].join("");
}

/**
 * Reusable Leaflet map over OpenStreetMap tiles.
 *
 * Import ONLY via next/dynamic with `ssr: false` from a client component —
 * Leaflet needs a real window.
 *
 * The map instance is created once per mount and then *updated* as markers and
 * selection change, rather than being torn down. That is what lets the explore
 * page filter markers without the map flashing back to its default viewport on
 * every keystroke.
 */
export default function LeafletMap({
  markers,
  center,
  zoom,
  polyline,
  className,
  selectedId,
  onSelect,
  scrollWheelZoom = false,
  fitToMarkers = false,
  ariaLabel = "Map of Sikkim",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());
  const routeRef = useRef<L.Polyline | null>(null);
  /** Selection driven from the map itself must not re-fit the viewport. */
  const skipNextFit = useRef(false);
  /** The mount-time fit, which is an initial view rather than a transition. */
  const firstFit = useRef(true);

  /* ---- create the map once ------------------------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    /* Captured now so the cleanup clears the Map this effect owned, not
       whatever markerRefs.current happens to point at when it runs. */
    const ownedMarkers = markerRefs.current;

    const map = L.map(container, {
      center: center
        ? [center.lat, center.lng]
        : markers.length
          ? [markers[0]!.position.lat, markers[0]!.position.lng]
          : [SIKKIM_CENTER.lat, SIKKIM_CENTER.lng],
      zoom: zoom ?? 9,
      scrollWheelZoom,
      zoomControl: true,
    });
    mapRef.current = map;

    /*
     * CARTO's Voyager raster tiles rather than the standard OSM ones.
     *
     * Standard OSM renders every label in its local script. On a Sikkim map that
     * means the Tibetan side of the border arrives as 岗巴县, 亚东县 and 日喀则,
     * which at the default zoom occupy more of the frame than Sikkim does — an
     * odd look for a heritage platform about an Indian border state, and the
     * first thing a reviewer noticed about the map.
     *
     * PHASE 20 HAD TO GIVE THAT UP. CARTO now requires an API key for its
     * basemaps and stamps "API KEY REQUIRED / carto.com/basemaps" diagonally
     * across every tile it serves without one. Every map in this product —
     * the world map on /destinations, the heritage map, each story and place
     * map — was rendering that watermark. Measured on all four free CARTO
     * styles (voyager, voyager_labels_under, light_all, dark_all); all
     * watermarked.
     *
     * OpenStreetMap's standard tiles need no key, are the canonical free
     * basemap, and render clean. The cost is the thing Voyager was chosen for:
     * labels come back in local script. That is a real regression, recorded in
     * docs/phase-20-ux-polish.md rather than hidden, and it is the right trade
     * — a legible map in the wrong script beats an illegible one in the right
     * one. Wikimedia's osm-intl was measured as the obvious replacement and
     * rejected: it still renders नेपाल and বাংলা, and its tiles are served for
     * Wikimedia projects rather than for this.
     */
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);

    /* Leaflet measures the container when the map is created. Inside a grid
       that is still settling, that measurement can be wrong, and every
       subsequent fitBounds is then computed against the wrong viewport — which
       showed up as an explore map opening zoomed out over Tibet. Re-measure
       once the layout is final, and again whenever the element resizes. */
    /* Set on teardown, checked by every deferred callback. A ResizeObserver
       record or an animation frame that arrives after the map is gone must do
       nothing rather than reach into detached panes. */
    let disposed = false;
    const remeasure = () => {
      if (disposed) return;
      map.invalidateSize({ animate: false });
    };
    const raf = requestAnimationFrame(remeasure);
    const observer = new ResizeObserver(remeasure);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      /*
       * PHASE 16 — stop any animation before tearing the map down.
       *
       * Navigating away while a `panTo` / `fitBounds` was still easing threw
       * `Cannot read properties of undefined (reading '_leaflet_pos')`: the
       * animation frame fired after `remove()` had detached the container.
       * Harmless to the page, but it is a real uncaught exception and it
       * appeared on the demo path — measured once per run of the demo
       * walkthrough, now zero. `stop()` is Leaflet's own way to cancel an
       * in-flight animation.
       */
      /*
       * PHASE 21 — ORDER MATTERS, AND IT WAS THE WRONG WAY ROUND.
       *
       * Phase 16 added `stop()` but placed `off()` before it. `off()` with no
       * arguments removes EVERY listener on the map, including the internal
       * ones Leaflet's own zoom and pan animations use to finish and clean up
       * after themselves. Cancelling an animation whose internals had already
       * been detached left a frame queued, and that frame called
       * `invalidateSize` → `_getMapPanePos` on panes `remove()` had deleted.
       *
       * Reproduced deterministically: load the home page, click a navigation
       * link about 150 ms later — while `fitBounds({animate: true})` is still
       * easing — and the console takes an uncaught TypeError. Earlier or later
       * and it does not happen, which is why it survived: it is exactly the
       * timing of an impatient click, and exactly the timing of a live demo.
       *
       * Stop the animation first, while Leaflet can still unwind it. Then
       * detach handlers. Then remove.
       */
      disposed = true;
      map.stop();
      map.off();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      ownedMarkers.clear();
      routeRef.current = null;
    };
    // Created once; subsequent prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- keep markers in sync ------------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerRefs.current.clear();

    const bounds = L.latLngBounds([]);
    for (const marker of markers) {
      const id = marker.id ?? marker.title;
      const instance = L.marker([marker.position.lat, marker.position.lng], {
        icon: markerIcon(marker, id === selectedId),
        title: marker.title,
        /* Keyboard users tab through markers; the selected one sits on top. */
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: id === selectedId ? 1000 : 0,
        alt: marker.title,
      });

      if (onSelect) {
        instance.on("click keypress", () => {
          skipNextFit.current = true;
          onSelect(id);
        });
      } else {
        instance.bindPopup(popupHtml(marker));
      }

      instance.addTo(layer);
      markerRefs.current.set(id, instance);
      bounds.extend([marker.position.lat, marker.position.lng]);
    }

    if (fitToMarkers && markers.length > 0 && !skipNextFit.current) {
      /* Fit against the container's real size, not the one it had at creation. */
      map.invalidateSize({ animate: false });
      /*
       * THE FIRST FIT DOES NOT ANIMATE, AND THAT FIXED AN UNCAUGHT ERROR.
       *
       * Animating the initial view animates from a viewport the visitor has
       * never seen — it buys nothing. It cost something: a zoom animation
       * started at mount schedules `_onZoomTransitionEnd`, and `map.stop()`
       * does not cancel a zoom transition. Navigate away while it is running
       * and that callback fires against panes `remove()` has already deleted:
       *
       *   TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
       *     at i._getMapPanePos → i._move → i._onZoomTransitionEnd
       *
       * Reproducible by clicking a nav link a few hundred milliseconds after
       * the home page loads, which is how an impatient visitor and a presenter
       * both behave. Later fits — the ones a visitor triggers by filtering or
       * selecting — still animate, because there the motion carries meaning.
       */
      const animate = !firstFit.current;
      firstFit.current = false;
      if (markers.length === 1) {
        map.setView([markers[0]!.position.lat, markers[0]!.position.lng], Math.max(zoom ?? 11, 11), {
          animate,
        });
      } else {
        map.fitBounds(bounds.pad(0.08), { animate });
      }
    } else if (!fitToMarkers && !center && markers.length > 1) {
      /* Also an initial view, and Leaflet animates `fitBounds` by default —
         which is the same zoom transition, on the home page's heritage map. */
      map.fitBounds(bounds.pad(0.2), { animate: !firstFit.current });
      firstFit.current = false;
    }
    skipNextFit.current = false;
    // `zoom` and `center` are initial-view concerns; refitting is driven by markers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, selectedId, fitToMarkers, onSelect]);

  /* ---- pan to the selected marker ------------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    if (!marker) return;
    /* Keep the selection comfortably in view without yanking the zoom about. */
    map.panTo(marker.getLatLng(), { animate: true });
  }, [selectedId]);

  /* ---- optional route line ------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routeRef.current?.remove();
    routeRef.current = null;
    if (polyline && polyline.length > 1) {
      routeRef.current = L.polyline(
        polyline.map((point) => [point.lat, point.lng]),
        { color: "#e39b2c", weight: 3, dashArray: "6 8" },
      ).addTo(map);
    }
  }, [polyline]);

  return (
    <div
      ref={containerRef}
      className={cn("z-0 min-h-100 w-full rounded-xl border bg-surface-muted", className)}
      role="region"
      aria-label={ariaLabel}
    />
  );
}
