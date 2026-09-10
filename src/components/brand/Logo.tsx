import { cn } from "@/lib/cn";
import { SITE } from "@/lib/constants";

/**
 * The TerraStory mark.
 *
 * The geometry is unchanged from the mark this project already had, because it
 * already met every requirement a wordmark change would have been asked to
 * meet: it is drawn from the fabric of a Sikkim gompa rather than from generic
 * tourism iconography, it is flat geometry in `currentColor` so it holds on
 * both light and dark grounds, and it survives being scaled to a favicon.
 * Replacing a mark that works, purely because the name beside it changed, would
 * have thrown away the strongest piece of the existing identity.
 *
 * Geometry borrowed from the things a Sikkim gompa is actually built from: the
 * pointed torana arch over a shrine door, the stepped tiers of a chorten, and
 * the ridgeline behind them. Drawn as flat geometry in currentColor rather
 * than religious iconography, so the mark never becomes a sacred symbol used
 * as decoration.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9", className)}
      role="img"
      aria-label={SITE.name}
      fill="none"
    >
      {/* Torana arch — the doorway you walk through */}
      <path
        d="M20 2.5 L34.5 15.5 V36 H5.5 V15.5 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Ridgeline inside the arch */}
      <path
        d="M9.5 30.5 L15.5 22 L20 27 L25.5 18.5 L30.5 30.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Finial */}
      <circle cx="20" cy="12.5" r="2" fill="currentColor" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Hide the wordmark — navbar on small screens, favicons, avatars. */
  compact?: boolean;
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0" />
      {compact ? null : (
        <span className="font-display text-xl leading-none tracking-tight whitespace-nowrap">
          {/*
            PHASE 20: the wordmark reads from the constant rather than being
            typed here. It said "Sikkim Darshan" on every page of a product
            that now covers fifteen destinations in six countries — the mark
            in the corner of Paris's page named a different place.

            The geometry above is unchanged and deliberately so: it is drawn
            from a Sikkim gompa's torana arch, and the archive that geometry
            belongs to is still the deepest thing in this product. A mark
            earns its keep by being recognisable, not by being renamed.
          */}
          <span className="font-semibold">{SITE.name}</span>
        </span>
      )}
    </span>
  );
}
