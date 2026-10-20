import copy
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import analise_opcional as ao
import fila_video as fv
import manifesto_analise as ma
import pipeline_video as pv


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / 'synthetic.txt'
        self.source.write_text('fixture')
        self.transcript = self.root / 'transcript.json'
        ma.salvar(self.transcript, {'words': [{'w': 'Como?', 's': 0.1, 'e': 2.123456},
                                            {'w': 'Assim.', 's': 2.2, 'e': 5}]})

    def analyze(self):
        return pv.analisar(self.source, self.root / 'job', transcript=self.transcript, minimum=1, maximum=6)

    def test_checkpoint_roundtrip_and_exact_word_boundaries(self):
        with patch.object(pv, 'probe', return_value={'duration': 6, 'streams': []}) as probe, patch.object(pv, 'detectar', return_value={}):
            m = self.analyze()
            self.assertEqual(self.analyze(), m)
            self.assertEqual(probe.call_count, 1)
            self.assertIn(2.123456, [c['end'] for c in m['candidates']])
            self.assertEqual(ma.ler(self.root / 'job/job.json')['status'], 'ready_for_review')
        (self.root / 'job/probe.json').write_text('{}')
        with self.assertRaises(ValueError):
            self.analyze()

    def test_failed_step_resumes_without_repeating_probe(self):
        with patch.object(pv, 'probe', return_value={'duration': 6, 'streams': []}) as probe, patch.object(pv, 'detectar', side_effect=RuntimeError('fixture')):
            with self.assertRaises(RuntimeError):
                self.analyze()
            self.assertEqual(probe.call_count, 1)
        with patch.object(pv, 'probe', side_effect=AssertionError('must resume')), patch.object(pv, 'detectar', return_value={}):
            self.analyze()
        self.assertFalse((self.root / 'job/running.lock').exists())

    def test_lock_prevents_concurrent_job_and_preserves_unrelated_files(self):
        folder = self.root / 'job'
        folder.mkdir()
        (folder / 'probe.json').write_text('unrelated')
        with self.assertRaises(ValueError):
            self.analyze()
        self.assertEqual((folder / 'probe.json').read_text(), 'unrelated')

    def test_queue_failure_retry_and_changed_source(self):
        q = self.root / 'queue'
        jid = fv.adicionar(q, self.source, self.root / 'out', self.transcript)
        fv.processar(q, analyze=lambda *a, **k: (_ for _ in ()).throw(ValueError('fixture')))
        self.assertEqual(ma.ler(q / (jid + '.json'))['status'], 'failed')
        calls = []
        fv.processar(q, analyze=lambda *a, **k: calls.append(a))
        self.assertFalse(calls)
        fv.processar(q, resume_failed=True, analyze=lambda *a, **k: calls.append(a))
        self.assertEqual(len(calls), 1)
        self.assertEqual(ma.ler(q / (jid + '.json'))['status'], 'ready_for_review')

    def test_semantic_adapter_validates_model_output_without_mutating_manifest(self):
        with patch.object(pv, 'probe', return_value={'duration': 6, 'streams': []}), patch.object(pv, 'detectar', return_value={}):
            m = self.analyze()
        before = copy.deepcopy(m)
        result = ao.semantica(m, 'fixture-model', lambda prompt: {'topic': 'fixture', 'context_independent': True,
                                                                'hook': 50, 'clarity': 80, 'rationale': 'test'})
        self.assertEqual(m, before)
        self.assertEqual(result['manifest_sha256'], ma.hash_json(m))
        with self.assertRaises(ValueError):
            ao.semantica(m, 'fixture-model', lambda prompt: {'topic': 'x', 'context_independent': 'yes'})


if __name__ == '__main__':
    unittest.main()
