import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { reviewQueue } from "@/db/queries/partners";
import { requireAdmin } from "@/lib/auth/session";
import { getDestination } from "@/lib/destinations/registry";
import { PROPERTY_STATUSES, PROPERTY_STATUS_LABEL, PROPERTY_STATUS_TONE, type PropertyStatus } from "@/lib/partners/lifecycle";
import { ACCOMMODATION_LABEL } from "@/lib/partners/schema";

export const metadata: Metadata = { title: "Partner review", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The review queue. Reachable only by an allowlisted reviewer; everyone
 * else — signed in or not — gets the same 404 a non-existent page gives,
 * so the console's existence is not confirmed to anyone outside it.
 */
export default async function AdminPartnersPage() {
  const admin = await requireAdmin();
  if (!admin) notFound();

  const queue = await reviewQueue();
  const byStatus = new Map<PropertyStatus, number>();
  for (const item of queue) {
    const s = item.property.status as PropertyStatus;
    byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
  }

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6">
        <p className="font-mono text-eyebrow tracking-widest text-primary uppercase">Review console</p>
        <h1 className="mt-3 font-display text-h1 text-balance-heading">Partner properties</h1>
        <p className="mt-2 text-body text-muted">
          Signed in as {admin.email}. Every decision here is recorded with your identity.
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {PROPERTY_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-2 text-small">
              <dt><Badge tone={PROPERTY_STATUS_TONE[status]}>{PROPERTY_STATUS_LABEL[status].label}</Badge></dt>
              <dd className="font-mono" data-numeric>{byStatus.get(status) ?? 0}</dd>
            </div>
          ))}
        </dl>

        {queue.length === 0 ? (
          <p className="mt-10 rounded-xl border border-border bg-surface-muted/40 p-5 text-body text-muted">
            No partnership requests yet. When a property owner applies at /partner/apply, it appears here.
          </p>
        ) : (
          <div className="relative mt-8 overflow-x-auto">
            {/* `relative` makes this the containing block for the sr-only
                header below; without it that absolutely-positioned span
                escapes the scroll clip and widened the page to ~590px on a
                phone. */}
            <table className="w-full min-w-[40rem] text-small">
              <thead>
                <tr className="border-b border-border text-left text-caption text-subtle">
                  <th className="py-2 pr-4 font-medium">Property</th>
                  <th className="py-2 pr-4 font-medium">Destination</th>
                  <th className="py-2 pr-4 font-medium">Partner</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  <th className="py-2 font-medium"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {queue.map(({ property, partner }) => {
                  const status = property.status as PropertyStatus;
                  return (
                    <tr key={property.id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{property.name}</span>
                        <span className="block text-caption text-muted">{ACCOMMODATION_LABEL[property.type]}</span>
                      </td>
                      <td className="py-3 pr-4">{getDestination(property.destinationId)?.name ?? property.destinationId}</td>
                      <td className="py-3 pr-4">
                        {partner.organizationName}
                        <span className="block text-caption text-muted">{partner.email}</span>
                      </td>
                      <td className="py-3 pr-4"><Badge tone={PROPERTY_STATUS_TONE[status]}>{PROPERTY_STATUS_LABEL[status].label}</Badge></td>
                      <td className="py-3 pr-4 font-mono text-caption" data-numeric>{property.createdAt.toISOString().slice(0, 10)}</td>
                      <td className="py-3 text-right">
                        <Link href={`/admin/partners/${property.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          Review
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
