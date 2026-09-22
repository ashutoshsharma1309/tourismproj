import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { buttonClasses } from "@/components/ui/Button";
import type { GovAccess } from "@/lib/government/access";
import type { GovT } from "@/lib/i18n/government-messages";

/**
 * What a visitor who is not a government officer sees: that this console is
 * for authorities, and nothing about who is in the queue. The same answer for
 * a traveller, a partner and a signed-out stranger.
 */
export function ConsoleGate({ access, t }: { access: Exclude<GovAccess, { kind: "ok" }>; t: GovT }) {
  return (
    <>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
        {access.kind === "no-database" ? (
          <p className="text-body-lg leading-relaxed text-muted">{t("gate.unavailable")}</p>
        ) : access.kind === "needs-code" ? (
          <>
            <h1 className="font-display text-h1 text-balance-heading">{t("gate.codeTitle")}</h1>
            <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">{t("gate.codeBody")}</p>
            <Link href="/login/code?next=/government" className={`${buttonClasses({ variant: "primary", size: "md" })} mt-6`}>
              {t("gate.codeCta")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-h1 text-balance-heading">{t("gate.title")}</h1>
            <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-muted">{t("gate.notPermitted")}</p>
            <Link href="/login?next=/government" className={`${buttonClasses({ variant: "secondary", size: "md" })} mt-6`}>
              {t("gate.codeCta")}
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
