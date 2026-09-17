"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { REFERRAL_EVENT_TYPES } from "@/lib/partners/schema";

/**
 * An outbound link to a property's own channel that records the referral.
 *
 * The click goes where the href says — the official website, the booking
 * page, the map, the telephone — and a beacon tells /api/referrals that it
 * happened. The beacon never blocks or redirects the navigation, and if it
 * fails the traveller notices nothing. TerraStory never sits between the
 * traveller and the property; it counts that it sent them.
 */
export function ReferralLink({
  href,
  destinationId,
  eventType,
  propertyId,
  stayRef,
  className,
  children,
  newTab = true,
}: {
  href: string;
  destinationId: string;
  eventType: (typeof REFERRAL_EVENT_TYPES)[number];
  propertyId?: string;
  stayRef?: string;
  className?: string;
  children: ReactNode;
  /** Telephone links open in place; websites and maps in a new tab. */
  newTab?: boolean;
}) {
  const pathname = usePathname();

  const record = () => {
    if (typeof navigator === "undefined") return;
    const payload = JSON.stringify({
      destinationId,
      eventType,
      source: pathname ?? "/",
      ...(propertyId ? { propertyId } : {}),
      ...(stayRef ? { stayRef } : {}),
    });
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/referrals", blob)) {
        void fetch("/api/referrals", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true });
      }
    } catch {
      /* Counting failed; the link still works. */
    }
  };

  return (
    <a
      href={href}
      onClick={record}
      onAuxClick={record}
      className={className}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
