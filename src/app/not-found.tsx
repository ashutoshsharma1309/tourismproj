import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Shared 404 — also the landing state for routes the hero links to before
 * their phases ship (/monasteries, /hotels, /planner, /tsd, /permits).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
        404 · Not mapped yet
      </p>
      <h1 className="font-display text-h2 text-balance-heading">
        This trail hasn&apos;t been laid.
      </h1>
      <p className="max-w-md text-body text-muted">
        The page you&apos;re after doesn&apos;t exist yet — monastery tours,
        hotels and the trip planner arrive in the next phase.
      </p>
      <Link
        href="/"
        className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to base camp
      </Link>
    </main>
  );
}
