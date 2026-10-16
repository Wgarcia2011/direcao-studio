import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIB = ROOT / 'motion/remotion/templates/biblioteca'
SRC = ROOT / 'motion/remotion/src/biblioteca'
PRIVADO = re.compile(r'gaby|gabriela|\bruan\b|thallius|\berin\b|\blula\b|bolsonaro|esquadr|wagner|logo-esq|[A-Z]:\\\\|Renders/', re.I)


class BibliotecaTests(unittest.TestCase):
    def test_indice_aponta_para_arquivos_e_composicoes_registradas(self):
        indice = json.loads((BIB / 'indice.json').read_text(encoding='utf-8'))['templates']
        registradas = set(re.findall(r'id="([A-Za-z0-9]+)"', (SRC / 'index.tsx').read_text(encoding='utf-8')))
        self.assertGreaterEqual(len(indice), 20)
        for t in indice:
            for comp in t['composicao'].split(', '):
                self.assertIn(comp, registradas, t['nome'])
            if t['arquivo']:
                self.assertTrue((BIB / t['arquivo']).is_file(), t['arquivo'])
            if t['detalhes']:
                self.assertTrue((ROOT / 'docs/templates/biblioteca/detalhes' / t['detalhes']).is_file(), t['detalhes'])

    def test_exemplos_e_codigo_sem_dados_pessoais(self):
        arquivos = list(BIB.glob('*.json')) + list(SRC.rglob('*.ts*'))
        arquivos += list((ROOT / 'docs/templates/biblioteca').rglob('*.md')) + list((ROOT / 'docs/aprendizado').glob('*.md'))
        for f in arquivos:
            texto = f.read_text(encoding='utf-8')
            achados = PRIVADO.findall(texto)
            self.assertEqual(achados, [], f.name)

    def test_templates_com_trechos_tem_tempos_coerentes(self):
        for f in BIB.glob('*.template.json'):
            d = json.loads(f.read_text(encoding='utf-8'))
            for ini, fim in d.get('segments', []) if isinstance(d.get('segments'), list) else []:
                self.assertLess(ini, fim, f.name)


if __name__ == '__main__':
    unittest.main()
