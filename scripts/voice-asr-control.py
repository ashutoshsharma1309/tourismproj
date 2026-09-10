#!/usr/bin/env python3
"""
ASR control experiment.

A WER above 100% means the recogniser inserted more words than the reference
contains. That is the signature of a failing recogniser, not necessarily a
failing voice. Before ranking any Indic voice on Whisper-small's output, test
the instrument: re-transcribe the same files with a larger model and see how
much of the "error" was ours.

Usage: .venv-tts/bin/python scripts/voice-asr-control.py
"""
import json, re, unicodedata
from pathlib import Path
from faster_whisper import WhisperModel
import jiwer

ROOT = Path(__file__).resolve().parent.parent
BENCH = ROOT / "voice-benchmark"

def normalise(t):
    t = unicodedata.normalize("NFC", t)
    t = re.sub(r"[^\w\sऀ-ॿঀ-৿]", " ", t)
    return re.sub(r"\s+", " ", t).strip().lower()

data = json.loads((BENCH / "renders.json").read_text())
passage, asr_lang = data["passage"], data["asrLang"]
targets = [r for r in data["renders"] if r["lang"] in ("hi", "ne", "bn") and not r.get("error")]

print("  loading Whisper medium (int8, CPU) — the control instrument …", flush=True)
model = WhisperModel("medium", device="cpu", compute_type="int8")

small = {f"{r['lang']}/{r['id']}": r for r in json.loads((BENCH / "scores.json").read_text())}
out = []
for r in targets:
    key = f"{r['lang']}/{r['id']}"
    segs, _ = model.transcribe(str(ROOT / r["file"]), language=asr_lang[r["lang"]], beam_size=5)
    hyp = normalise(" ".join(s.text for s in segs))
    ref = normalise(passage[r["lang"]])
    wer, cer = jiwer.wer(ref, hyp), jiwer.cer(ref, hyp)
    prev = small.get(key, {})
    out.append({**r, "wer_medium": round(wer, 4), "cer_medium": round(cer, 4),
                "wer_small": prev.get("wer"), "transcript_medium": hyp})
    print(f"  {key:<28} small {prev.get('wer',0):6.1%} -> medium {wer:6.1%}   (CER {cer:.1%})")

(BENCH / "asr-control.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")

print("\n  === VERDICT PER LANGUAGE ===")
for lang in ("hi", "ne", "bn"):
    rows = sorted([r for r in out if r["lang"] == lang], key=lambda r: r["wer_medium"])
    if not rows: continue
    best = rows[0]
    improvement = (best.get("wer_small") or 0) - best["wer_medium"]
    print(f"  {lang}: best={best['id']:<24} WER {best['wer_medium']:.1%} "
          f"(was {best.get('wer_small',0):.1%} on small; instrument accounted for {improvement:+.1%})")
