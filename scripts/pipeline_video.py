"""Análise local retomável: probe, transcrição, cenas/silêncios, tópicos e manifesto.

Não monta nem exporta automaticamente. Modelos devem existir localmente.
"""
import argparse
from contextlib import contextmanager
import importlib.metadata
import json
import math
import os
from pathlib import Path
import re
import subprocess

import manifesto_analise as ma
import pontuar_cortes as pc


def executar(args):
    return subprocess.run(list(map(str, args)), capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)


def atomico(path, value):
    path = Path(path)
    tmp = path.with_suffix(path.suffix + '.tmp')
    with tmp.open('w', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


@contextmanager
def lock(folder):
    p = folder / 'running.lock'
    with p.open('x', encoding='utf-8') as f:
        f.write(str(os.getpid()))
    try:
        yield
    finally:
        p.unlink()


def probe(source):
    data = json.loads(executar(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', source]).stdout)
    duration = float(data['format']['duration'])
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError('Duração inválida')
    return {'duration': duration, 'streams': data['streams']}


def transcrever(source, model_path, language='pt', device='cpu'):
    from faster_whisper import WhisperModel
    model_path = Path(model_path).resolve(strict=True)
    model = WhisperModel(str(model_path), device=device,
                         compute_type='int8' if device == 'cpu' else 'float16', local_files_only=True)
    segments, info = model.transcribe(str(source), language=language, word_timestamps=True,
                                      vad_filter=True, condition_on_previous_text=False)
    words = []
    for segment in segments:
        for w in segment.words or []:
            if w.word.strip() and w.end > w.start:
                # Whisper pode produzir pequena sobreposição entre segmentos.
                start = float(max(w.start, words[-1]['e'] if words else 0))
                end = float(w.end)
                if end > start:
                    words.append({'w': w.word.strip(), 's': start, 'e': end})
    if not words:
        raise ValueError('Nenhuma palavra detectada; revisar áudio/modelo')
    return {'words': words, 'provenance': {'provider': 'faster-whisper',
            'version': importlib.metadata.version('faster-whisper'), 'model_path': str(model_path),
            'model_sha256': ma.hash_arquivo(model_path / 'model.bin'), 'language': info.language, 'device': device}}


def detectar(source, duration, has_audio=True):
    silence = []
    if has_audio:
        log = executar(['ffmpeg', '-nostdin', '-i', source, '-vn', '-af',
                        'silencedetect=noise=-35dB:d=0.4', '-f', 'null', '-']).stderr
        start = None
        for kind, value in re.findall(r'silence_(start|end):\s*([\d.]+)', log):
            if kind == 'start':
                start = float(value)
            elif start is not None:
                silence.append({'start': start, 'end': min(float(value), duration)})
                start = None
        if start is not None:
            silence.append({'start': start, 'end': duration})
    # Decodificação sequencial; downscale/fps limitam custo em vídeos longos.
    log = executar(['ffmpeg', '-nostdin', '-i', source, '-an', '-vf',
                    "fps=2,scale=160:-2,select='gt(scene,0.25)',showinfo", '-f', 'null', '-']).stderr
    scenes = [float(t) for t in re.findall(r'pts_time:\s*([\d.]+)', log)]
    return {'silences': silence, 'scene_changes': scenes,
            'method': 'FFmpeg silencedetect -35dB/0.4s; scene 0.25 at 2fps; não é VAD semântico'}


def topicos(words, window=90):
    """Agrupamento lexical em janelas; não substitui compreensão por LLM."""
    stop = set('a o as os de da do das dos e em um uma que para por com se na no eu você voce'.split())
    groups = []
    for w in words:
        if not groups or w['s'] - groups[-1]['start'] >= window:
            groups.append({'start': w['s'], 'end': w['e'], 'words': []})
        groups[-1]['words'].append(w)
        groups[-1]['end'] = w['e']
    for g in groups:
        counts = {}
        for token in re.findall(r'\w+', ' '.join(w['w'] for w in g.pop('words')).lower()):
            if len(token) > 3 and token not in stop:
                counts[token] = counts.get(token, 0) + 1
        g['keywords'] = sorted(counts, key=lambda t: (-counts[t], t))[:6]
    return {'method': 'janelas lexicais, sem inferência semântica', 'topics': groups}


def analisar(source, folder, transcript=None, model=None, minimum=15, maximum=60, language='pt', device='cpu'):
    source, folder = Path(source).resolve(strict=True), Path(folder).resolve()
    if minimum <= 0 or maximum < minimum or not all(math.isfinite(v) for v in (minimum, maximum)):
        raise ValueError('Limites inválidos')
    config = {'source': str(source), 'sha256': ma.hash_arquivo(source),
              'transcript_sha256': ma.hash_arquivo(transcript) if transcript else None,
              'model': str(Path(model).resolve()) if model else None, 'min': minimum, 'max': maximum,
              'language': language, 'device': device, 'pipeline_version': 1}
    if model:
        config['model_sha256'] = ma.hash_arquivo(Path(model) / 'model.bin')
    if folder.exists() and any(folder.iterdir()) and not (folder / 'job.json').exists():
        raise ValueError('Pasta não vazia sem checkpoint; use uma pasta nova')
    folder.mkdir(parents=True, exist_ok=True)
    with lock(folder):
        state_path = folder / 'job.json'
        state = ma.ler(state_path) if state_path.exists() else {'config': config, 'completed': {}}
        if state['config'] != config:
            raise ValueError('Configuração/fonte alterada; use nova pasta')
        def step(name, fn):
            path = folder / (name + '.json')
            if name in state['completed']:
                if not path.exists() or ma.hash_arquivo(path) != state['completed'][name]:
                    raise ValueError(f'Checkpoint alterado: {name}')
                return ma.ler(path)
            state.update(status='running', current=name)
            atomico(state_path, state)
            value = fn()
            atomico(path, value)
            state['completed'][name] = ma.hash_arquivo(path)
            atomico(state_path, state)
            return value
        try:
            metadata = step('probe', lambda: probe(source))
            def get_transcript():
                if transcript:
                    t = ma.ler(transcript)
                    pc.validar_palavras(t)
                    t.setdefault('provenance', {'provider': 'arquivo fornecido'})
                    return t
                if not model:
                    raise ValueError('Informe --transcricao ou --modelo local')
                return transcrever(source, model, language, device)
            tr = step('transcricao', get_transcript)
            detection = step('deteccao', lambda: detectar(source, metadata['duration'],
                             any(s['codec_type'] == 'audio' for s in metadata['streams'])))
            step('topicos', lambda: topicos(tr['words']))
            def rank():
                candidates = pc.pontuar(pc.validar_palavras(tr), minimum, maximum)
                # Restaurar limites exatos das palavras após arredondamento do ranker legado.
                for c in candidates:
                    first = min(tr['words'], key=lambda w: abs(w['s'] - c['start']))
                    last = min(tr['words'], key=lambda w: abs(w['e'] - c['end']))
                    c.update(start=first['s'], end=last['e'], duration=last['e'] - first['s'])
                    c['text'] = ' '.join(w['w'] for w in tr['words'] if c['start'] <= w['s'] and w['e'] <= c['end'])
                return {'version': 1, 'method': 'heurística lexical; não prevê viralização',
                        'weights': pc.PESOS, 'candidates': candidates}
            ranking = step('ranking', rank)
            def manifest():
                m = ma.criar(source, metadata['duration'], tr, ranking, tr['provenance']['provider'])
                m['transcript']['provenance'] = tr['provenance']
                m['analysis']['detections'] = detection
                return ma.validar(m)
            result = step('manifesto', manifest)
            state.update(status='ready_for_review', current=None)
            state.pop('error_type', None)
            atomico(state_path, state)
            return result
        except Exception as e:
            state.update(status='failed', error_type=type(e).__name__)
            atomico(state_path, state)
            raise


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('fonte', type=Path)
    p.add_argument('--pasta', type=Path, required=True)
    p.add_argument('--transcricao', type=Path)
    p.add_argument('--modelo', type=Path)
    p.add_argument('--idioma', default='pt')
    p.add_argument('--dispositivo', choices=['cpu', 'cuda'], default='cpu')
    p.add_argument('--min-seg', type=float, default=15)
    p.add_argument('--max-seg', type=float, default=60)
    a = p.parse_args()
    try:
        m = analisar(a.fonte, a.pasta, a.transcricao, a.modelo, a.min_seg, a.max_seg, a.idioma, a.dispositivo)
        print(f"{len(m['candidates'])} candidatos; manifesto em {a.pasta / 'manifesto.json'}; revisão pendente")
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as exc:
        p.exit(1, f'Análise interrompida: {type(exc).__name__}. Confira job.json e dependências.\n')


if __name__ == '__main__':
    main()
