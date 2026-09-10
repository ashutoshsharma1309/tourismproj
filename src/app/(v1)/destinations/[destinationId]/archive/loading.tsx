import { Skeleton } from "@/components/ui/Skeleton";

/**
 * /archive is `force-dynamic` — it re-reads the submission store on every
 * request — so it is rendered on demand rather than served prerendered. Without
 * a loading state the browser sits on the previous page until the server
 * responds, which reads as a dead click.
 */
export default function ArchiveLoading() {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
      <Skeleton className="h-4 w-32 rounded" />
      <Skeleton className="mt-4 h-10 w-3/4 max-w-xl rounded" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl rounded" />
      <Skeleton className="mt-2 h-5 w-2/3 max-w-xl rounded" />

      <Skeleton className="mt-10 h-12 w-full rounded-lg" />

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-xl border bg-surface">
            <Skeleton className="aspect-4/3 w-full rounded-none" />
            <div className="p-5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="mt-3 h-5 w-full rounded" />
              <Skeleton className="mt-2 h-4 w-2/3 rounded" />
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status">
        Loading the heritage archive
      </span>
    </main>
  );
}
