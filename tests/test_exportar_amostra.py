import importlib
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import exportar_amostra as ea
import manifesto_analise as ma


class SampleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / 'project'
        self.project.mkdir()
        ma.salvar(self.root / 'resultado.json', {'status': 'assembled_for_review', 'project': str(self.project),
                                               'review': {'status': 'pending'}})
        ma.salvar(self.root / 'documento.json', {'fixture': True})

    def test_export_waits_records_hash_and_never_approves(self):
        def call(settings, method, params, **kwargs):
            if method == 'project.document':
                return {'result': {'fixture': True}}
            if method == 'export.run':
                self.assertTrue(kwargs['wait'])
                Path(params['output']).write_bytes(b'synthetic export, not video')
                return {'method': 'export.done'}
            return {'result': {}}
        with patch.object(ea.rpc, 'invoke', side_effect=call):
            result = ea.exportar(self.root, {})
        self.assertTrue(result.exists())
        self.assertEqual(ma.ler(self.root / 'amostra-done.json')['review'], 'pending')
        with self.assertRaises(ValueError):
            ea.exportar(self.root, {})

    def test_changed_document_is_refused_before_export(self):
        def call(settings, method, params, **kwargs):
            self.assertNotEqual(method, 'export.run')
            return {'result': {'fixture': False}}
        with patch.object(ea.rpc, 'invoke', side_effect=call), self.assertRaises(ValueError):
            ea.exportar(self.root, {})
        self.assertFalse((self.root / 'amostra-pending.json').exists())


if __name__ == '__main__':
    unittest.main()
