"""Monta candidatos em projeto NOVO do Concat; exportação exige revisão separada."""
import argparse
import json
import math
import os
from pathlib import Path
import re

import concat_rpc as rpc
import manifesto_analise as ma

PRESETS = {'horizontal': (1920, 1080), 'shorts': (1080, 1920),
           'reels': (1080, 1920), 'tiktok': (1080, 1920)}


def legendas(plan, max_words=5):
    for cut in plan['clips']:
        words = cut['words']
        for i in range(0, len(words), max_words):
            group = words[i:i + max_words]
            yield {'start': group[0]['s'], 'end': group[-1]['e'], 'text': ' '.join(w['w'] for w in group)}


def retirar_silencios(plan, manifest):
    """Remove só silêncio interior confirmado, entre palavras; mantém margem de 150ms."""
    import copy
    plan = copy.deepcopy(plan)
    intervals = manifest['analysis'].get('detections', {}).get('silences', [])
    for silence in intervals:
        start = ma.numero(silence['start'], 'silence.start')
        end = ma.numero(silence['end'], 'silence.end')
        if not 0 <= start < end <= manifest['source']['duration']:
            raise ValueError('Silêncio fora da fonte')
    output, offset = [], 0
    for cut in plan['clips']:
        words = [w for w in manifest['transcript']['words'] if cut['source_in'] <= w['s'] and w['e'] <= cut['source_out']]
        boundaries = []
        for a, b in zip(words, words[1:]):
            for silence in intervals:
                start = max(a['e'] + .15, silence['start'])
                end = min(b['s'] - .15, silence['end'])
                if end - start >= .4:
                    boundaries.append((start, end))
                    break
        start = cut['source_in']
        for end, next_start in boundaries + [(cut['source_out'], cut['source_out'])]:
            segment_words = [w for w in words if start <= w['s'] and w['e'] <= end]
            if end <= start or not segment_words:
                raise ValueError('Remoção de silêncio gerou intervalo sem fala')
            length = end - start
            output.append({'candidate_id': cut['candidate_id'], 'source_in': start, 'source_out': end,
                           'timeline_start': offset, 'timeline_end': offset + length,
                           'text': ' '.join(w['w'] for w in segment_words),
                           'words': [dict(w, s=offset + w['s'] - start, e=offset + w['e'] - start) for w in segment_words]})
            offset += length
            start = next_start
    plan.update(clips=output, duration=offset, silence_policy='confirmed gaps only; 150ms margins; review required')
    return plan


def timeline(doc):
    return next(t for t in doc['timelines'] if t['id'] == doc['activeTimelineId'])


def perto(actual, expected):
    return type(actual) in (int, float) and math.isfinite(actual) and abs(actual - expected) <= 1e-6


def montar(manifesto, ids, location, name, evidence, call, preset=None, captions=False, framing=None, remove_silence=False):
    plan = ma.plano_concat(manifesto, ids)
    if remove_silence:
        plan = retirar_silencios(plan, manifesto)
    if preset is not None and preset not in PRESETS:
        raise ValueError('Preset desconhecido')
    frames = {}
    if framing is not None:
        if framing['manifest_sha256'] != ma.hash_json(manifesto) or not preset:
            raise ValueError('Enquadramento exige manifesto correspondente e preset')
        for suggestion in framing['suggestions']:
            center = suggestion['center_x']
            if center is not None and not 0 <= ma.numero(center, 'center_x') <= 1:
                raise ValueError('Centro inválido')
            if suggestion['candidate_id'] in frames:
                raise ValueError('Enquadramento duplicado')
            frames[suggestion['candidate_id']] = suggestion
    location, evidence = Path(location).resolve(), Path(evidence).resolve()
    if not re.fullmatch(r'[\w -]{1,80}', name) or name.endswith((' ', '.')):
        raise ValueError('Nome de projeto inválido')
    project = location / name
    if project.exists():
        raise ValueError('Use um projeto novo; destino já existe')
    if not project.is_relative_to(Path.home().resolve()):
        raise ValueError('Projeto deve ficar dentro da pasta do usuário')
    if evidence == project or evidence.is_relative_to(project):
        raise ValueError('Evidências devem ficar fora do novo projeto')
    # Reserva exclusiva antes de qualquer RPC. Não retoma nem repete mutações.
    evidence.mkdir(parents=True, exist_ok=False)
    ma.salvar(evidence / 'plano.json', plan)
    path = str(project)
    with (evidence / 'operacoes.jsonl').open('x', encoding='utf-8') as log:
        def record(value):
            log.write(json.dumps(value, ensure_ascii=False, allow_nan=False) + '\n')
            log.flush()
            os.fsync(log.fileno())

        def request(method, params):
            record({'state': 'pending', 'method': method, 'params': params})
            result = call(method, params)
            record({'state': 'returned', 'method': method})
            return result

        def document():
            return request('project.document', {'path': path})

        def edit(command):
            result = request('edit.apply', {'path': path, 'command': command})
            return result, document()

        try:
            version = request('version', {})
            if not isinstance(version.get('apiVersion'), str) or not isinstance(version.get('capabilities'), list):
                raise ValueError('Resposta version incompatível')
            ma.salvar(evidence / 'version.json', version)
            # Fonte reconferida após preflight e antes de criar o projeto.
            if ma.hash_arquivo(plan['source']['path']) != plan['source']['sha256']:
                raise ValueError('Fonte alterada durante preflight')
            create = {'location': str(location), 'name': name}
            if preset:
                width, height = PRESETS[preset]
                create['video'] = {'width': width, 'height': height, 'rateNum': 30, 'rateDen': 1}
            request('project.create', create)
            doc = document()
            tl = timeline(doc)
            if any(t['clips'] for t in doc['timelines']) or doc['media']:
                raise ValueError('Projeto novo não está vazio')
            track = next(t['id'] for t in tl['tracks'] if t['visible'] and not t['muted'])
            request('media.import', {'path': path, 'file': plan['source']['path']})
            doc = document()
            media = next(m for m in doc['media'] if Path(m['path']).resolve() == Path(plan['source']['path']).resolve())
            ma.numero(media['duration'], 'Duração detectada')
            if not perto(media['duration'], plan['source']['duration']):
                raise ValueError('Duração detectada diverge do manifesto')
            completed = []
            for cut in plan['clips']:
                result, doc = edit({'op': 'addClip', 'mediaId': media['id'], 'trackId': track,
                                    'start': cut['timeline_start']})
                cid = result['createdId']
                def clip():
                    return next(c for c in timeline(doc)['clips'] if c['id'] == cid)
                if cut['source_in']:
                    _, doc = edit({'op': 'trimClip', 'clipId': cid, 'edge': 'start', 'delta': cut['source_in']})
                # Aparar o fim antes de mover evita sobreposição com trechos anteriores.
                length = cut['source_out'] - cut['source_in']
                _, doc = edit({'op': 'trimClip', 'clipId': cid, 'edge': 'end', 'delta': length - clip()['duration']})
                _, doc = edit({'op': 'moveClips', 'moves': [{'clipId': cid, 'trackId': track, 'start': cut['timeline_start']}]})
                completed.append((cid, cut))
                frame = frames.get(cut['candidate_id'])
                if frame and frame['center_x'] is not None and not frame['requires_manual_framing']:
                    width, height = PRESETS[preset]
                    keep = min(1.0, media['height'] * width / height / media['width'])
                    left = min(max(frame['center_x'] - keep / 2, 0), 1 - keep)
                    crop = {'left': left, 'right': 1 - keep - left, 'top': 0, 'bottom': 0}
                    _, doc = edit({'op': 'updateClip', 'clipId': cid, 'patch': {'crop': crop}})
                    current = next(c for c in timeline(doc)['clips'] if c['id'] == cid)
                    if any(not perto(current['crop'][k], v) for k, v in crop.items()):
                        raise ValueError('Recorte diverge do plano')
                actual = timeline(doc)['clips']
                if len(actual) != len(completed):
                    raise ValueError('Quantidade inesperada de clipes')
                for expected_id, expected in completed:
                    c = next(c for c in actual if c['id'] == expected_id)
                    if (c['mediaId'] != media['id'] or c['trackId'] != track
                            or not perto(c['sourceStart'], expected['source_in'])
                            or not perto(c['start'], expected['timeline_start'])
                            or not perto(c['duration'], expected['source_out'] - expected['source_in'])):
                        raise ValueError('Documento diverge do plano; confira antes de repetir')
            if captions:
                for caption in legendas(plan):
                    result, doc = edit({'op': 'addTextClip', 'start': caption['start'],
                                       'duration': caption['end'] - caption['start'], 'above': True,
                                       'offsetY': 0.3, 'style': {'content': caption['text'], 'fontSize': 0.045,
                                                               'maxWidth': 0.9, 'strokeWidth': 0.002}})
                    c = next(c for c in timeline(doc)['clips'] if c['id'] == result['createdId'])
                    if not perto(c['start'], caption['start']) or not perto(c['duration'], caption['end'] - caption['start']):
                        raise ValueError('Legenda diverge do plano')
            request('project.save', {'path': path})
            doc = document()
            ma.salvar(evidence / 'documento.json', doc)
            request('project.close', {'path': path, 'save': True})
            ma.salvar(evidence / 'resultado.json', {'project': path, 'manifest_sha256': plan['manifest_sha256'],
                       'review': plan['review'], 'status': 'assembled_for_review'})
            return path
        except Exception:
            # Não fechar/salvar/repetir em falha: operação anterior pode ainda estar em curso.
            record({'state': 'stopped', 'instruction': 'Conferir projeto e operação pending antes de repetir; sem rollback automático.'})
            raise


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('manifesto', type=Path)
    p.add_argument('--cortes', nargs='+', required=True)
    p.add_argument('--local', type=Path, default=Path.home() / 'Videos/Concat')
    p.add_argument('--nome', required=True)
    p.add_argument('--evidencias', type=Path, required=True, help='Nova pasta de evidências')
    p.add_argument('--settings', type=Path)
    p.add_argument('--preset', choices=sorted(PRESETS))
    p.add_argument('--legendas', action='store_true', help='Adicionar legendas simples para revisão no Concat')
    p.add_argument('--enquadramentos', type=Path, help='Sugestões locais de rostos; aplicar só centros sem ambiguidade')
    p.add_argument('--remover-silencios', action='store_true', help='Remover apenas silêncios confirmados entre palavras')
    args = p.parse_args(argv)
    try:
        settings = ma.ler(args.settings or rpc.settings_path())
        def call(method, params):
            return rpc.invoke(settings, method, params)['result']
        path = montar(ma.ler(args.manifesto), args.cortes, args.local, args.nome, args.evidencias, call,
                      args.preset, args.legendas, ma.ler(args.enquadramentos) if args.enquadramentos else None,
                      args.remover_silencios)
        print(f'Montagem salva e fechada: {path}. Revisão da amostra pendente; leia docs/CLI.md.')
        return 0
    except (OSError, ValueError, KeyError, TypeError, StopIteration, rpc.RpcError):
        print('Montagem interrompida. Confira evidências/projeto antes de repetir. Nenhuma exportação foi solicitada.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
