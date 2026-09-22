import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db, hasDatabase } from "@/db";
import { partnerMembers, partners, users } from "@/db/schema";
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
  /** The name given at sign-up (Supabase user metadata), if any. */
  name: string | null;
  /** The e-mail address has been confirmed. */
  emailConfirmed: boolean;
  /** How this session was established ("password", "otp", ...). */
  methods: string[];
  /** When a one-time code or e-mail link (including a reset link) last proved the inbox, in ms. */
  inboxProvenAt: number | null;
}

/**
 * The inbox was proven within `windowMs`: a code or e-mail link used recently.
 * Supabase records a password-reset link as "otp", the same as a sign-in code,
 * so this is what "opened from a reset e-mail" means for setting a password.
 */
export function recentInboxProof(session: SessionUser, windowMs = 15 * 60 * 1000): boolean {
  return session.inboxProvenAt !== null && Date.now() - session.inboxProvenAt <= windowMs;
}

/**
 * A session that proves control of the inbox: a confirmed address signed in
 * with a one-time code or e-mail link. Reviewer rights and partner records
 * are granted only to these. A password alone never reaches them, so someone
 * who registers another person's address with a password first cannot
 * inherit that person's partner or reviewer access.
 */
export function provesInbox(session: SessionUser): boolean {
  return session.emailConfirmed && session.methods.some((method) => method === "otp" || method === "magiclink");
}

/** Authentication methods (and when) named in the session's access token (validated by getUser). */
function methodsFromToken(token: string | undefined): { method: string; at: number | null }[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { amr?: unknown };
    if (!Array.isArray(payload.amr)) return [];
    return payload.amr.flatMap((entry) => {
      if (typeof entry === "string") return [{ method: entry, at: null }];
      const { method, timestamp } = (entry ?? {}) as { method?: unknown; timestamp?: unknown };
      return typeof method === "string" ? [{ method, at: typeof timestamp === "number" ? timestamp * 1000 : null }] : [];
    });
  } catch {
    return [];
  }
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
  const metaName = (user.user_metadata as { full_name?: unknown } | null)?.full_name;
  /* getUser() above validated this session's token with Supabase; reading its
     claims adds no trust, only which method issued it. */
  const { data: current } = await supabase.auth.getSession();
  const session: SessionUser = {
    id: user.id,
    email,
    isAdmin: false,
    name: typeof metaName === "string" && metaName.trim() ? metaName.trim().slice(0, 80) : null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    methods: [],
    inboxProvenAt: null,
  };
  const entries = methodsFromToken(current.session?.access_token);
  session.methods = entries.map((entry) => entry.method);
  const proofs = entries.filter((entry) => (entry.method === "otp" || entry.method === "magiclink") && entry.at !== null);
  session.inboxProvenAt = proofs.length > 0 ? Math.max(...proofs.map((entry) => entry.at as number)) : null;
  session.isAdmin = adminEmails().has(email) && provesInbox(session);
  return session;
}

/**
 * The `users` row for a session, created on first sight.
 *
 * The row's id is the Supabase auth id, so a partner's `owner_user_id` and a
 * reviewer's `reviewer_id` / audit `actor_id` all point at the same identity
 * the session carries. Phone is null for e-mail sign-ins.
 */
/** User ids whose row this process has already ensured; bounded. */
const ENSURED = new Set<string>();

/** After an account is deleted, its id must be ensured afresh if it ever returns. */
export function forgetEnsuredUser(userId: string): void {
  ENSURED.delete(userId);
}

export async function ensureUserRow(session: SessionUser): Promise<void> {
  if (!hasDatabase || ENSURED.has(session.id)) return;
  await db
    .insert(users)
    .values({
      id: session.id,
      email: session.email,
      fullName: session.name,
      role: session.isAdmin ? "ADMIN" : "TRAVELLER",
    })
    .onConflictDoNothing({ target: users.id });
  if (ENSURED.size > 10_000) ENSURED.clear();
  ENSURED.add(session.id);
}

export interface PartnerSession extends SessionUser {
  partnerId: string;
  /** OWNER: the person the partnership request was made by. STAFF: a team member they added. */
  role: "OWNER" | "STAFF";
}

/**
 * The partner record this user owns, linking it on first sign-in.
 *
 * Linking is by exact e-mail match between the verified session and the
 * address the partnership request was made from. Once linked, ownership is
 * the `owner_user_id` column and the e-mail no longer matters.
 */
export async function partnerFor(session: SessionUser): Promise<PartnerSession | null> {
  if (!hasDatabase || !provesInbox(session)) return null;
  await ensureUserRow(session);
  const [owned] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.ownerUserId, session.id))
    .limit(1);
  if (owned) return { ...session, partnerId: owned.id, role: "OWNER" };

  /* A team member, matched on the proven address, linked on first sign-in. */
  const [member] = await db
    .select({ id: partnerMembers.id, partnerId: partnerMembers.partnerId, userId: partnerMembers.userId })
    .from(partnerMembers)
    .where(eq(partnerMembers.email, session.email.toLowerCase()))
    .limit(1);
  if (member) {
    if (member.userId !== session.id) {
      await db.update(partnerMembers).set({ userId: session.id }).where(eq(partnerMembers.id, member.id));
    }
    return { ...session, partnerId: member.partnerId, role: "STAFF" };
  }

  const [byEmail] = await db
    .select({ id: partners.id, ownerUserId: partners.ownerUserId })
    .from(partners)
    .where(eq(partners.email, session.email))
    .limit(1);
  if (!byEmail || byEmail.ownerUserId) return null;
  await db.update(partners).set({ ownerUserId: session.id }).where(eq(partners.id, byEmail.id));
  return { ...session, partnerId: byEmail.id, role: "OWNER" };
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await currentUser();
  if (!session?.isAdmin) return null;
  await ensureUserRow(session);
  return session;
}

/**
 * A signed-in traveller for an account PAGE: redirects to sign-in otherwise,
 * with `next` so they return where they were going. Creates the `users` row
 * on first sight.
 */
export async function requireTraveller(next: string): Promise<SessionUser> {
  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  await ensureUserRow(session);
  return session;
}

/** A signed-in traveller for an account API route, or null (the route answers 401). */
export async function travellerForApi(): Promise<SessionUser | null> {
  const session = await currentUser();
  if (!session) return null;
  await ensureUserRow(session);
  return session;
}
