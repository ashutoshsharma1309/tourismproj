/*
 * PHASE 11 — destination-native route.
 *
 * The destination comes from the URL, never from a default. Static params are
 * generated only for destinations that have the capability behind this route,
 * so a destination without the underlying corpus has no such route at all
 * rather than an empty page explaining its absence.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { CapacityTable } from "@/components/industry/CapacityTable";
import { OperatorDirectory } from "@/components/industry/OperatorDirectory";
import { Footer } from "@/components/layout/Footer";
import { REGISTER_STATS } from "@/data/hotels";
import { AGENCY_ROUTED_PERMITS, AGENT_REGISTER_STATS } from "@/data/travel-agents";
import { CAPACITY_TOTALS, districtCapacity, widestGap } from "@/lib/capacity";
import { tallyLicences } from "@/lib/licence";
import { OPERATOR_TOTALS } from "@/lib/operator-index";
import { hotels } from "@/data/hotels";
import { travelAgents } from "@/data/travel-agents";
import { listDestinations } from "@/lib/destinations/registry";
import { destinationsWithCapability, requireCapability } from "@/lib/destinations/resolve";
import { DestinationBreadcrumb } from "@/components/destinations/DestinationBreadcrumb";

const CAPABILITY = "trade" as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await destinationsWithCapability(
    "trade",
    listDestinations().map((d) => d.id),
  );
  return ids.map((destinationId) => ({ destinationId }));
}

export const metadata: Metadata = {
  title: "The tourism trade",
  description:
    "Sikkim's registered hotels and travel agencies, from the state's own registers — searchable, with licence currency stated and heritage measured against supply by district.",
};

const hotelTally = tallyLicences(hotels.map((h) => h.licence));
const agentTally = tallyLicences(travelAgents.map((a) => a.licence));

const gangtok = districtCapacity.find((d) => d.district === "Gangtok");

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const { destination } = await requireCapability(destinationId, CAPABILITY);

  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6">
        <DestinationBreadcrumb
          destinationId={destinationId}
          destinationName={destination.name}
          section="Trade"
        />
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">
          The trade
        </p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">
          Sikkim licenses {OPERATOR_TOTALS.all.toLocaleString()} tourism
          businesses. Almost nobody can read the list.
        </h1>

        <p className="mt-4 max-w-2xl text-body-lg text-muted">
          The Tourism &amp; Civil Aviation Department registers every hotel and
          every travel agency in the state, and publishes both registers in
          full. It publishes them as paginated tables inside a JavaScript
          bundle — {AGENT_REGISTER_STATS.pagesRead} pages for the agencies
          alone — with no search, no district filter and no way to query them.
          This page is those two registers, unaltered, with the three controls
          that make them usable.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat
            value={REGISTER_STATS.published.toLocaleString()}
            label="registered hotels"
            detail={`of ${REGISTER_STATS.reportedTotal?.toLocaleString() ?? "—"} the department reports`}
          />
          <Stat
            value={AGENT_REGISTER_STATS.published.toLocaleString()}
            label="registered travel agencies"
            detail={`matching the department's own total`}
          />
          <Stat
            value={`${CAPACITY_TOTALS.heritageSites}`}
            label="catalogued heritage sites"
            detail={`${CAPACITY_TOTALS.monasteries} monasteries · ${CAPACITY_TOTALS.places} places`}
          />
        </div>

        {/* ------------------------------------------------------------------
            Why the agency register is load-bearing rather than decorative.
            ------------------------------------------------------------------ */}
        {AGENCY_ROUTED_PERMITS.length > 0 && (
          <section className="mt-14" aria-labelledby="permits-heading">
            <h2 id="permits-heading" className="font-display text-h2 text-balance-heading">
              For {AGENCY_ROUTED_PERMITS.length} destinations, the registered
              agency is part of the permit

            </h2>
            <p className="mt-3 max-w-2xl text-body text-muted">
              The department&apos;s own permit rules route these through a
              registered travel agency, which makes a searchable register of
              those agencies a precondition for the trip rather than a
              directory listing. For Nathula the requirement covers domestic
              visitors too; for others it applies to foreign nationals while
              domestic permits issue at the Police Check Post.
            </p>
            <p className="mt-2 max-w-2xl text-caption leading-relaxed text-muted">
              The requirement is specific to the destination and to the
              visitor&apos;s nationality, and this page does not flatten that
              into a blanket rule — each destination&apos;s own wording is on{" "}
              <Link href={`/destinations/${destinationId}/permits`} className="text-primary hover:underline">
                the permits page
              </Link>
              . Note also that the department cites the Tourist Trade Rules of
              2008 as the basis for the agency requirement, while the 2025 Rules
              govern the ₹50 levy.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {AGENCY_ROUTED_PERMITS.map((p) => (
                <li
                  key={p.slug}
                  className="rounded-full border border-border-strong bg-surface px-3 py-1 text-caption font-medium text-foreground"
                >
                  {p.name}
                  <span className="text-subtle"> · {p.region}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-muted">
              Read from{" "}
              <Link href={`/destinations/${destinationId}/permits`} className="text-primary hover:underline">
                the permit rules
              </Link>
              , not hardcoded — if the department changes a permit route, this
              list changes with it.
            </p>
          </section>
        )}

        {/* ------------------------------------------------------------------
            The capacity gap.
            ------------------------------------------------------------------ */}
        <section className="mt-16" aria-labelledby="capacity-heading">
          <h2 id="capacity-heading" className="font-display text-h2 text-balance-heading">
            Sikkim&apos;s heritage is spread across six districts. Its tourism
            trade is not.
          </h2>

          {gangtok && widestGap && (
            <p className="mt-3 max-w-2xl text-body text-muted">
              {gangtok.district} holds{" "}
              {(gangtok.heritageShare * 100).toFixed(1)}% of the heritage
              catalogued here and{" "}
              <strong className="font-semibold text-foreground">
                {(gangtok.hotelShare * 100).toFixed(1)}% of the state&apos;s
                registered hotels
              </strong>
              . {widestGap.district} holds{" "}
              {(widestGap.heritageShare * 100).toFixed(1)}% of the heritage and{" "}
              <strong className="font-semibold text-foreground">
                {(widestGap.hotelShare * 100).toFixed(1)}%
              </strong>{" "}
              of the hotels. Nobody publishes these two things side by side,
              because they live in different places — one in a heritage
              archive, the other in a licensing table.
            </p>
          )}

          <div className="mt-8">
            <CapacityTable />
          </div>
        </section>

        {/* ------------------------------------------------------------------
            Licence currency.
            ------------------------------------------------------------------ */}
        <section className="mt-16" aria-labelledby="licence-heading">
          <h2 id="licence-heading" className="font-display text-h2 text-balance-heading">
            Most entries on both registers are past their printed validity date
          </h2>
          <p className="mt-3 max-w-2xl text-body text-muted">
            This is a statement about the registers, and it is the kind of thing
            only reading all {OPERATOR_TOTALS.all.toLocaleString()} rows
            reveals. It is worth publishing because nothing else does: no count
            of renewals, de-registrations, inspections or compliance rates
            appears in any departmental publication, press release or assembly
            answer we could find. The proportion below may be the only
            quantitative statement about renewal compliance in Sikkim&apos;s
            tourist trade that exists in public — which is precisely why it
            needs stating carefully rather than loudly.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <LicencePanel
              title="Registered hotels"
              tally={hotelTally}
              assessedOn={REGISTER_STATS.retrievedAt}
              sourceUrl={REGISTER_STATS.sourceUrl}
            />
            <LicencePanel
              title="Registered travel agencies"
              tally={agentTally}
              assessedOn={AGENT_REGISTER_STATS.retrievedAt}
              sourceUrl={AGENT_REGISTER_STATS.sourceUrl}
            />
          </div>

          <p className="mt-4 rounded-xl border border-dashed border-border-strong p-4 text-caption leading-relaxed text-muted">
            <strong className="font-semibold text-foreground">
              Read this carefully, because it is easy to read wrongly.
            </strong>{" "}
            {hotelTally.caveat} This page makes no claim about whether any
            business is currently registered or still trading, and the most
            likely single explanation for figures this size is that renewals
            are recorded somewhere the public table is not refreshed from.
          </p>
        </section>

        {/* ------------------------------------------------------------------
            The directory.
            ------------------------------------------------------------------ */}
        <section className="mt-16" aria-labelledby="directory-heading">
          <h2 id="directory-heading" className="font-display text-h2 text-balance-heading">
            Both registers, searchable
          </h2>
          <p className="mt-3 mb-6 max-w-2xl text-body text-muted">
            {OPERATOR_TOTALS.hotels.toLocaleString()} hotels and{" "}
            {OPERATOR_TOTALS.agencies.toLocaleString()} agencies, ordered by
            district then name. No rating, no price, no availability and no
            recommendation appears here, because none is published and none is
            this project&apos;s to invent. The registers record a grade for{" "}
            {(REGISTER_STATS.withCategory + AGENT_REGISTER_STATS.withGrade).toLocaleString()}{" "}
            of them; the rest show none, which means the register states none.
          </p>

          <OperatorDirectory totals={OPERATOR_TOTALS} />
        </section>

        <p className="mt-12 text-caption leading-relaxed text-muted">
          Both registers read from the Tourism &amp; Civil Aviation Department
          on {REGISTER_STATS.retrievedAt} —{" "}
          <a
            href={REGISTER_STATS.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            hotels
          </a>{" "}
          and{" "}
          <a
            href={AGENT_REGISTER_STATS.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            travel agents
          </a>
          . Refresh with <code className="font-mono">npm run ingest:tourism</code>{" "}
          followed by{" "}
          <code className="font-mono">node scripts/promote-registers.mjs</code>.
        </p>
      </main>
      <Footer />
    </>
  );
}

function Stat({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-h2 font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-small font-medium text-foreground">{label}</p>
      <p className="mt-1 text-caption text-muted">{detail}</p>
    </div>
  );
}

function LicencePanel({
  title,
  tally,
  assessedOn,
  sourceUrl,
}: {
  title: string;
  tally: ReturnType<typeof tallyLicences>;
  assessedOn: string;
  sourceUrl: string;
}) {
  const datable = tally.current + tally.lapsed;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-h4 font-semibold text-foreground">{title}</h3>

      <p className="mt-3 font-mono text-h2 font-semibold text-warning">
        {tally.lapsedShareOfDatable === null
          ? "—"
          : `${(tally.lapsedShareOfDatable * 100).toFixed(1)}%`}
      </p>
      <p className="text-small text-muted">
        of {datable.toLocaleString()} datable entries are past the validity date
        printed against them
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-caption">
        <Figure term="Current" value={tally.current} />
        <Figure term="Date passed" value={tally.lapsed} />
        <Figure term="No date" value={tally.undated} />
      </dl>

      <p className="mt-4 text-caption text-subtle">
        Assessed against {assessedOn}, the date{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          the register
        </a>{" "}
        was read — not against today, which would assume it has not changed
        since.
      </p>
    </div>
  );
}

function Figure({ term, value }: { term: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-muted p-2">
      <dt className="text-subtle">{term}</dt>
      <dd className="mt-0.5 font-mono text-small font-semibold text-foreground">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
