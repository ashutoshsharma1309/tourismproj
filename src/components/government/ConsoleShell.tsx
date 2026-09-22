import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/account/SignOutButton";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import type { GovContext } from "@/lib/government/access";
import type { GovT } from "@/lib/i18n/government-messages";

const SECTIONS = [
  { href: "/government", key: "nav.overview" },
  { href: "/government/queue", key: "nav.queue" },
  { href: "/government/advisories", key: "nav.advisories" },
  { href: "/government/team", key: "nav.team" },
] as const;

export type ConsoleSection = (typeof SECTIONS)[number]["href"];

/**
 * The console frame: which authority you act for, how far it reaches, and
 * four sections. The jurisdiction is shown on every page because every
 * number and every record below it is limited to exactly that.
 */
export function ConsoleShell({
  context,
  current,
  t,
  title,
  lede,
  actions,
  children,
}: {
  context: GovContext;
  current: ConsoleSection;
  t: GovT;
  title: string;
  lede?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const count = context.destinations.length;
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-24 pb-20 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="truncate text-small font-medium">{context.org.name}</p>
            <p className="truncate text-caption text-subtle">
              {count === 1 ? t("gate.scopeOne", { authority: context.org.authority }) : t("gate.scope", { authority: context.org.authority, count })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="info">{t(`role.${context.role}`)}</Badge>
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
