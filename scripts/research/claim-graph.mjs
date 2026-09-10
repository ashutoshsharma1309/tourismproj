/**
 * Claim graph — explainable relationships between approved claims.
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase 5 shipped narrative that was restatement: claims concatenated in
 * whatever order they were extracted. Readable-ish, useless as prose, and it
 * gave a model nothing to work with beyond a list.
 *
 * Composition needs structure. But a model asked to find structure will
 * invent it — "these two developments were connected" is exactly the kind of
 * sentence that reads well and is supported by nothing. So the structure is
 * derived HERE, deterministically, from properties the claims actually have,
 * and handed to the model as a plan rather than left to its judgement.
 *
 * EVERY EDGE MUST BE EXPLAINABLE. Each one records why it exists — the shared
 * entity, the two years, the common category. An edge nobody can explain is
 * an invented relationship wearing a data structure, and this file has no
 * similarity scores or embeddings for that reason.
 */

/** Words that are capitalised without naming anything. */
const NON_ENTITY = new Set([
  "the", "a", "an", "this", "that", "these", "those", "it", "its", "he", "she",
  "they", "their", "and", "but", "or", "in", "on", "at", "by", "for", "from",
  "to", "of", "with", "as", "was", "were", "is", "are", "been", "has", "have",
  "had", "today", "later", "during", "after", "before", "when", "while",
  "although", "however", "built", "founded", "established", "constructed",
  "located", "known", "one", "two", "three", "many", "most", "some", "several",
  "both", "each", "every", "there", "here", "now", "then", "over", "under",
]);

export function entitiesIn(statement) {
  return [
    ...new Set(
      [...String(statement).matchAll(/\b([A-Z][a-zA-ZÀ-ɏ]{2,}(?:\s+[A-Z][a-zA-ZÀ-ɏ]{2,}){0,3})\b/g)]
        .map((m) => m[1])
        .filter((e) => !NON_ENTITY.has(e.toLowerCase().split(/\s+/)[0])),
    ),
  ];
}

export function yearsIn(statement) {
  return [...new Set([...String(statement).matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)].map((m) => Number(m[1])))];
}

/**
 * Build the graph.
 *
 * Four edge kinds, each derived from something checkable:
 *
 *   shares-entity  both claims name the same proper noun
 *   temporal       both carry a year; the edge records the ordering
 *   same-category  both belong to one knowledge area
 *   same-source    both rest on the same document
 *
 * `same-source` is included because it is useful for the reverse question —
 * which parts of a narrative would collapse if one source were withdrawn —
 * not because two facts sharing a publisher are related in the world.
 */
export function buildClaimGraph(claims) {
  const nodes = claims.map((c) => ({
    id: c.id,
    category: c.category,
    claimType: c.claimType,
    statement: c.statement,
    entities: entitiesIn(c.statement),
    years: yearsIn(c.statement),
    sourceIds: [...new Set((c.evidence ?? []).map((e) => e.sourceId))],
  }));

  const edges = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];

      const sharedEntities = a.entities.filter((e) => b.entities.includes(e));
      if (sharedEntities.length > 0) {
        edges.push({ from: a.id, to: b.id, kind: "shares-entity", because: sharedEntities.join(", ") });
      }

      if (a.years.length > 0 && b.years.length > 0) {
        const ea = Math.min(...a.years);
        const eb = Math.min(...b.years);
        if (ea !== eb) {
          edges.push({
            from: ea < eb ? a.id : b.id,
            to: ea < eb ? b.id : a.id,
            kind: "temporal",
            because: `${Math.min(ea, eb)} precedes ${Math.max(ea, eb)}`,
          });
        }
      }

      if (a.category === b.category) {
        edges.push({ from: a.id, to: b.id, kind: "same-category", because: a.category });
      }

      const sharedSources = a.sourceIds.filter((s) => b.sourceIds.includes(s));
      if (sharedSources.length > 0) {
        edges.push({ from: a.id, to: b.id, kind: "same-source", because: sharedSources.join(", ") });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Order claims for narration.
 *
 * Chronology first, because a heritage narrative that jumps between centuries
 * reads as a list however well written. Undated claims follow, grouped so
 * that claims about the same entity stay adjacent — which is what lets a
 * model write a transition instead of starting every sentence afresh.
 *
 * Deterministic: ties break on claim id, so the same claim set always yields
 * the same plan and the narrative cache stays valid.
 */
export function planNarrative({ claims, mode }) {
  const graph = buildClaimGraph(claims);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  const dated = graph.nodes.filter((n) => n.years.length > 0);
  const undated = graph.nodes.filter((n) => n.years.length === 0);

  dated.sort((a, b) => Math.min(...a.years) - Math.min(...b.years) || a.id.localeCompare(b.id));

  /* Group undated claims by their most-shared entity so related statements
     sit together rather than being interleaved arbitrarily. */
  const entityOf = (n) => n.entities[0] ?? "";
  undated.sort((a, b) => entityOf(a).localeCompare(entityOf(b)) || a.id.localeCompare(b.id));

  const ordered = [...dated, ...undated];

  /* The chronology the model may rely on for temporal transitions. Stated
     explicitly so "later" is grounded in years the claims actually carry. */
  const chronology = dated.map((n) => ({ id: n.id, year: Math.min(...n.years) }));

  /* Entities appearing in more than one claim — the natural through-lines. */
  const entityCounts = new Map();
  for (const n of graph.nodes) for (const e of n.entities) entityCounts.set(e, (entityCounts.get(e) ?? 0) + 1);
  const throughLines = [...entityCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([entity, count]) => ({ entity, claims: count }));

  return {
    mode,
    orderedClaimIds: ordered.map((n) => n.id),
    orderedClaims: ordered.map((n) => byId.get(n.id)),
    chronology,
    throughLines,
    edgeCount: graph.edges.length,
    graph,
  };
}
