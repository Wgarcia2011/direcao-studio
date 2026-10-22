"""Template Interface Explicativa (HyperFrames + Three.js): validação, preparação e amostra.

Fala em tela cheia com legenda central e destaque violeta, alternada com
inserts de interface (perfil, busca, pergunta, checklist). Referência
estrutural: Pin 984106956076960638. A montagem e a exportação final
continuam no Concat; este script só prepara o motion 9:16.
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
TEMPLATE = ROOT / 'motion/hyperframes/templates/interface-explicativa'
HF_LOCAL = ROOT / 'motion/hyperframes/node_modules/.bin' / ('hyperframes.cmd' if os.name == 'nt' else 'hyperframes')
ENV = {k: v for k, v in os.environ.items() if k != 'GEMINI_API_KEY'}
ENV.update({'DO_NOT_TRACK': '1', 'HYPERFRAMES_NO_TELEMETRY': '1', 'HF_CLI_TELEMETRY_DISABLED': '1'})
GSAP = ROOT / 'motion/hyperframes/node_modules/gsap/dist/gsap.min.js'
# Three.js 0.186 local (o mesmo do Caderno 3D); nada é baixado.
THREE_CANDIDATES = [ROOT / 'motion/hyperframes/node_modules/three/build', ROOT / 'motion/remotion/node_modules/three/build', ROOT / 'app/remotion-project/node_modules/three/build', ROOT / 'app/node_modules/three/build']
ESTILOS = ('3d', '2d')
REMOTION = ROOT / 'motion/remotion'
RUNTIME_REMOTION = REMOTION / 'public/local/interface-explicativa'  # fora do Git
FORMATOS = {'9x16': (1080, 1920), '1x1': (1080, 1080), '16x9': (1920, 1080)}
FUNDOS = ('claro', 'escuro', 'lavanda')
CENAS = ('perfil', 'busca', 'pergunta', 'checklist', 'broll')
BROLL = ('fichas', 'imagem')
SOBREPOSICOES = ('lista', 'caminho', 'faixa', 'manuscrito')
TRANSICOES = ('corte', 'luz', 'branco', 'whip', 'zoom', 'cartao')
ICONES = ('selo', 'caixa', 'pular', 'lupa', 'raio', 'alvo', 'livro', 'grafico', 'relogio', 'estrela')
PALETA = ('acento', 'acento2', 'destaqueClaro', 'lavanda', 'claro', 'escuro', 'tinta', 'luz', 'faixa')
# Arquivos de fonte procurados em ordem (Poppins da referência; Segoe UI como reserva do Windows).
FONTES = {'regular': ('Poppins-Regular.ttf', 'segoeui.ttf'), 'medio': ('Poppins-Medium.ttf', 'seguisb.ttf'),
          'negrito': ('Poppins-Bold.ttf', 'segoeuib.ttf'), 'manuscrito': ('segoesc.ttf',)}


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def num(v, lo=-math.inf, hi=math.inf):
    return type(v) in (int, float) and math.isfinite(v) and lo <= v <= hi


def txt(v, limite):
    return isinstance(v, str) and v.strip() != '' and len(v.replace('*', '')) <= limite and not any(ord(c) < 32 for c in v)


# ---------------- legendas ----------------
# Mesmo agrupamento em blocos de 2–4 palavras e a mesma extração de contorno do
# template Caderno 3D, copiados para que este template não dependa dele.
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


# ---------------- validação ----------------
def validar(cfg, base):
    erros = []
    err = erros.append
    if cfg.get('schemaVersion') != 1 or cfg.get('template') != 'interface-explicativa':
        err('schemaVersion 1 e template "interface-explicativa" são obrigatórios')
    if type(cfg.get('fixture')) is not bool:
        err('fixture deve ser true ou false')
    dur = cfg.get('duracao')
    if not num(dur, 3, 300):
        err('duracao (s) entre 3 e 300'); dur = 0
    for key in ('video', 'legendas'):
        if not isinstance(cfg.get(key), str) or not (base / cfg[key]).is_file():
            err(f'{key}: arquivo não encontrado')
    fv = cfg.get('fonteVideo', {'largura': 1080, 'altura': 1920})
    if not (num(fv.get('largura'), 320, 7680) and num(fv.get('altura'), 320, 7680)):
        err('fonteVideo: largura e altura em px')
    enq = cfg.get('enquadramento', {})
    if not (num(enq.get('cx', 0), 0, fv.get('largura', 0)) and num(enq.get('cy', 0), 0, fv.get('altura', 0)) and num(enq.get('zoom', 1), 1, 2.5) and num(enq.get('rostoY', 640), 420, 1100)):
        err('enquadramento: cx/cy dentro da fonte, zoom 1–2,5 e rostoY 420–1100 (px do quadro 9:16)')
    if not num(cfg.get('legendaY', 860), 600, 1250):
        err('legendaY entre 600 e 1250 px (centro do quadro, sobre o peito)')
    for k, v in (cfg.get('paleta') or {}).items():
        if k not in PALETA or not re.fullmatch(r'#[0-9a-fA-F]{6}', str(v)):
            err(f'paleta.{k}: chaves {", ".join(PALETA)} com cor #RRGGBB')
    if cfg.get('estilo', '3d') not in ESTILOS:
        err('estilo: "3d" (Three.js, padrão) ou "2d" (DOM/CSS)')
    if cfg.get('estilo', '3d') == '2d' and (cfg.get('planos') or cfg.get('encerramento') or any(c.get('tipo') == 'broll' for c in cfg.get('cenas') or [])):
        err('planos, broll e encerramento só existem no estilo "3d"')
    if cfg.get('abertura', 'luz') not in TRANSICOES:
        err('abertura: transição desconhecida')
    for i, d in enumerate(cfg.get('destaques') or []):
        texto = d if isinstance(d, str) else d.get('texto') if isinstance(d, dict) else None
        if not txt(texto, 30) or (isinstance(d, dict) and d.get('icone') not in (None, *ICONES)):
            err(f'destaques[{i}]: texto até 30 caracteres e ícone conhecido')
    for i, u in enumerate(cfg.get('sublinhados') or []):
        if u.get('tipo') not in ('traco', 'slider') or not (num(u.get('at'), 0, dur) and num(u.get('ate'), 0, dur) and u['ate'] - u['at'] >= 0.4):
            err(f'sublinhados[{i}]: tipo traco/slider e at < ate (≥ 0,4 s)')
    cenas = []
    for i, c in enumerate(cfg.get('cenas') or []):
        tipo = c.get('tipo')
        if tipo not in CENAS:
            err(f'cenas[{i}]: tipo {tipo!r} desconhecido ({", ".join(CENAS)})'); continue
        limite = 8 if tipo == 'broll' else 6
        if not (num(c.get('from'), 0, dur) and num(c.get('to'), 0, dur) and 1.0 <= c['to'] - c['from'] <= limite):
            err(f'cenas[{i}]: from/to dentro da duração, entre 1 e {limite} s'); continue
        for k in ('entrada', 'saida', 'retorno'):
            if c.get(k) is not None and c[k] not in TRANSICOES:
                err(f'cenas[{i}].{k}: use {", ".join(TRANSICOES)}')
        if c.get('entrada') == 'cartao':
            err(f'cenas[{i}].entrada: cartao só existe como retorno à fala')
        if tipo == 'perfil' and not (txt(c.get('nome'), 26) and txt(c.get('legenda'), 30) and (c.get('detalhe') is None or txt(c['detalhe'], 32))):
            err(f'cenas[{i}] perfil: nome (≤26), legenda (≤30) e detalhe opcional (≤32)')
        if tipo == 'busca' and not txt(c.get('texto'), 32):
            err(f'cenas[{i}] busca: texto até 32 caracteres (uma linha)')
        if tipo == 'pergunta' and not (txt(c.get('titulo'), 22) and txt(c.get('texto'), 90) and c.get('linhas', 3) in (2, 3, 4)):
            err(f'cenas[{i}] pergunta: titulo (≤22), texto (≤90) e linhas 2–4')
        if tipo == 'broll':
            # B-roll 3D: fichas procedurais ou imagem PNG local com alfa (nada é baixado).
            if c.get('cena') not in BROLL:
                err(f'cenas[{i}] broll: cena "fichas" ou "imagem"')
            if c.get('cena') == 'imagem' and not (isinstance(c.get('imagem'), str) and c['imagem'].lower().endswith('.png') and (base / c['imagem']).is_file()):
                err(f'cenas[{i}] broll: imagem PNG local não encontrada')
            if c.get('cena') == 'fichas' and not (1 <= len(c.get('linhas') or []) <= 4 and all(txt(x, 22) for x in c['linhas'])):
                err(f'cenas[{i}] broll fichas: 1–4 linhas de até 22 caracteres')
            if c.get('rotulo') is not None and not txt(c['rotulo'], 30):
                err(f'cenas[{i}] broll: rotulo até 30 caracteres')
            if c.get('fundo', 'lavanda') not in ('claro', 'lavanda', 'escuro') or any(n not in ICONES for n in c.get('icones') or []) or len(c.get('icones') or []) > 3:
                err(f'cenas[{i}] broll: fundo claro/lavanda/escuro e até 3 ícones conhecidos')
            if not num(c.get('legendaY', 1470), 1300, 1650):
                err(f'cenas[{i}] broll: legendaY entre 1300 e 1650 px')
        if tipo == 'checklist':
            itens = c.get('itens') or []
            if not txt(c.get('titulo'), 14) or not 1 <= len(itens) <= 5:
                err(f'cenas[{i}] checklist: titulo (≤14) e 1–5 itens')
            for j, it in enumerate(itens):
                if not (txt(it.get('texto'), 16) and num(it.get('at'), c['from'], c['to'] - 0.3) and it.get('icone') in (None, *ICONES)):
                    err(f'cenas[{i}].itens[{j}]: texto ≤16, at dentro da cena (até 0,3 s antes do fim), ícone conhecido')
        cenas.append((c['from'], c['to'], f'cena {i} ({tipo})'))
    cenas.sort()
    for a, b in zip(cenas, cenas[1:]):
        if b[0] < a[1] - 1e-6:
            err(f'sobreposição: {a[2]} e {b[2]}')
    for i, o in enumerate(cfg.get('sobreposicoes') or []):
        tipo = o.get('tipo')
        if tipo not in SOBREPOSICOES:
            err(f'sobreposicoes[{i}]: tipo {tipo!r} desconhecido ({", ".join(SOBREPOSICOES)})'); continue
        if not (num(o.get('at'), 0, dur) and num(o.get('ate'), 0, dur) and o['ate'] - o['at'] >= 0.6):
            err(f'sobreposicoes[{i}]: at < ate (≥ 0,6 s) dentro da duração'); continue
        if any(o['at'] < b and o['ate'] > a for a, b, _ in cenas):
            err(f'sobreposicoes[{i}]: fica sobre a fala; não pode cruzar uma cena')
        if not num(o.get('y', 1100), 950, 1600):
            err(f'sobreposicoes[{i}]: y entre 950 e 1600 px (abaixo da legenda)')
        if tipo == 'lista':
            itens = o.get('itens') or []
            if not 1 <= len(itens) <= 4 or not all(txt(it.get('texto'), 20) and num(it.get('at'), o['at'], o['ate']) and it.get('icone') in (None, *ICONES) for it in itens):
                err(f'sobreposicoes[{i}] lista: 1–4 itens com texto ≤20 e at dentro do intervalo')
        if tipo == 'caminho' and o.get('icone', 'caixa') not in ICONES:
            err(f'sobreposicoes[{i}] caminho: ícone desconhecido')
        if tipo == 'faixa' and not txt(o.get('texto'), 28):
            err(f'sobreposicoes[{i}] faixa: texto até 28 caracteres')
        if tipo == 'manuscrito' and not (1 <= len(o.get('palavras') or []) <= 3 and all(txt(w, 14) for w in o['palavras'])):
            err(f'sobreposicoes[{i}] manuscrito: 1–3 palavras de até 14 caracteres')
    planos = cfg.get('planos') or []
    for i, pl in enumerate(planos):
        if not (num(pl.get('from'), 0) and num(pl.get('to'), 0) and pl['to'] > pl['from'] and num(pl.get('cx'), 0, fv.get('largura', 0)) and num(pl.get('cy', 0), 0, fv.get('altura', 0)) and num(pl.get('zoom', 1), 1, 2.5)):
            err(f'planos[{i}]: from < to, cx/cy dentro da fonte e zoom 1–2,5')
        elif i and abs(pl['from'] - planos[i - 1]['to']) > 1e-3:
            err(f'planos[{i}]: deve começar onde o anterior termina')
    if planos and dur and (planos[0].get('from') != 0 or planos[-1].get('to', 0) < dur - 1e-3):
        err('planos devem cobrir de 0 até duracao')
    fim = cfg.get('encerramento')
    extra = 0
    if fim:
        extra = fim.get('extra', 0)
        if not (num(fim.get('from'), max(0, dur - 1.0), dur) and num(extra, 2, 8)):
            err('encerramento: from no fim da fala (último segundo) e extra de 2 a 8 s')
        elif cenas and fim['from'] < cenas[-1][1] - 1e-6:
            err('encerramento: não pode cruzar a última cena')
        if not (isinstance(fim.get('logo'), str) and fim['logo'].lower().endswith('.png') and (base / fim['logo']).is_file()):
            err('encerramento.logo: PNG com transparência não encontrado')
        if not (isinstance(fim.get('perfil'), str) and re.fullmatch(r'@[A-Za-z0-9_.]{2,30}', fim['perfil'])):
            err('encerramento.perfil: @perfil válido')
        if fim.get('chamada') is not None and not txt(fim['chamada'], 28):
            err('encerramento.chamada: até 28 caracteres')
        if fim.get('entrada', 'luz') not in TRANSICOES or fim.get('entrada') == 'cartao':
            err('encerramento.entrada: transição desconhecida')
        if fim.get('transforma') is not None and not num(fim['transforma'], fim.get('from', 0) + 1.2, dur + extra - 1.2):
            err('encerramento.transforma: ao menos 1,2 s após o início e 1,2 s antes do fim')
    am = cfg.get('amostra')
    if am and not (num(am.get('inicio'), 0) and num(am.get('fim'), 0) and am['inicio'] < am['fim'] <= dur + extra + 1e-6):
        err('amostra: inicio < fim dentro da duração')
    return erros


def resumo(cfg):
    """Proporção fala/inserts e maior trecho de fala sem nenhum evento visual."""
    dur = cfg['duracao']
    cenas = sorted((c['from'], c['to']) for c in cfg.get('cenas') or [])
    insert = sum(b - a for a, b in cenas)
    eventos = sorted([a for a, _ in cenas] + [b for _, b in cenas] + [o['at'] for o in cfg.get('sobreposicoes') or []] + [0, dur])
    maior = max((b - a for a, b in zip(eventos, eventos[1:])), default=dur)
    return {'duracao': dur, 'cenas': len(cenas), 'insertPct': round(100 * insert / dur, 1), 'falaPct': round(100 * (dur - insert) / dur, 1), 'maiorTrechoSemEvento': round(maior, 2)}


# ---------------- fixture sintética ----------------
FIXTURE_GRUPOS = [
    (0.3, 1.3, 'E eu sei disso'), (1.4, 2.5, 'porque eu passava todo o meu tempo'),
    (5.6, 6.3, 'Estudando'), (6.6, 7.2, 'Este vídeo vai'), (7.25, 8.0, 'te ajudar a pular etapas'), (8.1, 9.1, 'todos os erros'),
    (11.35, 11.9, 'Primeiro,'), (12.0, 12.75, 'você precisa aprender'),
    (15.8, 16.8, 'Nós temos agora'), (17.1, 18.4, 'entramos em uma nova fase'), (18.6, 19.8, 'bem-vindo à Era da Constância'),
]


def fixture(pasta):
    """Vídeo 9:16 com silhueta sobre fundo azul, tom de 220 Hz e legendas sintéticas + configuração de exemplo."""
    pasta = Path(pasta).resolve()
    if pasta.exists():
        raise FileExistsError(f'{pasta} já existe')
    pasta.mkdir(parents=True)
    cfg = read_json(TEMPLATE / 'exemplo-sintetico.json')
    dur = cfg['duracao']
    graph = (f'color=c=0x151c8e:s=1080x1920:r=30:d={dur},'
             'drawbox=x=0:y=0:w=180:h=1920:color=0x2a36c8@0.6:t=fill,drawbox=x=900:y=0:w=180:h=1920:color=0x2a36c8@0.6:t=fill,'
             'drawbox=x=250:y=900:w=580:h=1020:color=0x16161c:t=fill,drawbox=x=440:y=360:w=200:h=560:color=0xc79a7e:t=fill,'
             'drawbox=x=380:y=300:w=320:h=330:color=0x1b1410:t=fill,drawbox=x=420:y=420:w=240:h=300:color=0xd4a688:t=fill')
    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', graph, '-f', 'lavfi', '-i', f'sine=frequency=220:duration={dur}:sample_rate=48000',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(pasta / 'fala-sintetica.mp4')], check=True)
    grupos = []
    for s, e, frase in FIXTURE_GRUPOS:
        ws = frase.split()
        passo = (e - s) / len(ws)
        grupos.append({'start': s, 'end': e, 'words': [{'text': w, 'start': round(s + i * passo, 3), 'end': round(s + (i + 1) * passo, 3)} for i, w in enumerate(ws)]})
    (pasta / 'legendas-sinteticas.json').write_text(json.dumps(grupos, ensure_ascii=False), encoding='utf-8')
    (pasta / 'exemplo-sintetico.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding='utf-8')
    return pasta / 'exemplo-sintetico.json'


# ---------------- preparação ----------------
def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def fonte(papel, cfg, base):
    if (cfg.get('fontes') or {}).get(papel):
        p = base / cfg['fontes'][papel]
        if p.suffix.lower() in ('.ttf', '.otf') and p.is_file():
            return p
        raise FileNotFoundError(f'fontes.{papel}: arquivo TTF/OTF local não encontrado')
    pastas = [Path(os.environ.get('LOCALAPPDATA', '')) / 'Microsoft/Windows/Fonts', Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts']
    for nome in FONTES[papel]:
        for d in pastas:
            if (d / nome).is_file():
                return d / nome
    raise FileNotFoundError(f'Fonte {papel} não encontrada; informe "fontes": {{"{papel}": "arquivo.ttf"}}')


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
    if amostra and not cfg.get('amostra'):
        raise ValueError('--amostra exige o campo amostra {inicio, fim}')
    fontes = {p: fonte(p, cfg, base) for p in FONTES}
    estilo = cfg.get('estilo', '3d')
    t3 = three_dir(three) if estilo == '3d' else None
    assets = pasta / 'assets'; assets.mkdir(parents=True)
    fim = cfg.get('encerramento')
    total = cfg['duracao'] + (fim['extra'] if fim else 0)
    start, end = (cfg['amostra']['inicio'], cfg['amostra']['fim']) if amostra else (0.0, total)
    shutil.copy2(GSAP, assets / 'gsap.min.js')
    if estilo == '3d':
        shutil.copy2(TEMPLATE / 'cena3d.js', assets / 'cena.js')
        shutil.copy2(TEMPLATE / 'elementos3d.js', assets / 'elementos3d.js')
        for name in ('three.module.js', 'three.core.js'):
            shutil.copy2(t3 / name, assets / name)
    else:
        shutil.copy2(TEMPLATE / 'cena.js', assets / 'cena.js')
    for papel, p in fontes.items():
        shutil.copy2(p, assets / f'{papel}.ttf')
    link_or_copy(base / cfg['video'], assets / 'fala.mp4')
    (assets / 'legendas.js').write_text('export const LEGENDAS = ' + json.dumps(read_json(base / cfg['legendas']), ensure_ascii=False) + ';\n', encoding='utf-8')
    roteiro = {k: cfg[k] for k in ('fixture', 'paleta', 'fonteVideo', 'enquadramento', 'planos', 'legendaY', 'abertura', 'destaques', 'sublinhados', 'cenas', 'sobreposicoes') if k in cfg}
    # Imagens de B-roll e logo vão para assets/ com nomes neutros.
    roteiro['cenas'] = []
    for i, c in enumerate(cfg.get('cenas') or []):
        if c.get('tipo') == 'broll' and c.get('cena') == 'imagem':
            nome = f'broll-{i + 1:02d}.png'; shutil.copy2(base / c['imagem'], assets / nome); c = {**c, 'imagem': f'assets/{nome}'}
        roteiro['cenas'].append(c)
    geo = None
    if fim:
        shutil.copy2(base / fim['logo'], assets / 'logo.png')
        roteiro['encerramento'] = {**fim, 'logo': 'assets/logo.png'}
        geo = logo_geometria(base / fim['logo'], fim.get('tamanhoLogo', 5.2))
    (assets / 'roteiro.js').write_text('export const ROTEIRO = ' + json.dumps(roteiro, ensure_ascii=False).replace('<', '\\u003c') + ';\nexport const LOGO_GEOMETRIA = ' + json.dumps(geo) + ';\n', encoding='utf-8')
    fv = cfg.get('fonteVideo', {'largura': 1080, 'altura': 1920})
    title = re.sub(r'[<>&{}]', '', cfg.get('titulo', 'Interface Explicativa'))
    html = (TEMPLATE / 'pagina.html').read_text(encoding='utf-8').format(title=title, start=round(start, 4), duration=round(end - start, 4),
                                                                         video_duration=round(max(0.04, min(cfg['duracao'], end) - start), 4), src_w=fv['largura'], src_h=fv['altura'])
    (pasta / 'index.html').write_text(html, encoding='utf-8')
    (pasta / 'hyperframes.json').write_text(json.dumps({'width': 1080, 'height': 1920, 'fps': 30}), encoding='utf-8')
    manifest = {'template': 'interface-explicativa', 'engine': 'hyperframes+threejs' if estilo == '3d' else 'hyperframes', 'estilo': estilo, 'editor': 'concat', 'config': str(config), 'config_sha256': sha(config),
                'amostra': amostra, 'inicio': start, 'duracao': round(end - start, 4), 'fixture': cfg['fixture'], 'revisao': 'pendente', 'resumo': resumo(cfg),
                'arquivos': {p.name: sha(p) for p in sorted(assets.iterdir()) if p.name != 'fala.mp4'}, 'video_sha256': sha(assets / 'fala.mp4')}
    (pasta / 'manifesto.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return pasta


def runtime_remotion(three=None):
    """Copia elementos3d.js, Three.js 0.186 local e as fontes para o public/local do Remotion."""
    t3 = three_dir(three)
    RUNTIME_REMOTION.mkdir(parents=True, exist_ok=True)
    shutil.copy2(TEMPLATE / 'elementos3d.js', RUNTIME_REMOTION / 'elementos3d.js')
    for name in ('three.module.js', 'three.core.js'):
        shutil.copy2(t3 / name, RUNTIME_REMOTION / name)
    for papel in ('regular', 'medio', 'negrito'):
        shutil.copy2(fonte(papel, {}, ROOT), RUNTIME_REMOTION / f'{papel}.ttf')
    return RUNTIME_REMOTION


def elementos(nomes, saida, fundo='claro', titulo=None, duracao=6, formato='9x16', three=None):
    """Renderiza elementos 3D avulsos (vitrine) pela composição Remotion InterfaceElementos3D."""
    if not nomes or len(nomes) > 12 or any(n not in ICONES for n in nomes):
        raise ValueError(f'elementos: 1–12 entre {", ".join(ICONES)}')
    if fundo not in FUNDOS or formato not in FORMATOS:
        raise ValueError(f'fundo {FUNDOS} e formato {tuple(FORMATOS)}')
    if not num(duracao, 2, 20) or not math.isclose(duracao * 30, round(duracao * 30)):
        raise ValueError('duracao: 2–20 s em quadros inteiros')
    if titulo is not None and not txt(titulo, 48):
        raise ValueError('titulo: até 48 caracteres')
    saida = Path(saida).resolve()
    if saida.exists():
        raise FileExistsError(f'{saida} já existe; não sobrescrevo renders')
    runtime_remotion(three)
    w, h = FORMATOS[formato]
    props = {'elementos': nomes, 'fundo': fundo, 'duration': duracao, 'width': w, 'height': h, 'runtime': 'local/interface-explicativa'}
    if titulo:
        props['titulo'] = titulo
    arq = RUNTIME_REMOTION / 'props.json'
    arq.write_text(json.dumps(props, ensure_ascii=False), encoding='utf-8')
    saida.parent.mkdir(parents=True, exist_ok=True)
    npx = shutil.which('npx') or 'npx'
    run([npx, 'remotion', 'render', 'src/index.ts', 'InterfaceElementos3D', str(saida), f'--props={arq}', '--gl=angle', '--codec=h264', '--crf=18', '--log=error'], REMOTION)
    return saida


def hf():
    return [str(HF_LOCAL)] if HF_LOCAL.is_file() else ['npx', '--yes', 'hyperframes@0.8.137']


def run(args, cwd):
    subprocess.run(args, cwd=cwd, env=ENV, check=True, shell=(os.name == 'nt'))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('legendas', help='agrupa uma transcrição palavra a palavra em blocos de 2–4 palavras')
    s.add_argument('transcricao'); s.add_argument('--saida', required=True); s.add_argument('--plano')
    s = sub.add_parser('validar'); s.add_argument('config')
    s = sub.add_parser('resumo'); s.add_argument('config')
    s = sub.add_parser('preparar'); s.add_argument('config'); s.add_argument('--pasta', required=True); s.add_argument('--amostra', action='store_true'); s.add_argument('--three')
    s = sub.add_parser('verificar'); s.add_argument('--pasta', required=True)
    s = sub.add_parser('render'); s.add_argument('--pasta', required=True); s.add_argument('--saida', required=True)
    sub.add_parser('icones')
    s = sub.add_parser('elementos', help='Remotion: renderiza elementos 3D avulsos (Three.js) para o Concat ou a biblioteca')
    s.add_argument('nomes', nargs='+'); s.add_argument('--saida', required=True); s.add_argument('--fundo', default='claro', choices=FUNDOS)
    s.add_argument('--titulo'); s.add_argument('--duracao', type=float, default=6); s.add_argument('--formato', default='9x16', choices=tuple(FORMATOS)); s.add_argument('--three')
    s = sub.add_parser('fixture', help='gera mídia e configuração sintéticas para testar o template'); s.add_argument('--pasta', required=True)
    a = ap.parse_args()
    try:
        if a.cmd == 'legendas':
            g = legendas(a.transcricao, a.saida, a.plano); print(f'{len(g)} blocos em {a.saida}')
        elif a.cmd == 'validar':
            cfg = Path(a.config).resolve(); erros = validar(read_json(cfg), cfg.parent)
            print('\n'.join(erros) if erros else 'ok'); return 1 if erros else 0
        elif a.cmd == 'resumo':
            print(json.dumps(resumo(read_json(a.config)), ensure_ascii=False))
        elif a.cmd == 'preparar':
            print(preparar(a.config, a.pasta, a.amostra, a.three))
        elif a.cmd == 'verificar':
            run(hf() + ['lint'], Path(a.pasta).resolve())
        elif a.cmd == 'render':
            out = Path(a.saida).resolve()
            if out.exists():
                raise FileExistsError(f'{out} já existe; não sobrescrevo renders')
            out.parent.mkdir(parents=True, exist_ok=True)
            run(hf() + ['render', '.', '-o', str(out), '--quality', 'delivery', '--fps', '30'], Path(a.pasta).resolve())
        elif a.cmd == 'fixture':
            print(fixture(a.pasta))
        elif a.cmd == 'elementos':
            print(elementos(a.nomes, a.saida, a.fundo, a.titulo, a.duracao, a.formato, a.three))
        elif a.cmd == 'icones':
            print('\n'.join(ICONES))
    except (ValueError, FileExistsError, FileNotFoundError, subprocess.CalledProcessError) as e:
        print(e, file=sys.stderr); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
