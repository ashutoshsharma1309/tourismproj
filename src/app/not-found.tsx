import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Shared 404.
 *
 * This used to double as the placeholder for routes that had not shipped, and
 * its copy still told visitors that monastery pages, stays and the planner
 * "arrive in the next phase". All three have shipped and are prerendered, so a
 * genuine 404 was advertising the site's own features as missing. It now offers
 * the way back to the things that exist.
 */
export default function NotFound() {
  return (
    <main id="main" className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
        404 · Not mapped yet
      </p>
      <h1 className="font-display text-h2 text-balance-heading">
        This trail hasn&apos;t been laid.
      </h1>
      <p className="max-w-md text-body text-muted">
        There is no page at this address. The archive itself is here — fifteen
        destinations, each with its places, stories, culture, history and
        catalogued objects.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to base camp
        </Link>
        <Link
          href="/destinations"
          className="flex h-11 items-center rounded-full border border-border-strong px-6 text-small font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Browse destinations
        </Link>
        <Link
          href="/stories"
          className="flex h-11 items-center rounded-full border border-border-strong px-6 text-small font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Read the stories
        </Link>
      </div>
    </main>
  );
}
