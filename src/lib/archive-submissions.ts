import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { archiveItems, ARCHIVE_CATEGORY_ORDER } from "@/data/archive";
import type { ArchiveCategory } from "@/data/archive";

/**
 * Community contributions to the Digital Heritage Archive.
 *
 * The one rule this module exists to enforce: a submission NEVER becomes
 * published archive content on its own. Every record is created with status
 * "pending-review" and there is no code path in the application that sets any
 * other status — approval is a curator action performed outside the public
 * app, and until it happens the item is rendered as pending everywhere it
 * appears.
 *
 * Pre-screening runs automatically and is advisory only. It can flag a likely
 * duplicate, a missing field, a location that does not look like Sikkim or an
 * obvious spam pattern. It cannot mark anything verified, and it cannot reject
 * anything. A cultural verification decision is a human decision.
 *
 * Storage is a JSON file plus an uploads directory under .data/ — deliberately
 * outside public/, so an unreviewed upload is never served as a static asset.
 * Supabase is the intended home for this table; the local store keeps the flow
 * working with no database configured, which is how the rest of this app
 * behaves too.
 */

const DATA_DIR = join(process.cwd(), ".data");
const STORE = join(DATA_DIR, "archive-submissions.json");
const UPLOADS = join(DATA_DIR, "uploads");

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** The only status a submission can hold inside this application. */
export type SubmissionStatus = "pending-review";

export type ScreeningSeverity = "info" | "warning";

export interface ScreeningFlag {
  code: string;
  severity: ScreeningSeverity;
  message: string;
}

export interface ArchiveSubmission {
  id: string;
  status: SubmissionStatus;
  /* What was submitted. */
  title: string;
  description: string;
  category: ArchiveCategory;
  community: string | null;
  location: string | null;
  period: string | null;
  sourceContext: string | null;
  /* Who submitted it. */
  contributorName: string;
  contributorContact: string | null;
  /** Explicit rights declaration — a submission cannot be stored without it. */
  rightsDeclared: boolean;
  /* Media, held outside public/ until a curator approves it. */
  mediaFilename: string | null;
  mediaType: string | null;
  mediaBytes: number | null;
  /** SHA-256 of the uploaded bytes — the duplicate check. */
  mediaHash: string | null;
  /* Automated pre-screening. Advisory. */
  screening: ScreeningFlag[];
  submittedAt: string;
}

export interface SubmissionInput {
  title: string;
  description: string;
  category: string;
  community?: string | null;
  location?: string | null;
  period?: string | null;
  sourceContext?: string | null;
  contributorName: string;
  contributorContact?: string | null;
  rightsDeclared: boolean;
  media?: File | null;
}

export class SubmissionError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
    this.name = "SubmissionError";
  }
}

/* ------------------------------------------------------------------- store */

async function ensureDirs() {
  await mkdir(UPLOADS, { recursive: true });
}

export async function readSubmissions(): Promise<ArchiveSubmission[]> {
  if (!existsSync(STORE)) return [];
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ArchiveSubmission[]) : [];
  } catch {
    /* A corrupt store must not take the review queue down. */
    return [];
  }
}

async function writeSubmissions(rows: ArchiveSubmission[]) {
  await ensureDirs();
  await writeFile(STORE, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

export function submissionMediaPath(submission: ArchiveSubmission): string | null {
  return submission.mediaFilename ? join(UPLOADS, submission.mediaFilename) : null;
}

export async function readSubmissionMedia(id: string): Promise<{ bytes: Buffer; type: string } | null> {
  const rows = await readSubmissions();
  const row = rows.find((r) => r.id === id);
  const path = row ? submissionMediaPath(row) : null;
  if (!row || !path || !existsSync(path)) return null;
  return { bytes: await readFile(path), type: row.mediaType ?? "application/octet-stream" };
}

/* --------------------------------------------------------- pre-screening */

/** Districts and well-known place names, used only to flag — never to reject. */
const SIKKIM_PLACE_HINTS = [
  "sikkim",
  "gangtok",
  "mangan",
  "namchi",
  "gyalshing",
  "pelling",
  "pakyong",
  "soreng",
  "ravangla",
  "yuksom",
  "lachen",
  "lachung",
  "rumtek",
  "tashiding",
  "dzongu",
  "singtam",
  "rangpo",
  "jorethang",
  "geyzing",
  "aritar",
  "temi",
  "khecheopalri",
  "tsomgo",
  "nathu",
  "kabi",
  "rabdentse",
];

const SPAM_PATTERNS = [
  /\bhttps?:\/\/\S+\b.*\bhttps?:\/\/\S+/i, // two or more links in the body
  /\b(buy now|click here|free download|casino|crypto|viagra|seo services)\b/i,
  /(.)\1{9,}/, // ten of the same character in a row
];

/**
 * Automated pre-screening.
 *
 * Everything here is a flag for the curator's attention. Nothing here decides
 * whether a submission is true, and nothing here changes its status.
 */
export function prescreen(
  input: Omit<SubmissionInput, "media">,
  media: { hash: string | null; bytes: number | null; type: string | null },
  existing: ArchiveSubmission[],
): ScreeningFlag[] {
  const flags: ScreeningFlag[] = [];
  const haystack = `${input.title} ${input.description}`.toLowerCase();

  /* Duplicate media — byte-identical to something already in the queue. */
  if (media.hash && existing.some((row) => row.mediaHash === media.hash)) {
    flags.push({
      code: "duplicate-media",
      severity: "warning",
      message: "This file is byte-identical to a submission already in the queue.",
    });
  }

  /* Duplicate of something already published. */
  const titleKey = input.title.trim().toLowerCase();
  if (titleKey && archiveItems.some((item) => item.title.toLowerCase() === titleKey)) {
    flags.push({
      code: "duplicate-title",
      severity: "warning",
      message: "An item with this exact title is already published in the archive.",
    });
  }
  if (titleKey && existing.some((row) => row.title.trim().toLowerCase() === titleKey)) {
    flags.push({
      code: "duplicate-pending",
      severity: "warning",
      message: "A submission with this title is already awaiting review.",
    });
  }

  /* Missing metadata that a curator will have to chase. */
  const missing = [
    !input.location?.trim() && "location",
    !input.period?.trim() && "date or period",
    !input.community?.trim() && "community",
    !input.sourceContext?.trim() && "source or context",
  ].filter(Boolean) as string[];
  if (missing.length > 0) {
    flags.push({
      code: "missing-metadata",
      severity: "info",
      message: `No ${missing.join(", ")} given. A heritage record needs these before it can be published.`,
    });
  }

  /* Location that does not read like Sikkim. */
  const location = input.location?.toLowerCase() ?? "";
  if (location && !SIKKIM_PLACE_HINTS.some((hint) => location.includes(hint))) {
    flags.push({
      code: "location-unrecognised",
      severity: "info",
      message:
        "The location given does not match any Sikkim district or well-known place name. Worth confirming before publication.",
    });
  }

  /* Obvious spam shapes. */
  if (SPAM_PATTERNS.some((pattern) => pattern.test(haystack))) {
    flags.push({
      code: "spam-pattern",
      severity: "warning",
      message: "The text matches a common spam pattern. Read it before doing anything else with it.",
    });
  }

  /* A description too thin to verify. */
  if (input.description.trim().length < 120) {
    flags.push({
      code: "thin-description",
      severity: "info",
      message: "The description is short. There may not be enough here to check the claim against a source.",
    });
  }

  /* Claims stated as fact with no source offered. */
  if (!input.sourceContext?.trim() && /\b(18|19|20)\d{2}\b/.test(haystack)) {
    flags.push({
      code: "unsourced-date",
      severity: "warning",
      message: "The text states a specific year but no source was given for it.",
    });
  }

  if (media.type && !ACCEPTED_UPLOAD_TYPES.includes(media.type)) {
    flags.push({
      code: "unexpected-media-type",
      severity: "warning",
      message: `Unexpected media type ${media.type}.`,
    });
  }

  return flags;
}

/* ------------------------------------------------------------------ create */

function slugId(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "submission";
  /* Randomness keeps two identical titles from colliding; it is not a secret. */
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

const isCategory = (value: string): value is ArchiveCategory =>
  (ARCHIVE_CATEGORY_ORDER as string[]).includes(value);

/**
 * Validate, screen and store a submission.
 *
 * Returns the stored record. Its status is "pending-review" and there is no
 * argument that changes that.
 */
export async function createSubmission(input: SubmissionInput): Promise<ArchiveSubmission> {
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const contributorName = input.contributorName?.trim() ?? "";

  if (title.length < 4) throw new SubmissionError("title", "Give the item a title of at least 4 characters.");
  if (description.length < 30)
    throw new SubmissionError("description", "Describe the item in at least 30 characters, so a curator can check it.");
  if (!isCategory(input.category))
    throw new SubmissionError("category", "Choose one of the archive's categories.");
  if (contributorName.length < 2)
    throw new SubmissionError("contributorName", "Tell us who to credit this contribution to.");
  if (!input.rightsDeclared)
    throw new SubmissionError(
      "rightsDeclared",
      "You must confirm you hold the rights to this material, or that it is free to share.",
    );
  if (input.contributorContact && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.contributorContact.trim()))
    throw new SubmissionError("contributorContact", "That email address does not look valid.");

  await ensureDirs();
  const existing = await readSubmissions();

  let mediaFilename: string | null = null;
  let mediaType: string | null = null;
  let mediaBytes: number | null = null;
  let mediaHash: string | null = null;

  const file = input.media;
  if (file && typeof file === "object" && "arrayBuffer" in file && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES)
      throw new SubmissionError("media", `That file is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
    if (!ACCEPTED_UPLOAD_TYPES.includes(file.type))
      throw new SubmissionError("media", "Upload a JPEG, PNG, WebP or AVIF image.");
    const buffer = Buffer.from(await file.arrayBuffer());
    mediaHash = createHash("sha256").update(buffer).digest("hex");
    mediaType = file.type;
    mediaBytes = buffer.byteLength;
    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    mediaFilename = `${mediaHash.slice(0, 24)}.${extension}`;
    await writeFile(join(UPLOADS, mediaFilename), buffer);
  }

  const screening = prescreen(
    {
      title,
      description,
      category: input.category,
      community: input.community ?? null,
      location: input.location ?? null,
      period: input.period ?? null,
      sourceContext: input.sourceContext ?? null,
      contributorName,
      contributorContact: input.contributorContact ?? null,
      rightsDeclared: input.rightsDeclared,
    },
    { hash: mediaHash, bytes: mediaBytes, type: mediaType },
    existing,
  );

  const submission: ArchiveSubmission = {
    id: slugId(title),
    /* The only status this application can write. */
    status: "pending-review",
    title,
    description,
    category: input.category,
    community: input.community?.trim() || null,
    location: input.location?.trim() || null,
    period: input.period?.trim() || null,
    sourceContext: input.sourceContext?.trim() || null,
    contributorName,
    contributorContact: input.contributorContact?.trim() || null,
    rightsDeclared: true,
    mediaFilename,
    mediaType,
    mediaBytes,
    mediaHash,
    screening,
    submittedAt: new Date().toISOString(),
  };

  await writeSubmissions([submission, ...existing]);
  return submission;
}

/** Newest first — the order the curator queue reads in. */
export async function getPendingSubmissions(): Promise<ArchiveSubmission[]> {
  const rows = await readSubmissions();
  return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getSubmission(id: string): Promise<ArchiveSubmission | undefined> {
  const rows = await readSubmissions();
  return rows.find((row) => row.id === id);
}
