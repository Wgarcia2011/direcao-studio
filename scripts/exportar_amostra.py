"""Exporta somente amostra da montagem registrada, com documento conferido."""
import argparse
import math
from pathlib import Path

import concat_rpc as rpc
import manifesto_analise as ma


def documentos_equivalentes(a, b):
    """Tolera apenas ruído de roundtrip f64, sem ignorar chaves, textos ou ordem."""
    if type(a) in (int, float) and type(b) in (int, float):
        return math.isfinite(a) and math.isfinite(b) and math.isclose(a, b, abs_tol=1e-9, rel_tol=0)
    if type(a) is not type(b):
        return False
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(documentos_equivalentes(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return len(a) == len(b) and all(documentos_equivalentes(x, y) for x, y in zip(a, b))
    return a == b


def exportar(evidence, settings, filename='amostra.mp4'):
    evidence = Path(evidence)
    result = ma.ler(evidence / 'resultado.json')
    if result['status'] != 'assembled_for_review' or result['review']['status'] != 'pending':
        raise ValueError('Montagem não está disponível para amostra')
    if Path(filename).name != filename or not filename.lower().endswith('.mp4'):
        raise ValueError('Use nome MP4 simples')
    project = Path(result['project'])
    output = project / filename
    if output.exists() or (evidence / 'amostra-pending.json').exists():
        raise ValueError('Amostra já existe ou operação anterior incerta; conferir antes de repetir')
    rpc.invoke(settings, 'project.open', {'path': str(project)})
    doc = rpc.invoke(settings, 'project.document', {'path': str(project)})['result']
    if not documentos_equivalentes(doc, ma.ler(evidence / 'documento.json')):
        raise ValueError('Documento mudou; preparar nova revisão')
    ma.salvar(evidence / 'amostra-pending.json', {'project': str(project), 'output': str(output),
              'document_sha256': ma.hash_json(doc), 'intent': 'sample', 'review': 'pending'})
    response = rpc.invoke(settings, 'export.run', {'path': str(project), 'output': str(output)}, timeout=300, wait=True)
    if not output.is_file() or output.stat().st_size == 0:
        raise ValueError('Evento recebido, mas arquivo de amostra ausente/vazio')
    ma.salvar(evidence / 'amostra-done.json', {'event': response, 'output': str(output),
              'sha256': ma.hash_arquivo(output), 'review': 'pending'})
    rpc.invoke(settings, 'project.close', {'path': str(project), 'save': True})
    return output


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('evidencias', type=Path)
    p.add_argument('--settings', type=Path)
    a = p.parse_args()
    try:
        print(exportar(a.evidencias, ma.ler(a.settings or rpc.settings_path())))
    except (OSError, ValueError, KeyError, rpc.RpcError):
        p.exit(1, 'Amostra interrompida; confira diário, projeto e jobs antes de repetir.\n')


if __name__ == '__main__':
    main()
