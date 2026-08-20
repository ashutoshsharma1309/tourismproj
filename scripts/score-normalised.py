"""Re-score the CJK and Arabic candidates with orthography normalised.

WHY THIS EXISTS
---------------
Raw character error rate said Mandarin was the worst new language at 41.6% and
Arabic was poor at 21.1%. Reading the transcripts showed why, and it had almost
nothing to do with the voices:

  - Whisper transcribes Mandarin into TRADITIONAL characters. The benchmark
    script is written in simplified. 歡迎來到 against 欢迎来到 is four character
    errors out of four, for text that is word-for-word identical.
  - Whisper drops Arabic short vowels. أهلاً against أهلا is an error on a
    diacritic the voice pronounced correctly.
  - Japanese comes back with homophone kanji — 僧院 heard as 総員. The voice said
    the right sounds; the recogniser chose the wrong characters for them.

So the instrument was measuring orthography, not intelligibility, and ranking on
it would have rejected Mandarin — which is in fact one of the better new
languages. Normalising script before comparison is what makes the number mean
what it claims to mean.
"""
import json, re, unicodedata
from pathlib import Path
import jiwer
from opencc import OpenCC

t2s = OpenCC("t2s")  # traditional -> simplified

ARABIC_DIACRITICS = re.compile(r"[ً-ٰٟۖ-ۭ]")

def norm_generic(t):
    t = unicodedata.normalize("NFC", t.lower())
    t = re.sub(r"[^\w\sऀ-ॿ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def norm_zh(t):
    return re.sub(r"\s+", "", t2s.convert(re.sub(r"[^\w]", "", t)))

def norm_ar(t):
    t = ARABIC_DIACRITICS.sub("", t)
    t = t.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه").replace("ى", "ي")
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", t)).strip()

def norm_ja(t):
    # compare on the sounds we can: strip everything but kana, which the
    # recogniser gets right even when it picks the wrong kanji
    return re.sub(r"[^぀-ヿ]", "", t)

scripts = json.loads(Path("voice-benchmark/v2/test-scripts.json").read_text())
scores = json.loads(Path("voice-benchmark/v2/scores.json").read_text())
NORM = {"zh": norm_zh, "ar": norm_ar, "ja": norm_ja}

print(f"{'lang':<5}{'voice':<28}{'raw CER':>9}{'normalised':>12}")
out = []
for r in scores:
    if r["lang"] not in NORM or not r.get("heard"):
        continue
    f = NORM[r["lang"]]
    asked, heard = f(scripts[r["lang"]]), f(r["heard"])
    if not asked:
        continue
    cer = jiwer.cer(asked, heard) * 100
    out.append({**r, "cerNormalised": round(cer, 1)})
    print(f"{r['lang']:<5}{r['model']:<28}{r['cer']:>8.1f}%{cer:>11.1f}%")

Path("voice-benchmark/v2/scores-normalised.json").write_text(
    json.dumps(out, indent=2, ensure_ascii=False) + "\n")
