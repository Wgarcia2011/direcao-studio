import glob, json, os, site, sys

for d in glob.glob(os.path.join(site.getsitepackages()[-1], "nvidia", "*", "bin")):
    os.add_dll_directory(d)
    os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]
from faster_whisper import WhisperModel

src, out = sys.argv[1], sys.argv[2]
try:
    model = WhisperModel("medium", device="cuda", compute_type="float16")
except Exception:
    model = WhisperModel("medium", device="cpu", compute_type="int8")
segments, info = model.transcribe(src, language="pt", word_timestamps=True, vad_filter=True)
words = []
for s in segments:
    for w in s.words or []:
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
json.dump({"duration": info.duration, "words": words}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(len(words), "palavras")
