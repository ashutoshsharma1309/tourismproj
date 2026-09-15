import { headers } from "next/headers";

/**
 * A rate limiter for the public write path.
 *
 * WHAT THIS DEFENDS AGAINST
 * -------------------------
 * `submitContribution` is an unauthenticated Server Action that writes up to
 * 8 MB to disk per call. Without a limit, one script fills the disk and buries
 * the curator queue under thousands of rows. The blast radius of a single
 * abusive POST is small by design; the blast radius of a hundred thousand of
 * them is not.
 *
 * WHAT IT DOES NOT DEFEND AGAINST — read this before relying on it
 * ---------------------------------------------------------------
 * The counter lives in this process's memory. That means:
 *
 *   - it resets on every deploy and every cold start;
 *   - it does not hold across multiple instances, so N instances allow N times
 *     the quota;
 *   - it keys on a client IP taken from `x-forwarded-for`, which is a header
 *     and therefore forgeable unless a trusted proxy overwrites it. Behind
 *     Vercel or a properly configured reverse proxy it is trustworthy; served
 *     directly, it is not.
 *
 * It is a speed bump that makes casual abuse inconvenient, not a control that
 * makes determined abuse impossible. A durable limiter belongs at the edge or
 * in the datastore, and that is the right fix when this archive stops writing
 * to a flat file.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS = new Map<string, Bucket>();

/** Submissions allowed per window, per client. */
export const SUBMISSION_LIMIT = 5;
export const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

/** Keeps the map from growing without bound on a long-lived process. */
function sweep(now: number) {
  if (BUCKETS.size < 5_000) return;
  for (const [key, bucket] of BUCKETS) {
    if (bucket.resetAt <= now) BUCKETS.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when `ok` is false. */
  retryAfterSeconds: number;
}

/**
 * Consume one unit of quota for the calling client.
 *
 * Falls back to a single shared bucket when no client address can be
 * determined. That is deliberately strict: an unattributable flood is exactly
 * the case worth slowing down.
 */
export async function consumeSubmissionQuota(): Promise<RateLimitResult> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  const client =
    forwarded.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unattributed";

  const now = Date.now();
  sweep(now);

  const bucket = BUCKETS.get(client);
  if (!bucket || bucket.resetAt <= now) {
    BUCKETS.set(client, { count: 1, resetAt: now + SUBMISSION_WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= SUBMISSION_LIMIT) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/* ------------------------------------------------------------- named quotas */

const SCOPED = new Map<string, Bucket>();

/**
 * A quota in its own bucket, so sign-in attempts, account-activity beacons
 * and public form submissions do not spend each other's allowance.
 *
 * `key` defaults to the client address; pass a user id to limit per account
 * instead (activity beacons, where one household may share an address).
 * In-memory and per process like the submission quota: a deterrent on a
 * single server, not a distributed guarantee — see docs/accounts.md.
 */
export async function consumeQuota(
  scope: string,
  limit: number,
  windowMs: number,
  key?: string,
): Promise<RateLimitResult> {
  let subject = key;
  if (!subject) {
    const headerList = await headers();
    subject =
      (headerList.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      headerList.get("x-real-ip")?.trim() ||
      "unattributed";
  }
  const id = `${scope}:${subject}`;
  const now = Date.now();
  if (SCOPED.size > 10_000) {
    for (const [k, bucket] of SCOPED) if (bucket.resetAt <= now) SCOPED.delete(k);
  }
  const bucket = SCOPED.get(id);
  if (!bucket || bucket.resetAt <= now) {
    SCOPED.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
