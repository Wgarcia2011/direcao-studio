#!/usr/bin/env python3
"""Transcreve um vídeo com tempo por palavra e agrupa em blocos de legenda.

Uso:
  python3 transcribe.py edit/limpo.mp4 edit/legendas.json [--lang pt] [--model small]
                        [--max-words 3] [--max-gap 0.4] [--srt edit/legendas.srt]
  python3 transcribe.py --from-json words.json edit/legendas.json   # re-agrupar sem transcrever

Requer: pip install faster-whisper   (usa CPU por padrão; --device cuda se tiver GPU)
Formato de saída:
  {"words":[{"w","s","e"}], "blocks":[{"text","s","e","words":[...],"key":idx}]}
"key" = índice da palavra sugerida para destaque (heurística; a IA pode trocar).
"""
import argparse, json, os, re, sys

STOP = set("""a o as os um uma uns umas de do da dos das no na nos nas em e é ou que se
por para pra com como mas mais eu tu ele ela nós vós eles elas você vocês me te lhe
isso isto esse essa este esta aquilo ao aos à às já só tá né lá aqui então tipo""".split())
STRONG = set("nunca sempre grátis agora nada tudo zero nenhum melhor pior único segredo".split())


def key_index(words):
    best, score = 0, -1
    for i, w in enumerate(words):
        t = re.sub(r"[^\wÀ-ú%$]", "", w["w"].lower())
        if not t or t in STOP:
            continue
        sc = len(t)
        if any(c.isdigit() for c in t) or "%" in t or "$" in t: sc += 20
        if t in STRONG: sc += 15
        if w["w"][:1].isupper() and i > 0: sc += 5
        if sc > score: best, score = i, sc
    return best


def group(words, max_words, max_gap, max_dur=1.6):
    blocks, cur = [], []
    for w in words:
        if cur:
            gap = w["s"] - cur[-1]["e"]
            ends_sentence = re.search(r"[.!?…]$", cur[-1]["w"])
            comma = cur[-1]["w"].endswith((",", ";", ":")) and len(cur) >= 2
            if len(cur) >= max_words or gap > max_gap or ends_sentence or comma or w["e"] - cur[0]["s"] > max_dur:
                blocks.append(cur); cur = []
        cur.append(w)
    if cur: blocks.append(cur)
    out = []
    for b in blocks:
        out.append({"text": " ".join(x["w"] for x in b), "s": b[0]["s"], "e": b[-1]["e"],
                    "words": b, "key": key_index(b)})
    # estende cada bloco até o próximo (máx 0.3s) para não piscar
    for i in range(len(out) - 1):
        out[i]["e"] = round(min(out[i + 1]["s"], out[i]["e"] + 0.3), 3)
    return out


def transcribe(path, lang, model, device):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Instale: pip install faster-whisper  (ou use --from-json com palavras já transcritas)")
    m = WhisperModel(model, device=device, compute_type="int8" if device == "cpu" else "float16")
    segs, _ = m.transcribe(path, language=lang, word_timestamps=True, vad_filter=True)
    words = []
    for s in segs:
        for w in s.words or []:
            t = w.word.strip()
            if t:
                words.append({"w": t, "s": round(w.start, 3), "e": round(w.end, 3)})
    return words


def srt_time(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03}"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", nargs="?"); p.add_argument("output")
    p.add_argument("--from-json", help="JSON com lista de palavras {w,s,e} (pula a transcrição)")
    p.add_argument("--lang", default="pt"); p.add_argument("--model", default="small")
    p.add_argument("--device", default="cpu")
    p.add_argument("--max-words", type=int, default=3)
    p.add_argument("--max-gap", type=float, default=0.4)
    p.add_argument("--srt", help="também salvar .srt")
    a = p.parse_args()

    if a.from_json:
        data = json.load(open(a.from_json))
        words = data["words"] if isinstance(data, dict) else data
    else:
        if not a.input: p.error("informe o vídeo de entrada ou --from-json")
        words = transcribe(a.input, a.lang, a.model, a.device)
    blocks = group(words, a.max_words, a.max_gap)
    os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
    json.dump({"words": words, "blocks": blocks}, open(a.output, "w"), indent=1, ensure_ascii=False)
    if a.srt:
        with open(a.srt, "w") as f:
            for i, b in enumerate(blocks, 1):
                f.write(f"{i}\n{srt_time(b['s'])} --> {srt_time(b['e'])}\n{b['text']}\n\n")
    print(f"{len(words)} palavras · {len(blocks)} blocos → {a.output}")


if __name__ == "__main__":
    main()
