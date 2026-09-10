/**
 * Curated-content contradiction guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * Sikkim's archive is human-curated: fifteen monastery records whose founding
 * years were taken from cited sources and checked by a person. The research
 * engine reads the same public web and can produce a claim asserting a
 * different year for the same monastery.
 *
 * Every earlier phase's brief said the same thing about that case — reject or
 * flag, never silently overwrite — and until now nothing implemented it. The
 * claim would simply have been validated on its own evidence and approved
 * alongside the curated record, leaving the archive asserting two founding
 * dates for one building with nothing marking the disagreement.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not decide who is right. The curated record wins by default for
 * PUBLICATION, because it was verified by a person against a cited source and
 * the research claim was not — but the disagreement is recorded rather than
 * discarded, because "an official portal disagrees with our archive" is
 * exactly the kind of thing a curator needs to see.
 *
 * It is deliberately narrow: a named subject and a differing year. Broader
 * semantic contradiction needs a model, and claiming to detect it with
 * regexes would be worse than not claiming to.
 */

import { readFileSync } from "node:fs";

/**
 * Curated facts a research claim can contradict.
 *
 * Parsed from the TypeScript source the way every other script in this
 * project reads typed data — plain node, no TS loader.
 */
export function curatedFacts(destinationId) {
  /* Only Sikkim has a curated corpus. Other destinations have nothing to
     contradict, which is why they carry no protection here. */
  if (destinationId !== "sikkim") return [];

  const src = readFileSync("src/data/monasteries.ts", "utf8");
  const facts = [];

  /* Each seed record carries a name and a founding year together. */
  for (const m of src.matchAll(/slug:\s*"([a-z-]+)",\s*\n\s*name:\s*"([^"]+)",[\s\S]{0,400}?establishedYear:\s*(\d{3,4}),/g)) {
    facts.push({
      kind: "founding-year",
      slug: m[1],
      subject: m[2],
      /* The subject without the generic noun, so "Rumtek" matches a claim
         that says "Rumtek" rather than "Rumtek Monastery". */
      shortSubject: m[2].replace(/\s+(Monastery|Gompa)$/i, ""),
      year: Number(m[3]),
      source: "curated:src/data/monasteries.ts",
    });
  }
  return facts;
}

/**
 * Does this claim contradict a curated fact?
 *
 * Requires the claim to name the subject AND to assert a founding-shaped
 * statement AND to carry a year that differs. All three, because a claim
 * mentioning Rumtek and the number 1966 in some other context is not a
 * disagreement about when it was founded.
 *
 * Returns every contradiction found, so a claim colliding with two curated
 * records reports both.
 */
export function findContradictions(claim, facts) {
  const statement = String(claim.statement ?? "");
  const years = [...statement.matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)].map((m) => Number(m[1]));
  if (years.length === 0) return [];

  /* Founding-shaped language. Without this, "Rumtek was rebuilt in 1992"
     would read as a contradiction of a 1966 founding, which it is not. */
  const assertsFounding =
    /\b(founded|established|built|constructed|consecrated|dates? (back )?to|origins? to)\b/i.test(statement);
  if (!assertsFounding) return [];

  const out = [];
  for (const fact of facts) {
    const namesSubject =
      statement.includes(fact.subject) || statement.includes(fact.shortSubject);
    if (!namesSubject) continue;
    /* Agreement is the common case and is not interesting. */
    if (years.includes(fact.year)) continue;
    out.push({
      kind: fact.kind,
      subject: fact.subject,
      curatedYear: fact.year,
      claimedYears: years,
      curatedSource: fact.source,
      detail: `curated archive records ${fact.subject} founded ${fact.year}; this claim asserts ${years.join("/")}`,
    });
  }
  return out;
}

/**
 * Screen a set of claims against the curated archive.
 *
 * Contradicting claims are marked, not removed: they keep their evidence and
 * appear in the reviewer queue carrying the disagreement, which is what lets
 * a curator investigate rather than wonder why a claim vanished.
 */
export function screenAgainstCurated(claims, destinationId) {
  const facts = curatedFacts(destinationId);
  if (facts.length === 0) return { claims, contradictions: [] };

  const contradictions = [];
  const screened = claims.map((claim) => {
    const found = findContradictions(claim, facts);
    if (found.length === 0) return claim;
    contradictions.push({ claimId: claim.id, statement: claim.statement, contradicts: found });
    return {
      ...claim,
      contradictsCurated: found,
      /* Publication is blocked; review is not. The curated record stands
         until a person decides otherwise. */
      blockedFromPublication: true,
    };
  });

  return { claims: screened, contradictions };
}
