# TerraStory Knowledge Architecture

**Purpose:** define how destination knowledge connects, so TerraStory is a connected knowledge system rather than a set of isolated features sharing a header. **Design only — nothing implemented in Phase 1.**

---

## 1. The problem with the current structure

Sikkim Darshan's content is excellent and **almost entirely disconnected**. Each surface is a silo reached only from the navbar:

```
/monasteries   /stories   /history   /culture   /archive   /explore   /hotels   /planner
     │             │          │          │          │          │          │         │
     └─────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
                        no edges between them — 12 flat nav items
```

Concretely: a story about the Pemayangtse founding does not link to the Pemayangtse site page. The history timeline's 1642 Yuksom consecration does not link to Norbugang. The planner routes past monasteries without surfacing their stories. `ContinueExploring` (125 lines) is the only cross-linking component in the codebase.

The result is that a visitor who arrives at a story has no path onward to *visiting* — which is exactly the conversion the SIH problem statement asks for. **The knowledge is there; the edges are not.**

## 2. The core relation

Everything hangs off one spine:

```
                          DESTINATION
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   KNOWLEDGE               PLACE                  PRACTICAL
   (why it matters)     (where it is)          (how to go)
        │                      │                      │
   History ─────┐         HeritageSite          EntryRequirement
   Story ───────┼────────►    │    ◄────────── Admission / Hours
   TimelineEvent│              │                MandatoryFee
   Culture ─────┤              │                Stay
   Festival ────┘              │                Operator
   ArchiveItem ────────────────┤                      │
                               ▼                      ▼
                          EXPERIENCE ──────────► ITINERARY
```

**`HeritageSite` is the hub.** It is the one entity that is simultaneously a knowledge object (it has history, stories, a timeline) and a tourism object (it has hours, admission, a location, nearby stays). Every meaningful edge in the product passes through it. Today it is called `Monastery` and carries almost none of those edges.

## 3. The edges to build

Directional, with the surface each one powers:

| From | To | Cardinality | Powers |
|---|---|---|---|
| `Story` | `HeritageSite` | many→many | "Places in this story" → visit |
| `TimelineEvent` | `HeritageSite` | many→many | "Where this happened" |
| `HeritageSite` | `Story` | 1→many | "Stories of this place" |
| `HeritageSite` | `TimelineEvent` | 1→many | Per-site timeline (exists as `MonasteryTimeline`) |
| `HeritageSite` | `HeritageSite` | many→many | "Nearby", "same tradition", "same period" |
| `HeritageSite` | `Stay` | 1→many | Proximity — **the discovery→booking hinge** |
| `HeritageSite` | `Experience` | 1→many | Festivals, rituals, seasonal access |
| `Festival` | `HeritageSite` + date | many→many | "What's on when I'm there" |
| `ArchiveItem` | `HeritageSite` / `Story` | many→many | Objects in context |
| `Itinerary` | `HeritageSite[]` | 1→many | Route composition |
| Any entity | `Source` | many→many | **Already exists** — the one edge that is built |

Two properties make these safe to add:

- **Every edge is data, not code.** They live on records and are validated by QA, so a broken reference fails the build rather than rendering a dead link.
- **Every edge inherits the weakest depth it connects.** A `deep` site linked to a `researched` story presents that link at `researched` confidence. Connection must never launder credibility.

## 4. The journey, as a graph traversal

The product philosophy — *discover → understand → explore → experience → plan → travel* — becomes a concrete path through the graph, with every step already backed by an existing component:

```
DISCOVER      Global explore → Destination                    [new]
   ↓
UNDERSTAND    Destination → History / Timeline / Stories      [history.ts, stories/*]
   ↓
EXPLORE       Story → HeritageSite → nearby Sites             [MonasteriesExplorer, ExploreMap]
   ↓
EXPERIENCE    Site → audio guide / gallery / panorama /
              festivals / archive objects                     [HeritageAudioPlayer, PhotoGallery]
   ↓
PLAN          Sites → Itinerary + Stays + Permits + Fees      [generate-itinerary, /hotels, /permits]
   ↓
TRAVEL        Itinerary → practical info → external booking   [TSDBreakdown, /permits]
```

**Every stage has working components today.** What is missing is the traversal — the links that let a visitor move from one stage to the next without going back to the navbar. That is the highest-value, lowest-risk work in the whole roadmap: it adds no new data and no new dependencies, and it directly serves the SIH conversion objective.

## 5. Two rules that keep it honest

**Depth propagates downward, never upward.**
```
deep site + researched story  ⇒  the story renders as researched
```
A well-sourced entity must not lend authority to a poorly-sourced neighbour.

**Practical data never travels along a knowledge edge.**
Opening hours, fees and permits attach only to the entity that owns them, sourced. A nearby site's hours are never inferred from another's. This is the graph-level restatement of research-engine rule 3, and it is where a connected system is most tempting to cheat.

## 6. Cross-destination edges

Only two, and both are strictly typed — this is where a knowledge graph most easily starts inventing things:

- **`sameThemeAs`** — curated thematic parallels (Buddhist monastic architecture: Sikkim ↔ Kyoto). **Human-curated only.** No automatic similarity inference.
- **`historicallyConnected`** — documented historical relationships (trade routes, empires), each requiring `claimType: "documented history"` and a citation.

Everything else stays destination-scoped. A global "related places" recommender is explicitly out of scope — see `features-to-avoid.md`.

## 7. Implementation order

1. **Add edges within Sikkim** using existing content — no new data, immediate value, fully reversible. *Highest value per unit risk in the entire roadmap.*
2. **Add depth propagation** to the rendering layer.
3. **Add `destinationId`** and scope every edge to it (Phase 2).
4. **Add cross-destination edges** only once a second destination is genuinely populated.

Step 1 can begin without any of the generalization work and is the recommended quick win for hackathon demonstration value.
