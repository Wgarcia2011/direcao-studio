import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('caderno_3d', ROOT / 'scripts/caderno_3d.py')
caderno = importlib.util.module_from_spec(spec)
spec.loader.exec_module(caderno)
EXAMPLE = ROOT / 'motion/hyperframes/templates/caderno-3d-threejs/exemplo-sintetico.json'


class Caderno3DTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)
        self.cfg = json.loads(EXAMPLE.read_text(encoding='utf-8'))
        for name in (self.cfg['video'], self.cfg['legendas'], self.cfg['encerramento']['logo']):
            (self.base / name).write_bytes(b'x')

    def tearDown(self):
        self.tmp.cleanup()

    def test_example_is_valid(self):
        self.assertEqual(caderno.validar(self.cfg, self.base), [])

    def test_rejects_overlap_unknown_icon_and_offscreen(self):
        self.cfg['cards'][0]['to'] = 4.0
        self.cfg['blocos'][0]['itens'][3]['icone'] = 'inexistente'
        self.cfg['blocos'][0]['itens'][4]['x'] = 6
        erros = '\n'.join(caderno.validar(self.cfg, self.base))
        self.assertIn('sobreposição', erros)
        self.assertIn('ícone desconhecido', erros)
        self.assertIn('fora disso sai da tela', erros)

    def test_planos_must_cover_duration(self):
        self.cfg['planos'][-1]['to'] = 12
        self.assertTrue(any('cobrir' in e for e in caderno.validar(self.cfg, self.base)))

    def test_logo_must_leave_before_video_ends(self):
        self.cfg['encerramento']['saidaFoto'] = 13.4
        self.assertTrue(any('antes do fim' in e for e in caderno.validar(self.cfg, self.base)))

    def test_inserts_need_gap_and_no_overlap(self):
        cv2 = __import__('cv2')
        import numpy as np
        cv2.imwrite(str(self.base / 'img.png'), np.zeros((1920, 1080, 3), np.uint8))
        ins = lambda a, b: {'from': a, 'to': b, 'imagem': 'img.png', 'saida': 'flash', 'camera': {'de': {'x': 540, 'y': 960, 'escala': 1}, 'para': {'x': 540, 'y': 960, 'escala': 1.05}}}
        self.cfg['inserts'] = [ins(7.9, 10.9)]
        self.assertTrue(any('sobreposição' in e for e in caderno.validar(self.cfg, self.base)))
        self.cfg['blocos'] = self.cfg['blocos'][:1]
        self.cfg.pop('encerramento')
        self.cfg['inserts'] = [ins(8.0, 10.6), ins(11.0, 13.6)]
        erros = caderno.validar(self.cfg, self.base)
        self.assertTrue(any('1 s de rosto' in e for e in erros))

    def test_caption_groups_have_two_to_four_words(self):
        words = [{'text': w, 'start': i * 0.3, 'end': i * 0.3 + 0.25} for i, w in enumerate('um dois três quatro cinco seis, sete oito.'.split())]
        groups = caderno.agrupar(words)
        self.assertTrue(all(1 <= len(g['words']) <= 4 for g in groups))
        self.assertEqual(sum(len(g['words']) for g in groups), len(words))
        self.assertTrue(groups[0]['words'][-1]['text'].endswith(',') or len(groups[0]['words']) <= 4)

    def test_captions_remap_to_montage(self):
        src = self.base / 't.json'
        src.write_text(json.dumps({'words': [{'w': 'antes', 's': 1.0, 'e': 1.2}, {'w': 'fica', 's': 5.0, 'e': 5.3}, {'w': 'aqui.', 's': 5.3, 'e': 5.6}]}), encoding='utf-8')
        plan = self.base / 'p.json'
        plan.write_text(json.dumps({'trechos': [{'id': 'T1', 'fonte_in': 4.9, 'fonte_out': 6.0, 'saida_in': 0.0}]}), encoding='utf-8')
        groups = caderno.legendas(src, self.base / 'out.json', plan)
        self.assertEqual([w['text'] for w in groups[0]['words']], ['fica', 'aqui.'])
        self.assertAlmostEqual(groups[0]['start'], 0.1)


if __name__ == '__main__':
    unittest.main()
