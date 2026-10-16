"""Template "short editorial 9:16": do plano JSON a amostra montada no Concat.

    python scripts/short_editorial.py validar PLANO
    python scripts/short_editorial.py preparar PLANO --pasta TRABALHO
    python scripts/short_editorial.py renderizar PLANO --pasta TRABALHO
    python scripts/short_editorial.py montar PLANO --pasta TRABALHO
    python scripts/short_editorial.py amostra PLANO --pasta TRABALHO --saida PASTA

O original so e lido. Plano, trechos, fontes e logo ficam na pasta de trabalho, fora do Git.
"""
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FPS = 30
KINDS = {'pergunta': ('remotion', 'EditorialPergunta'), 'meta': ('remotion', 'EditorialMeta'),
         'fechamento': ('remotion', 'EditorialFechamento'), 'mosaico': ('hyperframes', 'mosaico'),
         'contraste': ('hyperframes', 'contraste')}
NO_TELEMETRY = {'DO_NOT_TRACK': '1', 'HYPERFRAMES_NO_TELEMETRY': '1', 'HF_CLI_TELEMETRY_DISABLED': '1'}


class PlanoInvalido(ValueError):
    pass


def validar(plano):
    """Confere o plano antes de qualquer extracao ou render; devolve a lista de cenas."""
    def falha(msg):
        raise PlanoInvalido(msg)
    if plano.get('templateId') != 'short-editorial-9x16' or plano.get('version') != 1:
        falha('templateId/version devem ser "short-editorial-9x16"/1')
    if not isinstance(plano.get('source'), str) or not plano['source']:
        falha('source deve ser o caminho do video original ou "sintetico"')
    size = plano.get('sourceSize')
    if not (isinstance(size, list) and len(size) == 2 and all(isinstance(v, int) and v > 0 for v in size)):
        falha('sourceSize deve ser [largura, altura] do original')
    cenas = plano.get('scenes')
    if not isinstance(cenas, list) or not cenas:
        falha('scenes deve ser uma lista com ao menos uma cena')
    ids = set()
    for i, c in enumerate(cenas):
        cid = c.get('id')
        if not isinstance(cid, str) or not cid.isalnum() or cid in ids:
            falha(f'cena {i}: id deve ser unico, so letras e numeros')
        ids.add(cid)
        if c.get('kind') not in KINDS:
            falha(f'cena {cid}: kind deve ser um de {sorted(KINDS)}')
        if c.get('engine') != KINDS[c['kind']][0]:
            falha(f'cena {cid}: a cena "{c["kind"]}" e feita em {KINDS[c["kind"]][0]}')
        for k in ('sourceStartFrame', 'frames'):
            if not isinstance(c.get(k), int) or c[k] < 0 or (k == 'frames' and c[k] < 45):
                falha(f'cena {cid}: {k} deve ser inteiro (frames >= 45)')
        if not isinstance(c.get('tailFrames', 0), int) or c.get('tailFrames', 0) < 0:
            falha(f'cena {cid}: tailFrames deve ser inteiro >= 0')
        if c.get('tailFrames') and i != len(cenas) - 1:
            falha(f'cena {cid}: so a ultima cena pode ter tailFrames (encerramento sem voz)')
        shots = c.get('shots')
        if not (isinstance(shots, list) and shots and all(0 <= s.get('x', -1) <= 1 and s.get('at', -1) >= 0 for s in shots)):
            falha(f'cena {cid}: shots precisa de [{{"at": seg, "x": 0..1}}]')
        t = c.get('transition')
        if t is not None and not (isinstance(t, dict) and str(t.get('id', '')).startswith('concat.') and 0.1 <= t.get('duration', 0) <= 1.5):
            falha(f'cena {cid}: transition deve ser null ou {{"id": "concat....", "duration": 0.1..1.5}}')
        dur = c['frames'] / FPS
        if c['kind'] == 'contraste' and not (0 < c.get('darkAt', -1) < c.get('lightAt', -1) < dur):
            falha(f'cena {cid}: contraste precisa de 0 < darkAt < lightAt < duracao')
        for w in c.get('words', []):
            if not (isinstance(w.get('t'), str) and 0 <= w.get('s', -1) <= w.get('e', -1)):
                falha(f'cena {cid}: palavra invalida {w}')
    return cenas


def ler_plano(caminho):
    plano = json.loads(Path(caminho).read_text(encoding='utf-8'))
    validar(plano)
    return plano


def ffmpeg():
    return shutil.which('ffmpeg') or str(next((ROOT / 'motion/remotion/node_modules/@remotion').glob('compositor-*/ffmpeg*')))


def run(cmd, cwd=None, env=None):
    r = subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        raise SystemExit(f'Falhou: {Path(cmd[0]).name} {" ".join(map(str, cmd[1:3]))}\n{(r.stdout + r.stderr)[-1500:]}')
    return r.stdout


def junction(alvo, link):
    """node_modules da copia aponta para a instalacao do repositorio (sem novo download)."""
    if link.exists():
        return
    if os.name == 'nt':
        import _winapi
        _winapi.CreateJunction(str(alvo), str(link))
    else:
        link.symlink_to(alvo, target_is_directory=True)


def palavras_da_transcricao(plano, cena):
    tr = json.loads(Path(plano['transcript']).read_text(encoding='utf-8'))['words']
    t0, t1 = cena['sourceStartFrame'] / FPS, (cena['sourceStartFrame'] + cena['frames']) / FPS
    chaves = set(cena.get('keywords', []))
    out = []
    for w in tr:
        if t0 - .02 <= w['s'] < t1 - .05:
            texto = plano.get('replace', {}).get(w['w'], w['w'])
            out.append({'t': texto, 's': round(max(0, w['s'] - t0), 3), 'e': round(min(t1 - t0, w['e'] - t0), 3),
                        'k': texto.strip('.,!?;:').lower() in chaves})
    return out


def preparar(plano, pasta, plano_path):
    pasta.mkdir(parents=True, exist_ok=True)
    rem, hf = pasta / 'remotion', pasta / 'hyperframes'
    # Copia os fontes do template para a edicao; node_modules por juncao.
    for nome in ('src', 'templates'):
        shutil.copytree(ROOT / 'motion/remotion' / nome, rem / nome, dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.local.json'))
    for nome in ('package.json', 'package-lock.json', 'tsconfig.json'):
        shutil.copy2(ROOT / 'motion/remotion' / nome, rem / nome)
    shutil.copytree(ROOT / 'motion/hyperframes/templates', hf / 'templates', dirs_exist_ok=True)
    for nome in ('package.json', 'package-lock.json'):
        shutil.copy2(ROOT / 'motion/hyperframes' / nome, hf / nome)
    junction(ROOT / 'motion/remotion/node_modules', rem / 'node_modules')
    junction(ROOT / 'motion/hyperframes/node_modules', hf / 'node_modules')
    for d in (rem / 'public/local/fonts', hf / 'public/fonts', pasta / 'render', pasta / 'concat'):
        d.mkdir(parents=True, exist_ok=True)
    # Fonte sintetica para testes: barras + tom, sem material pessoal.
    fonte = plano['source']
    if fonte == 'sintetico':
        total = max(c['sourceStartFrame'] + c['frames'] for c in plano['scenes']) / FPS + 1
        fonte = str(pasta / 'fonte-sintetica.mp4')
        run([ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', f'testsrc2=size=1920x1080:rate={FPS}:duration={total}',
             '-f', 'lavfi', '-i', f'sine=frequency=330:duration={total}', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', fonte])
    probe = Path(ffmpeg()).with_name('ffprobe' + Path(ffmpeg()).suffix)
    taxa = run([str(probe), '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', fonte]).strip().strip(',')
    if taxa != f'{FPS}/1':
        raise SystemExit(f'O original esta a {taxa} fps; o template usa {FPS} fps (converta antes para nao desalinhar a voz).')
    fontes = {}
    for chave, arq in (plano.get('fonts') or {}).items():
        if arq:
            destino = f'{chave}{Path(arq).suffix}'
            shutil.copy2(arq, rem / 'public/local/fonts' / destino); shutil.copy2(arq, hf / 'public/fonts' / destino)
            fontes[chave] = destino
    brand = dict(plano.get('brand') or {'logo': '', 'endText': ''})
    if brand.get('logo'):
        shutil.copy2(brand['logo'], rem / 'public/local' / ('logo' + Path(brand['logo']).suffix))
        brand['logo'] = 'local/logo' + Path(brand['logo']).suffix
    estado = {'source': fonte, 'scenes': []}
    for cena in plano['scenes']:
        if not cena.get('words') and plano.get('transcript'):
            cena['words'] = palavras_da_transcricao(plano, cena)
        cena.setdefault('words', [])
        seg = f'seg-{cena["id"]}.mp4'
        # Trecho com quadros exatos: busca rapida ate 1 s antes e selecao por quadro.
        ini = cena['sourceStartFrame'] / FPS; pre = max(0.0, ini - 1)
        run([ffmpeg(), '-v', 'error', '-y', '-ss', f'{pre:.6f}', '-i', fonte, '-an',
             '-vf', f"select='gte(n\\,{round((ini - pre) * FPS)})',setpts=PTS-STARTPTS", '-frames:v', str(cena['frames']),
             '-r', str(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', str(rem / 'public/local' / seg)])
        shutil.copy2(rem / 'public/local' / seg, hf / 'public' / seg)
        engine, comp = KINDS[cena['kind']]
        if engine == 'remotion':
            props = {'scene': cena, 'video': f'local/{seg}', 'sourceSize': plano['sourceSize'], 'brand': brand,
                     'fonts': {k: f'local/fonts/{fontes[k]}' if k in fontes else '' for k in ('serif', 'sans', 'label')}}
            (pasta / 'render' / f'props-{cena["id"]}.json').write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding='utf-8')
        else:
            ctx = {'sourceSize': plano['sourceSize'], 'fonts': {k: f'public/fonts/{fontes[k]}' if k in fontes else '' for k in ('serif', 'sans', 'label')}}
            html = (ROOT / f'motion/hyperframes/templates/short-editorial-9x16/{comp}.html').read_text(encoding='utf-8')
            html = (html.replace('__SCENE__', json.dumps(cena, ensure_ascii=False)).replace('__CTX__', json.dumps(ctx))
                    .replace('__DUR__', f'{cena["frames"] / FPS:.4f}').replace('__VIDEO__', f'public/{seg}'))
            (hf / f'cena-{cena["id"]}.html.gerado').write_text(html, encoding='utf-8')
        estado['scenes'].append({'id': cena['id'], 'engine': engine, 'composition': comp})
    if Path(plano_path).resolve() != (pasta / 'plano.json').resolve():
        shutil.copy2(plano_path, pasta / 'plano.json')
    (pasta / 'estado.json').write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Preparado: {len(plano["scenes"])} cenas em {pasta}')


def quadros(arquivo):
    probe = Path(ffmpeg()).with_name('ffprobe' + Path(ffmpeg()).suffix)
    out = run([str(probe), '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', str(arquivo)])
    return int(out.strip().strip(','))


def renderizar(plano, pasta):
    rem, hf = pasta / 'remotion', pasta / 'hyperframes'
    npx = shutil.which('npx') or 'npx'
    for cena in plano['scenes']:
        engine, comp = KINDS[cena['kind']]
        saida = pasta / 'render' / f'cena-{cena["id"]}.mp4'
        if engine == 'remotion':
            run([npx, 'remotion', 'render', 'src/index.ts', comp, str(saida), f'--props={pasta / "render" / ("props-" + cena["id"] + ".json")}',
                 '--codec=h264', '--crf=16', '--log=error'], cwd=rem)
        else:
            # O HyperFrames aceita uma unica raiz: a cena da vez vira index.html.
            shutil.copy2(hf / f'cena-{cena["id"]}.html.gerado', hf / 'index.html')
            run([npx, 'hyperframes', 'lint', '.'], cwd=hf, env=NO_TELEMETRY)
            run([npx, 'hyperframes', 'render', '.', '-o', str(saida), '-q', 'delivery', '--quiet'], cwd=hf, env=NO_TELEMETRY)
        n = quadros(saida)
        esperado = cena['frames'] + cena.get('tailFrames', 0)
        if n < esperado:
            raise SystemExit(f'cena {cena["id"]}: {n} quadros, esperado {esperado}')
        print(f'cena {cena["id"]} ({engine}): {n} quadros')


def _rpc():
    import importlib.util
    spec = importlib.util.spec_from_file_location('concat_rpc', ROOT / 'scripts/concat_rpc.py')
    rpc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rpc)
    settings = json.loads(rpc.settings_path().read_text(encoding='utf-8-sig'))

    def call(method, params):
        r = rpc.invoke(settings, method, params, timeout=1800, wait=method == 'export.run')
        return r.get('result', r.get('params'))
    return call


def montar(plano, pasta, local, nome):
    """Cenas na faixa T2 com transicoes do Concat; voz original na T1 (oculta, com audio)."""
    call = _rpc()
    estado = json.loads((pasta / 'estado.json').read_text(encoding='utf-8'))
    call('project.create', {'location': str(local), 'name': nome, 'video': {'width': 1080, 'height': 1920, 'rateNum': FPS, 'rateDen': 1}})
    path = str(Path(local) / nome)
    edit = lambda cmd: call('edit.apply', {'path': path, 'command': cmd})
    clip = lambda doc, cid: next(c for c in next(t for t in doc['project']['timelines'] if t['id'] == doc['project']['activeTimelineId'])['clips'] if c['id'] == cid)
    voz = call('media.import', {'path': path, 'file': str(Path(estado['source']).resolve())})['createdId']
    t0, cenas = 0, plano['scenes']
    # Da primeira para a ultima: um clipe novo so poderia invadir o seguinte, que ainda nao existe,
    # e cada um e aparado antes do proximo entrar (o Concat empurra para o fim o que sobrepoe).
    inicios = []
    for c in cenas:
        inicios.append(t0); t0 += c['frames']
    for c, ini in zip(cenas, inicios):
        mid = call('media.import', {'path': path, 'file': str(pasta / 'render' / f'cena-{c["id"]}.mp4')})['createdId']
        r = edit({'op': 'addClip', 'mediaId': mid, 'trackId': 'T2', 'start': ini / FPS}); cid = r['createdId']
        alvo = (c['frames'] + c.get('tailFrames', 0)) / FPS
        if abs(clip(r, cid)['duration'] - alvo) > 1e-6:
            edit({'op': 'trimClip', 'clipId': cid, 'edge': 'end', 'delta': alvo - clip(r, cid)['duration']})
        if c.get('transition'):
            edit({'op': 'updateClip', 'clipId': cid, 'patch': {'transitionIn': c['transition']}})
        if c['kind'] == 'contraste' and c.get('splitTransition'):
            r = edit({'op': 'splitClips', 'clipIds': [cid], 'time': (ini + round(c['darkAt'] * FPS)) / FPS})
            if r.get('createdId'):
                edit({'op': 'updateClip', 'clipId': r['createdId'], 'patch': {'transitionIn': c['splitTransition']}})
        r = edit({'op': 'addClip', 'mediaId': voz, 'trackId': 'T1', 'start': ini / FPS}); v = r['createdId']
        edit({'op': 'trimClip', 'clipId': v, 'edge': 'start', 'delta': c['sourceStartFrame'] / FPS})
        edit({'op': 'moveClips', 'moves': [{'clipId': v, 'start': ini / FPS, 'trackId': 'T1'}]})
        r = edit({'op': 'updateClip', 'clipId': v, 'patch': {'fadeIn': .03, 'fadeOut': .05}})
        edit({'op': 'trimClip', 'clipId': v, 'edge': 'end', 'delta': c['frames'] / FPS - clip(r, v)['duration']})
    edit({'op': 'setTrackFlag', 'trackId': 'T1', 'flag': 'visible', 'value': False})
    call('project.save', {'path': path})
    doc = call('project.document', {'path': path})
    (pasta / 'concat/documento.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    tl = next(t for t in doc['timelines'] if t['id'] == doc['activeTimelineId'])
    erros = []
    for c, ini in zip(cenas, inicios):
        clips = [x for x in tl['clips'] if abs(x['start'] * FPS - ini) < .01]
        if {x['trackId'] for x in clips} != {'T1', 'T2'}:
            erros.append(c['id'])
    if erros:
        raise SystemExit(f'Clipes fora do lugar nas cenas {erros}; confira {pasta / "concat/documento.json"}')
    (pasta / 'concat/projeto.txt').write_text(path, encoding='utf-8')
    print(f'Montado no Concat: {path} ({t0 + cenas[-1].get("tailFrames", 0)} quadros)')


def amostra(pasta, saida):
    """Exporta a amostra para revisao humana e copia para a pasta escolhida pelo usuario."""
    call = _rpc()
    path = (pasta / 'concat/projeto.txt').read_text(encoding='utf-8')
    nome = Path(path).name.replace(' ', '-') + '-AMOSTRA.mp4'
    tmp = str(Path(path) / nome)          # a API do Concat so grava dentro da pasta do usuario
    call('export.run', {'path': path, 'output': tmp})
    saida.mkdir(parents=True, exist_ok=True)
    shutil.copy2(tmp, saida / nome)
    print(f'Amostra para revisao: {saida / nome}')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('acao', choices=['validar', 'preparar', 'renderizar', 'montar', 'amostra'])
    ap.add_argument('plano', type=Path)
    ap.add_argument('--pasta', type=Path, help='Pasta de trabalho da edicao (fora do Git)')
    ap.add_argument('--concat-dir', type=Path, default=Path.home() / 'Videos/Concat', help='Onde criar o projeto Concat (dentro da pasta do usuario)')
    ap.add_argument('--nome', help='Nome do projeto Concat')
    ap.add_argument('--saida', type=Path, help='Pasta onde a amostra sera copiada')
    a = ap.parse_args(argv)
    try:
        plano = ler_plano(a.plano)
    except (PlanoInvalido, OSError, json.JSONDecodeError) as e:
        raise SystemExit(f'Plano invalido: {e}')
    if a.acao == 'validar':
        print(f'Plano valido: {len(plano["scenes"])} cenas, {sum(c["frames"] for c in plano["scenes"]) / FPS:.2f} s de fala')
        return
    if not a.pasta:
        ap.error('--pasta e obrigatoria')
    if a.acao == 'preparar':
        preparar(plano, a.pasta.resolve(), a.plano)
    else:
        plano = ler_plano(a.pasta / 'plano.json') if (a.pasta / 'plano.json').exists() else plano
        if a.acao == 'renderizar':
            renderizar(json.loads((a.pasta / 'plano.json').read_text(encoding='utf-8')), a.pasta.resolve())
        elif a.acao == 'montar':
            montar(plano, a.pasta.resolve(), a.concat_dir, a.nome or plano.get('name', 'short-editorial'))
        else:
            if not a.saida:
                ap.error('--saida e obrigatoria para a amostra')
            amostra(a.pasta.resolve(), a.saida)


if __name__ == '__main__':
    main()
