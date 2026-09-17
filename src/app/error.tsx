"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Route-level error boundary — graceful failure instead of a white screen. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surface the real error for debugging; nothing sensitive renders below.
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
        Something went wrong
      </p>
      <h1 className="font-display text-h2 text-balance-heading">
        This page could not load.
      </h1>
      <p className="max-w-md text-body text-muted">
        Something interrupted it on our side, not yours. Try again, or go back
        to the destinations and pick up from there.
      </p>
      <button
        type="button"
        onClick={reset}
        className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-small font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <RotateCcw className="size-4" aria-hidden />
        Try again
      </button>
      <Link href="/destinations" className="text-small font-medium text-primary underline-offset-4 hover:underline">
        Explore destinations
      </Link>
    </main>
  );
}
