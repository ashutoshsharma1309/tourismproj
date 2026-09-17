import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/account/SignOutButton";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import type { PartnerRow } from "@/db/queries/partners";
import type { PartnerT } from "@/lib/i18n/partner-messages";
import { VENDOR_STATUS_TONE, type VendorStatus } from "@/lib/partners/vendor";

const SECTIONS = [
  { href: "/partner/dashboard", key: "nav.overview" },
  { href: "/partner/verification", key: "nav.verification" },
  { href: "/partner/listings", key: "nav.listings" },
  { href: "/partner/calendar", key: "nav.calendar" },
] as const;

export type WorkspaceSection = (typeof SECTIONS)[number]["href"];

/**
 * The frame every partner-workspace page shares: who is signed in, the
 * organisation's verification status, and four sections. Light and quiet —
 * this is a surface people work in, not one they browse.
 */
export function WorkspaceShell({
  partner,
  current,
  t,
  title,
  lede,
  actions,
  children,
}: {
  partner: PartnerRow;
  current: WorkspaceSection;
  t: PartnerT;
  title: string;
  lede?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const status = partner.status as VendorStatus;
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-24 pb-20 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="truncate text-small font-medium">{partner.organizationName}</p>
            <p className="truncate text-caption text-subtle">{partner.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={VENDOR_STATUS_TONE[status]}>{t(`vendor.${status}`)}</Badge>
            <SignOutButton />
          </div>
        </div>

        <nav aria-label={t("nav.label")} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex min-w-max gap-1 py-3">
            {SECTIONS.map((section) => {
              const active = section.href === current;
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "inline-flex h-10 items-center rounded-full bg-primary-soft px-4 text-small font-medium text-primary"
                        : "inline-flex h-10 items-center rounded-full px-4 text-small text-muted hover:bg-surface-muted hover:text-foreground"
                    }
                  >
                    {t(section.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-h1 text-balance-heading">{title}</h1>
            {lede ? <p className="mt-2 max-w-2xl text-body leading-relaxed text-muted">{lede}</p> : null}
          </div>
          {actions}
        </div>

        <div className="mt-8">{children}</div>
      </main>
      <Footer />
    </>
  );
}
