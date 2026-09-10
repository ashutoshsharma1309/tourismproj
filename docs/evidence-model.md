# Evidence Model

**The component Phase 2.5 specified and deferred, now implemented.** It is the mechanism that makes "no claim without a source" checkable rather than merely stated.

---

## 1. The problem it solves

Phase 1 studied Tapestry and found the gap that shaped this entire phase: its research output stores sources at the **task** level. A reader sees that thirty sources were consulted and cannot determine which supports any given sentence — a bibliography, not attribution.

Worse, attribution cannot be recovered afterwards. Once a model has composed prose from a corpus, no later step can establish which source backs which sentence. **So evidence must be extracted before synthesis, or not at all.**

## 2. The shape

```ts
interface Evidence {
  sourceId: string;          // -> SOURCES registry in src/data/sources.ts
  quote: string;             // VERBATIM span from the retrieved document
  locator: {
    charStart: number;       // offset in the normalised document text
    charEnd: number;
    url: string;             // where a reviewer opens it
  };
  evidenceType: "direct-statement" | "supporting-context";
  retrievedAt: string;
  contentHash: string;       // SHA-256 of the document text verified against
}
```

Full definition: `src/lib/research/types.ts`.

## 3. The verification, which is the whole point

```js
export function verifyEvidenceSpan(documentText, quote) {
  const needle = normaliseText(quote);
  if (needle.length < 20) return null;        // too short to be evidence
  const charStart = documentText.indexOf(needle);
  if (charStart === -1) return null;          // not in the source
  return { charStart, charEnd: charStart + needle.length, quote: needle };
}
```

`indexOf`. Not similarity, not fuzzy matching, not a second model asked whether it is "close enough".

This converts *"the model says this is in the source"* into *"the source contains this"* — a fact about bytes rather than a judgement about output quality. It holds regardless of which provider proposed the span or how convincing the surrounding prose was.

There is deliberately **no "close enough" return value**, because a caller offered one would eventually use it.

### What it rejects, verified by test

| Proposal | Result |
|---|---|
| Exact span from the document | accepted, with offsets |
| **Paraphrase** ("was established" for "was founded") | **rejected** |
| Fabricated quote | rejected |
| Span under 20 characters | rejected |
| Missing quote | rejected as malformed |
| Span whose document changed since extraction | rejected at validation |

The paraphrase case matters most. A model that paraphrases is not lying — it is being helpful in the ordinary way — and a similarity-based check would accept it. Once paraphrase is accepted, the span no longer proves the source says the thing, and the guarantee is gone.

## 4. Normalisation, and why it stays narrow

A span is checked against normalised text: NFC, line endings unified, reference markers (`[12]`) removed, whitespace collapsed, MediaWiki section headers stripped.

Nothing else. No case folding, no punctuation stripping.

**Every additional normalisation widens what counts as "verbatim", and the value of the check is precisely that it is narrow.** The removals above exist because they are formatting artifacts that would make otherwise-correct quotes fail — not because they make matching easier.

The section-header removal came from a real defect found in this phase: without it, `"...Jai's City.\n== History ==\nJaipur was founded..."` was extracted as a claim, and a reviewer would have been shown markup as fact.

## 5. Verified twice

Once at extraction, again at validation — because a source can change between the two:

```
doc.text.slice(charStart, charEnd) === quote     // offset still correct
evidence.contentHash === document.contentHash    // document unchanged
```

A source re-fetched and edited underneath a stored claim invalidates it rather than silently keeping a quote that no longer exists. `qa:research` tests this with a deliberately tampered document.

## 6. The chain

```
CLAIM ──has──> EVIDENCE ──cites──> SOURCE ──scoped to──> DESTINATION
  │                │                  │                      │
  │                │                  │                      └─ Source.scope:
  │                │                  │                         destination | country | global
  │                │                  └─ must be registered in SOURCES
  │                └─ quote must exist verbatim in the retrieved document
  └─ claimType: documented history | oral tradition | legend | travel story
```

Every link is checked deterministically in `validateClaims()`. A break at any link rejects the claim with a machine-readable reason:

`no-evidence` · `evidence-not-in-source` · `unknown-source` · `source-out-of-scope` · `practical-data` · `duplicate` · `malformed`

**Rejected claims are retained**, not discarded. A reviewer needs to see what the engine refused as much as what it accepted; a silent drop is indistinguishable from a bug.

## 7. Confidence comes from the source, not the model

```js
official-government | official-tourism | institutional | academic | museum-university  -> high
encyclopedia | reputable-publication                                                   -> medium
other-public                                                                           -> unverified
```

A model's stated confidence describes its own internal state, which is not evidence about the world. Tier is a property of the publisher, and it is what this archive has always used.

## 8. Measured

Across the Sikkim, Jaipur and Kyoto jobs: **38 evidence spans stored, 38 verified byte-exact against their documents, 0 mismatched.** Asserted on every run by `qa:research` §20.
