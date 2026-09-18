import "server-only";

import { eq } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { govMembers, govOrganisations } from "@/db/schema";
import { currentUser, ensureUserRow, provesInbox, type SessionUser } from "@/lib/auth/session";
import { listDestinations } from "@/lib/destinations/registry";
import type { LanguageCode } from "@/lib/i18n";
import { requestLanguage } from "@/lib/i18n/request";

import { permittedDestinations, type GovRole } from "./permissions";

/**
 * Who may use the government console, resolved from the session.
 *
 * The organisation and its destinations come from the membership row — never
 * from a URL or a form — so an officer cannot widen their jurisdiction by
 * editing a link. A destination id that does arrive in a URL is checked
 * against this list before anything is read or written.
 */
export type GovOrganisation = typeof govOrganisations.$inferSelect;

export interface GovContext {
  session: SessionUser;
  org: GovOrganisation;
  role: GovRole;
  /** Registry destination ids this officer may act in. */
  destinations: string[];
}

export type GovAccess =
  | { kind: "no-database" }
  | { kind: "needs-code"; session: SessionUser }
  | { kind: "not-permitted" }
  | ({ kind: "ok" } & GovContext);

async function resolve(session: SessionUser): Promise<GovContext | null> {
  const [row] = await db
    .select({ member: govMembers, org: govOrganisations })
    .from(govMembers)
    .innerJoin(govOrganisations, eq(govMembers.orgId, govOrganisations.id))
    .where(eq(govMembers.email, session.email.toLowerCase()))
    .limit(1);
  if (!row || !row.org.isActive) return null;
  await ensureUserRow(session);
  if (row.member.userId !== session.id) {
    await db.update(govMembers).set({ userId: session.id }).where(eq(govMembers.id, row.member.id));
  }
  const destinations = permittedDestinations(row.org, listDestinations().map((d) => d.id));
  if (destinations.length === 0) return null;
  return { session, org: row.org, role: row.member.role as GovRole, destinations };
}

/** For a PAGE. A visitor who is not a government officer is told nothing about the console. */
export async function govAccess(): Promise<GovAccess> {
  if (!hasDatabase) return { kind: "no-database" };
  const session = await currentUser();
  if (!session) return { kind: "not-permitted" };
  /* An institutional surface opens only to a session that proved its inbox. */
  if (!provesInbox(session)) return { kind: "needs-code", session };
  const context = await resolve(session);
  return context ? { kind: "ok", ...context } : { kind: "not-permitted" };
}

/** For an ACTION, or null. */
export async function govForAction(): Promise<GovContext | null> {
  if (!hasDatabase) return null;
  const session = await currentUser();
  if (!session || !provesInbox(session)) return null;
  return resolve(session);
}

export async function govLanguage(): Promise<LanguageCode> {
  return requestLanguage();
}
