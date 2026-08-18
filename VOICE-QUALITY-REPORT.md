# Voice Quality Report — Sikkim Darshan

Generated 2026-08-17. Every number here was measured on this machine. Where a
quantity was not measured, this report says so instead of printing a figure.

---

## The headline, stated plainly

**I cannot tell you the narration scores 8.5/10, because I cannot listen to it.**

The brief asks for scores on naturalness, prosody, listener fatigue and
"human-likeness". Those are perceptual judgements. I can render audio, transcribe
it, and measure its waveform — I cannot hear it. Producing a confident 8.7/10
naturalness figure would be inventing data, which is the exact failure this
project has spent its whole life removing.

So this report splits into two halves:

- **Measured** — intelligibility, loudness, pace, clipping, duration. Real numbers.
- **Not measured** — naturalness and pleasantness. Left to your ears, with a
  purpose-built comparison page so the judgement takes about three minutes.

**Open `voice-benchmark/listen.html` in a browser.** Eleven candidates, four
languages, same passage, side by side, with the current production voice marked.

---

## What the benchmark found

### The instrument was lying, and the control caught it

First pass with Whisper-small produced these word error rates:

| Language | Best candidate | WER |
|---|---|---|
| English | say / Daniel | 4.8% |
| Hindi | Piper priyamvada | 61.1% |
| Nepali | Piper google | 112.8% |
| Bengali | Piper google | 100.0% |

A WER above 100% means the recogniser invented more words than the script
contains. That is a broken *instrument*, not necessarily a broken voice — so
before ranking anything, I re-ran the Indic renders through a larger Whisper
model.

| Render | Whisper-small | Whisper-medium | Instrument's share |
|---|---|---|---|
| hi / say-lekha | 64.8% | **31.5%** | 33.3 points |
| hi / piper-pratham | 72.2% | 35.2% | 37.0 points |
| hi / piper-priyamvada | 61.1% | 42.6% | 18.5 points |
| hi / piper-rohan | 63.0% | 48.1% | 14.9 points |
| ne / piper-chitwan | 123.1% | 105.1% | 18.0 points |
| bn / say-piya | 151.5% | 109.1% | 42.4 points |

**Two conclusions, both important:**

1. **Roughly half the Hindi "error" was mine, not the voice's.** And the ranking
   *inverted*: on the better instrument the incumbent macOS **Lekha wins**
   (31.5% WER, 11.6% CER) over all three Piper Hindi voices. Had I trusted the
   first pass I would have replaced a more intelligible voice with a less
   intelligible one and reported it as an upgrade.

2. **Nepali and Bengali cannot be measured at all here.** Every candidate stays
   above 100% WER even on the larger model. Whisper simply cannot transcribe
   these two reliably. Any ranking I gave them would be noise dressed as data.

### Reading the transcripts is more honest than reading the scores

| Language | Asked | Heard back |
|---|---|---|
| English | "Welcome to Rumtek Monastery. It stands in Gangtok district…" | "welcome to romtec monastery it stands in gangtok district…" |
| Hindi | "रुमटेक मठ में आपका स्वागत है। यह पूर्वी हिमालय में…" | "रूंते एक मत में आपका स्वागत है यहे पूरवी हेमाले में…" |
| Nepali | "रुमटेक गुम्बामा तपाईंलाई स्वागत छ…" | "रूमदिग कुमबा मात पाईनाय स्वागचा…" |
| Bengali | "রুমটেক মঠে আপনাকে স্বাগতম…" | `侮 gonna` |

Hindi and Nepali come back as recognisably the right words with spelling drift —
consistent with a weak recogniser and a functioning voice. Bengali returned two
junk tokens from 16 seconds of audio, on **both** engines. That is either a badly
broken render or a recogniser that is completely blind to the language. I could
not distinguish these without listening, and I am flagging it rather than
guessing.

---

## What I changed, and why each change is defensible

### 1. Loudness matching — the one clear, measurable defect

Peak level was consistent; *perceived* level was not. Bengali sat about
**4.5 dB louder** than English, so switching language in the player produced an
audible jump.

Fixed by matching **RMS** (a reasonable proxy for perceived loudness in speech)
to 0.11, with a 0.89 peak ceiling so AAC never clips.

| | Before | After |
|---|---|---|
| RMS spread across languages | ~4.5 dB | **0.2 dB** |
| Clipped files | 0 | **0** |

Gain only. **No compression, EQ, de-essing, noise reduction or reverb** — heavy
processing is what makes synthetic speech sound worse, and the real defect here
was level, not tone.

### 2. Script engineering

Three long sentences in the English narration became eight shorter ones,
averaging **10.7 words per sentence**. Punctuation is where a TTS engine takes
breath; long clauses are a major cause of the flat, rushed delivery that reads
as "robotic". This improves prosody in *any* engine, so it survives whichever
voice you pick.

### 3. Language labelling — a correctness bug, not a preference

Bengali was sitting in the language row alongside Nepali as though it were
local. **Sikkim's languages are Nepali, Bhutia, Lepcha and Limbu.** Bengali
belongs to neighbouring West Bengal, through which most domestic visitors
arrive. It is a legitimate *visitor* language and the player now says exactly
that.

The blocked-language notice now also names **Bhutia and Lepcha** — two official
languages of Sikkim with no speech engine anywhere. That absence belongs on the
page more than Assamese does.

### 4. Pronunciation dictionary

`src/data/pronunciation.json` — respellings for Rumtek, Pemayangtse, Tashiding,
Phodong, Ralang, Chogyal, Kagyu, Nyingma and others. Applies to the `say` engine;
Piper reads Devanagari directly through its phonemiser and needs no hint.

---

## What ships today

| | |
|---|---|
| Guides | 60 (15 monasteries × 4 languages) |
| Languages | English, हिन्दी, नेपाली, বাংলা |
| Duration | 70.5 – 88.3 s — all inside the 60–90 s target, none over |
| Loudness | RMS 0.107–0.110 across every file |
| Clipping | none |
| Transcript | every guide, in its own language |
| Disclosure | narration marked machine-generated in the player |

---

## Languages that remain unavailable

| Language | Official in Sikkim | Blocker |
|---|---|---|
| Bhutia (Sikkimese) | **Yes** | No speech voice in any available engine |
| Lepcha | **Yes** | No engine supports the language or its script |
| Assamese | No | Absent from macOS voices and Piper's 50 languages |
| Dzongkha | No | No voice, and no speaker to review a translation |

The brief asked for Assamese specifically. It is not reachable on this hardware:
the engines that cover it (IndicF5, Indic Parler-TTS) need PyTorch plus a
multi-gigabyte model, and this machine has **8 GB RAM, 12 GB free disk and no
CUDA**. Both were rejected before installation rather than after crashing the
project — that judgement is recorded in `final-report.json`.

---

## What I recommend you do next, in order

1. **Open `voice-benchmark/listen.html` and spend three minutes on it.** Your ear
   settles the naturalness question that no measurement here can. Pay particular
   attention to Hindi: the data says the current Lekha voice is the most
   *intelligible*, but you reported it as unpleasant, and those are different
   properties. If you prefer `piper-pratham` or `piper-rohan`, say so and the
   switch is a one-line change in `VOICES`.
2. **Listen to one Bengali file specifically.** If it is garbled, the language
   should come out until it can be replaced — it is a visitor convenience, not a
   Sikkim language, so removing it costs little.
3. **If naturalness still falls short**, the honest unlock is not another model
   on this machine — it is either a GPU box for IndicF5, or recording a human
   narrator for the fifteen English guides, which is roughly a day in a room with
   a decent microphone.

---

## Reproducing any of this

```bash
node scripts/voice-benchmark.mjs                  # render every candidate
.venv-tts/bin/python scripts/voice-score.py       # ASR scoring (Whisper small)
.venv-tts/bin/python scripts/voice-asr-control.py # instrument control (medium)
node scripts/voice-report.mjs                     # regenerate final-report.json
npm run agent:audio                               # regenerate production audio
```

Benchmark tooling lives in `scripts/` and `voice-benchmark/`, entirely separate
from the runtime. Only the winning pipeline ships; no unused TTS engine is
wired into the application.
