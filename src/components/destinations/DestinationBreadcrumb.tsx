import Link from "next/link";

/**
 * Breadcrumb for destination-native routes.
 *
 * The destination comes from the caller, which resolved it from the URL —
 * nothing here knows or assumes which destination it is rendering. That is
 * the whole point of the migration: the same component labels Sikkim, Jaipur
 * and Kyoto without a conditional.
 */
export function DestinationBreadcrumb({
  destinationId,
  destinationName,
  section,
  sectionHref,
  current,
}: {
  destinationId: string;
  destinationName: string;
  /** e.g. "Monasteries". Omit on a destination landing page. */
  section?: string;
  sectionHref?: string;
  /** The page itself, when it sits below a section. */
  current?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="font-mono text-eyebrow tracking-widest uppercase">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-subtle">
        <li>
          <Link href="/destinations" className="hover:text-primary">
            Explore
          </Link>
        </li>
        <li aria-hidden>·</li>
        <li>
          {section ? (
            <Link href={`/destinations/${destinationId}`} className="hover:text-primary">
              {destinationName}
            </Link>
          ) : (
            <span className="text-primary">{destinationName}</span>
          )}
        </li>
        {section ? (
          <>
            <li aria-hidden>·</li>
            <li>
              {current && sectionHref ? (
                <Link href={sectionHref} className="hover:text-primary">
                  {section}
                </Link>
              ) : (
                <span className="text-primary">{section}</span>
              )}
            </li>
          </>
        ) : null}
        {current ? (
          <>
            <li aria-hidden>·</li>
            <li className="text-primary normal-case">{current}</li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
