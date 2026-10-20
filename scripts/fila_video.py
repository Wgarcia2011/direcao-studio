"""Fila persistente local de análise; worker explícito, serial e sem serviço web."""
import argparse
from pathlib import Path
import uuid

import manifesto_analise as ma
import pipeline_video as pv


def adicionar(queue, source, output, transcript=None, model=None):
    queue = Path(queue)
    queue.mkdir(parents=True, exist_ok=True)
    job = {'version': 1, 'id': uuid.uuid4().hex, 'status': 'queued',
           'source': str(Path(source).resolve(strict=True)), 'source_sha256': ma.hash_arquivo(source),
           'output': str(Path(output).resolve()),
           'transcript': str(Path(transcript).resolve(strict=True)) if transcript else None,
           'model': str(Path(model).resolve(strict=True)) if model else None}
    if not transcript and not model:
        raise ValueError('Transcrição ou modelo local obrigatório')
    ma.salvar(queue / (job['id'] + '.json'), job)
    return job['id']


def processar(queue, resume_failed=False, analyze=pv.analisar):
    queue = Path(queue)
    with pv.lock(queue):
        for path in sorted(queue.glob('*.json')):
            job = ma.ler(path)
            eligible = {'queued', 'running', 'failed'} if resume_failed else {'queued', 'running'}
            if job.get('status') not in eligible:
                continue
            job['status'] = 'running'
            pv.atomico(path, job)
            try:
                if ma.hash_arquivo(job['source']) != job['source_sha256']:
                    raise ValueError('Fonte alterada na fila')
                analyze(job['source'], job['output'], transcript=job['transcript'], model=job['model'])
                job['status'] = 'ready_for_review'
                job.pop('error_type', None)
            except Exception as exc:
                job.update(status='failed', error_type=type(exc).__name__)
            pv.atomico(path, job)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('acao', choices=['adicionar', 'processar'])
    p.add_argument('--fila', type=Path, required=True)
    p.add_argument('--fonte', type=Path)
    p.add_argument('--pasta', type=Path)
    p.add_argument('--transcricao', type=Path)
    p.add_argument('--modelo', type=Path)
    p.add_argument('--retomar-falhas', action='store_true')
    a = p.parse_args()
    try:
        if a.acao == 'adicionar':
            if not a.fonte or not a.pasta:
                p.error('--fonte e --pasta obrigatórios')
            print(adicionar(a.fila, a.fonte, a.pasta, a.transcricao, a.modelo))
        else:
            processar(a.fila, a.retomar_falhas)
    except (OSError, ValueError, KeyError) as exc:
        p.exit(1, f'Fila interrompida: {type(exc).__name__}; confira jobs/lock local.\n')


if __name__ == '__main__':
    main()
