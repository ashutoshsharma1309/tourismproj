import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/account/SignOutButton";
import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import type { PartnerT } from "@/lib/i18n/partner-messages";
import type { PartnerAccess } from "@/lib/partners/access";

/**
 * What the workspace shows a visitor who may not use it yet: a database-less
 * deployment, a session that has not proved its inbox, or a signed-in person
 * with no partnership request. Each says what to do next.
 */
export function WorkspaceGate({ access, t, next }: { access: Exclude<PartnerAccess, { kind: "ok" }>; t: PartnerT; next: string }) {
  return (
    <>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
        {access.kind === "no-database" ? (
          <p className="text-body-lg leading-relaxed text-muted">{t("gate.unavailable")}</p>
        ) : access.kind === "needs-code" ? (
          <>
            <h1 className="font-display text-h1 text-balance-heading">{t("gate.codeTitle")}</h1>
            <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">{t("gate.codeBody")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/login/code?next=${encodeURIComponent(next)}`} className={buttonClasses({ variant: "primary", size: "md" })}>
                {t("gate.codeCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-h1 text-balance-heading">{t("gate.noneTitle")}</h1>
            <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">{t("gate.noneBody", { email: access.session.email })}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/partner/apply" className={buttonClasses({ variant: "primary", size: "md" })}>
                {t("gate.noneCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <SignOutButton />
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
