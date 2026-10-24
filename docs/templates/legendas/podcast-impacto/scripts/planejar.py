"""Planeja legendas e efeitos do template Podcast Impacto a partir de palavras transcritas.

Uso: python planejar.py palavras.json config.json plano.json
"""
import glob, json, os, re, sys, unicodedata
from pathlib import Path
from PIL import ImageFont

words_path, config_path, out_path = sys.argv[1:4]
ROOT = Path(__file__).resolve().parents[5]
TPL = json.load(open(Path(__file__).resolve().parents[1] / "template.json", encoding="utf-8"))
CFG = json.load(open(config_path, encoding="utf-8"))
W, H = TPL["width"], TPL["height"]
FONT_DIRS = [str(ROOT / "motion/remotion/public/fonts"), r"C:\Windows\Fonts",
             os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts")]
STYLES = {k: dict(v) for k, v in TPL["styles"].items()}
SIZE = TPL["size_scale"]
BEBAS = TPL["base"]["px"]
_cache = {}


def font_file(name):
    for d in FONT_DIRS:
        hits = glob.glob(os.path.join(d, name))
        if hits:
            return hits[0]
    raise SystemExit(f"fonte não encontrada: {name} (instale-a ou ajuste template.json)")


for st in STYLES.values():
    st["path"] = font_file(st["file"])


def font(style, px):
    key = (style, round(px))
    if key not in _cache:
        _cache[key] = ImageFont.truetype(STYLES[style]["path"], round(px))
    return _cache[key]


def cap_ratio(style):
    b = font(style, 1000).getbbox("H")
    return (b[3] - b[1]) / 1000


def norm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w]", "", s)


words = [dict(w) for w in json.load(open(words_path, encoding="utf-8"))["words"] if w["w"].strip()]
for w in words:
    for wrong, right in CFG.get("corrections", []):
        if norm(w["w"]) == norm(wrong):
            w["w"] = right
N = [norm(w["w"]) for w in words]


def find(anchor, after=0.0):
    toks = [norm(t) for t in anchor.split()]
    for i in range(len(N) - len(toks) + 1):
        if words[i]["s"] >= after and N[i:i + len(toks)] == toks:
            return i
    raise SystemExit(f"âncora não encontrada: {anchor}")


def span(first, last, after=0.0):
    i = find(first, after)
    b = [norm(t) for t in last.split()]
    for j in range(i, len(N)):
        if N[j:j + len(b)] == b:
            return words[i]["s"], words[j + len(b) - 1]["e"]
    raise SystemExit(f"fim não encontrado: {last}")


def disp(i, j, upper=False):
    t = re.sub(r"[,.…]+$", "", " ".join(w["w"] for w in words[i:j]).strip()).replace("...", "")
    return t.upper() if upper else t


blocks, covered = [], set()
for h in CFG.get("highlights", []):
    i = k = find(h["anchor"], h.get("after", 0))
    rows = []
    for row in h["rows"]:
        if row == "LINE":
            rows.append("LINE")
            continue
        segs = []
        for n, st, px, *extra in row:
            segs.append(dict(i=k, j=k + n, style=st, px=px, extra=(extra or [""])[0]))
            k += n
        rows.append(segs)
    if k != i + len(h["anchor"].split()):
        raise SystemExit(f"{h['id']}: as linhas somam {k - i} palavras; a âncora tem {len(h['anchor'].split())}")
    covered.update(range(i, k))
    blocks.append(dict(i=i, j=k, kind=h["id"], layout=h.get("layout", "center"), rows=rows))

cur = []
for idx, w in enumerate(words):
    if idx in covered:
        if cur:
            blocks.append(dict(i=cur[0], j=cur[-1] + 1, kind="BASE"))
            cur = []
        continue
    if cur:
        prev = words[cur[-1]]
        if (len(cur) >= 3 or len(disp(cur[0], idx + 1)) > 22 or w["s"] - prev["e"] > 0.45
                or prev["w"][-1] in ".?!,"):
            blocks.append(dict(i=cur[0], j=cur[-1] + 1, kind="BASE"))
            cur = []
    cur.append(idx)
if cur:
    blocks.append(dict(i=cur[0], j=cur[-1] + 1, kind="BASE"))

MAIN = {norm(w) for w in CFG.get("main_words", [])}
EM = TPL["emphasis"]
last_emph = -99.0
for b in sorted(blocks, key=lambda b: words[b["i"]]["s"]):
    if b["kind"] != "BASE":
        continue
    cand = [k for k in range(b["i"], b["j"]) if N[k] in MAIN]
    pick = None
    if cand and words[cand[0]]["s"] - last_emph >= EM["min_gap_s"]:
        pick = max(cand, key=lambda k: len(N[k]))
        last_emph = words[pick]["s"]
    if pick is None:
        fb = font("base", BEBAS)
        lines, cur = [], [b["i"]]
        for k in range(b["i"] + 1, b["j"]):
            if fb.getlength(disp(cur[0], k + 1, True)) > 0.86 * W:
                lines.append(cur)
                cur = [k]
            else:
                cur.append(k)
        lines.append(cur)
        b.update(layout="center", rows=[[dict(i=l[0], j=l[-1] + 1, style="base", px=BEBAS / SIZE, extra="")]
                                        for l in lines],
                 y0=(TPL["base"]["baseline_y"] - 0.7 * BEBAS / 2) / H - 0.5)
        continue
    segs = []
    if pick > b["i"]:
        segs.append(dict(i=b["i"], j=pick, style="m7", px=EM["support_px"], extra=""))
    segs.append(dict(i=pick, j=pick + 1, style="emph", px=EM["px"], extra="e"))
    if pick + 1 < b["j"]:
        segs.append(dict(i=pick + 1, j=b["j"], style="m7", px=EM["support_px"], extra=""))
    b.update(layout="center", rows=[[s] for s in segs])        # ênfase sempre em linha própria
for b in blocks:
    for row in b["rows"]:
        if row != "LINE":
            for s in row:
                s["px"] *= SIZE

blocks.sort(key=lambda b: words[b["i"]]["s"])
for b in blocks:
    b["start"] = words[b["i"]]["s"]
for n, b in enumerate(blocks):
    last = words[b["j"] - 1]["e"]
    nxt = blocks[n + 1]["start"] if n + 1 < len(blocks) else last + 0.6
    b["end"] = min(nxt, last + (0.6 if b["kind"] != "BASE" else 0.35)) if nxt - last > 0.05 else nxt
    b["end"] = max(b["end"], b["start"] + 0.35)
    if n + 1 < len(blocks):
        b["end"] = min(b["end"], nxt)
    b["gap_after"] = nxt - b["end"] > 0.08

items = []
Y0 = TPL["composition_center_y"]
for b in blocks:
    rows_m = []
    for row in b["rows"]:
        if row == "LINE":
            rows_m.append(dict(line=True, h=34))
            continue
        limit, scale = (0.84 if b["layout"] == "left" else 0.86) * W, 1.0
        while True:
            segs = []
            for s in row:
                st, px = STYLES[s["style"]], s["px"] * scale
                text = disp(s["i"], s["j"], st["upper"])
                segs.append(dict(s, px=px, text=text, w=font(s["style"], px).getlength(text),
                                 cap=cap_ratio(s["style"]) * px))
            gap = 0.30 * min(x["px"] for x in segs)
            width = sum(x["w"] for x in segs) + gap * (len(segs) - 1)
            if width <= limit:
                break
            scale *= limit / width * 0.99
        rows_m.append(dict(line=False, segs=segs, width=width, gap=gap, h=max(x["px"] for x in segs) * 1.15))
    y = (0.5 + b.get("y0", Y0)) * H - sum(r["h"] for r in rows_m) / 2
    max_w = max((r["width"] for r in rows_m if not r["line"]), default=0)
    for r in rows_m:
        cy = y + r["h"] / 2
        y += r["h"]
        if r["line"]:
            cx = 0.08 * W + 70 if b["layout"] == "left" else W / 2
            items.append(dict(t="bar", s=b["start"], d=b["end"] - b["start"], w=140, h=4, x=cx, y=cy, draw=0.3))
            continue
        x = 0.08 * W if b["layout"] == "left" else (W - r["width"]) / 2
        for s in r["segs"]:
            st = STYLES[s["style"]]
            sx = (W + max_w) / 2 - s["w"] if "r" in s["extra"] else x
            start = max(words[s["i"]]["s"] if b["kind"] != "BASE" else b["start"], b["start"])
            items.append(dict(t="text", s=start, d=b["end"] - start, txt=s["text"], fam=st["family"], sty=st["style"],
                              px=s["px"], col=st["color"], x=sx + s["w"] / 2, y=cy, base=cy + s["cap"] / 2,
                              fade=b["gap_after"], emph="e" in s["extra"], kind=b["kind"]))
            if "u" in s["extra"]:
                items.append(dict(t="bar", s=start, d=b["end"] - start, w=s["w"] + 10, h=4, x=sx + s["w"] / 2,
                                  y=cy + s["cap"] / 2 + 0.22 * s["px"],
                                  draw=max(words[s["j"] - 1]["e"] - words[s["i"]]["s"], 0.25)))
            x += s["w"] + r["gap"]

fx = dict(negative=[span(*n) for n in CFG.get("negative", [])],
          punch=[span(*p) for p in CFG.get("punch", [])],
          push=sorted({(b["start"], b["end"]) for b in blocks if b["kind"] != "BASE"}),
          cuts=CFG.get("cuts", []), duration=CFG.get("duration") or words[-1]["e"] + 0.5)
json.dump(dict(items=items, effects=fx), open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
kinds = sorted({b["kind"] for b in blocks if b["kind"] != "BASE"})
print(f"{len(blocks)} blocos, {len(items)} elementos, combinações: {', '.join(kinds) or 'nenhuma'};",
      f"ênfases: {sum(1 for i in items if i.get('emph'))}; P&B: {len(fx['negative'])}; punch-in: {len(fx['punch'])}")
