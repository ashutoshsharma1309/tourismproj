import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionControls } from "@/components/government/ConsoleForms";
import { ConsoleGate } from "@/components/government/ConsoleGate";
import { ConsoleShell } from "@/components/government/ConsoleShell";
import { Badge } from "@/components/ui/Badge";
import { queueItem } from "@/db/queries/government";
import { signedVendorDocumentUrl } from "@/db/storage";
import { getDestination } from "@/lib/destinations/registry";
import { govAccess, govLanguage } from "@/lib/government/access";
import { canGov } from "@/lib/government/permissions";
import { govTranslator, type GovT } from "@/lib/i18n/government-messages";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { nextStatuses, PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";

export const metadata: Metadata = { title: "Review application", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHECK_FIELDS = ["exists", "destination", "address", "registration", "documents"] as const;
const stamp = (at: Date) => at.toISOString().replace("T", " ").slice(0, 16);

function Row({ label, value, href, missing }: { label: string; value: string | null; href?: boolean; missing: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className="mt-0.5 text-small break-words">
        {value ? (
          href ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {value}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-subtle">{missing}</span>
        )}
      </dd>
    </div>
  );
}

/**
 * One application, for the authority that governs its destination.
 *
 * An id outside the jurisdiction answers 404 — the query never selected it —
 * so a link passed between departments leaks nothing. Documents open through
 * signed links that expire in minutes, minted per view.
 */
export default async function GovernmentReviewPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const language = await govLanguage();
  const t: GovT = govTranslator(language);
  const p = partnerTranslator(language);
  const access = await govAccess();
  if (access.kind !== "ok") return <ConsoleGate access={access} t={t} />;
  if (!canGov(access.role, "viewQueue")) return <ConsoleGate access={{ kind: "not-permitted" }} t={t} />;

  const { propertyId } = await params;
  if (!UUID.test(propertyId)) notFound();
  const item = await queueItem(access.destinations, propertyId);
  if (!item) notFound();
  const { property, partner, documents, units, trail } = item;
  const status = property.status as PropertyStatus;
  const links = await Promise.all(documents.map(async (doc) => ({ doc, url: await signedVendorDocumentUrl(doc.fileUrl) })));
  const missing = t("review.notGiven");
  const targets = nextStatuses(status);

  return (
    <ConsoleShell context={access} current="/government/queue" t={t} title={property.name}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={PROPERTY_STATUS_TONE[status]}>{p(`listing.${status}`)}</Badge>
        <span className="text-small text-muted">
          {ACCOMMODATION_LABEL[property.type]} · {getDestination(property.destinationId)?.name ?? property.destinationId}
        </span>
        <Link href="/government/queue" className="text-small font-medium text-primary hover:underline">{t("queue.title")}</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <section className="rounded-xl border border-border p-5" aria-labelledby="submitted">
            <h2 id="submitted" className="font-display text-h4">{t("review.submitted")}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Row label={t("review.organisation")} value={partner.organizationName} missing={missing} />
              <Row label={t("review.contact")} value={`${partner.contactName}${partner.phone ? ` · ${partner.phone}` : ""}`} missing={missing} />
              <Row label={t("review.registration")} value={partner.registrationInfo} missing={missing} />
              <Row label={t("review.rooms")} value={String(units)} missing={missing} />
              <div className="sm:col-span-2">
                <Row label={t("review.address")} value={property.address} missing={missing} />
              </div>
              <Row label={t("review.area")} value={property.area} missing={missing} />
              <Row label={t("review.website")} value={property.officialWebsite} href missing={missing} />
              <Row label={t("review.booking")} value={property.bookingUrl} href missing={missing} />
              <Row label={t("review.maps")} value={property.mapsUrl} href missing={missing} />
              <div className="sm:col-span-2">
                <Row label={t("review.amenities")} value={property.amenities?.join(", ") || null} missing={missing} />
              </div>
            </dl>
            <div className="mt-4">
              <p className="text-caption text-subtle">{t("review.description")}</p>
              <p className="mt-0.5 max-w-prose text-small leading-relaxed whitespace-pre-line">{property.description ?? <span className="text-subtle">{missing}</span>}</p>
            </div>
            <div className="mt-4">
              <p className="text-caption text-subtle">{t("review.character")}</p>
              <p className="mt-0.5 max-w-prose text-small leading-relaxed whitespace-pre-line">{property.localCharacter ?? <span className="text-subtle">{missing}</span>}</p>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-border p-5" aria-labelledby="documents">
            <h2 id="documents" className="font-display text-h4">{t("review.documents")}</h2>
            {links.length === 0 ? (
              <p className="mt-2 text-small text-muted">{t("review.documentsNone")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {links.map(({ doc, url }) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-small">
                    <span className="min-w-0 break-words">
                      {p(`doc.${doc.kind}`)} — {doc.fileName ?? "file"}
                    </span>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        {t("review.openDocument")}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-xl border border-border p-5" aria-labelledby="trail">
            <h2 id="trail" className="font-display text-h4">{t("review.trail")}</h2>
            {trail.length === 0 ? <p className="mt-2 text-small text-muted">{t("review.trailEmpty")}</p> : null}
            <ol className="mt-3 space-y-2">
              {trail.map((entry) => {
                const after = (entry.after ?? {}) as { by?: string };
                return (
                  <li key={entry.id} className="flex flex-wrap gap-x-3 text-small">
                    <span className="font-mono text-caption text-subtle" data-numeric>{stamp(entry.at)}</span>
                    <span>{entry.action.replace("partner_property.", "")}</span>
                    {after.by ? <span className="text-muted">{after.by}</span> : null}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside>
          {canGov(access.role, "decideVerification") ? (
            <DecisionControls
              propertyId={property.id}
              targets={targets.filter((to) => to !== "PENDING")}
              canVerify={targets.includes("VERIFIED")}
              checks={CHECK_FIELDS.map((field) => ({ field, label: t(`review.check.${field}`) }))}
              labels={{
                decision: t("review.decision"),
                checks: t("review.checks"),
                note: t("review.note"),
                notePlaceholder: t("review.notePlaceholder"),
                clarify: t("review.clarify"),
                "verb.UNDER_REVIEW": t("review.verb.UNDER_REVIEW"),
                "verb.VERIFIED": t("review.verb.VERIFIED"),
                "verb.APPROVED": t("review.verb.APPROVED"),
                "verb.PUBLISHED": t("review.verb.PUBLISHED"),
                "verb.UNPUBLISHED": t("review.verb.UNPUBLISHED"),
                "verb.REJECTED": t("review.verb.REJECTED"),
              }}
            />
          ) : null}
          {property.reviewNote ? (
            <p className="mt-4 rounded-lg border border-border bg-surface-muted/40 p-3 text-small leading-relaxed">{property.reviewNote}</p>
          ) : null}
        </aside>
      </div>
    </ConsoleShell>
  );
}
