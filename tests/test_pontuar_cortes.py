import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pontuar_cortes', ROOT / 'scripts/pontuar_cortes.py')
pc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pc)


class PontuarCortesTests(unittest.TestCase):
    def test_intervalos_sinteticos_ranked_com_justificativa(self):
        texto = "Como resolver esse problema importante agora. Esta e a explicacao completa para voce entender o contexto."
        words = []
        t = 0.0
        for w in texto.split():
            words.append({'w': w, 's': t, 'e': t + .5})
            t += .65
        resultado = pc.pontuar(pc.validar_palavras({'words': words}), min_seg=3, max_seg=20)
        self.assertTrue(resultado)
        self.assertEqual([x['score'] for x in resultado], sorted((x['score'] for x in resultado), reverse=True))
        self.assertTrue(all(0 <= x['score'] <= 100 and x['rationale'] for x in resultado))
        self.assertEqual(resultado[0]['criteria']['gancho'], 100)

    def test_recusa_timestamps_invalidos_e_limites(self):
        with self.assertRaises(ValueError):
            pc.validar_palavras({'words': [{'w': 'oi', 's': 2, 'e': 1}]})
        with self.assertRaises(ValueError):
            pc.pontuar([], min_seg=20, max_seg=10)


if __name__ == '__main__':
    unittest.main()
