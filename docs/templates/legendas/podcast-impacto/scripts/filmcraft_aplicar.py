"""Aplica um plano do template Podcast Impacto ao vivo no FilmCraft (filmcraft --control 9878).

Uso: python filmcraft_aplicar.py plano.json VIDEO_CLIP AUDIO_CLIP [--sem-legendas] [--sem-efeitos]
Cria os textos em V2..V8 da sequência ativa e anima o clipe de vídeo. Não exporta nada.
"""
import json, socket, sys
from pathlib import Path

TPL = json.load(open(Path(__file__).resolve().parents[1] / "template.json", encoding="utf-8"))
plan = json.load(open(sys.argv[1], encoding="utf-8"))
VID, AUD = int(sys.argv[2]), int(sys.argv[3])
ROSTO = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--rosto=")), None)
FOLLOW = TPL["camera"]["face_follow"]
ENQUADRAR = float(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--enquadrar=")), FOLLOW["base_scale"]))
FPS = TPL["fps"]
T = 254016000000
F = T // FPS
_sock = socket.create_connection(("127.0.0.1", 9878), timeout=120)
_file = _sock.makefile("rwb")
_id = 0


def ex(command, params):
    global _id
    _id += 1
    _file.write((json.dumps({"id": _id, "method": "engine.execute",
                             "params": {"command": command, "params": params}}) + "\n").encode())
    _file.flush()
    reply = json.loads(_file.readline())
    if not reply.get("ok"):
        raise RuntimeError(f"{command}: {reply.get('error')}")
    return reply.get("result")


def kf(clip, eff, param, frame, value):
    ex("effects.setParam", {"clip": clip, "effect": eff, "param": param, "value": value,
                            "time": int(frame) * F, "keyframe": True})


def legendas(items):
    for it in items:
        a = round(it["s"] * FPS)
        it["fa"], it["fb"] = a, max(a + 1, round((it["s"] + it["d"]) * FPS))
    lanes = [0] * 7
    for it in sorted(items, key=lambda i: i["fa"]):
        k = next((k for k in range(7) if lanes[k] <= it["fa"]), None)
        if k is None:
            raise SystemExit("mais de 7 legendas simultâneas")
        it["track"], lanes[k] = k + 1, it["fb"]
    an = TPL["animation"]
    for it in items:
        t0, n = it["fa"], it["fb"] - it["fa"]
        if it["t"] == "text":
            clip = ex("graphics.newText", {"text": it["txt"], "position": [it["x"], it["base"]], "size": round(it["px"], 1),
                                           "font": it["fam"], "fontStyle": it["sty"], "seconds": n / FPS,
                                           "time": t0 * F, "track": it["track"]})["clip"]
            ex("graphics.set", {"clip": clip, "layer": 0, "props": {"align": "center", "fill_color": it["col"],
                                                                    "shadow": True, "position": [it["x"], it["base"]]}})
            for p in ("anchor", "position"):
                ex("effects.setParam", {"clip": clip, "effect": "motion", "param": p, "value": [it["x"], it["y"]]})
            spec = an["emphasis_in"] if it["emph"] else an["text_in"]
            for fr, sc in zip(spec["frames"], spec["scale"]):
                kf(clip, "motion", "scale", t0 + fr, sc)
            kf(clip, "opacity", "opacity", t0, 0)
            kf(clip, "opacity", "opacity", t0 + an["text_in"]["opacity_frames"], 100)
            if it["fade"] and n > 15:
                kf(clip, "opacity", "opacity", it["fb"] - an["text_in"]["fade_out_frames"], 100)
                kf(clip, "opacity", "opacity", it["fb"] - 1, 0)
        else:
            clip = ex("graphics.newRectangle", {"position": [it["x"], it["y"]], "size": [round(it["w"]), round(it["h"])],
                                                "seconds": n / FPS, "time": t0 * F, "track": it["track"]})["clip"]
            ex("graphics.set", {"clip": clip, "layer": 0, "props": {"fill_color": "#fff0cf"}})
            for p in ("anchor", "position"):
                ex("effects.setParam", {"clip": clip, "effect": "motion", "param": p, "value": [it["x"], it["y"]]})
            ex("effects.setParam", {"clip": clip, "effect": "motion", "param": "uniform_scale", "value": False})
            kf(clip, "motion", "scale_width", t0, 3)
            kf(clip, "motion", "scale_width", t0 + max(1, round(min(it["draw"], n / FPS) * FPS)), 100)
    print(len(items), "elementos de legenda")


def efeitos(fx):
    cam, dur = TPL["camera"], fx["duration"]
    windows = []

    def add(a, b, keys):
        if a >= 0 and b <= dur and all(b <= x or a >= y for x, y, _ in windows):
            windows.append((a, b, keys))

    i, o = cam["intro"], cam["outro"]
    add(0, i["seconds"], [(0, i["from"]), (i["seconds"], 100)])
    add(dur - o["seconds"], dur, [(dur - o["seconds"], 100), (dur, o["to"])])
    cz = cam["cut_zoom"]
    for c in fx["cuts"]:
        add(c - cz["before_s"], c + cz["after_s"],
            [(c - cz["before_s"], 100), (c - 1 / FPS, cz["peak"]), (c, cz["peak"]), (c + cz["after_s"], 100)])
    pu = cam["punch_in"]
    for a, b in fx["punch"]:
        add(a - 0.05, b + 0.5, [(a - 0.05, 100), (a + 0.05, pu["scale"]), (b + 0.3, pu["scale"]), (b + 0.5, 100)])
    pi = cam["push_in"]
    for a, b in fx["push"]:
        end = min(b + pi["tail_s"], dur)
        add(a, end + 0.25, [(a, 100), (end, pi["scale"]), (end + 0.25, 100)])
    base = 1.0
    if ROSTO:
        data = json.load(open(ROSTO, encoding="utf-8"))
        Wv, Hv = data["size"]
        pts = data["points"]
        base = ENQUADRAR
        tx, ty = Wv * FOLLOW["target_x"], Hv * FOLLOW["target_y"]
        step = max(1, round(FOLLOW["key_every_s"] / max(pts[1]["t"] - pts[0]["t"], 1e-3))) if len(pts) > 1 else 1
        sel = set(range(0, len(pts), step))
        for c in fx["cuts"]:                        # sem deslizar através dos cortes
            for i in range(len(pts) - 1):
                if pts[i]["t"] < c <= pts[i + 1]["t"]:
                    sel |= {i, i + 1}
        for i in sorted(sel):
            r = pts[i]
            x, y = r["x"], r["y"]
            px = min(max(tx, Wv - base * (Wv - x)), base * x)    # desloca até onde não aparece borda
            py = min(max(ty, Hv - base * (Hv - y)), base * y)
            fr = round(r["t"] * FPS)
            kf(VID, "motion", "anchor", fr, [round(x, 1), round(y, 1)])
            kf(VID, "motion", "position", fr, [round(px, 1), round(py, 1)])
    else:
        for p in ("anchor", "position"):
            ex("effects.setParam", {"clip": VID, "effect": "motion", "param": p, "value": cam["anchor"]})
    keys = sorted(k for *_, ks in windows for k in ks)
    if not keys or keys[0][0] > 0:
        keys.insert(0, (0, 100))
    for t, v in keys:
        kf(VID, "motion", "scale", round(t * FPS), round(v * base, 2))
    kf(VID, "opacity", "opacity", round((dur - o["fade_to_black_s"]) * FPS), 100)
    kf(VID, "opacity", "opacity", round(dur * FPS) - 1, 0)
    bw = TPL["negative_black_white"]
    ex("effects.apply", {"clips": [VID], "effect": bw["effect"]})
    kf(VID, bw["effect"], "amount", 0, 0)
    for a, b in fx["negative"]:
        for t, v in [(a - bw["ramp_in_s"], 0), (a, 100), (b + bw["hold_after_s"], 100),
                     (b + bw["hold_after_s"] + bw["ramp_out_s"], 0)]:
            kf(VID, bw["effect"], "amount", round(t * FPS), v)
    print(len(windows), "janelas de câmera;", len(fx["negative"]), "trechos P&B")


if "--sem-legendas" not in sys.argv:
    legendas(plan["items"])
if "--sem-efeitos" not in sys.argv:
    efeitos(plan["effects"])
