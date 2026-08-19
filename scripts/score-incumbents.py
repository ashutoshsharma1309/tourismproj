"""Score the incumbent macOS voices on the SAME stress script as the challengers.

Without this the comparison is not a comparison: the earlier benchmark measured
say/Daniel on the ordinary Rumtek narration, while the new candidates read a
script deliberately loaded with Pemayangtse, Khangchendzonga and Pang Lhabsol.
Those two error rates cannot be placed in the same table.
"""
import json, re, unicodedata, wave
from pathlib import Path
import numpy as np
import jiwer
from faster_whisper import WhisperModel

def normalise(t):
    t = unicodedata.normalize("NFC", t.lower())
    t = re.sub(r"[^\w\sऀ-ॿ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

scripts = json.loads(Path("voice-benchmark/v2/test-scripts.json").read_text())
model = WhisperModel("medium", device="cpu", compute_type="int8")
out = []
for lang, voice in [("en", "Daniel"), ("hi", "Lekha")]:
    wav = Path(f"voice-benchmark/v2/renders/{lang}__say-{voice}.wav")
    segs, _ = model.transcribe(str(wav), language=lang, beam_size=5)
    heard = normalise(" ".join(s.text for s in segs))
    asked = normalise(scripts[lang])
    with wave.open(str(wav), "rb") as w:
        rate = w.getframerate(); frames = w.readframes(w.getnframes())
    x = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    wer, cer = jiwer.wer(asked, heard) * 100, jiwer.cer(asked, heard) * 100
    row = {"lang": lang, "model": f"say-{voice}", "engine": "macOS say",
           "wer": round(wer, 1), "cer": round(cer, 1),
           "rmsDbfs": float(round(float(20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-12)), 2))}
    out.append(row)
    print(f"  {lang}  say/{voice:<10} WER {wer:5.1f}%  CER {cer:5.1f}%  RMS {row['rmsDbfs']:6.2f} dBFS", flush=True)
Path("voice-benchmark/v2/incumbents.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
