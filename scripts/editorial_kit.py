"""Prepara três motions editoriais locais; Concat continua sendo o editor."""
import argparse
import hashlib
import html
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / 'motion/hyperframes/templates/editorial-kit'
IDENTITY = ROOT / 'motion/identity/editorial-v1'
HF = ROOT / 'motion/hyperframes/node_modules/.bin' / ('hyperframes.cmd' if os.name == 'nt' else 'hyperframes')
ENV = {**os.environ, 'DO_NOT_TRACK': '1', 'HYPERFRAMES_NO_TELEMETRY': '1', 'HF_CLI_TELEMETRY_DISABLED': '1'}
KINDS = ('titulo-editorial', 'card-dados', 'encerramento')


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def text(p, key, limit, lines=1):
    value = p.get(key)
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f'{key}: texto obrigatório com até {limit} caracteres')
    if len(value.split('\n')) > lines or any(ord(c) < 32 and c != '\n' for c in value):
        raise ValueError(f'{key}: no máximo {lines} linhas; sem caracteres de controle')
    if lines == 1 and '\n' in value:
        raise ValueError(f'{key}: use apenas uma linha')
    return value


def validate(p, identity):
    if not isinstance(p, dict) or p.get('version') != 1 or p.get('templateId') not in KINDS:
        raise ValueError('version/templateId inválido')
    width, height = p.get('width'), p.get('height')
    if (width, height) not in ((540, 960), (1080, 1920), (960, 540), (1920, 1080)):
        raise ValueError('Use 540x960, 1080x1920, 960x540 ou 1920x1080')
    if p.get('fps') not in (24, 30, 60):
        raise ValueError('fps deve ser 24, 30 ou 60')
    duration = p.get('duration')
    if type(duration) not in (int, float) or not math.isfinite(duration) or not 4 <= duration <= 15:
        raise ValueError('duration deve estar entre 4 e 15 segundos')
    if not math.isclose(duration * p['fps'], round(duration * p['fps']), abs_tol=1e-7):
        raise ValueError('duration deve corresponder a frames inteiros')
    for key, limit in [('brand', 24), ('eyebrow', 32), ('subtitle', 75), ('footer', 42)]:
        text(p, key, limit)
    title = text(p, 'title', 54, lines=2)
    if any(not line.strip() or len(line) > 28 for line in title.split('\n')):
        raise ValueError('title: até duas linhas, cada uma com até 28 caracteres')
    if type(p.get('fixture')) is not bool:
        raise ValueError('fixture deve indicar explicitamente true ou false')
    if p['templateId'] == 'card-dados':
        for key in ('value', 'baseline'):
            if type(p.get(key)) is not int or not 0 <= p[key] <= 100:
                raise ValueError(f'{key}: inteiro entre 0 e 100 (percentual)')
        for key, limit in [('metric', 28), ('baselineLabel', 12), ('valueLabel', 12)]:
            text(p, key, limit)
        if not p['footer'].upper().startswith('FONTE:'):
            raise ValueError('Card de dados exige footer com FONTE: e a origem dos dados')
    if p['templateId'] == 'encerramento':
        text(p, 'cta', 26)
    if not isinstance(identity, dict) or identity.get('id') != 'direcao-editorial-v1' or identity.get('version') != 1:
        raise ValueError('Identidade inválida')
    for key in ('paper', 'ink', 'accent', 'muted', 'rule'):
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', identity.get('colors', {}).get(key, '')):
            raise ValueError(f'Cor inválida: {key}')
    for role in ('display', 'sans', 'mono'):
        spec = identity.get('typography', {}).get(role, {})
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', spec.get('family', '')):
            raise ValueError('Nome de família tipográfica inválido')
        if not re.fullmatch(r'[A-Za-z0-9_-]+\.(ttf|otf|woff2?)', spec.get('localFile', '')):
            raise ValueError('Nome de arquivo de fonte inválido')
    for key, lo, hi in [('enterSeconds', .2, 1), ('staggerSeconds', 0, .2), ('exitSeconds', .2, .6)]:
        value = identity.get('motion', {}).get(key)
        if type(value) not in (int, float) or not math.isfinite(value) or not lo <= value <= hi:
            raise ValueError(f'Motion inválido: {key}')
    if identity.get('layout', {}).get('safeInset') != .075:
        raise ValueError('Este layout usa safeInset 0.075')


def content(p):
    esc = lambda key: html.escape(p[key])
    heading = ''.join(f'<span class="line">{html.escape(line)}</span>' for line in p['title'].split('\n'))
    common = f'<p class="eyebrow">{esc("eyebrow")}</p><h1>{heading}</h1><p class="subtitle">{esc("subtitle")}</p>'
    if p['templateId'] == 'titulo-editorial':
        return '<div class="signal" aria-hidden="true"><span></span><span></span><span></span></div>' + common
    if p['templateId'] == 'card-dados':
        rows = ''.join(f'<div class="bar-row"><span>{esc(label)}</span><div class="bar-track"><div class="bar {kind}" style="width:{p[value]}%"></div></div><span class="bar-value">{p[value]}%</span></div>' for label, value, kind in [('baselineLabel', 'baseline', 'baseline'), ('valueLabel', 'value', 'current')])
        source = 'DADOS FICTÍCIOS · SEM VALOR ESTATÍSTICO' if p['fixture'] else 'DADOS INFORMADOS NO PLANO · CONFERIR FONTE'
        return common + f'<div class="stat"><span class="number">0</span><span class="unit">%</span></div><p class="metric">{esc("metric")}</p><div class="chart">{rows}</div><p class="source">{source}</p>'
    return common + f'<p class="signature">{esc("brand")}</p><p class="cta"><span>{esc("cta")}</span><span class="arrow" aria-hidden="true">↗</span></p><div class="cta-line"></div>'


def prepare(plan_path, destination, identity_path=IDENTITY / 'tokens.json'):
    p, identity = read_json(plan_path), read_json(identity_path)
    validate(p, identity)
    if destination.exists():
        raise ValueError('Destino já existe; escolha nova pasta para preservar versões')
    if not HF.is_file():
        raise ValueError('Prepare o motor com PREPARAR-MOTION.ps1 -Engine HyperFrames')
    gsap = ROOT / 'motion/hyperframes/node_modules/gsap/dist/gsap.min.js'
    if not gsap.is_file():
        raise ValueError('GSAP local ausente')
    overrides = p.get('fontFiles', {})
    if not isinstance(overrides, dict) or set(overrides) - {'display', 'sans', 'mono'}:
        raise ValueError('fontFiles aceita display, sans e mono')
    fonts = {}
    for role, spec in identity['typography'].items():
        supplied = overrides.get(role)
        if supplied is not None and (not isinstance(supplied, str) or '://' in supplied):
            raise ValueError('Fontes devem ser arquivos locais')
        path = (plan_path.parent / supplied).resolve() if supplied else Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / spec['localFile']
        if not path.is_file() or path.suffix.lower() not in ('.ttf', '.otf', '.woff', '.woff2'):
            raise ValueError(f'Fonte local ausente ou inválida: {role}; configure fontFiles')
        fonts[role] = path
    destination.mkdir(parents=True)
    (destination / 'assets').mkdir()
    faces = []
    for role, path in fonts.items():
        relative = f'assets/{role}{path.suffix.lower()}'
        shutil.copyfile(path, destination / relative)
        faces.append(f"@font-face{{font-family:{identity['typography'][role]['family']};src:url('{relative}');font-weight:100 900;font-style:normal;font-display:block}}")
    css = (TEMPLATE / 'style.css').read_text(encoding='utf-8')
    css = css.replace('/*TOKENS*/', ';'.join(f'--{k}:{v}' for k, v in identity['colors'].items()))
    # Font family aliases in the CSS are generated from the same token contract.
    for role, default in [('display', 'DirecaoDisplay'), ('sans', 'DirecaoSans'), ('mono', 'DirecaoMono')]:
        css = css.replace(default, identity['typography'][role]['family'])
    css = css.replace('/*FONTS*/', '\n'.join(faces))
    portrait = p['height'] > p['width']
    css = css.replace('SCALE', str(p['width'] / (1080 if portrait else 1920)))
    config = {**p, 'identity': identity}
    replacements = {'/*STYLE*/': css, 'KIND': p['templateId'], 'ORIENTATION': 'portrait' if portrait else 'landscape', 'WIDTH': str(p['width']), 'HEIGHT': str(p['height']), 'DURATION': str(p['duration']), 'BRAND': html.escape(p['brand']), 'CONTENT': content(p), 'FOOTER': html.escape(p['footer']), 'PAGE': str(KINDS.index(p['templateId']) + 1).zfill(2), 'REVIEW': 'AMOSTRA · REVISÃO PENDENTE' if p['fixture'] else 'REVISÃO PENDENTE', '/*CONFIG*/': json.dumps(config, ensure_ascii=False).replace('<', '\\u003c')}
    # Single-pass substitution prevents user strings from becoming placeholders.
    replacements['/*RUNTIME*/'] = (TEMPLATE / 'runtime.js').read_text(encoding='utf-8')
    pattern = re.compile('|'.join(re.escape(k) for k in replacements))
    page = pattern.sub(lambda match: replacements[match.group()], (TEMPLATE / 'index.html').read_text(encoding='utf-8'))
    (destination / 'index.html').write_text(page, encoding='utf-8')
    shutil.copyfile(TEMPLATE / 'runtime.js', destination / 'runtime.js')
    shutil.copyfile(gsap, destination / 'gsap.min.js')
    shutil.copyfile(identity_path, destination / 'tokens.json')
    shutil.copyfile(IDENTITY / 'DESIGN.md', destination / 'DESIGN.md')
    (destination / 'plano.local.json').write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding='utf-8')
    (destination / 'hyperframes.json').write_text('{}\n', encoding='utf-8')
    (destination / 'package.json').write_text('{"name":"direcao-editorial-kit-local","private":true}\n', encoding='utf-8')
    (destination / 'BRIEF.md').write_text('---\nworkflow: motion-graphics\nflow: automation\nstoryboard: no\n---\nAmostra sintética solicitada para revisão. Tela cheia opaca e silêncio intencional.\nConcat é o editor; esta pasta é apenas o fonte da peça. Não é uma entrega aprovada.\n', encoding='utf-8')
    manifest = {'templateId': p['templateId'], 'engine': 'hyperframes', 'editor': 'concat', 'reviewStatus': 'pending', 'fixture': p['fixture'], 'width': p['width'], 'height': p['height'], 'fps': p['fps'], 'duration': p['duration'], 'identityId': identity['id'], 'files': {}}
    for path in sorted(destination.rglob('*')):
        if path.is_file():
            manifest['files'][path.relative_to(destination).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    (destination / 'manifest.local.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return manifest


def run(args, cwd):
    subprocess.run([str(x) for x in args], cwd=cwd, env=ENV, check=True)


def render(folder, output):
    if output.exists():
        raise ValueError('Saída já existe; use novo nome para preservar a amostra')
    p = read_json(folder / 'plano.local.json')
    validate(p, read_json(folder / 'tokens.json'))
    output.parent.mkdir(parents=True, exist_ok=True)
    # O render deste comando é sempre uma amostra. Não marca aprovação humana.
    run([HF, 'check'], folder)
    run([HF, 'render', '--output', output, '--fps', p['fps'], '--quality', 'looks', '--workers', '2'], folder)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('listar')
    for command in ('validar', 'preparar'):
        item = sub.add_parser(command)
        item.add_argument('plano', type=Path)
        item.add_argument('--identidade', type=Path, default=IDENTITY / 'tokens.json')
        if command == 'preparar':
            item.add_argument('--pasta', type=Path, required=True)
    for command in ('verificar', 'amostra'):
        item = sub.add_parser(command)
        item.add_argument('--pasta', type=Path, required=True)
        if command == 'amostra':
            item.add_argument('--saida', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == 'listar':
            print('\n'.join(KINDS))
        elif args.command == 'validar':
            validate(read_json(args.plano), read_json(args.identidade))
            print('Plano válido')
        elif args.command == 'preparar':
            prepare(args.plano.resolve(), args.pasta.resolve(), args.identidade.resolve())
            print(f'Preparado: {args.pasta}')
        elif args.command == 'verificar':
            run([HF, 'check'], args.pasta.resolve())
        else:
            render(args.pasta.resolve(), args.saida.resolve())
    except (ValueError, OSError, subprocess.CalledProcessError, KeyError, TypeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
