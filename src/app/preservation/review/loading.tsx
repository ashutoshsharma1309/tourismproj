import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The review queue is `force-dynamic` and does disk I/O on every request
 * (`getPendingSubmissions` reads the submission store), so it is the slowest
 * route in the application and the one most in need of a loading state.
 */
export default function ReviewLoading() {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
      <Skeleton className="h-4 w-40 rounded" />
      <Skeleton className="mt-4 h-10 w-3/4 max-w-2xl rounded" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl rounded" />

      <ul className="mt-10 flex flex-col gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="rounded-xl border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Skeleton className="h-6 w-56 rounded" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-full rounded" />
            <Skeleton className="mt-2 h-4 w-4/5 rounded" />
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status">
        Loading the review queue
      </span>
    </main>
  );
}
