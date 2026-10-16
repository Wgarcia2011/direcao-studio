import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('short_editorial', ROOT / 'scripts/short_editorial.py')
se = importlib.util.module_from_spec(spec)
spec.loader.exec_module(se)
EXEMPLO = ROOT / 'motion/remotion/templates/short-editorial-9x16.json'


class ShortEditorialTests(unittest.TestCase):
    def setUp(self):
        self.plano = json.loads(EXEMPLO.read_text(encoding='utf-8'))

    def recusa(self, mudar):
        plano = copy.deepcopy(self.plano)
        mudar(plano)
        with self.assertRaises(se.PlanoInvalido):
            se.validar(plano)

    def test_exemplo_sintetico_e_valido_e_sem_dados_privados(self):
        self.assertEqual(len(se.validar(self.plano)), 5)
        self.assertEqual(self.plano['source'], 'sintetico')
        raw = EXEMPLO.read_text(encoding='utf-8')
        for privado in ('D:\\\\', 'C:\\\\Users', 'Esquadr', 'Gaby'):
            self.assertNotIn(privado, raw)
        self.assertFalse(any(self.plano['fonts'].values()) or self.plano['brand']['logo'])

    def test_cada_tipo_de_cena_tem_composicao_no_motor_certo(self):
        for kind, (engine, comp) in se.KINDS.items():
            if engine == 'hyperframes':
                self.assertTrue((ROOT / f'motion/hyperframes/templates/short-editorial-9x16/{comp}.html').is_file(), kind)
            else:
                self.assertIn(f'id="{comp}"', (ROOT / 'motion/remotion/src/editorial/index.tsx').read_text(encoding='utf-8'), kind)

    def test_recusa_planos_inconsistentes(self):
        self.recusa(lambda p: p.update(templateId='outro'))
        self.recusa(lambda p: p['scenes'][1].update(engine='remotion'))          # mosaico so existe em HyperFrames
        self.recusa(lambda p: p['scenes'][0].update(tailFrames=10))              # encerramento so na ultima cena
        self.recusa(lambda p: p['scenes'][1].update(id='A'))                     # id repetido
        self.recusa(lambda p: p['scenes'][3].update(darkAt=6.0, lightAt=5.0))    # contraste fora de ordem
        self.recusa(lambda p: p['scenes'][2].update(frames=20))                  # cena curta demais
        self.recusa(lambda p: p['scenes'][2].update(transition={'id': 'fade', 'duration': .4}))
        self.recusa(lambda p: p['scenes'][0]['shots'].__setitem__(0, {'at': 0, 'x': 1.4}))


if __name__ == '__main__':
    unittest.main()
