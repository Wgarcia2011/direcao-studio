"""Contrato offline de análise e plano de montagem manual para Concat."""
import argparse
import hashlib
import json
import math
from pathlib import Path


def numero(valor, nome):
    if type(valor) not in (int, float) or not math.isfinite(valor):
        raise ValueError(f'{nome}: número finito obrigatório')
    return valor


def hash_json(valor):
    return hashlib.sha256(json.dumps(valor, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def hash_arquivo(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def validar(m):
    if not isinstance(m, dict) or m.get('schema') != 'direcao.analysis' or type(m.get('version')) is not int or m['version'] != 1:
        raise ValueError('Schema/versão de manifesto desconhecidos')
    source = m['source']
    if not isinstance(source['path'], str) or not Path(source['path']).is_absolute():
        raise ValueError('source.path deve ser caminho local absoluto')
    digest = source['sha256']
    if not isinstance(digest, str) or len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest):
        raise ValueError('SHA256 inválido')
    duration = numero(source['duration'], 'source.duration')
    if duration <= 0:
        raise ValueError('Duração deve ser positiva')
    tr = m['transcript']
    if tr['timebase'] != 'source_seconds' or not isinstance(tr['provenance'], dict) or not tr['provenance'].get('provider'):
        raise ValueError('Transcrição exige timebase e proveniência')
    words = tr['words']
    if not isinstance(words, list) or not words:
        raise ValueError('Transcrição vazia')
    previous = 0
    for w in words:
        s, e = numero(w['s'], 'word.s'), numero(w['e'], 'word.e')
        if not isinstance(w['w'], str) or not w['w'].strip() or not previous <= s < e <= duration:
            raise ValueError('Palavra fora da fonte, sobreposta ou fora de ordem')
        previous = e
    if tr['sha256'] != hash_json(words):
        raise ValueError('Hash da transcrição diverge')
    if not isinstance(m['analysis'], dict) or not m['analysis'].get('method'):
        raise ValueError('Proveniência da análise obrigatória')
    if not isinstance(m['candidates'], list):
        raise ValueError('candidates deve ser lista')
    ids = set()
    for c in m['candidates']:
        if not isinstance(c['id'], str) or not c['id'] or c['id'] in ids:
            raise ValueError('IDs de candidatos vazios ou duplicados')
        ids.add(c['id'])
        start, end = numero(c['start'], 'cut.start'), numero(c['end'], 'cut.end')
        if not 0 <= start < end <= duration:
            raise ValueError('Corte fora da fonte')
        if 'duration' in c and not math.isclose(numero(c['duration'], 'cut.duration'), end - start, abs_tol=1e-6):
            raise ValueError('Duração do candidato diverge dos limites')
        selected = [w for w in words if start <= w['s'] and w['e'] <= end]
        if not selected or selected[0]['s'] != start or selected[-1]['e'] != end:
            raise ValueError('Corte deve respeitar fronteiras das palavras')
        if c['text'] != ' '.join(w['w'] for w in selected):
            raise ValueError('Texto do corte diverge da transcrição')
        if not 0 <= numero(c['score'], 'score') <= 100 or not isinstance(c['rationale'], str) or not c['rationale'].strip():
            raise ValueError('Score/justificativa inválidos')
        if not isinstance(c['criteria'], dict) or not c['criteria']:
            raise ValueError('Critérios obrigatórios')
        for value in c['criteria'].values():
            if not 0 <= numero(value, 'criterion') <= 100:
                raise ValueError('Critério fora de 0–100')
    if m['review'] != {'status': 'pending', 'required_before_final_export': True}:
        raise ValueError('Manifesto de análise deve manter revisão pendente')
    return m


def criar(source, duration, transcript, ranking, provider):
    if ranking.get('version') != 1:
        raise ValueError('Versão do ranking desconhecida')
    m = {'schema': 'direcao.analysis', 'version': 1,
         'source': {'path': str(Path(source).resolve(strict=True)), 'sha256': hash_arquivo(source), 'duration': duration},
         'transcript': {'timebase': 'source_seconds', 'words': transcript['words'],
                        'sha256': hash_json(transcript['words']), 'provenance': {'provider': provider}},
         'analysis': {'method': ranking['method'], 'weights': ranking.get('weights', {})},
         'candidates': [dict(c, id=f'cut-{i+1:04d}') for i, c in enumerate(ranking['candidates'])],
         'review': {'status': 'pending', 'required_before_final_export': True}}
    return validar(m)


def plano_concat(m, ids):
    """Lista de montagem manual; não contém comandos RPC nem autorização de exportação."""
    validar(m)
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('Selecione IDs únicos em ordem de montagem')
    if hash_arquivo(m['source']['path']) != m['source']['sha256']:
        raise ValueError('Arquivo fonte alterado desde a análise')
    by_id = {c['id']: c for c in m['candidates']}
    clips, offset = [], 0
    for cid in ids:
        if cid not in by_id:
            raise ValueError(f'Candidato desconhecido: {cid}')
        c = by_id[cid]
        length = c['end'] - c['start']
        clips.append({'candidate_id': cid, 'source_in': c['start'], 'source_out': c['end'],
                      'timeline_start': offset, 'timeline_end': offset + length, 'text': c['text'],
                      'words': [dict(w, s=offset + w['s'] - c['start'], e=offset + w['e'] - c['start'])
                                for w in m['transcript']['words'] if c['start'] <= w['s'] and w['e'] <= c['end']]})
        offset += length
    return {'schema': 'direcao.concat-review-plan', 'version': 1, 'manifest_sha256': hash_json(m),
            'source': m['source'], 'clips': clips, 'duration': offset,
            'review': {'status': 'pending', 'required_before_final_export': True},
            'instructions': 'Montar em novo projeto Concat, conferir fonte/tempos e exportar amostra com --sample. '
                            'Aprovação humana da amostra atual é necessária antes de --reviewed.'}


def salvar(path, value):
    # Criação exclusiva: nunca sobrescreve fonte, transcrição ou resultado anterior.
    with Path(path).open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write('\n')


def ler(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    p = sub.add_parser('criar')
    for name in ('fonte', 'transcricao', 'ranking', 'saida'):
        p.add_argument('--' + name, type=Path, required=True)
    p.add_argument('--duracao', type=float, required=True, help='Duração da fonte em segundos, conferida pelo operador')
    p.add_argument('--provedor', required=True, help='Origem/modelo da transcrição; use sintetico para fixture')
    p = sub.add_parser('validar')
    p.add_argument('manifesto', type=Path)
    p = sub.add_parser('plano-concat')
    p.add_argument('manifesto', type=Path)
    p.add_argument('--cortes', nargs='+', required=True)
    p.add_argument('--saida', type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.action == 'criar':
            salvar(args.saida, criar(args.fonte, args.duracao, ler(args.transcricao), ler(args.ranking), args.provedor))
        elif args.action == 'validar':
            validar(ler(args.manifesto))
            print('Contrato válido; validação estrutural não aprova conteúdo ou exportação.')
        else:
            salvar(args.saida, plano_concat(ler(args.manifesto), args.cortes))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f'Manifesto recusado: {exc}\n')


if __name__ == '__main__':
    main()
