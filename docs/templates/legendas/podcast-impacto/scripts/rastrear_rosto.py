"""Rastreia o ponto entre os olhos do rosto principal para o zoom seguir o falante.

Uso: python rastrear_rosto.py VIDEO.mp4 MODELO_YUNET.onnx rosto.json [--cortes 17.6,96.5]
Modelo: face_detection_yunet_2023mar.onnx do repositório opencv/opencv_zoo (não versionar).
Saída: {"fps", "size", "points": [{"t", "x", "y"}]} em pixels do vídeo, ~10 pontos por segundo.
"""
import argparse, json
import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("modelo")
ap.add_argument("saida")
ap.add_argument("--cortes", default="", help="tempos dos cortes de câmera em segundos, separados por vírgula")
ap.add_argument("--passo", type=int, default=3, help="analisar 1 a cada N quadros")
ap.add_argument("--suavizar", type=int, default=9, help="janela da média móvel, em amostras")
args = ap.parse_args()
CUTS = [float(c) for c in args.cortes.split(",") if c.strip()]

cap = cv2.VideoCapture(args.video)
fps = cap.get(cv2.CAP_PROP_FPS)
W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
det = cv2.FaceDetectorYN.create(args.modelo, "", (W // 2, H // 2), 0.6)
raw, n = [], 0
while cap.grab():
    if n % args.passo == 0:
        _, fr = cap.retrieve()
        _, faces = det.detect(cv2.resize(fr, (W // 2, H // 2)))
        cands = [dict(x=float((f[4] + f[6])), y=float((f[5] + f[7])), area=float(f[2] * f[3] * 4))
                 for f in (faces if faces is not None else [])]          # meio dos olhos, escala 2x
        raw.append(dict(t=n / fps, faces=cands))
    n += 1


def shot(t):
    return sum(t >= c for c in CUTS)


track, prev, prev_shot = [], None, -1
for r in raw:
    s = shot(r["t"])
    if s != prev_shot:
        prev, prev_shot = None, s
    if r["faces"]:
        if prev is None:
            best = max(r["faces"], key=lambda f: f["area"])
        else:
            best = min(r["faces"], key=lambda f: (f["x"] - prev[0]) ** 2 + (f["y"] - prev[1]) ** 2 - 0.02 * f["area"])
            if (best["x"] - prev[0]) ** 2 + (best["y"] - prev[1]) ** 2 > 250 ** 2:
                best = None
        if best:
            prev = (best["x"], best["y"])
    track.append(dict(t=r["t"], shot=s, p=prev))

points, k = [], args.suavizar
for s in range(len(CUTS) + 1):
    seg = [x for x in track if x["shot"] == s]
    if not seg:
        continue
    known = [i for i, x in enumerate(seg) if x["p"]]
    if not known:
        points += [dict(t=x["t"], x=W / 2, y=H * 0.4) for x in seg]
        continue
    xs = np.interp(range(len(seg)), known, [seg[i]["p"][0] for i in known])
    ys = np.interp(range(len(seg)), known, [seg[i]["p"][1] for i in known])
    ker = np.ones(k) / k
    xs = np.convolve(np.pad(xs, k // 2, mode="edge"), ker, "valid")
    ys = np.convolve(np.pad(ys, k // 2, mode="edge"), ker, "valid")
    points += [dict(t=x["t"], x=float(a), y=float(b)) for x, a, b in zip(seg, xs, ys)]

json.dump(dict(fps=fps, size=[W, H], points=points), open(args.saida, "w"), indent=0)
hit = sum(1 for x in track if x["p"])
print(f"{len(raw)} amostras; rosto em {hit} ({100 * hit / max(len(raw), 1):.0f}%)")
