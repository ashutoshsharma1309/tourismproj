"use client";

import { ArrowRight, Globe, MapPin, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { PublicPartnerStay } from "@/app/api/partner-stays/route";
import { ReferralLink } from "@/components/partners/ReferralLink";
import { Badge } from "@/components/ui/Badge";

/**
 * Verified partner properties of one destination, shown beside the curated
 * stays and never mixed into them.
 *
 * A property reaches this section only in status PUBLISHED, which the
 * lifecycle allows only after a reviewer verified and approved it, so the
 * badge "TerraStory partner · verified" is a statement about a review that
 * happened. The section renders nothing — no heading, no placeholder, no
 * promise — until the list arrives with at least one property, and nothing
 * at all on a deployment with no database.
 *
 * WHY THIS IS A CLIENT COMPONENT
 * ------------------------------
 * The destination page is prerendered and cannot be regenerated on demand
 * (see app/api/partner-stays/route.ts); partners are published at runtime.
 * The list is fetched after load instead. Nothing here imports the registry
 * or the Zod schemas — the endpoint sends display-ready fields — so the
 * page's client bundle grows by this file only.
 *
 * Every outbound action is a ReferralLink: the traveller goes to the
 * property's own website, map or telephone, and TerraStory counts that it
 * sent them. No rate, no availability, no booking here.
 */
export function PartnerStays({
  destinationId,
  destinationName,
}: {
  destinationId: string;
  destinationName: string;
}) {
  const [stays, setStays] = useState<PublicPartnerStay[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/partner-stays?destination=${encodeURIComponent(destinationId)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { stays: [] }))
      .then((data: { stays?: PublicPartnerStay[] }) => setStays(Array.isArray(data.stays) ? data.stays : []))
      .catch(() => {
        /* Aborted or offline: the section simply does not appear. */
      });
    return () => controller.abort();
  }, [destinationId]);

  if (stays.length === 0) return null;

  return (
    <section id="partner-stays" className="mt-14 scroll-mt-20" aria-labelledby="partner-stays-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="partner-stays-heading" className="font-display text-h3">
          Partner stays in {destinationName}
        </h2>
        <p className="text-caption text-subtle" data-numeric>{stays.length}</p>
      </div>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Properties whose owners partnered with TerraStory, each verified by a reviewer before it
        appeared here. You book with the property directly, through its own website or telephone.
      </p>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stays.map((stay) => {
          const ref = { destinationId, propertyId: stay.id };
          const href = `/destinations/${destinationId}/partner-stays/${stay.id}`;
          return (
            <li key={stay.id} className="tile flex flex-col p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">
                  <ShieldCheck className="size-3" aria-hidden />
                  TerraStory partner · verified
                </Badge>
                <span className="font-mono text-eyebrow tracking-widest text-primary uppercase">
                  {stay.typeLabel}
                </span>
              </div>
              <h3 className="mt-2 font-display text-h4">
                <Link href={href} prefetch={false} className="hover:text-primary">
                  {stay.name}
                </Link>
              </h3>
              {stay.area ? <p className="mt-1 text-caption text-muted">{stay.area}</p> : null}
              {stay.summary ? (
                <p className="mt-2 line-clamp-4 text-body leading-relaxed text-muted">{stay.summary}</p>
              ) : null}
              <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-caption">
                <Link href={href} prefetch={false} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Details
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                {stay.officialWebsite ? (
                  <ReferralLink href={stay.officialWebsite} eventType="OFFICIAL_WEBSITE" {...ref} className="inline-flex items-center gap-1 text-muted hover:text-primary">
                    <Globe className="size-3.5" aria-hidden />
                    Official website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ReferralLink>
                ) : null}
                {stay.mapsUrl ? (
                  <ReferralLink href={stay.mapsUrl} eventType="MAPS" {...ref} className="inline-flex items-center gap-1 text-muted hover:text-primary">
                    <MapPin className="size-3.5" aria-hidden />
                    Map
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ReferralLink>
                ) : null}
                {stay.phone ? (
                  <ReferralLink href={`tel:${stay.phone.replace(/[^\d+]/g, "")}`} eventType="CALL" newTab={false} {...ref} className="inline-flex items-center gap-1 text-muted hover:text-primary">
                    <Phone className="size-3.5" aria-hidden />
                    Call
                  </ReferralLink>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
