import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";

/** The quiet frame every sign-in page shares: brand line, heading, one form. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-md px-4 pt-28 pb-20">
        <p className="font-display text-h4 text-primary">TerraStory</p>
        <h1 className="mt-2 font-display text-h1 text-balance-heading">{title}</h1>
        {intro ? <p className="mt-2 text-body leading-relaxed text-muted">{intro}</p> : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-8 border-t border-border pt-6 text-small text-muted">{footer}</div> : null}
      </main>
      <Footer />
    </>
  );
}
