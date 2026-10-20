import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import manifesto_analise as ma
import pontuar_cortes as pc


class ManifestoTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.source = self.base / 'fixture.txt'
        self.source.write_text('Fonte sintética; não é vídeo.', encoding='utf-8')
        self.transcript = {'words': [
            {'w': 'Como', 's': 2, 'e': 3}, {'w': 'funciona?', 's': 3, 'e': 5},
            {'w': 'Exemplo', 's': 8, 'e': 9}, {'w': 'completo.', 's': 9, 'e': 12}]}
        self.ranking = {'version': 1, 'method': 'fixture', 'weights': pc.PESOS,
                        'candidates': pc.pontuar(self.transcript['words'], 2, 5)}
        self.m = ma.criar(self.source, 15, self.transcript, self.ranking, 'sintetico')

    def test_roundtrip_and_mapping_in_explicit_order(self):
        m = ma.validar(json.loads(json.dumps(self.m)))
        ids = [c['id'] for c in reversed(m['candidates'])]
        plan = ma.plano_concat(m, ids)
        self.assertEqual([c['candidate_id'] for c in plan['clips']], ids)
        self.assertEqual(plan['clips'][0]['timeline_start'], 0)
        self.assertEqual(plan['clips'][0]['words'][0]['s'], 0)
        self.assertEqual(plan['clips'][1]['timeline_start'], plan['clips'][0]['timeline_end'])
        self.assertEqual(plan['manifest_sha256'], ma.hash_json(m))
        self.assertTrue(plan['review']['required_before_final_export'])
        self.assertNotIn('export.run', json.dumps(plan))

    def test_reject_corruption_and_invalid_intervals(self):
        mutations = [lambda m: m.update(version=2),
                     lambda m: m['transcript']['words'][0].update(w='alterado'),
                     lambda m: m['candidates'][0].update(end=20),
                     lambda m: m['candidates'][0].update(start=2.5),
                     lambda m: m['candidates'][0].update(score=float('nan')),
                     lambda m: m['source'].update(duration=True),
                     lambda m: m['review'].update(status='approved'),
                     lambda m: m['candidates'].append(copy.deepcopy(m['candidates'][0]))]
        for mutate in mutations:
            m = copy.deepcopy(self.m)
            mutate(m)
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                ma.validar(m)

    def test_source_change_selection_and_no_overwrite(self):
        for ids in ([], ['missing'], ['cut-0001', 'cut-0001']):
            with self.assertRaises(ValueError):
                ma.plano_concat(self.m, ids)
        self.source.write_text('outra fonte', encoding='utf-8')
        with self.assertRaises(ValueError):
            ma.plano_concat(self.m, ['cut-0001'])
        with self.assertRaises(FileExistsError):
            ma.salvar(self.source, self.m)

    def test_cli_from_ranking_to_review_plan(self):
        tr, ranking, manifest, plan = [self.base / n for n in ('tr.json', 'ranking.json', 'manifest.json', 'plan.json')]
        ma.salvar(tr, self.transcript)
        def cli(script, *args):
            return subprocess.run([sys.executable, str(ROOT / 'scripts' / script), *map(str, args)],
                                  capture_output=True, text=True, check=True)
        cli('pontuar_cortes.py', tr, '--saida', ranking, '--min-seg', 2, '--max-seg', 5)
        cli('manifesto_analise.py', 'criar', '--fonte', self.source, '--duracao', 15,
            '--transcricao', tr, '--ranking', ranking, '--provedor', 'sintetico', '--saida', manifest)
        cli('manifesto_analise.py', 'validar', manifest)
        cli('manifesto_analise.py', 'plano-concat', manifest, '--cortes', 'cut-0001', '--saida', plan)
        self.assertEqual(ma.ler(plan)['review']['status'], 'pending')


if __name__ == '__main__':
    unittest.main()
