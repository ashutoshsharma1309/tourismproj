import { holdReportForPartner } from "@/db/queries/partner-analytics";
import { partnerForAction } from "@/lib/partners/access";
import { entitlementsFor } from "@/lib/subscriptions/access";
import { can } from "@/lib/subscriptions/entitlements";

/**
 * Reservations on the partner's listings as CSV. Gated on `advancedReports`
 * here, on the server — not only by hiding the link. No traveller identity:
 * code, stay, rooms, guests, status and amount only.
 */
export const dynamic = "force-dynamic";

const cell = (value: string | number) => {
  const text = String(value);
  /* Quote everything; neutralise spreadsheet formulas. */
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

const rupees = (paise: bigint) => `${paise / 100n}.${(paise % 100n).toString().padStart(2, "0")}`;

export async function GET() {
  const headers = { "cache-control": "private, no-store" };
  const access = await partnerForAction();
  if (!access) return Response.json({ error: "sign in as a partner" }, { status: 401, headers });
  if (!can(await entitlementsFor(access.partner.id), "advancedReports")) {
    return Response.json({ error: "your plan does not include reports" }, { status: 403, headers });
  }
  const rows = await holdReportForPartner(access.partner.id);
  const lines = [
    ["code", "listing", "room_type", "check_in", "check_out", "rooms", "guests", "status", "total_inr", "created_at"].map(cell).join(","),
    ...rows.map((r) =>
      [r.code, r.listing, r.roomType, r.checkIn, r.checkOut, r.rooms, r.guests, r.status, rupees(r.totalPaise), r.createdAt.toISOString()].map(cell).join(","),
    ),
  ];
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      ...headers,
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="reservations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
