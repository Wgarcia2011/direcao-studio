"""Métricas de validação em fixtures conhecidas; nunca aprova exportação."""
import argparse
import itertools
from pathlib import Path

import manifesto_analise as ma


def medir_diarizacao(reference, result, step=.02):
    """Confusão nos trechos centrais anotados; não é DER padronizado em corpus real."""
    truth = reference['turns']
    predicted = result['turns']
    actual = sorted({t['speaker'] for t in truth})
    labels = sorted({t['speaker'] for t in predicted})
    if len(labels) > 6 or len(actual) > 6:
        raise ValueError('Fixture pequena esperada')
    points = []
    for t in truth:
        at = t['start'] + .3
        while at < t['end'] - .3:
            matches = [p['speaker'] for p in predicted if p['start'] <= at < p['end']]
            points.append((t['speaker'], matches[0] if len(set(matches)) == 1 else None))
            at += step
    if not points:
        raise ValueError('Referência vazia')
    best = 0
    for perm in itertools.permutations(actual, min(len(labels), len(actual))):
        mapping = dict(zip(labels, perm))
        best = max(best, sum(mapping.get(p) == t for t, p in points))
    coverage = sum(p is not None for _, p in points) / len(points)
    confusion = sum(p is not None for _, p in points) - best
    voiced = sum(p is not None for _, p in points)
    return {'predicted_speakers': len(labels), 'expected_speakers': len(actual),
            'coverage_on_reference': coverage, 'speaker_accuracy_on_reference': best / len(points),
            'speaker_confusion_on_covered': confusion / max(voiced, 1),
            'passed': len(labels) == len(actual) and coverage >= .8 and best / len(points) >= .8,
            'metric': '20ms samples; 300ms edge collar; synthetic utterance intervals include pauses; not corpus DER'}


def medir_semantica(expected, result):
    values = {a['candidate_id']: a for a in result['annotations']}
    checks = []
    for cid, independent in expected.items():
        found = values.get(cid)
        checks.append({'candidate_id': cid, 'expected_independent': independent,
                       'actual_independent': found.get('context_independent') if found else None,
                       'passed': bool(found and found['context_independent'] is independent)})
    return {'checks': checks, 'passed': bool(checks) and all(c['passed'] for c in checks),
            'limitation': 'fixture-specific checks; not evidence of general editorial accuracy'}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('tipo', choices=['diarizacao', 'semantica'])
    p.add_argument('--referencia', type=Path, required=True)
    p.add_argument('--resultado', type=Path, required=True)
    p.add_argument('--saida', type=Path, required=True)
    a = p.parse_args()
    r = (medir_diarizacao if a.tipo == 'diarizacao' else medir_semantica)(ma.ler(a.referencia), ma.ler(a.resultado))
    ma.salvar(a.saida, r)
    print(r)
    raise SystemExit(0 if r['passed'] else 1)
