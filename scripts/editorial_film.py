"""Prepara/renderiza o template local Editorial Film sem publicar os modulos privados."""
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
TEMPLATE = ROOT / 'motion/hyperframes/templates/editorial-film'
PRIVATE = ROOT / 'skills-locais/editorial-film-edit'
HF = ROOT / 'motion/hyperframes/node_modules/.bin' / ('hyperframes.cmd' if os.name == 'nt' else 'hyperframes')
ENV = {**os.environ, 'DO_NOT_TRACK': '1', 'HYPERFRAMES_NO_TELEMETRY': '1', 'HF_CLI_TELEMETRY_DISABLED': '1'}


def validar(p):
    if p.get('templateId') != 'editorial-film' or p.get('version') != 1:
        raise ValueError('templateId/version devem ser editorial-film/1')
    if p.get('width') not in (540, 720, 1080) or p.get('height') != p['width'] * 16 // 9:
        raise ValueError('Formato suportado: 540x960, 720x1280 ou 1080x1920')
    if p.get('fps') not in (24, 25, 30, 60):
        raise ValueError('fps deve ser 24, 25, 30 ou 60')
    for k in ('paper', 'ink', 'accent'):
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', p.get(k, '')):
            raise ValueError(f'{k}: use #RRGGBB')
    for k in ('label', 'footer'):
        if not isinstance(p.get(k), str) or len(p[k]) > 42:
            raise ValueError(f'{k}: texto com ate 42 caracteres')
    for k, hi in [('grain', .12), ('bloom', 1)]:
        if not isinstance(p.get(k), (int, float)) or not math.isfinite(p[k]) or not 0 <= p[k] <= hi:
            raise ValueError(f'{k} fora de 0..{hi}')
    if not isinstance(p.get('scenes'), list) or not p['scenes']:
        raise ValueError('scenes deve conter ao menos uma cena')
    for s in p['scenes']:
        if s.get('kind') not in ('title', 'split', 'closing'):
            raise ValueError('kind deve ser title, split ou closing')
        duration = s.get('duration')
        if not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 2 <= duration <= 60:
            raise ValueError('duration deve estar entre 2 e 60 segundos')
        if not math.isclose(duration*p['fps'], round(duration*p['fps']), abs_tol=1e-7):
            raise ValueError('duration deve corresponder a frames inteiros')
        title = s.get('title')
        if not isinstance(title, list) or not 1 <= len(title) <= 3 or any(not isinstance(x, str) or not x or len(x)>13 for x in title):
            raise ValueError('title: 1 a 3 linhas curtas, ate 13 caracteres cada; confira a largura na previa')
        if not isinstance(s.get('eyebrow'), str) or len(s['eyebrow']) > 36:
            raise ValueError('eyebrow: ate 36 caracteres')
        if s.get('grade', 'clean') not in ('clean', 'film', 'bw', 'doc'):
            raise ValueError('grade invalido')
        words = s.get('caption')
        if not isinstance(words, list) or len(words)>7:
            raise ValueError('caption: ate 7 palavras por cena')
        previous=-1
        for w in words:
            at=w.get('at')
            if not isinstance(w.get('w'), str) or not w['w'] or len(w['w'])>20:
                raise ValueError('Palavra invalida')
            if not isinstance(at,(int,float)) or not math.isfinite(at) or not .5 <= at < duration-.4 or at < previous:
                raise ValueError('Tempos de palavras devem ser crescentes, entre .5 e duration-.4')
            previous=at
        if sum(len(w['w']) for w in words)>43:
            raise ValueError('Legenda muito longa: ate 43 caracteres sem espacos')
    return sum(s['duration'] for s in p['scenes'])


def run(args, cwd):
    subprocess.run([str(a) for a in args], cwd=cwd, env=ENV, check=True)


def substituir(text, before, after):
    if text.count(before) != 1:
        raise ValueError('Versao dos modulos privados diferente da adaptacao esperada')
    return text.replace(before, after)


def preparar(plan, destination):
    p=json.loads(plan.read_text(encoding='utf-8')); duration=validar(p)
    if destination.exists():
        raise ValueError('Pasta de destino ja existe. Use uma nova pasta para preservar a versao anterior.')
    if not HF.exists():
        raise ValueError('Instale o motor com PREPARAR-MOTION.ps1 -Engine HyperFrames')
    manifest=json.loads((PRIVATE/'importacao.local.json').read_text(encoding='utf-8'))
    for record in manifest['files']:
        if hashlib.sha256((PRIVATE/record['path']).read_bytes()).hexdigest()!=record['sha256']:
            raise ValueError('Pacote privado alterado; confira o original antes de adaptar')
    fonts=p.get('fontFiles',{})
    defaults={'sans':'arial.ttf','serif':'georgia.ttf','italic':'georgiai.ttf','mono':'consola.ttf'}
    resolved={k: (plan.parent/ fonts[k]).resolve() if k in fonts else Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts'/v for k,v in defaults.items()}
    for f in resolved.values():
        if not f.is_file():
            raise ValueError(f'Fonte ausente: {f}; configure fontFiles no plano')
    for s in p['scenes']:
        for key in ('image','presenter'):
            if s.get(key):
                f=(plan.parent/s[key]).resolve()
                if not f.is_file() or f.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):
                    raise ValueError(f'{key}: forneca uma imagem local JPG/PNG/WebP existente')
    destination.mkdir(parents=True)
    (destination/'assets').mkdir(); (destination/'modules').mkdir()
    (destination/'plano.original.local.json').write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf-8')
    for k,f in resolved.items():
        shutil.copyfile(f,destination/'assets'/f'{k}.ttf')
    for i,s in enumerate(p['scenes']):
        for key in ('image','presenter'):
            if s.get(key):
                f=(plan.parent/s[key]).resolve(); target=f'assets/{i}-{key}{f.suffix.lower()}'
                shutil.copyfile(f,destination/target); s[key]=target
    for f in (PRIVATE/'implementation/browser-reference').glob('*.js'):
        text=f.read_text(encoding='utf-8')
        if f.name=='picture.js':
            text=text.replace('preserveDrawingBuffer: false','preserveDrawingBuffer: true')
            text=substituir(text,'this.gl = gl;',"if (!gl) throw new Error('WebGL indisponivel para Editorial Film');\n    this.gl = gl;")
        elif f.name=='captions.js':
            text=substituir(text,'if (c._y == null) c._y = c.y ?? this.yAt(c.t0 + 1e-4);','const fixedY = c.y ?? this.yAt(c.t0 + 1e-4);')
            text=text.replace('`${c._y}px`','`${fixedY}px`')
        elif f.name=='typeLayers.js':
            text=substituir(text,"if (track != null) el.style.letterSpacing = `${track.toFixed(4)}em`;","el.style.letterSpacing = track == null ? '' : `${track.toFixed(4)}em`;")
        elif f.name=='split-layout.js':
            text=substituir(text,'const insert = animated && presenterB ? a : b;','const insert = presenterB ? a : b;')
            text=substituir(text,': [0, at, 1, 1];',': [0, clamp((insert.y - r.y) / r.h), 1, clamp((insert.y + insert.h - r.y) / r.h)];')
        elif f.name=='fonts.js':
            start=text.index('export const FONT = {'); end=text.index('\n};',start)+3
            text=text[:start]+"export const FONT = {sans:'EditorialSans',serif:'EditorialSerif',mono:'EditorialMono'};"+text[end:]
        (destination/'modules'/f.name).write_text(text,encoding='utf-8')
    shutil.copyfile(TEMPLATE/'runtime.js',destination/'runtime.js')
    shutil.copyfile(ROOT/'motion/hyperframes/node_modules/gsap/dist/gsap.min.js',destination/'gsap.min.js')
    esbuild=ROOT/'motion/hyperframes/node_modules/esbuild/bin/esbuild'
    if not esbuild.exists():
        raise ValueError('esbuild ausente. Repare a instalacao do motor HyperFrames.')
    run(['node',esbuild,'runtime.js','--bundle','--format=iife','--outfile=editorial.bundle.js'],destination)
    html=(TEMPLATE/'index.html').read_text(encoding='utf-8')
    # Replace placeholders before embedding user text, which is escaped as JSON.
    for key,value in [('WIDTH',p['width']),('HEIGHT',p['height']),('FPS',p['fps']),('DURATION',duration)]:
        html=html.replace(key,str(value))
    html=html.replace('/*STYLE*/',(TEMPLATE/'style.css').read_text(encoding='utf-8'))
    html=html.replace('/*CONFIG*/',json.dumps(p,ensure_ascii=False).replace('<','\\u003c'))
    (destination/'index.html').write_text(html,encoding='utf-8')
    (destination/'hyperframes.json').write_text('{}\n',encoding='utf-8')
    (destination/'package.json').write_text(json.dumps({'name':'editorial-film-local','private':True,'type':'module'}),encoding='utf-8')
    (destination/'BRIEF.md').write_text('---\nworkflow: general-video\nflow: automation\nstoryboard: no\n---\nAmostra sintética de 12s ou plano local parametrizado. Motion auxiliar para Concat.\nRender de amostra solicitado; silêncio intencional, palavras com tempos demonstrativos.\n',encoding='utf-8')
    (destination/'design.md').write_text('Editorial de arquivo: papel quente, tinta oliva e cobre. Serif de grande porte, sans nas legendas, mono nas marcas de borda. Abertura com escultura procedural, figura sintética em painel, encerramento escuro. Entrada suave, deriva contínua, texto discretizado no fechamento.\n',encoding='utf-8')
    (destination/'ORIGEM.local.json').write_text(json.dumps({'zip_sha256':manifest['zip_sha256'],'private':True,'adaptation':'editorial-film-v1','duration':duration,'fps':p['fps'],'width':p['width'],'height':p['height']},indent=2),encoding='utf-8')
    print(f'Preparado: {destination}')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    for name in ('validar','preparar'):
        q=sub.add_parser(name);q.add_argument('plano',type=Path)
        if name=='preparar':q.add_argument('--pasta',required=True,type=Path)
    for name in ('verificar','renderizar'):
        q=sub.add_parser(name);q.add_argument('--pasta',required=True,type=Path)
        if name=='renderizar':q.add_argument('--saida',required=True,type=Path)
    args=parser.parse_args()
    try:
        if args.command=='validar':
            print(f"Plano valido: {validar(json.loads(args.plano.read_text(encoding='utf-8')))}s")
        elif args.command=='preparar':preparar(args.plano.resolve(),args.pasta.resolve())
        elif args.command=='verificar':run([HF,'check'],args.pasta.resolve())
        else:
            output=args.saida.resolve()
            if output.exists():raise ValueError('Saida ja existe; use outro nome para preservar a amostra.')
            run([HF,'render','--output',output,'--quality','looks','--workers','2'],args.pasta.resolve())
    except (ValueError,OSError,subprocess.CalledProcessError) as e:
        print(str(e),file=sys.stderr);return 1
    return 0


if __name__=='__main__':sys.exit(main())
