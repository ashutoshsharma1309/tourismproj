# The TerraStory Guide

The "Ask the guide" panel, extended into a travel companion: it knows where the
traveller is (when they say so), what is near them, how far things are, how to
get there, what to see on the way, how to fill the rest of the day, and it
speaks the answer in their language. It is never more confident than its data.

## How an answer is made

```
question ──► classify (rules, no model) ──► tools over TerraStory's records
                                               │  places · distances · routes · permits
                                               │  weather · advisories · stays · audio guides
                                               ▼
                                     a draft answer, already correct
                                               │
               only for history / culture / place questions, or another language:
                                               ▼
                         language model rewords the draft from the retrieved records
                                               │
                     validate: schema · citations ⊆ retrieved · no links or markup ·
                     every number already in the records
                                               │
                         pass ─► model wording     fail ─► the draft, with a notice
```

- **The model never looks anything up.** It has no database access and no
  tools; it receives the records the tools retrieved and may only reword them.
  Distances, routes, weather, permits and itineraries are computed, never
  generated (`DETERMINISTIC` in `src/lib/assistant/intents.ts`).
- **Every reply is schema-checked** (`assistantReplySchema`) on the server and
  again in the browser before rendering. Nothing is rendered as HTML.
- **Prompt injection** is screened by Llama Prompt Guard; a flagged question is
  answered from records only.
- **No model configured** — the Guide answers every intent from records and
  says so ("From TerraStory's records").

## Knowledge

`src/lib/assistant/knowledge.ts` builds one index over what the site already
publishes: monasteries, places, history, stories, culture, stays and
experiences for all 18 destinations (≈1,900 records, ≈630 with coordinates).
A record without a source URL is not indexed. Each carries its source, which
the traveller can open from "Sources".

## Location, distance and routes

- Location is requested only when the traveller presses **Use my location**,
  is sent with each question, and is never stored.
- "You're here" means within 250 m of a catalogued place.
- **Straight-line distance** is haversine over published coordinates and is
  always labelled as such.
- **Road distance, drive time and the route line** come from OSRM
  (`ROUTING_OSRM_URL`). Unset or unreachable, the card says "Not available"
  and the notice explains why. The provider is named on every road figure.
- A multi-stop plan uses one OSRM request for all legs.

## Memory

- **This conversation:** the browser holds the last turns and a *focus* (the
  place and route being discussed), so "how do I get there?" works. The
  server stores no conversation.
- **The journey:** places are added only by the traveller pressing "Add … to
  my journey". Journeys now hold places as well as destinations
  (`journeys.place_ids`, migration `0006_journey_places.sql`, ≤60), synced to
  the account like the rest of the journey.

## Languages

`src/lib/assistant/languages.ts` is the capability matrix, served at
`/api/assistant/capabilities`:

| Capability | Languages |
|---|---|
| Interface and answers | the 20 platform languages |
| Answer straight from records | English |
| Answer by model translation (marked as such) | the other 19 |
| Voice input (Whisper) | the 19 Whisper supports — not Odia |
| Recorded monastery guides | 12 (ar bn de en es fr hi ja ko ne ru zh) |
| Spoken answers | the device's own voice for that language; the control says so when the device has none |
| Not yet offered | Assamese, Urdu, Sanskrit (listed with the reason) |

Place names stay in their catalogued form in every language.

## Voice

- **Input:** record (≤15 s) → `/api/assistant/transcribe` (Whisper turbo,
  biased with the destination's place names) → the transcript goes into the
  question box for the traveller to correct, not straight into a question.
  Recordings are not stored.
- **Output:** the Web Speech API, sentence by sentence, with play, pause,
  resume, replay, mute, speed and progress. English device voices get
  respellings from `src/data/pronunciation.json` for names they mangle.
- **Server speech** (optional): `ASSISTANT_TTS_PROVIDER=groq` +
  `ASSISTANT_TTS_VOICE` generates audio once per (language, voice, text),
  caches it in the private `assistant-audio` bucket and serves signed links.
  English only today.

## What it refuses to invent

Opening hours (reported hours are called reported), visiting durations,
restaurants, telephone numbers, prices, availability, emergency numbers,
permit rules beyond the department's list, weather without a provider,
distances to places it doesn't have, and facts beyond the records.

## Limits and cost

- 30 questions per 10 minutes and 20 voice questions per 10 minutes, per
  address.
- Model wording is cached for an hour by (question, records, language).
- On a rate limit the second model is used; on failure, the records' answer.
- Logs carry intent, timings, provider and outcome — never the question, the
  answer, the location or who asked (`src/lib/assistant/metrics.ts`).

## Configuration

See the "TerraStory Guide" block in `.env.example`. Before production:

- **Routing:** the public OSRM demo server is development-only. Self-host OSRM
  (India extract) or use a licensed provider.
- **Weather:** Open-Meteo's free tier is non-commercial.
- **Server speech:** accept the Orpheus model terms in the Groq console and
  choose a voice.

## QA

`pnpm qa:guide-assistant` (part of `qa:final`): intent and language rules,
code guarantees, the Sikkim traveller sequence, hallucination and injection
cases, voice input with a spoken clip, and the panel at 375/390/430 px with
keyboard, sources, location, route map and journey.
