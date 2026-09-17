"use server";

import { revalidatePath } from "next/cache";

import { removeVendorDocument, storeVendorDocument } from "@/db/storage";
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES, documentKindSchema } from "@/lib/partners/inventory-schema";
import { recordVendorDocument } from "@/lib/partners/inventory";

import { text, workspaceAction } from "../workspace-action";
import type { WorkspaceState } from "../workspace-state";

/**
 * Upload one supporting document to private storage and record it.
 *
 * The declared type is checked against the file's first bytes, so a script
 * renamed to .pdf is refused. If the record cannot be written, the stored
 * object is removed again: no orphan files in the bucket.
 */
export async function uploadDocumentAction(_prev: WorkspaceState, formData: FormData): Promise<WorkspaceState> {
  const ctx = await workspaceAction();
  if (!ctx.ok) return ctx.state;
  const { scope, t } = ctx;
  const parsedKind = documentKindSchema.safeParse(text(formData, "kind"));
  if (!parsedKind.success) return { status: "error", errors: { kind: t("error.invalid") }, message: t("error.invalid") };
  const { data: kind } = parsedKind;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > DOCUMENT_MAX_BYTES || !(file.type in DOCUMENT_TYPES)) {
    return { status: "error", errors: { file: t("error.file") }, message: t("error.file") };
  }
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signature =
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 ? "application/pdf"
    : head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff ? "image/jpeg"
    : head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 ? "image/png"
    : null;
  if (signature !== file.type) return { status: "error", errors: { file: t("error.file") }, message: t("error.file") };

  const stored = await storeVendorDocument(scope.partnerId, file, DOCUMENT_TYPES[file.type] ?? "bin");
  if (!stored.ok) return { status: "error", message: t("error.storage") };
  const result = await recordVendorDocument(scope, {
    kind,
    path: stored.path,
    fileName: file.name.slice(0, 200),
    contentType: file.type,
    sizeBytes: file.size,
  }).catch(() => ({ ok: false as const, error: "error.storage" as const }));
  if (!result.ok) {
    await removeVendorDocument(stored.path);
    return { status: "error", message: t(result.error) };
  }
  revalidatePath("/partner/verification");
  return { status: "ok", message: t("upload.done") };
}
