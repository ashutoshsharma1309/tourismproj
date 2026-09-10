"use client";

import { CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/format";
import type { Coordinates } from "@/types";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-100 w-full rounded-xl" />,
});

/* ------------------------------------------------------------------------
   Route map — one marker per base, dashed polyline in travel order
   ------------------------------------------------------------------------ */

interface Stop {
  location: string;
  coordinates: Coordinates;
  days: string;
}

export function ItineraryMap({ stops }: { stops: Stop[] }) {
  return (
    <LeafletMap
      className="h-100"
      markers={stops.map((stop) => ({
        position: stop.coordinates,
        title: stop.location,
        subtitle: stop.days,
      }))}
      polyline={stops.map((stop) => stop.coordinates)}
    />
  );
}

/* ------------------------------------------------------------------------
   Book-this-trip — mock checkout for the whole itinerary
   ------------------------------------------------------------------------ */

export function BookTripButton({ total, tripName }: { total: number; tripName: string }) {
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const confirm = () => {
    setPaying(true);
    window.setTimeout(() => {
      setPaying(false);
      setDone(true);
      toast("Confirmation email sent to user@example.com", "info");
    }, 1400);
  };

  return (
    <>
      <Button size="lg" variant="accent" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Book this trip — {formatPrice(total)}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setDone(false);
        }}
        title={done ? "Trip booked" : `Book ${tripName}`}
      >
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="animate-scale-in mx-auto size-12 text-success" aria-hidden />
            <p className="mt-3 text-body text-muted">
              All stays reserved. Your hotels have been notified, and your TSD
              contribution is logged with the department.
            </p>
            <Link
              href="/destinations/sikkim/hotels"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-small font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Browse your hotels
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-body text-muted">
              This reserves every hotel night in the itinerary at the quoted
              rates and registers your permits with a single payment of{" "}
              <strong data-numeric>{formatPrice(total)}</strong> per person.
            </p>
            <Button onClick={confirm} loading={paying} className="mt-5 w-full" size="lg">
              Pay {formatPrice(total)}
            </Button>
            <p className="mt-2 text-center text-caption text-subtle">
              Demo flow — no real payment is taken.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
