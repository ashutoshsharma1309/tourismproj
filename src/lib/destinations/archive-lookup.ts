import { getArchiveItem } from "@/data/archive";
import type { ArchiveObject } from "@/components/archive/DestinationArchive";

/**
 * Resolving one archive object for ANY destination.
 *
 * `archive/[id]` generated its params as (every destination with an
 * archive) x (Sikkim's 77 objects), then looked the object up in Sikkim's
 * module. The day fourteen destinations gained archives, Paris prerendered
 * seventy-seven of Sikkim's objects at Paris URLs and the build went from
 * 1,014 pages to 2,120. Same cross-product the stories route once had.
 *
 * Sikkim's objects stay Sikkim's, resolved by its own helper. A capsule
 * object is found only in its own destination's catalogue, and its
 * neighbours are the objects either side of it in that catalogue — so a
 * "next" link can never leave the destination.
 */
export async function ownArchiveIds(destinationId: string): Promise<string[]> {
  if (destinationId === "sikkim") {
    const { archiveItems } = await import("@/data/archive");
    return archiveItems.map((item) => item.id);
  }
  const { archiveObjects, hasArchive } = await import("@/data/generated/archive/index");
  if (!hasArchive(destinationId)) return [];
  return ((await archiveObjects(destinationId)) as ArchiveObject[]).map((o) => o.id);
}

export async function capsuleArchiveObject(destinationId: string, id: string) {
  if (destinationId === "sikkim") return null;
  const { archiveObjects, hasArchive } = await import("@/data/generated/archive/index");
  if (!hasArchive(destinationId)) return null;
  const objects = (await archiveObjects(destinationId)) as ArchiveObject[];
  const index = objects.findIndex((o) => o.id === id);
  if (index < 0) return null;
  return {
    object: objects[index] as ArchiveObject,
    previous: index > 0 ? (objects[index - 1] as ArchiveObject) : null,
    next: index < objects.length - 1 ? (objects[index + 1] as ArchiveObject) : null,
    total: objects.length,
  };
}

/** Sikkim's own resolver, re-exported so the page has one import. */
export { getArchiveItem };
