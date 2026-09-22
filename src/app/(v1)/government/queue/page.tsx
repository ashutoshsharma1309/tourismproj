import type { Metadata } from "next";
import Link from "next/link";

import { ConsoleGate } from "@/components/government/ConsoleGate";
import { ConsoleShell } from "@/components/government/ConsoleShell";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { verificationQueue, type QueueStatus } from "@/db/queries/government";
import { getDestination } from "@/lib/destinations/registry";
import { govAccess, govLanguage } from "@/lib/government/access";
import { canGov } from "@/lib/government/permissions";
import { govTranslator } from "@/lib/i18n/government-messages";
import { PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { partnerTranslator } from "@/lib/i18n/partner-messages";

export const metadata: Metadata = { title: "Verification queue", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const OPEN: QueueStatus[] = ["PENDING", "UNDER_REVIEW", "VERIFIED"];
const day = (at: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(at);

/**
 * Applications inside the jurisdiction, oldest first — the order a queue is
 * fair in. The filter is a link, so a reviewer's place in the queue is a URL
 * they can return to.
 */
export default async function GovernmentQueuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = govTranslator(await govLanguage());
  const p = partnerTranslator(await govLanguage());
  const access = await govAccess();
  if (access.kind !== "ok") return <ConsoleGate access={access} t={t} />;
  if (!canGov(access.role, "viewQueue")) return <ConsoleGate access={{ kind: "not-permitted" }} t={t} />;

  const query = await searchParams;
  const show = (Array.isArray(query.show) ? query.show[0] : query.show) === "all" ? "all" : "open";
  const rows = await verificationQueue(access.destinations, show === "open" ? OPEN : undefined);

  return (
    <ConsoleShell
      context={access}
      current="/government/queue"
      t={t}
      title={t("queue.title")}
      lede={t("queue.lede")}
      actions={
        <div className="flex gap-2" role="group" aria-label={t("queue.filter")}>
          <Link href="/government/queue" aria-current={show === "open" ? "true" : undefined} className={buttonClasses({ variant: show === "open" ? "primary" : "outline", size: "sm" })}>
            {t("queue.filterOpen")}
          </Link>
          <Link href="/government/queue?show=all" aria-current={show === "all" ? "true" : undefined} className={buttonClasses({ variant: show === "all" ? "primary" : "outline", size: "sm" })}>
            {t("queue.filterAll")}
          </Link>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="text-body text-muted" data-queue-empty>{t("queue.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {rows.map((row) => {
            const status = row.status as PropertyStatus;
            return (
              <li key={row.propertyId} className="flex flex-wrap items-start justify-between gap-3 p-4" data-queue-item={row.propertyId}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.name}</p>
                    <Badge tone={PROPERTY_STATUS_TONE[status]}>{p(`listing.${status}`)}</Badge>
                  </div>
                  <p className="mt-0.5 text-caption text-subtle">
                    {row.organisationName} · {getDestination(row.destinationId)?.name ?? row.destinationId} · {row.vendorType.toLowerCase()} ·{" "}
                    {t("queue.submitted")} {day(row.submittedAt)} ·{" "}
                    {row.documents === 0 ? t("queue.noDocuments") : t("queue.documentCount", { count: row.documents })}
                  </p>
                  {row.clarificationRequestedAt ? (
                    <p className="mt-1 text-caption text-warning">{t("queue.clarificationPending", { date: day(row.clarificationRequestedAt) })}</p>
                  ) : null}
                </div>
                <Link href={`/government/queue/${row.propertyId}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                  {t("queue.open")}
                  <span className="sr-only">: {row.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ConsoleShell>
  );
}
