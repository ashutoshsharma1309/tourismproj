import { eq } from "drizzle-orm";

import { db, hasDatabase } from "@/db";
import { partners, users } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * Who is making this request, and what they may do.
 *
 * THREE ROLES, RESOLVED FROM TWO FACTS
 * ------------------------------------
 *   ADMIN     — the signed-in e-mail is in `ADMIN_EMAILS`, a comma-separated
 *               allowlist in the environment. Reviewers are appointed by the
 *               operator, not by a checkbox anyone can tick.
 *   PARTNER   — a `partners` row is owned by this user (linked on first
 *               sign-in by matching the request's e-mail), so a partner sees
 *               exactly the properties of that one record and nothing else.
 *   TRAVELLER — everyone else who is signed in. They see nothing here.
 *
 * Nothing partner- or admin-facing renders without passing through
 * `requirePartner` / `requireAdmin`. Ownership is checked by row, never by
 * trusting an id from the client.
 */

export interface SessionUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function currentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  return { id: user.id, email, isAdmin: adminEmails().has(email) };
}

/**
 * The `users` row for a session, created on first sight.
 *
 * The row's id is the Supabase auth id, so a partner's `owner_user_id` and a
 * reviewer's `reviewer_id` / audit `actor_id` all point at the same identity
 * the session carries. Phone is null for e-mail sign-ins.
 */
export async function ensureUserRow(session: SessionUser): Promise<void> {
  if (!hasDatabase) return;
  await db
    .insert(users)
    .values({ id: session.id, email: session.email, role: session.isAdmin ? "ADMIN" : "TRAVELLER" })
    .onConflictDoNothing({ target: users.id });
}

export interface PartnerSession extends SessionUser {
  partnerId: string;
}

/**
 * The partner record this user owns, linking it on first sign-in.
 *
 * Linking is by exact e-mail match between the verified session and the
 * address the partnership request was made from. Once linked, ownership is
 * the `owner_user_id` column and the e-mail no longer matters.
 */
export async function partnerFor(session: SessionUser): Promise<PartnerSession | null> {
  if (!hasDatabase) return null;
  await ensureUserRow(session);
  const [owned] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.ownerUserId, session.id))
    .limit(1);
  if (owned) return { ...session, partnerId: owned.id };

  const [byEmail] = await db
    .select({ id: partners.id, ownerUserId: partners.ownerUserId })
    .from(partners)
    .where(eq(partners.email, session.email))
    .limit(1);
  if (!byEmail || byEmail.ownerUserId) return null;
  await db.update(partners).set({ ownerUserId: session.id }).where(eq(partners.id, byEmail.id));
  return { ...session, partnerId: byEmail.id };
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await currentUser();
  if (!session?.isAdmin) return null;
  await ensureUserRow(session);
  return session;
}
