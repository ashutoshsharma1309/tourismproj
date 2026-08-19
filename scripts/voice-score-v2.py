"""
Objective measurement of the candidate renders.

WHAT THIS MEASURES, AND WHAT IT DOES NOT
----------------------------------------
Measured: intelligibility (word/character error rate against the exact script
the voice was asked to read), loudness (RMS and peak), clipping, leading and
trailing silence, and speaking rate.

Not measured: naturalness, warmth, "human-likeness", emotional appropriateness.
Those are perceptual and I cannot hear the files. This script prints no number
for them rather than inventing one — a fabricated 8.7/10 is exactly the kind of
claim this project exists to refuse.

WER is a proxy, not a verdict. A voice can be highly intelligible and still
sound robotic; a warm voice can score badly because the recogniser is weak in
that language. Read it as "can a machine recover the words", nothing more.
"""

import json
import re
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ASR_LANG = {"en": "en", "hi": "hi", "de": "de", "fr": "fr", "es": "es"}


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFC", text.lower())
    text = re.sub(r"[^\w\sऀ-ॿ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def audio_metrics(path: Path) -> dict:
    with wave.open(str(path), "rb") as w:
        rate = w.getframerate()
        frames = w.readframes(w.getnframes())
    x = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if x.size == 0:
        return {}
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x**2)))
    clipped = int(np.sum(np.abs(x) >= 0.999))
    # leading / trailing silence at -50 dBFS
    thresh = 10 ** (-50 / 20)
    loud = np.where(np.abs(x) > thresh)[0]
    lead = float(loud[0] / rate) if loud.size else 0.0
    trail = float((x.size - loud[-1]) / rate) if loud.size else 0.0
    return {
        "peak": round(peak, 4),
        "peakDbfs": round(20 * np.log10(peak + 1e-12), 2),
        "rms": round(rms, 4),
        "rmsDbfs": round(20 * np.log10(rms + 1e-12), 2),
        "clippedSamples": clipped,
        "leadingSilenceS": round(lead, 2),
        "trailingSilenceS": round(trail, 2),
    }


def main() -> None:
    scripts = json.loads(Path("voice-benchmark/v2/test-scripts.json").read_text())
    renders = json.loads(Path("voice-benchmark/v2/renders.json").read_text())
    import jiwer

    size = sys.argv[1] if len(sys.argv) > 1 else "medium"
    print(f"loading whisper '{size}' (the small model was shown to be an unreliable instrument)…", flush=True)
    model = WhisperModel(size, device="cpu", compute_type="int8")

    out = []
    for r in renders:
        if not r.get("ok"):
            continue
        wav = Path(f"voice-benchmark/v2/renders/{r['lang']}__{r['model']}.wav")
        if not wav.exists():
            continue
        segments, _ = model.transcribe(str(wav), language=ASR_LANG[r["lang"]], beam_size=5)
        heard = normalise(" ".join(s.text for s in segments))
        asked = normalise(scripts[r["lang"]])
        wer = jiwer.wer(asked, heard)
        cer = jiwer.cer(asked, heard)
        row = {**r, **audio_metrics(wav),
               "wer": round(wer * 100, 1), "cer": round(cer * 100, 1),
               "heard": heard[:150]}
        out.append(row)
        print(f"  {r['lang']}  {r['model']:<26} WER {wer*100:5.1f}%  CER {cer*100:5.1f}%  "
              f"RMS {row['rmsDbfs']:6.2f} dBFS  peak {row['peakDbfs']:6.2f}  clip {row['clippedSamples']}",
              flush=True)

    Path("voice-benchmark/v2/scores.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"\nwrote voice-benchmark/v2/scores.json ({len(out)} rows)")


if __name__ == "__main__":
    main()
