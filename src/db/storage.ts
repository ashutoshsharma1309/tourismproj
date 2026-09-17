import "server-only";

import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

/**
 * Private storage for vendor verification documents.
 *
 * The service-role key never leaves src/db (CLAUDE.md §8). Documents go to
 * the PRIVATE `vendor-docs` bucket under the vendor's own id, and are read
 * back only through signed links that expire in minutes — there is no public
 * URL for any of them.
 */
const BUCKET = "vendor-docs";
const SIGNED_URL_SECONDS = 300;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const hasDocumentStorage = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function storeVendorDocument(
  vendorId: string,
  file: File,
  extension: string,
): Promise<{ ok: true; path: string } | { ok: false }> {
  const client = adminClient();
  if (!client) return { ok: false };
  /* The stored name is random: the original file name is kept as a column,
     never as a path a URL could guess. */
  const path = `${vendorId}/${randomUUID()}.${extension}`;
  const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("storage: vendor document upload failed", error.message);
    return { ok: false };
  }
  return { ok: true, path };
}

export async function removeVendorDocument(path: string): Promise<void> {
  const client = adminClient();
  if (!client) return;
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) console.error("storage: vendor document removal failed", error.message);
}

/** A link a reviewer can open for a few minutes. Null if storage is unavailable. */
export async function signedVendorDocumentUrl(path: string): Promise<string | null> {
  const client = adminClient();
  if (!client) return null;
  const { data: signed, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) {
    console.error("storage: signed link failed", error.message);
    return null;
  }
  return signed.signedUrl;
}
