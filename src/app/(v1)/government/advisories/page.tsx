import type { Metadata } from "next";

import { AdvisoryForm, AdvisoryStatusForm } from "@/components/government/ConsoleForms";
import { ConsoleGate } from "@/components/government/ConsoleGate";
import { ConsoleShell } from "@/components/government/ConsoleShell";
import { Badge } from "@/components/ui/Badge";
import { advisoriesForOrg } from "@/db/queries/government";
import { getDestination } from "@/lib/destinations/registry";
import { govAccess, govLanguage } from "@/lib/government/access";
import { canGov } from "@/lib/government/permissions";
import { govTranslator } from "@/lib/i18n/government-messages";

export const metadata: Metadata = { title: "Advisories", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const KINDS = ["PERMIT", "WEATHER", "CLOSURE", "RESTRICTION", "OTHER"] as const;
const SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
const day = (at: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(at);
const TONE = { INFO: "info", WARNING: "warning", CRITICAL: "error" } as const;

/**
 * The department's own advisories. Saving drafts and publishing are separate
 * acts, both audited: an advisory reaches travellers only when someone with
 * the authority to publish says so, and it carries that authority's name.
 */
export default async function GovernmentAdvisoriesPage() {
  const t = govTranslator(await govLanguage());
  const access = await govAccess();
  if (access.kind !== "ok") return <ConsoleGate access={access} t={t} />;
  if (!canGov(access.role, "viewAdvisories")) return <ConsoleGate access={{ kind: "not-permitted" }} t={t} />;
  const manage = canGov(access.role, "manageAdvisories");
  const rows = await advisoriesForOrg(access.org.id, access.destinations);

  const windowLine = (starts: Date | null, ends: Date | null) =>
    starts && ends ? t("advisories.window", { from: day(starts), until: day(ends) })
    : starts ? t("advisories.windowOpen", { from: day(starts) })
    : ends ? t("advisories.windowUntil", { until: day(ends) })
    : t("advisories.noWindow");

  return (
    <ConsoleShell context={access} current="/government/advisories" t={t} title={t("advisories.title")} lede={t("advisories.lede")}>
      {rows.length === 0 ? (
        <p className="text-body text-muted" data-advisories-empty>{t("advisories.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-surface p-5" data-advisory={row.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-h4">{row.title}</h2>
                <Badge tone={TONE[row.severity]}>{t(`severity.${row.severity}`)}</Badge>
                <Badge tone={row.status === "PUBLISHED" ? "success" : row.status === "WITHDRAWN" ? "neutral" : "marigold-soft"}>{t(`status.${row.status}`)}</Badge>
              </div>
              <p className="mt-1 text-caption text-subtle">
                {t(`kind.${row.kind}`)} · {getDestination(row.destinationId)?.name ?? row.destinationId} · {windowLine(row.startsAt, row.endsAt)}
              </p>
              {row.body ? <p className="mt-2 max-w-prose text-small leading-relaxed whitespace-pre-line text-muted">{row.body}</p> : null}
              {manage ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {row.status !== "PUBLISHED" ? <AdvisoryStatusForm advisoryId={row.id} to="PUBLISHED" label={t("advisories.publish")} /> : null}
                  {row.status === "PUBLISHED" ? <AdvisoryStatusForm advisoryId={row.id} to="WITHDRAWN" label={t("advisories.withdraw")} /> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="new-advisory">
        <h2 id="new-advisory" className="font-display text-h2">{t("advisories.new")}</h2>
        <div className="mt-4">
          {manage ? (
            <AdvisoryForm
              destinations={access.destinations.map((id) => ({ value: id, label: getDestination(id)?.name ?? id }))}
              kinds={KINDS.map((kind) => ({ value: kind, label: t(`kind.${kind}`) }))}
              severities={SEVERITIES.map((severity) => ({ value: severity, label: t(`severity.${severity}`) }))}
              labels={{
                new: t("advisories.new"),
                destination: t("advisories.destination"),
                kind: t("advisories.kind"),
                severity: t("advisories.severity"),
                title: t("advisories.advisoryTitle"),
                body: t("advisories.body"),
                from: t("advisories.from"),
                until: t("advisories.until"),
                source: t("advisories.source"),
                sourceHint: t("advisories.sourceHint"),
                save: t("advisories.save"),
                saving: t("advisories.saving"),
              }}
            />
          ) : (
            <p className="text-small text-muted">{t("advisories.readOnly")}</p>
          )}
        </div>
      </section>
    </ConsoleShell>
  );
}
