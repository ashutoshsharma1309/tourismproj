import type { Metadata } from "next";
import { Check } from "lucide-react";

import { copyFor } from "@/components/partners/workspace/copy";
import { DocumentUploadForm } from "@/components/partners/workspace/DocumentUploadForm";
import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { documentsForPartner, vendorDecisionsForPartner } from "@/db/queries/partner-inventory";
import { hasDocumentStorage } from "@/db/storage";
import { partnerTranslator, type PartnerMessageKey } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { UPLOADABLE_DOCUMENT_KINDS } from "@/lib/partners/inventory-schema";
import { VENDOR_STATUS_TONE, type VendorStatus } from "@/lib/partners/vendor";

export const metadata: Metadata = { title: "Verification", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STEPS: VendorStatus[] = ["PENDING", "UNDER_REVIEW", "VERIFIED", "APPROVED"];
const dateOf = (at: Date) => at.toISOString().slice(0, 10);

/**
 * The organisation's verification: where it is in review, the latest
 * decision and why, the registration reference given, and the supporting
 * documents. Reviewer identities are internal and never shown here.
 */
export default async function PartnerVerificationPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/verification");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/verification" />;
  const { partner } = access;
  const status = partner.status as VendorStatus;
  const [documents, decisions] = await Promise.all([documentsForPartner(partner.id), vendorDecisionsForPartner(partner.id)]);
  const reached = STEPS.indexOf(status);

  return (
    <WorkspaceShell partner={partner} current="/partner/verification" t={t} title={t("verification.title")} lede={t("verification.lede")}>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="steps" className="rounded-xl border border-border bg-surface p-5">
          <h2 id="steps" className="font-display text-h4">{t("verification.steps")}</h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((step, index) => {
              const done = reached >= 0 && index < reached;
              const here = step === status;
              return (
                <li key={step} className="flex items-start gap-3" aria-current={here ? "step" : undefined}>
                  <span
                    className={
                      done
                        ? "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white"
                        : here
                          ? "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary text-caption font-medium text-primary"
                          : "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-caption text-subtle"
                    }
                    aria-hidden
                  >
                    {done ? <Check className="size-4" /> : index + 1}
                  </span>
                  <div>
                    <p className={here ? "text-body font-medium" : "text-body text-muted"}>{t(`vendor.${step}`)}</p>
                    {here ? <p className="mt-0.5 text-small leading-relaxed text-muted">{t(`vendor.${step}.detail`)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {status === "REJECTED" || status === "SUSPENDED" ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-muted/40 p-3">
              <Badge tone={VENDOR_STATUS_TONE[status]}>{t(`vendor.${status}`)}</Badge>
              <p className="mt-2 text-small leading-relaxed text-muted">{t(`vendor.${status}.detail`)}</p>
            </div>
          ) : null}
        </section>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="latest" className="rounded-xl border border-border bg-surface p-5">
            <h2 id="latest" className="font-display text-h4">{t("verification.latest")}</h2>
            {partner.verifiedAt ? (
              <>
                <p className="mt-2 text-small text-muted">{t("verification.decidedOn", { date: dateOf(partner.verifiedAt) })}</p>
                {partner.verificationNote ? <p className="mt-2 text-small leading-relaxed">{partner.verificationNote}</p> : null}
              </>
            ) : (
              <p className="mt-2 text-small text-muted">{t("verification.noDecision")}</p>
            )}
          </section>
          <section aria-labelledby="registration" className="rounded-xl border border-border bg-surface p-5">
            <h2 id="registration" className="font-display text-h4">{t("verification.registration")}</h2>
            <p className="mt-2 text-small break-words text-muted">{partner.registrationInfo ?? t("verification.registrationNone")}</p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="documents" className="mt-10">
        <h2 id="documents" className="font-display text-h2">{t("verification.documents")}</h2>
        <p className="mt-2 max-w-prose text-body leading-relaxed text-muted">{t("verification.documentsLede")}</p>
        {documents.length === 0 ? (
          <p className="mt-4 text-body text-muted">{t("verification.noDocuments")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-small font-medium">{t(`doc.${doc.kind}`)}</p>
                  <p className="truncate text-caption text-subtle">
                    {doc.fileName ?? ""} {t("verification.uploaded", { date: dateOf(doc.createdAt) })}
                  </p>
                </div>
                <Badge tone={doc.status === "APPROVED" ? "success" : doc.status === "REJECTED" ? "error" : "neutral"}>{t(`docStatus.${doc.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
        {hasDocumentStorage ? (
          <div className="mt-6">
            <DocumentUploadForm
              copy={copyFor(t, ["upload.kind", "upload.file", "upload.hint", "upload.submit", "upload.pending", "field.choose"])}
              kinds={UPLOADABLE_DOCUMENT_KINDS.map((kind) => ({ value: kind, label: t(`doc.${kind}` as PartnerMessageKey) }))}
            />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="history" className="mt-10">
        <h2 id="history" className="font-display text-h3">{t("verification.history")}</h2>
        {decisions.length === 0 ? (
          <p className="mt-2 text-small text-muted">{t("verification.noHistory")}</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {decisions.map((decision) => {
              const to = decision.action.replace("partner.", "").toUpperCase() as VendorStatus;
              return (
                <li key={decision.id} className="flex flex-wrap gap-x-3 text-small">
                  <span className="font-mono text-caption text-subtle" data-numeric>{dateOf(decision.at)}</span>
                  <span>{t(`vendor.${to}`)}</span>
                  {decision.note ? <span className="text-muted">{decision.note}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </WorkspaceShell>
  );
}
