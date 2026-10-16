"""Biblioteca de templates de motion (vindos do editor web arquivado) no Remotion atual.

    python scripts/biblioteca_motion.py listar
    python scripts/biblioteca_motion.py assets --de 'PASTA/public'      # ilustracoes e fontes locais
    python scripts/biblioteca_motion.py preparar TEMPLATE.json [--sintetico]
    python scripts/biblioteca_motion.py renderizar TEMPLATE.json [--quadros 30,120] [--saida ARQ.mp4]
    python scripts/biblioteca_motion.py contraste TEMPLATE.json [--sintetico] [--completo] [--quadros ...]
    python scripts/biblioteca_motion.py aplicar PROPS.json --composicao ID --slug NOME [--sintetico] [--quadros ...]

`preparar` corta os trechos da fala (segundos do original), mapeia as palavras e
gera props.json em motion/remotion/public/projects/SLUG/ (fora do Git). Os tempos
das cenas sao escritos em segundos do original e convertidos para a saida; tambem
aceitam "sN" (inicio do trecho N) e "end". O original nunca e alterado.
O resultado e um MP4 com fala e motion, importado como clipe no Concat.
"""
import argparse, json, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REMOTION = ROOT / 'motion/remotion'
INDICE = REMOTION / 'templates/biblioteca/indice.json'
TIME_KEYS = {'at', 'from', 'to', 'until', 'smallAt', 'bigAt', 'moodAt', 'confettiAt', 'openAt', 'strike', 'markAt', 'shake'}
NEUTRAS = ('a ideia principal e estudar com metodo revisar com calma praticar todo dia '
           'organizar o tempo comparar resultados e seguir em frente com foco').split()


def ffmpeg():
    return shutil.which('ffmpeg') or str(next((REMOTION / 'node_modules/@remotion').glob('compositor-*/ffmpeg*')))


def run(cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def sintetico(cfg, base):
    """Fonte e transcricao neutras cobrindo os trechos do template (testes sem material pessoal)."""
    fim = max(e for _, e in cfg['segments']) + 2
    pasta = base / 'sintetico'; pasta.mkdir(parents=True, exist_ok=True)
    video = pasta / 'fonte.mp4'
    run([ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', f'testsrc2=size=1920x1080:rate=30:duration={fim}',
         '-f', 'lavfi', '-i', f'sine=frequency=330:duration={fim}', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(video)])
    words, t, i = [], 0.0, 0
    while t < fim:
        words.append({'w': NEUTRAS[i % len(NEUTRAS)], 's': round(t, 2), 'e': round(t + .3, 2)}); t += .36; i += 1
    tr = pasta / 'transcricao.json'
    tr.write_text(json.dumps({'words': words}, ensure_ascii=False), encoding='utf-8')
    return video, tr


def preparar(cfg_path, use_synthetic):
    cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
    base = cfg_path.parent
    if use_synthetic:
        src, tr = sintetico(cfg, base / 'qa' / cfg['slug'])
    else:
        src, tr = (base / cfg['source']).resolve(), base / cfg['transcript']
    words = json.loads(tr.read_text(encoding='utf-8'))['words']
    slug = cfg['slug']
    dest = REMOTION / 'public/projects' / slug
    qa = base / 'qa' / slug
    dest.mkdir(parents=True, exist_ok=True); qa.mkdir(parents=True, exist_ok=True)
    fix = cfg.get('fix', {})
    tail = float(cfg.get('tail', 0.9))
    segs, mapped, table, offset = [], [], [], 0.0
    for i, (start, end) in enumerate(cfg['segments']):
        d = round((end - start) * 30) / 30
        pad = tail if i == len(cfg['segments']) - 1 else 0.0
        clip = qa / f'clip-{i}.mov'
        run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(start), '-i', str(src), '-t', str(d),
             '-vf', f'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,tpad=stop_mode=clone:stop_duration={0.1 + pad},trim=duration={d + pad}',
             '-af', f'afade=t=in:st=0:d=0.025,afade=t=out:st={d - 0.025}:d=0.025,apad,atrim=duration={d + pad}',
             '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-c:a', 'pcm_s16le', '-ar', '48000', str(clip)])
        sel, seen = [], set()
        for w in words:
            if w['s'] >= start - 0.001 and w['e'] <= start + d + 0.06 and w['e'] > w['s'] and (w['w'], w['s']) not in seen:
                seen.add((w['w'], w['s'])); sel.append(w)
                mapped.append({'text': fix.get(f"{w['w']}@{w['s']}", fix.get(w['w'], w['w'])), 'startMs': round((offset + w['s'] - start) * 1000),
                               'endMs': round((offset + w['e'] - start) * 1000), 'timestampMs': round((offset + (w['s'] + w['e']) / 2 - start) * 1000),
                               'confidence': None, 'segment': i, 'sourceStart': w['s'], 'sourceEnd': w['e']})
        segs.append((start, start + d, offset))
        table.append({'outputStart': round(offset, 3), 'outputEnd': round(offset + d, 3), 'sourceStart': start,
                      'sourceEnd': round(start + d, 3), 'speech': ' '.join(fix.get(f"{w['w']}@{w['s']}", fix.get(w['w'], w['w'])) for w in sel)})
        offset += d + pad
    total = offset
    (qa / 'concat.txt').write_text('\n'.join(f"file 'clip-{i}.mov'" for i in range(len(segs))), encoding='utf-8')
    run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(qa / 'concat.txt'),
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', '30', '-frames:v', str(round(total * 30)), '-c:a', 'aac',
         '-af', f'atrim=duration={total},asetpts=PTS-STARTPTS', '-movflags', '+faststart', str(dest / 'cut.mp4')])

    def to_out(v):
        if isinstance(v, str):
            if v == 'end':
                return round(total, 3)
            if v.startswith('end+'):
                return round(total + float(v[4:]), 3)
            if v.startswith('s'):
                return round(segs[int(v[1:])][2], 3)
            raise ValueError(f'tempo invalido: {v}')
        for a, b, off in segs:
            if a - 0.06 <= v <= b + 0.06:
                return round(off + min(max(v, a), b) - a, 3)
        raise ValueError(f'{v}s nao esta dentro de nenhum trecho do corte')

    def resolve(node):
        if isinstance(node, list):
            return [resolve(x) for x in node]
        if isinstance(node, dict):
            return {k: ([to_out(x) for x in v] if k in TIME_KEYS and isinstance(v, list) else to_out(v) if k in TIME_KEYS and v is not None else resolve(v)) for k, v in node.items()}
        return node

    def check_assets(scenes):
        # PNG ausente: cai para o objeto desenhado em codigo (kind) ou some.
        for sc in scenes:
            objs = ([sc['object']] if sc.get('object') else []) + sc.get('objects', [])
            kept = []
            for o in objs:
                if o.get('src') and not (REMOTION / 'public' / o['src']).exists():
                    print(f"aviso: {o['src']} nao existe; usando {o.get('kind') or 'nada'}", file=sys.stderr)
                    o = {k: v for k, v in o.items() if k != 'src'}
                if o.get('src') or o.get('kind'):
                    kept.append(o)
            sc.pop('object', None)
            sc['objects'] = kept
        return scenes

    props = {'video': f'projects/{slug}/cut.mp4', 'words': mapped, 'durationInFrames': round(total * 30),
             'cuts': [round(s[2], 4) for s in segs[1:]], 'theme': cfg.get('theme', 'editorial'),
             'keywords': cfg.get('keywords', []), 'scenes': check_assets(resolve(cfg.get('scenes', [])))}
    for key in ('palette', 'enhancedMotion', 'selectiveMonochrome', 'largeCaptions', 'sketchPalette', 'captionTop', 'faceY', 'videoZoom', 'marginRocket', 'marginRocketScale', 'darkMode', 'music'):
        if key in cfg:
            props[key] = cfg[key]
    for key in ('fullScreenInserts', 'speakerShots', 'sketchBlocks', 'identity'):
        if key in cfg:
            props[key] = resolve(cfg[key])
    if 'punchTimes' in cfg:
        props['punchTimes'] = [to_out(t) for t in cfg['punchTimes']]
    if 'rocketTransitions' in cfg:
        props['rocketTransitions'] = [to_out(t) for t in cfg['rocketTransitions']]
    if 'emphasisMoments' in cfg:
        props['emphasisMoments'] = resolve(cfg['emphasisMoments'])
    if 'motionAccents' in cfg:
        accents = cfg['motionAccents']
        props['motionAccents'] = {'turns': [to_out(t) for t in accents.get('turns', [])], 'parallax': resolve(accents.get('parallax', []))}
    if 'tunnels' in cfg:
        props['tunnels'] = resolve(cfg['tunnels'])
        props['videoEnd'] = round(total, 3)
    for key in ('tunnelAssets', 'phrases'):
        if key in cfg:
            props[key] = cfg[key]
    if cfg.get('cutout') and (dest / 'falante-alpha.webm').exists():
        props['cutout'] = f'projects/{slug}/falante-alpha.webm'
    if 'outro' in cfg:
        outro = {**cfg['outro'], 'from': round(total, 3)}
        props['outro'] = {k: v for k, v in outro.items() if k != 'duration'}
        props['durationInFrames'] += round(float(cfg['outro'].get('duration', 3)) * 30)
    if 'brand' in cfg:
        props['brand'] = {**cfg['brand'], 'windows': [[to_out(a), to_out(b)] for a, b in cfg['brand'].get('windows', [])]}
    # A voz vem do proprio cut.mp4; trilhas/efeitos extras entram depois, no Concat.
    for name, data in [('props.json', props), ('words.json', mapped), ('selection.json', table)]:
        (dest / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'slug': slug, 'duration': round(total, 3), 'frames': props['durationInFrames'], 'trechos': len(table)}, ensure_ascii=False))
    return cfg


def renderizar(cfg_path, quadros, saida):
    cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
    props = REMOTION / 'public/projects' / cfg['slug'] / 'props.json'
    if not props.exists():
        sys.exit('rode preparar antes de renderizar')
    comp = cfg.get('composition', 'MotionTemplate')
    npx = shutil.which('npx') or 'npx'
    t0 = time.perf_counter()
    if quadros:
        out = cfg_path.parent / 'qa' / cfg['slug']
        for q in quadros:
            run([npx, 'remotion', 'still', 'src/index.ts', comp, str(out / f'quadro-{q}.png'), f'--frame={q}', f'--props={props}', '--log=error'], cwd=REMOTION)
        print(f'{len(quadros)} quadros em {out}')
    else:
        out = Path(saida or cfg_path.parent / f'{cfg["slug"]}.mp4').resolve()
        run([npx, 'remotion', 'render', 'src/index.ts', comp, str(out), f'--props={props}', '--codec=h264', '--crf=18', '--log=error'], cwd=REMOTION)
        print(f'render: {time.perf_counter() - t0:.0f}s -> {out}')


MIDIA = ('.mp4', '.mov', '.webm', '.wav', '.mp3', '.m4a', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ttf', '.json')


def aplicar(props_path, comp, slug, use_synthetic, quadros, saida):
    """Templates com motor proprio: props prontas. Arquivos locais citados nas props sao
    copiados para public/projects/SLUG e os caminhos reescritos; o resto precisa existir em public/."""
    props = json.loads(props_path.read_text(encoding='utf-8-sig'))
    dest = REMOTION / 'public/projects' / slug
    dest.mkdir(parents=True, exist_ok=True)
    dur = float(props.get('duration') or props.get('durationInFrames', 900) / 30)
    faltando = []

    def fake(ext):
        alvo = dest / f'sintetico{ext}'
        if not alvo.exists():
            if ext in ('.wav', '.mp3', '.m4a'):
                run([ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', f'sine=frequency=330:duration={dur + 1}', str(alvo)])
            else:
                run([ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', f'testsrc2=size=1920x1080:rate=30:duration={dur + 1}',
                     '-f', 'lavfi', '-i', f'sine=frequency=330:duration={dur + 1}', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(alvo.with_suffix('.mp4'))])
        return f'projects/{slug}/{alvo.with_suffix(".mp4" if ext not in (".wav", ".mp3", ".m4a") else ext).name}'

    def walk(node):
        if isinstance(node, list):
            return [walk(x) for x in node]
        if isinstance(node, dict):
            return {k: walk(v) for k, v in node.items()}
        if isinstance(node, str) and Path(node).suffix.lower() in MIDIA and not node.startswith(('http', 'data:')):
            ext = Path(node).suffix.lower()
            local = (props_path.parent / node)
            if (REMOTION / 'public' / node).exists():
                return node
            if local.is_file():
                shutil.copy2(local, dest / local.name)
                return f'projects/{slug}/{local.name}'
            if use_synthetic and ext in ('.mp4', '.mov', '.webm', '.wav', '.mp3', '.m4a'):
                return fake(ext)
            faltando.append(node)
        return node
    props = walk(props)
    if faltando:
        print('aviso: arquivos nao encontrados (o render pode falhar): ' + ', '.join(sorted(set(faltando))[:12]), file=sys.stderr)
    final = dest / 'props.json'
    final.write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding='utf-8')
    renderizar_props(final, comp, slug, quadros, saida)


def renderizar_props(props, comp, slug, quadros, saida):
    npx = shutil.which('npx') or 'npx'
    if quadros:
        out = REMOTION / 'templates/biblioteca/qa' / slug
        out.mkdir(parents=True, exist_ok=True)
        for q in quadros:
            run([npx, 'remotion', 'still', 'src/index.ts', comp, str(out / f'quadro-{q}.png'), f'--frame={q}', f'--props={props}', '--log=error'], cwd=REMOTION)
        print(f'{len(quadros)} quadros em {out}')
    else:
        out = Path(saida or REMOTION / 'templates/biblioteca/qa' / f'{slug}.mp4').resolve()
        run([npx, 'remotion', 'render', 'src/index.ts', comp, str(out), f'--props={props}', '--codec=h264', '--crf=18', '--log=error'], cwd=REMOTION)
        print(f'render -> {out}')


def contraste(tpl_path, use_synthetic, completo, quadros, saida):
    """Contraste Cinetico: alinha as linhas de cada cena com a transcricao e renderiza."""
    sys.path.insert(0, str(Path(__file__).parent))
    import contraste_cinetico as cc
    props, slug = cc.preparar(tpl_path, REMOTION, ffmpeg(), use_synthetic, completo)
    renderizar_props(props, 'MotionContrasteCinetico', slug, quadros, saida)


def assets(origem):
    """Copia ilustracoes e fontes locais para public/ (ignorado pelo Git)."""
    origem = Path(origem)
    for nome in ('motion-assets', 'fonts'):
        de = origem / nome
        if de.is_dir():
            shutil.copytree(de, REMOTION / 'public' / nome, dirs_exist_ok=True)
            print(f'{nome}: copiado de {de}')
    # Pastas de ilustracoes nomeadas por episodio ganham um nome generico.
    for antigo, novo in (('impacto/gaby-revisao', 'impacto/revisao'), ('gaby14-pin129', 'percurso'), ('kinetico-gaby21', 'kinetico-fala')):
        if (REMOTION / 'public/motion-assets' / antigo).is_dir():
            shutil.copytree(REMOTION / 'public/motion-assets' / antigo, REMOTION / 'public/motion-assets' / novo, dirs_exist_ok=True)


def listar():
    for t in json.loads(INDICE.read_text(encoding='utf-8'))['templates']:
        print(f"{t['nome']:28s} {t['formato']:6s} {t['composicao']:28s} {t['resumo']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('acao', choices=['listar', 'assets', 'preparar', 'renderizar', 'contraste', 'aplicar'])
    ap.add_argument('template', nargs='?', type=Path)
    ap.add_argument('--de', help='Pasta public com motion-assets/ e fonts/ (assets)')
    ap.add_argument('--sintetico', action='store_true', help='Usa fonte e transcricao neutras (testes)')
    ap.add_argument('--quadros', help='Renderiza so estes quadros como PNG, ex.: 30,120')
    ap.add_argument('--saida', help='MP4 de saida')
    ap.add_argument('--composicao', help='Composicao Remotion (aplicar)')
    ap.add_argument('--slug', help='Nome da pasta em public/projects (aplicar)')
    ap.add_argument('--completo', action='store_true', help='Contraste: video inteiro em vez da previa')
    a = ap.parse_args()
    if a.acao == 'listar':
        return listar()
    if a.acao == 'assets':
        return assets(a.de or ap.error('--de e obrigatorio'))
    if not a.template:
        ap.error('informe o TEMPLATE.json')
    quadros = [int(q) for q in a.quadros.split(',')] if a.quadros else None
    if a.acao == 'preparar':
        preparar(a.template.resolve(), a.sintetico)
    elif a.acao == 'contraste':
        contraste(a.template.resolve(), a.sintetico, a.completo, quadros, a.saida)
    elif a.acao == 'aplicar':
        if not (a.composicao and a.slug):
            ap.error('aplicar exige --composicao e --slug')
        aplicar(a.template.resolve(), a.composicao, a.slug, a.sintetico, quadros, a.saida)
    else:
        renderizar(a.template.resolve(), [int(q) for q in a.quadros.split(',')] if a.quadros else None, a.saida)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
