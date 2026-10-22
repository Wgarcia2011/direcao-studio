"""Template Caderno 3D (Three.js + HyperFrames): legendas, validação, preparação e amostra.

O vídeo de entrada é a montagem já cortada no Concat (16:9). Este script só
prepara o motion vertical; a montagem e a exportação final continuam no Concat.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / 'motion/hyperframes/templates/caderno-3d-threejs'
HF_LOCAL = ROOT / 'motion/hyperframes/node_modules/.bin' / ('hyperframes.cmd' if os.name == 'nt' else 'hyperframes')
ENV = {k: v for k, v in os.environ.items() if k != 'GEMINI_API_KEY'}
ENV.update({'DO_NOT_TRACK': '1', 'HYPERFRAMES_NO_TELEMETRY': '1', 'HF_CLI_TELEMETRY_DISABLED': '1'})
THREE_CANDIDATES = [ROOT / 'motion/hyperframes/node_modules/three/build', ROOT / 'app/remotion-project/node_modules/three/build', ROOT / 'app/node_modules/three/build']
GSAP = ROOT / 'motion/hyperframes/node_modules/gsap/dist/gsap.min.js'
ICONES = ('setaBaixo', 'setaCima', 'predio', 'livro', 'edital', 'coracao', 'vaso', 'figura', 'pessoas', 'capelo', 'folha', 'martelo', 'maleta', 'casa', 'bandeira')
ITENS = ('titulo', 'rotulo', 'icone', 'disco', 'caminho', 'no', 'brilho', 'balanca', 'pilha')


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


# ---------------- legendas ----------------
def chars(ws):
    return len(' '.join(w['text'] for w in ws))


def agrupar(words, maxc=22):
    """Blocos de 2–4 palavras: quebra em pontuação, troca de falante/trecho ou pausa > 0,45 s."""
    ends_phrase = lambda t: bool(re.search(r'[.,?!:…]$', t))
    ends_sentence = lambda t: bool(re.search(r'[.?!…]$', t))
    phrases = []
    for w in words:
        p = phrases[-1] if phrases else None
        if p is None or ends_phrase(p[-1]['text']) or w.get('speaker') != p[-1].get('speaker') or w.get('trecho') != p[-1].get('trecho') or w['start'] - p[-1]['end'] > 0.45:
            phrases.append([w])
        else:
            p.append(w)

    def split(ws):
        best = {0: (0.0, [])}
        for end in range(1, len(ws) + 1):
            opts = []
            for size in range(1, 5):
                if end - size < 0 or (end - size) not in best:
                    continue
                chunk = ws[end - size:end]
                if size > 1 and chars(chunk) > maxc:
                    continue
                opts.append((best[end - size][0] + 1 + (4 if size == 1 else 0) + abs(chars(chunk) - 15) * 0.08, best[end - size][1] + [chunk]))
            best[end] = min(opts, key=lambda o: o[0])
        return best[len(ws)][1]

    def can_join(a, b):
        return (a[-1].get('speaker') == b[0].get('speaker') and a[-1].get('trecho') == b[0].get('trecho') and not ends_sentence(a[-1]['text'])
                and b[0]['start'] - a[-1]['end'] < 0.7 and len(a) + len(b) <= 4 and chars(a + b) <= maxc)

    blocks = [c for p in phrases for c in split(p)]
    i = 0
    while i < len(blocks):
        if len(blocks[i]) == 1:
            if i + 1 < len(blocks) and can_join(blocks[i], blocks[i + 1]):
                blocks[i + 1] = blocks[i] + blocks[i + 1]; del blocks[i]; continue
            if i > 0 and can_join(blocks[i - 1], blocks[i]):
                blocks[i - 1] += blocks[i]; del blocks[i]; continue
        i += 1
    return [{'start': b[0]['start'], 'end': b[-1]['end'], 'words': [{k: w[k] for k in ('text', 'start', 'end')} for w in b]} for b in blocks]


def legendas(transcricao, saida, plano=None):
    data = read_json(transcricao)
    raw = data.get('words') or data.get('palavras') if isinstance(data, dict) else data
    words = [{'text': w.get('text', w.get('w', '')).strip(), 'start': w.get('start', w.get('s')), 'end': w.get('end', w.get('e')),
              'speaker': w.get('speaker', w.get('falante'))} for w in raw]
    words = [w for w in words if w['text']]
    if plano:
        out = []
        for t in read_json(plano)['trechos']:
            shift = t['saida_in'] - t['fonte_in']
            out += [{**w, 'start': round(w['start'] + shift, 3), 'end': round(min(w['end'], t['fonte_out']) + shift, 3), 'trecho': t['id']}
                    for w in words if w['start'] >= t['fonte_in'] - 0.01 and w['end'] <= t['fonte_out'] + 0.02]
        words = out
    groups = agrupar(words)
    Path(saida).write_text(json.dumps(groups, ensure_ascii=False), encoding='utf-8')
    return groups


# ---------------- validação ----------------
def num(v, lo=-math.inf, hi=math.inf):
    return type(v) in (int, float) and math.isfinite(v) and lo <= v <= hi


def validar(cfg, base):
    erros = []
    err = erros.append
    if cfg.get('schemaVersion') != 1 or cfg.get('template') != 'caderno-3d-threejs':
        err('schemaVersion 1 e template "caderno-3d-threejs" são obrigatórios')
    if type(cfg.get('fixture')) is not bool:
        err('fixture deve ser true ou false')
    dur = cfg.get('duracao')
    if not num(dur, 1, 600):
        err('duracao (s da montagem) entre 1 e 600'); dur = 0
    for key in ('video', 'legendas'):
        if not isinstance(cfg.get(key), str) or not (base / cfg[key]).is_file():
            err(f'{key}: arquivo não encontrado')
    planos = cfg.get('planos') or []
    if not planos:
        err('planos: ao menos um enquadramento')
    for i, p in enumerate(planos):
        if not (num(p.get('from'), 0) and num(p.get('to'), 0) and p['to'] > p['from'] and num(p.get('cx'), 0) and num(p.get('cy'), 0) and num(p.get('zoom'), 1, 2.5)):
            err(f'planos[{i}]: from<to, cx, cy e zoom (1–2,5)')
        elif i and abs(p['from'] - planos[i - 1]['to']) > 1e-3:
            err(f'planos[{i}]: deve começar onde o anterior termina')
    if planos and dur and (planos[0].get('from') != 0 or abs(planos[-1].get('to', 0) - dur) > 1e-3):
        err('planos devem cobrir de 0 até duracao')
    spans = []
    for i, c in enumerate(cfg.get('cards') or []):
        if not (num(c.get('from'), 0, dur) and num(c.get('to'), 0, dur) and c['to'] - c['from'] >= 1.2):
            err(f'cards[{i}]: intervalo de pelo menos 1,2 s dentro da duração'); continue
        for face in ('frente', 'verso'):
            f = c.get(face)
            if f is None and face == 'verso':
                continue
            if not f or f.get('icone') not in ICONES or not isinstance(f.get('texto'), list) or not 1 <= len(f['texto']) <= 2 or any(len(x) > 20 for x in f['texto']):
                err(f'cards[{i}].{face}: ícone conhecido e 1–2 linhas de até 20 caracteres')
        if c.get('verso') and not num(c.get('vira'), c['from'] + 0.5, c['to'] - 0.9):
            err(f'cards[{i}]: verso exige vira entre from+0,5 e to−0,9')
        if not num(c.get('y', 1150), 950, 1300):
            err(f'cards[{i}]: y entre 950 e 1300 px (abaixo dos rostos, acima das legendas)')
        spans.append((c['from'], c['to'], f'card {i}'))
    ids = set()
    for i, b in enumerate(cfg.get('blocos') or []):
        if not (num(b.get('from'), 0, dur) and num(b.get('to'), 0, dur) and b['to'] - b['from'] >= 2.5):
            err(f'blocos[{i}]: intervalo de pelo menos 2,5 s'); continue
        if b.get('id') in ids or not re.fullmatch(r'[A-Za-z0-9_-]+', str(b.get('id'))) or b.get('id') == 'FIM':
            err(f'blocos[{i}]: id único (letras, números, _ ou -), diferente de FIM')
        ids.add(b.get('id'))
        if not b.get('cams') or not all(num(c.get('at'), b['from'], b['to']) for c in b['cams']):
            err(f'blocos[{i}]: cams com at dentro do bloco')
        for j, it in enumerate(b.get('itens') or []):
            tipo = it.get('tipo')
            if tipo not in ITENS:
                err(f'blocos[{i}].itens[{j}]: tipo {tipo!r} desconhecido'); continue
            if tipo != 'pilha' and tipo != 'balanca' and not num(it.get('at'), b['from'], b['to']):
                err(f'blocos[{i}].itens[{j}]: at dentro do bloco')
            icons = [it] if tipo == 'icone' else [it.get(k) for k in ('esquerda', 'direita') if it.get(k)] if tipo == 'balanca' else [c for c in it.get('camadas', []) if c.get('tipo') != 'bloco'] if tipo == 'pilha' else []
            if any(x.get('icone') not in ICONES for x in icons):
                err(f'blocos[{i}].itens[{j}]: ícone desconhecido')
            for k in ('x', 'y'):
                if k in it and not num(it[k], -4.6, 4.6):
                    err(f'blocos[{i}].itens[{j}]: {k} entre −4,6 e 4,6 (fora disso sai da tela)')
        spans.append((b['from'], b['to'], f'bloco {b.get("id")}'))
    fim = cfg.get('encerramento')
    if fim:
        if not (isinstance(fim.get('logo'), str) and (base / fim['logo']).is_file()):
            err('encerramento.logo: PNG com transparência não encontrado')
        if not isinstance(fim.get('perfil'), str) or not 2 <= len(fim['perfil']) <= 24:
            err('encerramento.perfil: até 24 caracteres (ex.: @perfil)')
        corte = fim.get('transicao') == 'corte'
        if fim.get('transicao') not in (None, 'foto', 'corte'):
            err('encerramento.transicao: "foto" (vai ao caderno) ou "corte" (dissolve após a última frase)')
        elif corte and not (num(fim.get('from'), dur - 1.0, dur) and num(fim.get('fade', 0.12), 0.04, 0.6) and fim['from'] + fim.get('fade', 0.12) <= dur + 0.05
                            and num(fim.get('logoAt'), fim['from']) and num(fim.get('extra'), 1.5, 8)):
            err('encerramento (corte): from no último segundo da fala, from + fade até o fim do vídeo, logoAt e extra (1,5–8 s)')
        elif not corte and not (num(fim.get('from'), 0, dur) and num(fim.get('saidaFoto'), fim.get('from', 0) + 0.75, dur) and num(fim.get('logoAt'), fim.get('from', 0)) and num(fim.get('extra'), 1.5, 8)):
            err('encerramento: from < saidaFoto (≥ from+0,75, ≤ duracao), logoAt e extra (1,5–8 s após a fala)')
        elif not corte and fim['saidaFoto'] + 0.6 > dur + 0.05:
            err('encerramento: a foto precisa sair (saidaFoto + 0,6 s) antes do fim do vídeo')
        if fim.get('rede') is not None:
            if fim['rede'] != 'instagram':
                err('encerramento.rede: apenas "instagram" (o ícone gira e vira o logo)')
            elif not num(fim.get('transforma'), fim.get('logoAt', 0) + 1.2, dur + fim.get('extra', 0) - 1.2):
                err('encerramento.transforma: ao menos 1,2 s após logoAt e 1,2 s antes do fim')
        spans.append((fim.get('from', 0), dur, 'encerramento'))
    ins_spans = []
    for i, ins in enumerate(cfg.get('inserts') or []):
        if not (num(ins.get('from'), 0, dur) and num(ins.get('to'), 0, dur) and 2.5 <= ins['to'] - ins['from'] <= 6):
            err(f'inserts[{i}]: entre 2,5 e 6 s dentro da duração'); continue
        img = base / str(ins.get('imagem', ''))
        if not img.is_file():
            err(f'inserts[{i}].imagem: arquivo não encontrado')
        else:
            try:
                import cv2
                im = cv2.imread(str(img))
                if im is None or im.shape[:2] != (1920, 1080):
                    err(f'inserts[{i}].imagem: precisa ser 1080×1920')
            except ImportError:
                pass
        cam = ins.get('camera') or {}
        for k in ('de', 'para'):
            c = cam.get(k) or {}
            if not (num(c.get('x'), 0, 1080) and num(c.get('y'), 0, 1920) and num(c.get('escala'), 1, 1.35)):
                err(f'inserts[{i}].camera.{k}: x 0–1080, y 0–1920 e escala 1–1,35')
        if ins.get('saida') not in ('flash', 'push'):
            err(f'inserts[{i}].saida: "flash" ou "push"')
        for j, a in enumerate(ins.get('acentos') or []):
            if a.get('tipo') not in ('caminho', 'brilho', 'pulso') or not num(a.get('at'), ins['from'], ins['to']):
                err(f'inserts[{i}].acentos[{j}]: tipo caminho/brilho/pulso com at dentro do insert')
        spans.append((ins['from'], ins['to'], f'insert {i}'))
        ins_spans.append((ins['from'], ins['to']))
    ins_spans.sort()
    for a, b in zip(ins_spans, ins_spans[1:]):
        if b[0] - a[1] < 1.0:
            err(f'inserts: deixe ao menos 1 s de rosto entre {a} e {b}')
    spans.sort()
    for a, b in zip(spans, spans[1:]):
        if b[0] < a[1] - 1e-6:
            err(f'sobreposição: {a[2]} ({a[0]}–{a[1]}) e {b[2]} ({b[0]}–{b[1]})')
    am = cfg.get('amostra')
    if am and not (num(am.get('inicio'), 0) and num(am.get('fim'), 0) and am['fim'] > am['inicio'] and am['fim'] <= dur + (fim or {}).get('extra', 0) + 1e-6):
        err('amostra: inicio < fim dentro da duração')
    return erros


# ---------------- logo ----------------
def logo_geometria(png, tamanho=6.4):
    import cv2
    img = cv2.imread(str(png), cv2.IMREAD_UNCHANGED)
    if img is None or img.ndim != 3 or img.shape[2] != 4:
        raise ValueError('O logo precisa ser PNG com canal alfa')
    h, w = img.shape[:2]
    k = tamanho / max(w, h)
    mask = (img[..., 3] > 128).astype('uint8') * 255
    contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    pts = lambda c: [[round((float(p[0][0]) - w / 2) * k, 4), round((h / 2 - float(p[0][1])) * k, 4)] for p in cv2.approxPolyDP(c, 1.2, True)]
    shapes = []
    for i, c in enumerate(contours):
        if hier[0][i][3] == -1 and cv2.contourArea(c) > w * h * 0.0005:
            holes = [pts(contours[j]) for j in range(len(contours)) if hier[0][j][3] == i and cv2.contourArea(contours[j]) > w * h * 0.0002]
            shapes.append({'outline': pts(c), 'holes': holes})
    return {'tamanho': tamanho, 'shapes': shapes}



# ---------------- fixture sintética ----------------
def fixture(pasta):
    """Vídeo 16:9 com duas silhuetas, tom de 220 Hz, legendas e logo sintéticos + configuração de exemplo."""
    import cv2
    import numpy as np
    pasta = Path(pasta).resolve()
    if pasta.exists():
        raise FileExistsError(f'{pasta} já existe')
    pasta.mkdir(parents=True)
    dur = 13.6
    graph = ('color=c=0x1d2238:s=1920x1080:r=30:d=13.6,'
             'drawbox=x=520:y=180:w=400:h=900:color=0x3a7ca5:t=fill,drawbox=x=620:y=40:w=200:h=200:color=0xd9c2a7:t=fill,'
             'drawbox=x=1110:y=230:w=400:h=850:color=0x8a5aa8:t=fill,drawbox=x=1210:y=90:w=200:h=200:color=0xc9a184:t=fill')
    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', graph, '-f', 'lavfi', '-i', f'sine=frequency=220:duration={dur}:sample_rate=48000',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(pasta / 'montagem-sintetica.mp4')], check=True)
    texto = 'Exemplo sintético de legenda para validar o template no caderno com cards e logo'.split()
    words = [{'text': w, 'start': round(0.4 + i * 0.85, 2), 'end': round(0.4 + i * 0.85 + 0.7, 2)} for i, w in enumerate(texto)]
    (pasta / 'transcricao-sintetica.json').write_text(json.dumps({'words': words}, ensure_ascii=False), encoding='utf-8')
    legendas(pasta / 'transcricao-sintetica.json', pasta / 'legendas-sinteticas.json')
    logo = np.zeros((600, 600, 4), np.uint8)
    cv2.circle(logo, (300, 300), 260, (184, 208, 0, 255), -1); cv2.circle(logo, (300, 300), 150, (90, 30, 20, 255), -1)
    cv2.imwrite(str(pasta / 'logo-sintetico.png'), logo)
    cfg = read_json(TEMPLATE / 'exemplo-sintetico.json')
    (pasta / 'exemplo-sintetico.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding='utf-8')
    return pasta / 'exemplo-sintetico.json'

# ---------------- preparação ----------------
HTML = (TEMPLATE / 'pagina.html')


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def three_dir(explicit=None):
    for d in ([Path(explicit)] if explicit else THREE_CANDIDATES):
        pkg = d.parent / 'package.json'
        if (d / 'three.module.js').is_file() and pkg.is_file() and json.loads(pkg.read_text(encoding='utf-8')).get('version', '').startswith('0.186'):
            return d
    raise FileNotFoundError('Three.js 0.186 local não encontrado; informe --three CAMINHO/three/build')


def link_or_copy(src, dst):
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def preparar(config, pasta, amostra=False, three=None):
    config = Path(config).resolve(); base = config.parent
    cfg = read_json(config)
    erros = validar(cfg, base)
    if erros:
        raise ValueError('\n'.join(erros))
    pasta = Path(pasta).resolve()
    if pasta.exists():
        raise FileExistsError(f'{pasta} já existe; use uma pasta nova para cada versão')
    assets = pasta / 'assets'; assets.mkdir(parents=True)
    fim = cfg.get('encerramento')
    total = cfg['duracao'] + (fim['extra'] if fim else 0)
    start, end = (cfg['amostra']['inicio'], cfg['amostra']['fim']) if amostra else (0.0, total)
    t3 = three_dir(three)
    for name in ('three.module.js', 'three.core.js'):
        shutil.copy2(t3 / name, assets / name)
    shutil.copy2(GSAP, assets / 'gsap.min.js')
    shutil.copy2(TEMPLATE / 'cena.js', assets / 'cena.js')
    font = base / cfg['fonte'] if cfg.get('fonte') else Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/arialbd.ttf'
    shutil.copy2(font, assets / 'arialbd.ttf')
    link_or_copy(base / cfg['video'], assets / 'montagem.mp4')
    groups = read_json(base / cfg['legendas'])
    (assets / 'legendas.js').write_text('export const LEGENDAS = ' + json.dumps(groups, ensure_ascii=False) + ';\n', encoding='utf-8')
    roteiro = {k: cfg[k] for k in ('fonte', 'planos', 'cards', 'blocos') if k in cfg}
    roteiro['fonte'] = cfg.get('fonteVideo', {'largura': 1920, 'altura': 1080})
    geo = None
    if fim:
        shutil.copy2(base / fim['logo'], assets / 'logo.png')
        roteiro['encerramento'] = {**{k: v for k, v in fim.items() if k != 'logo'}, 'logo': 'assets/logo.png'}
        geo = logo_geometria(base / fim['logo'], fim.get('tamanhoLogo', 6.4))
    if cfg.get('inserts'):
        roteiro['inserts'] = []
        for i, ins in enumerate(cfg['inserts']):
            name = f'insert-{i + 1:02d}{Path(ins["imagem"]).suffix}'
            shutil.copy2(base / ins['imagem'], assets / name)
            roteiro['inserts'].append({**ins, 'imagem': f'assets/{name}'})
    (assets / 'roteiro.js').write_text('export const ROTEIRO = ' + json.dumps(roteiro, ensure_ascii=False) + ';\nexport const LOGO_GEOMETRIA = ' + json.dumps(geo) + ';\n', encoding='utf-8')
    dims = roteiro['fonte']
    html = HTML.read_text(encoding='utf-8').format(title=cfg.get('titulo', 'Caderno 3D'), start=round(start, 4), duration=round(end - start, 4),
                                                   video_duration=round(max(0.04, min(cfg['duracao'], end) - start), 4), src_w=dims['largura'], src_h=dims['altura'])
    (pasta / 'index.html').write_text(html, encoding='utf-8')
    (pasta / 'hyperframes.json').write_text(json.dumps({'width': 1080, 'height': 1920, 'fps': 30}), encoding='utf-8')
    manifest = {'template': 'caderno-3d-threejs', 'config': str(config), 'config_sha256': sha(config), 'amostra': amostra, 'inicio': start, 'duracao': round(end - start, 4),
                'fixture': cfg['fixture'], 'revisao': 'pendente', 'arquivos': {p.name: sha(p) for p in sorted(assets.iterdir()) if p.name != 'montagem.mp4'},
                'video_sha256': sha(assets / 'montagem.mp4')}
    (pasta / 'manifesto.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return pasta


def hf():
    return [str(HF_LOCAL)] if HF_LOCAL.is_file() else ['npx', '--yes', 'hyperframes@0.8.185']


def run(args, cwd):
    subprocess.run(args, cwd=cwd, env=ENV, check=True, shell=(os.name == 'nt' and args[0] == 'npx'))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('legendas', help='agrupa uma transcrição palavra a palavra em blocos de 2–4 palavras')
    s.add_argument('transcricao'); s.add_argument('--saida', required=True); s.add_argument('--plano', help='plano-de-cortes.json para remapear tempos da fonte para a montagem')
    s = sub.add_parser('validar'); s.add_argument('config')
    s = sub.add_parser('preparar'); s.add_argument('config'); s.add_argument('--pasta', required=True); s.add_argument('--amostra', action='store_true'); s.add_argument('--three')
    s = sub.add_parser('verificar'); s.add_argument('--pasta', required=True)
    s = sub.add_parser('render'); s.add_argument('--pasta', required=True); s.add_argument('--saida', required=True)
    s = sub.add_parser('icones')
    s = sub.add_parser('fixture', help='gera mídia e configuração sintéticas para testar o template'); s.add_argument('--pasta', required=True)
    a = ap.parse_args()
    try:
        if a.cmd == 'legendas':
            g = legendas(a.transcricao, a.saida, a.plano); print(f'{len(g)} blocos em {a.saida}')
        elif a.cmd == 'validar':
            cfg = Path(a.config).resolve(); erros = validar(read_json(cfg), cfg.parent)
            print('\n'.join(erros) if erros else 'ok'); return 1 if erros else 0
        elif a.cmd == 'preparar':
            print(preparar(a.config, a.pasta, a.amostra, a.three))
        elif a.cmd == 'verificar':
            run(hf() + ['lint'], Path(a.pasta).resolve())
        elif a.cmd == 'render':
            out = Path(a.saida).resolve()
            if out.exists():
                raise FileExistsError(f'{out} já existe; não sobrescrevo renders')
            run(hf() + ['render', '.', '-o', str(out), '--quality', 'delivery', '--fps', '30'], Path(a.pasta).resolve())
        elif a.cmd == 'fixture':
            print(fixture(a.pasta))
        elif a.cmd == 'icones':
            print('\n'.join(ICONES))
    except (ValueError, FileExistsError, FileNotFoundError, subprocess.CalledProcessError) as e:
        print(e, file=sys.stderr); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
