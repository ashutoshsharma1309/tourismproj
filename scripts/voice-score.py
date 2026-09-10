#!/usr/bin/env python3
"""
Voice Scoring Agent — Sikkim Darshan

Transcribes every benchmark render with Whisper and compares the transcript to
the script the voice was asked to read. Word and character error rate are the
objective intelligibility signal: if an ASR model cannot recover the words from
clean synthetic audio, a listener will struggle too.

What this deliberately does NOT do is score "naturalness". That requires
listening, and inventing a MOS number would be exactly the kind of unfounded
claim this project exists to avoid. The renders are written to disk for a human
to rate.

Usage: .venv-tts/bin/python scripts/voice-score.py
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

from faster_whisper import WhisperModel
import jiwer

ROOT = Path(__file__).resolve().parent.parent
BENCH = ROOT / "voice-benchmark"


def normalise(text: str) -> str:
    """Strip punctuation/case/diacritic noise so WER measures words, not typography."""
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"[^\w\sऀ-ॿঀ-৿]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def main() -> None:
    data = json.loads((BENCH / "renders.json").read_text())
    passage, asr_lang = data["passage"], data["asrLang"]

    # small is the largest model that fits comfortably in 8 GB alongside everything else.
    print("  loading Whisper (small, int8, CPU) …", flush=True)
    model = WhisperModel("small", device="cpu", compute_type="int8")

    results = []
    for r in data["renders"]:
        if r.get("error"):
            continue
        lang = r["lang"]
        wav = ROOT / r["file"]
        segments, _ = model.transcribe(str(wav), language=asr_lang[lang], beam_size=5)
        hypothesis = normalise(" ".join(s.text for s in segments))
        reference = normalise(passage[lang])

        wer = jiwer.wer(reference, hypothesis)
        cer = jiwer.cer(reference, hypothesis)
        results.append({**r, "transcript": hypothesis, "wer": round(wer, 4), "cer": round(cer, 4)})
        print(f"  {lang}/{r['id']:<24} WER {wer:6.1%}  CER {cer:6.1%}")

    (BENCH / "scores.json").write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")

    print("\n  === WINNER PER LANGUAGE (lowest WER) ===")
    for lang in passage:
        rows = [r for r in results if r["lang"] == lang]
        if not rows:
            continue
        rows.sort(key=lambda r: r["wer"])
        best, incumbent = rows[0], next((r for r in rows if r["incumbent"]), None)
        delta = ""
        if incumbent and incumbent["id"] != best["id"]:
            drop = incumbent["wer"] - best["wer"]
            delta = f"  (incumbent {incumbent['id']} WER {incumbent['wer']:.1%}; {drop:+.1%} change)"
        print(f"  {lang}: {best['id']:<24} WER {best['wer']:.1%}{delta}")


if __name__ == "__main__":
    sys.exit(main())
