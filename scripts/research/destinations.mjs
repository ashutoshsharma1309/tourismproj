/**
 * Destination lookup for the offline engine.
 *
 * Reads the registry out of the TypeScript sources by pattern, the same way
 * every other QA and agent script in this project reads typed data — these
 * run under plain node with no TS loader. The parse is indent-scoped to
 * top-level record fields so a nested id (Sikkim's taxonomy, for one) cannot
 * masquerade as a destination; that exact bug was caught in Phase 2.5 and is
 * not worth repeating.
 *
 * The engine deliberately does NOT accept a free-form destination string from
 * a caller. It resolves against this registry and refuses anything else, so a
 * destination id can never become a path, a module specifier or a URL.
 */

import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

function parseRecords(src, indent) {
  const pad = " ".repeat(indent);
  const idRe = new RegExp(`^${pad}id:\\s*"([a-z0-9-]+)",`, "gm");
  const nextRe = new RegExp(`^${pad}id:\\s*"`, "m");
  const out = [];
  for (const m of src.matchAll(idRe)) {
    const start = m.index;
    const rest = src.slice(start + m[0].length);
    const nextId = rest.search(nextRe);
    const end = nextId === -1 ? src.length : start + m[0].length + nextId;
    out.push({ id: m[1], block: src.slice(start, end) });
  }
  return out;
}

function field(block, name) {
  const m = block.match(new RegExp(`${name}:\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

function toDestination({ id, block }, isSikkim) {
  const country = block.match(/country:\s*\{\s*code:\s*"([A-Z]{2})",\s*name:\s*"([^"]+)"/);
  const region = block.match(/region:\s*\{\s*name:\s*"([^"]+)",\s*kind:\s*"([a-z]+)"/);
  return {
    id,
    name: field(block, "name"),
    country: country ? { code: country[1], name: country[2] } : null,
    region: region ? { name: region[1], kind: region[2] } : null,
    depth: field(block, "depth"),
    /* Sikkim builds its divisions from SIKKIM_DISTRICTS; planned records
       declare none. The engine only needs to know whether any exist. */
    divisions: isSikkim
      ? ["Gangtok", "Mangan", "Namchi", "Gyalshing", "Pakyong", "Soreng"]
      : [],
  };
}

let cache = null;

export function listDestinations() {
  if (cache) return cache;
  const sikkim = parseRecords(read("src/data/destinations/sikkim.ts"), 2).map((r) =>
    toDestination(r, true),
  );
  const planned = parseRecords(read("src/data/destinations/planned.ts"), 4).map((r) =>
    toDestination(r, false),
  );
  cache = [...sikkim, ...planned];
  return cache;
}

/** Resolve a destination, or throw. An unknown id is never fetched. */
export function getDestination(id) {
  const found = listDestinations().find((d) => d.id === id);
  if (!found) {
    throw new Error(
      `Unknown destination "${id}". Registered: ${listDestinations().map((d) => d.id).join(", ")}`,
    );
  }
  return found;
}
