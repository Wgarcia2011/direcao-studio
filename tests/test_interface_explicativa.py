import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('interface_explicativa', ROOT / 'scripts/interface_explicativa.py')
ie = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ie)


class InterfaceExplicativaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)
        # Arquivos sintéticos: nenhuma mídia pessoal neste teste.
        (self.base / 'fala-sintetica.mp4').write_bytes(b'synthetic-video-fixture')
        (self.base / 'legendas-sinteticas.json').write_text(json.dumps([{'start': 0.3, 'end': 1.0, 'words': [{'text': 'Oi', 'start': 0.3, 'end': 1.0}]}]), encoding='utf-8')
        self.cfg = ie.read_json(ie.TEMPLATE / 'exemplo-sintetico.json')

    def tearDown(self):
        self.tmp.cleanup()

    def erros(self, cfg):
        return ie.validar(cfg, self.base)

    def test_example_validates_and_keeps_reference_rhythm(self):
        self.assertEqual(self.erros(self.cfg), [])
        r = ie.resumo(self.cfg)
        self.assertTrue(30 <= r['insertPct'] <= 50, r)
        self.assertLessEqual(r['maiorTrechoSemEvento'], 4.0)
        self.assertEqual({c['tipo'] for c in self.cfg['cenas']}, set(ie.CENAS) - {'broll'})
        self.assertEqual({o['tipo'] for o in self.cfg['sobreposicoes']}, set(ie.SOBREPOSICOES))

    def test_invalid_scenes_are_rejected(self):
        casos = [
            lambda c: c['cenas'][0].update(tipo='video3d'),
            lambda c: c['cenas'][0].update(to=c['cenas'][0]['from'] + 0.5),
            lambda c: c['cenas'][1].update(**{'from': 3.0}),
            lambda c: c['cenas'][0].update(entrada='cartao'),
            lambda c: c['cenas'][1].update(saida='explosao'),
            lambda c: c['cenas'][1].update(texto='x' * 40),
            lambda c: c['cenas'][3]['itens'].append({'texto': 'Fora', 'at': 99}),
            lambda c: c['sobreposicoes'][0].update(at=9.5, ate=10.5),
            lambda c: c['sobreposicoes'][2].update(icone='desconhecido'),
            lambda c: c['sobreposicoes'][1].update(palavras=['a', 'b', 'c', 'd']),
            lambda c: c.update(paleta={'acento': 'red;display:none'}),
            lambda c: c.update(fixture='true'),
            lambda c: c.update(legendaY=1700),
            lambda c: c.update(video='nao-existe.mp4'),
        ]
        for i, mutar in enumerate(casos):
            cfg = copy.deepcopy(self.cfg)
            mutar(cfg)
            with self.subTest(caso=i):
                self.assertTrue(self.erros(cfg))

    def test_theme_swap_only_changes_text(self):
        cfg = copy.deepcopy(self.cfg)
        cfg['cenas'][1]['texto'] = 'Buscando um *atalho*'
        cfg['cenas'][3]['titulo'] = 'Roteiro'
        cfg['sobreposicoes'][3]['texto'] = 'Nova Rotina'
        self.assertEqual(self.erros(cfg), [])
        self.assertEqual(ie.resumo(cfg), ie.resumo(self.cfg))

    def test_prepare_freezes_sources_and_refuses_overwrite(self):
        font = self.base / 'fonte.ttf'
        font.write_bytes(b'synthetic-font-fixture')
        cfg = {**self.cfg, 'fontes': {p: 'fonte.ttf' for p in ie.FONTES}, 'titulo': 'Teste </script>'}
        cfg['cenas'] = copy.deepcopy(cfg['cenas'])
        cfg['cenas'][1]['texto'] = '</script><b>'
        plan = self.base / 'plano.json'
        plan.write_text(json.dumps(cfg), encoding='utf-8')
        gsap = self.base / 'gsap.min.js'
        gsap.write_text('/* synthetic GSAP fixture */', encoding='utf-8')
        three = self.base / 'three/build'
        three.mkdir(parents=True)
        for name in ('three.module.js', 'three.core.js'):
            (three / name).write_text('/* synthetic three fixture */', encoding='utf-8')
        (three.parent / 'package.json').write_text('{"version": "0.186.0"}', encoding='utf-8')
        with patch.object(ie, 'GSAP', gsap):
            pasta = ie.preparar(plan, self.base / 'proj', amostra=True, three=three)
            with self.assertRaises(FileExistsError):
                ie.preparar(plan, self.base / 'proj')
        manifest = json.loads((pasta / 'manifesto.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['estilo'], '3d')
        self.assertEqual(manifest['engine'], 'hyperframes+threejs')
        self.assertIn('elementos3d.js', manifest['arquivos'])
        self.assertIn('criarKit', (pasta / 'assets/cena.js').read_text(encoding='utf-8'))
        self.assertEqual(manifest['revisao'], 'pendente')
        self.assertEqual(manifest['editor'], 'concat')
        self.assertTrue(manifest['amostra'])
        roteiro = (pasta / 'assets/roteiro.js').read_text(encoding='utf-8')
        self.assertNotIn('</script>', roteiro)
        page = (pasta / 'index.html').read_text(encoding='utf-8')
        self.assertNotIn('</script>\n</script>', page)
        self.assertIn('data-duration="20.0"', page)
        for name, digest in manifest['arquivos'].items():
            self.assertEqual(ie.sha(pasta / 'assets' / name), digest)

    def test_2d_style_and_wrong_three_version(self):
        self.assertEqual(self.erros({**self.cfg, 'estilo': '2d'}), [])
        self.assertTrue(self.erros({**self.cfg, 'estilo': '4d'}))
        three = self.base / 'velho/build'
        three.mkdir(parents=True)
        (three / 'three.module.js').write_text('', encoding='utf-8')
        (three.parent / 'package.json').write_text('{"version": "0.150.0"}', encoding='utf-8')
        with self.assertRaises(FileNotFoundError):
            ie.three_dir(three)

    def test_remotion_elements_are_validated_before_rendering(self):
        out = self.base / 'elementos.mp4'
        for kw in [{'nomes': []}, {'nomes': ['dragao']}, {'nomes': ['selo'], 'fundo': 'verde'}, {'nomes': ['selo'], 'duracao': 1}, {'nomes': ['selo'], 'formato': '4x5'}]:
            args = {'nomes': ['selo'], 'saida': out, **kw}
            with self.subTest(kw=kw), patch.object(ie, 'run') as run, patch.object(ie, 'runtime_remotion') as rt, self.assertRaises(ValueError):
                ie.elementos(**args)
            run.assert_not_called(); rt.assert_not_called()
        out.write_bytes(b'fixture')
        with patch.object(ie, 'run') as run, self.assertRaises(FileExistsError):
            ie.elementos(['selo'], out)
        run.assert_not_called()

    def test_shared_elements_module_lists_same_icons(self):
        js = (ie.TEMPLATE / 'elementos3d.js').read_text(encoding='utf-8')
        tsx = (ie.ROOT / 'motion/remotion/src/InterfaceElementos3D.tsx').read_text(encoding='utf-8')
        for nome in ie.ICONES:
            self.assertIn(f'    {nome}() {{', js)
            self.assertIn(f"'{nome}'", tsx)

    def test_broll_planos_and_closing_are_validated(self):
        # PNGs sintéticos: nenhuma mídia pessoal neste teste.
        (self.base / 'objeto.png').write_bytes(b'png-fixture')
        (self.base / 'logo.png').write_bytes(b'png-fixture')
        cfg = copy.deepcopy(self.cfg)
        cfg['fonteVideo'] = {'largura': 1920, 'altura': 1080}
        cfg['planos'] = [{'from': 0, 'to': 10, 'cx': 900, 'cy': 540, 'zoom': 1}, {'from': 10, 'to': 20, 'cx': 1300, 'cy': 525, 'zoom': 1.25}]
        cfg['cenas'].append({'tipo': 'broll', 'cena': 'imagem', 'imagem': 'objeto.png', 'from': 5.6, 'to': 8.0, 'icones': ['relogio']})
        cfg['cenas'].append({'tipo': 'broll', 'cena': 'fichas', 'from': 16.0, 'to': 17.5, 'linhas': ['Prazo', 'Data que eu esquecia']})
        cfg['sobreposicoes'] = [o for o in cfg['sobreposicoes'] if not (o['at'] < 17.5 and o['ate'] > 16.0)]
        cfg['encerramento'] = {'from': 20.0, 'extra': 4.0, 'logo': 'logo.png', 'perfil': '@cursoesquadrao', 'transforma': 22.0}
        cfg['amostra'] = {'inicio': 0, 'fim': 24.0}
        self.assertEqual(self.erros(cfg), [])
        casos = [
            lambda c: c['planos'][1].update(**{'from': 11}),
            lambda c: c['planos'][1].update(zoom=3),
            lambda c: c['cenas'][-2].update(imagem='nao-existe.png'),
            lambda c: c['cenas'][-2].update(cena='video'),
            lambda c: c['cenas'][-1].update(linhas=['x' * 30]),
            lambda c: c['cenas'][-1].update(to=25),
            lambda c: c['encerramento'].update(perfil='sem arroba'),
            lambda c: c['encerramento'].update(extra=20),
            lambda c: c['encerramento'].update(**{'from': 12}),
            lambda c: c.update(estilo='2d'),
        ]
        for i, mutar in enumerate(casos):
            c2 = copy.deepcopy(cfg)
            mutar(c2)
            with self.subTest(caso=i):
                self.assertTrue(self.erros(c2))

    def test_existing_render_is_never_overwritten(self):
        out = self.base / 'amostra.mp4'
        out.write_bytes(b'fixture')
        with patch.object(ie, 'run') as run, patch('sys.argv', ['x', 'render', '--pasta', str(self.base), '--saida', str(out)]):
            self.assertEqual(ie.main(), 1)
        run.assert_not_called()
        self.assertEqual(out.read_bytes(), b'fixture')

    def test_runtime_lists_same_icons_and_transitions(self):
        js = (ie.TEMPLATE / 'cena.js').read_text(encoding='utf-8')
        for nome in ie.ICONES:
            self.assertIn(f'  {nome}: `', js)
        for t in ie.TRANSICOES:
            self.assertIn(f'{t}:', js.split('const DUR_TR')[1].split(';')[0])


if __name__ == '__main__':
    unittest.main()
