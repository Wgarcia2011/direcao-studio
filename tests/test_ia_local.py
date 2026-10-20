import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import analise_opcional as ao
import manifesto_analise as ma
import validar_ia_local as vl


class LocalAITests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec('numpy'), 'numpy é dependência opcional do backend local')
    def test_auto_clustering_finds_repeated_voices_without_given_count(self):
        labels = ao.agrupar_embeddings([[1, 0], [0, 1], [.99, .01], [.01, .99]])
        self.assertEqual(labels, [0, 1, 0, 1])
        with self.assertRaises(ValueError):
            ao.agrupar_embeddings([[0, 0]])

    def test_network_provider_refuses_remote_credentials_and_non_http(self):
        for url in ('https://127.0.0.1/x', 'http://8.8.8.8/x', 'http://a:b@127.0.0.1/x'):
            with self.assertRaises(ValueError):
                ao.post_local(url, {})

    def test_quality_metrics_do_not_pass_single_cluster_for_two_voices(self):
        truth = {'turns': [{'start': 0, 'end': 2, 'speaker': 'A'}, {'start': 3, 'end': 5, 'speaker': 'B'}]}
        bad = {'turns': [{'start': 0, 'end': 5, 'speaker': 'x'}]}
        good = {'turns': [{'start': 0, 'end': 2, 'speaker': 'y'}, {'start': 3, 'end': 5, 'speaker': 'x'}]}
        self.assertFalse(vl.medir_diarizacao(truth, bad)['passed'])
        self.assertTrue(vl.medir_diarizacao(truth, good)['passed'])

    def test_semantic_quality_rejects_inverted_context_labels(self):
        expected = {'a': True, 'b': False}
        self.assertFalse(vl.medir_semantica(expected, {'annotations': [
            {'candidate_id': 'a', 'context_independent': False}, {'candidate_id': 'b', 'context_independent': True}]})['passed'])

    def test_word_speaker_alignment_handles_overlap_and_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'synthetic.txt'
            source.write_text('fala sintética')
            m = ma.criar(source, 2, {'words': [{'w': 'Olá.', 's': 0, 'e': 1}]},
                {'version': 1, 'method': 'fixture', 'candidates': []}, 'sintetico')
            diar = {'source_sha256': m['source']['sha256'], 'turns': [{'start': 0, 'end': 1, 'speaker': 'A'}]}
            self.assertEqual(ao.associar_palavras(m, diar)['words'][0]['speaker'], 'A')
            diar['turns'].append({'start': 0, 'end': 1, 'speaker': 'B'})
            self.assertIsNone(ao.associar_palavras(m, diar)['words'][0]['speaker'])
            diar['source_sha256'] = 'other'
            with self.assertRaises(ValueError):
                ao.associar_palavras(m, diar)


if __name__ == '__main__':
    unittest.main()
