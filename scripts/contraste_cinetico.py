"""Contraste Cinetico (MotionContrasteCinetico): alinha as linhas de cada cena com a
transcricao por palavra e gera as props em public/projects/SLUG/ (fora do Git).

Sintaxe das linhas: palavras separadas por espaco; *palavra* vira destaque;
palavra@12.4 fixa o tempo (segundos do corte). Sem @, o tempo vem da transcricao
por palavra, procurada em ordem a partir de "after" (ou do inicio da cena).
Usado por: python scripts/biblioteca_motion.py contraste TEMPLATE.json
"""
import json, os, re, shutil, subprocess, sys, unicodedata
from pathlib import Path


def norm(text):
    text = unicodedata.normalize('NFD', text.lower())
    return re.sub(r'[^a-z0-9º]', '', ''.join(c for c in text if unicodedata.category(c) != 'Mn'))


def parse_tokens(text):
    out = []
    for raw in text.split():
        at = None
        if '@' in raw:
            raw, at = raw.rsplit('@', 1)
            at = float(at)
        key = raw.startswith('*') and raw.endswith('*') and len(raw) > 2
        out.append({'w': raw.strip('*'), 'key': key, 'at': at})
    return out


def align_line(line, words, start, corrections):
    tokens, cursor, prev = [], 0, start
    while cursor < len(words) and words[cursor]['s'] < start - 0.05:
        cursor += 1
    for tok in parse_tokens(line['text']):
        s = tok['at']
        if s is None:
            target = norm(tok['w'])
            for i in range(cursor, min(cursor + 8, len(words))):
                spoken = norm(corrections.get(words[i]['w'].strip('.,?!'), words[i]['w']))
                if spoken == target or norm(words[i]['w']) == target:
                    s, cursor = words[i]['s'], i + 1
                    break
        if s is None:
            s = prev + 0.12
            print(f'  aviso: "{tok["w"]}" sem correspondência; tempo estimado {s:.2f}s', file=sys.stderr)
        s = max(s, start)
        prev = s
        item = {'w': tok['w'], 's': round(s, 3)}
        if tok['key']:
            item['key'] = True
        tokens.append(item)
    out = {'tokens': tokens}
    for k in ('align', 'dx', 'size', 'until'):
        if k in line:
            out[k] = line[k]
    return out


def align_lines(lines, words, start, corrections):
    out, cursor = [], start
    for line in lines:
        aligned = align_line(line, words, line.get('after', cursor), corrections)
        cursor = aligned['tokens'][-1]['s'] + 0.01
        out.append(aligned)
    return out


def build_captions(tpl, words, scenes, duration):
    corrections, keys = tpl.get('corrections', {}), {norm(k) for k in tpl.get('captionKeys', [])}
    hidden = tpl.get('hideCaptions', [])
    gaps, cursor = [], 0.0
    for sc in sorted(scenes, key=lambda s: s['from']):
        if sc['from'] > cursor:
            gaps.append((cursor, sc['from']))
        cursor = max(cursor, sc['to'])
    if cursor < duration:
        gaps.append((cursor, duration))
    captions = []
    for a, b in gaps:
        sel = [w for w in words if a <= w['s'] < b - 0.05 and not any(h0 <= w['s'] < h1 for h0, h1 in hidden)]
        groups, cur = [], []
        for w in sel:
            text = corrections.get(w['w'].strip('.,?!'), w['w'])
            chars = sum(len(x['w']) + 1 for x in cur) + len(text)
            if cur and (w['s'] - cur[-1]['e'] > 0.35 or len(cur) >= 3 or chars > 17 or cur[-1]['raw'][-1:] in '.?!'):
                groups.append(cur)
                cur = []
            cur.append({'w': text.strip('.,!'), 's': w['s'], 'e': w['e'], 'raw': w['w']})
        if cur:
            groups.append(cur)
        for i, g in enumerate(groups):
            s = max(a, g[0]['s'] - 0.04)
            e = min(b, groups[i + 1][0]['s'] - 0.02 if i + 1 < len(groups) else g[-1]['e'] + 0.45)
            toks = []
            for x in g:
                item = {'w': x['w'], 's': round(max(x['s'], s), 3)}
                if norm(x['w']) in keys:
                    item['key'] = True
                toks.append(item)
            captions.append({'s': round(s, 3), 'e': round(e, 3), 'tokens': toks})
    return captions



def _sintetico(tpl, dest, ffmpeg):
    """Fonte neutra e transcricao montada com as proprias linhas das cenas (testes)."""
    fim = max(s['to'] for s in tpl['scenes']) + 2
    video = dest / 'fonte-sintetica.mp4'
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-f', 'lavfi', '-i', f'testsrc2=size=1920x1080:rate=30:duration={fim}',
                    '-f', 'lavfi', '-i', f'sine=frequency=330:duration={fim}', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(video)], check=True)
    words = []
    for sc in tpl['scenes']:
        toks = [t['w'] for line in sc.get('lines', []) for t in parse_tokens(line['text'])]
        step = (sc['to'] - sc['from']) / max(1, len(toks) + 1)
        words += [{'w': w, 's': round(sc['from'] + step * (i + .5), 3), 'e': round(sc['from'] + step * (i + 1.2), 3)} for i, w in enumerate(toks)]
    return video, sorted(words, key=lambda w: w['s'])


def preparar(tpl_path, remotion, ffmpeg='ffmpeg', sintetico=False, completo=False):
    tpl_path = Path(tpl_path).resolve()
    base = tpl_path.parent
    tpl = json.loads(tpl_path.read_text(encoding='utf-8'))
    corrections = tpl.get('corrections', {})
    slug = re.sub(r'[^a-z0-9-]+', '-', Path(tpl.get('output', 'contraste.mp4')).stem.lower())
    dest = Path(remotion) / 'public/projects' / slug
    (dest / 'fonts').mkdir(parents=True, exist_ok=True)
    if sintetico:
        source, words = _sintetico(tpl, dest, ffmpeg)
    else:
        source = (base / tpl['source']).resolve()
        words = json.loads((base / tpl['words']).read_text(encoding='utf-8'))['words']
    probe = str(Path(ffmpeg).with_name('ffprobe' + Path(ffmpeg).suffix)) if os.sep in str(ffmpeg) or '/' in str(ffmpeg) else 'ffprobe'
    duration = float(subprocess.check_output([probe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(source)]).decode().strip())

    scenes = []
    for sc in tpl['scenes']:
        out = {k: v for k, v in sc.items() if k not in ('lines', 'objects', 'note')}
        out['lines'] = align_lines(sc.get('lines', []), words, sc['from'], corrections)
        objs = []
        for o in sc.get('objects', []):
            o = dict(o)
            o.pop('note', None)
            if 'head' in o:
                o['head'] = align_lines(o['head'], words, o['at'], corrections)
            objs.append(o)
        out['objects'] = objs
        scenes.append(out)
    # O original e so lido: copia (ou link) para a pasta do projeto, mais o audio em WAV.
    video = dest / 'video.mp4'
    if not video.exists() or sintetico:
        if video.exists():
            video.unlink()
        try:
            os.link(source, video)
        except OSError:
            shutil.copy2(source, video)
    audio = dest / 'audio.wav'
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(source), '-vn', '-ac', '2', '-ar', '48000', str(audio)], check=True)
    # Arial do sistema, so na pasta local (nao redistribuir).
    for name in ('arial.ttf', 'arialbd.ttf'):
        sysfont = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / name
        if sysfont.exists() and not (dest / 'fonts' / name).exists():
            shutil.copy2(sysfont, dest / 'fonts' / name)
    rel = f'projects/{slug}'
    for sc in scenes:
        for o in sc['objects']:
            if o['kind'] == 'pip':
                o['src'] = f'{rel}/video.mp4'
            elif o.get('src') and not (Path(remotion) / 'public' / o['src']).exists():
                print(f"aviso: {o['src']} nao existe em public/; rode biblioteca_motion.py assets", file=sys.stderr)
    video_end = duration
    duration = max(duration, max(s['to'] for s in scenes))
    preview = tpl.get('preview', {'from': 0, 'duration': 0})
    props = {
        'video': f'{rel}/video.mp4', 'audio': f'{rel}/audio.wav', 'duration': round(duration, 3), 'videoEnd': round(video_end, 3),
        'previewFrom': 0 if completo else preview['from'], 'previewDuration': 0 if completo else preview['duration'],
        'speakerX': tpl['speakerX'], 'palette': tpl['palette'], 'brand': tpl.get('brand', ''),
        'fonts': {'regular': f'{rel}/fonts/arial.ttf', 'bold': f'{rel}/fonts/arialbd.ttf'},
        'scenes': scenes, 'captions': build_captions(tpl, words, scenes, duration),
        'captionY': tpl.get('captionY', 1430), 'punches': tpl.get('punches', []),
    }
    (dest / 'props.json').write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding='utf-8')
    motion = sum(s['to'] - s['from'] for s in scenes)
    print(json.dumps({'slug': slug, 'duration': duration, 'motionShare': round(motion / duration, 3), 'scenes': len(scenes), 'captions': len(props['captions'])}, ensure_ascii=False))
    return dest / 'props.json', slug
