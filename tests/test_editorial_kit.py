import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('editorial_kit', ROOT / 'scripts/editorial_kit.py')
kit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kit)


class EditorialKitTests(unittest.TestCase):
    def setUp(self):
        self.identity = kit.read_json(kit.IDENTITY / 'tokens.json')
        self.plan = kit.read_json(kit.TEMPLATE / 'card-dados.json')

    def test_examples_and_both_aspects_validate(self):
        for kind in kit.KINDS:
            p = kit.read_json(kit.TEMPLATE / f'{kind}.json')
            for width, height in [(540, 960), (1080, 1920), (960, 540), (1920, 1080)]:
                with self.subTest(kind=kind, dimensions=(width, height)):
                    kit.validate({**p, 'width': width, 'height': height}, self.identity)

    def test_invalid_metrics_and_timing_are_rejected(self):
        for key, value in [('value', -1), ('value', 101), ('value', True), ('baseline', '48'), ('duration', float('nan')), ('duration', 4.01), ('fps', 25), ('fixture', 'true'), ('footer', 'sem origem'), ('title', 'x' * 29), ('subtitle', 'a\nb')]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                kit.validate({**self.plan, key: value}, self.identity)

    def test_identity_rejects_css_and_path_injection(self):
        for section, key, value in [('colors', 'ink', 'red;display:none'), ('motion', 'exitSeconds', -1), ('layout', 'safeInset', 0)]:
            identity = copy.deepcopy(self.identity)
            identity[section][key] = value
            with self.subTest(section=section), self.assertRaises(ValueError):
                kit.validate(self.plan, identity)
        identity = copy.deepcopy(self.identity)
        identity['typography']['sans']['localFile'] = '../secret.ttf'
        with self.assertRaises(ValueError):
            kit.validate(self.plan, identity)

    def test_text_is_escaped_and_fixture_is_disclosed(self):
        p = {**self.plan, 'title': '<script>\n& "texto"'}
        rendered = kit.content(p)
        self.assertNotIn('<script>', rendered)
        self.assertIn('&lt;script&gt;', rendered)
        self.assertIn('DADOS FICTÍCIOS', rendered)
        self.assertIn('width:72%', rendered)

    def test_prepare_freezes_sources_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            # Arquivos sintéticos: nenhuma mídia pessoal ou fonte real neste teste.
            font = base / 'fixture.ttf'
            font.write_bytes(b'synthetic-font-fixture')
            gsap = base / 'motion/hyperframes/node_modules/gsap/dist/gsap.min.js'
            gsap.parent.mkdir(parents=True)
            gsap.write_text('/* synthetic GSAP fixture */', encoding='utf-8')
            p = {**self.plan, 'title': 'CONTENT\n</script>', 'fontFiles': {role: 'fixture.ttf' for role in ('display', 'sans', 'mono')}}
            plan = base / 'plan.json'
            plan.write_text(json.dumps(p), encoding='utf-8')
            identity = copy.deepcopy(self.identity)
            identity['typography']['sans']['family'] = 'DirecaoSansCustom'
            identity_path = base / 'tokens.json'
            identity_path.write_text(json.dumps(identity), encoding='utf-8')
            # O teste não depende de npm, fontes ou motores instalados.
            with patch.object(kit, 'HF', font), patch.object(kit, 'ROOT', base):
                result = kit.prepare(plan, base / 'project', identity_path)
                with self.assertRaises(ValueError):
                    kit.prepare(plan, base / 'project')
            page = (base / 'project/index.html').read_text(encoding='utf-8')
            self.assertIn('CONTENT', page)
            self.assertIn('font-family:DirecaoSansCustom;', page)
            self.assertNotIn('DirecaoSansCustomCustom', page)
            self.assertIn('\\u003c/script>', page)
            self.assertIn('&lt;/script&gt;', page)
            self.assertNotIn('/*CONFIG*/', page)
            self.assertEqual(result['reviewStatus'], 'pending')
            self.assertEqual(result['editor'], 'concat')
            for relative, digest in result['files'].items():
                self.assertEqual(kit.hashlib.sha256((base / 'project' / relative).read_bytes()).hexdigest(), digest)

    def test_existing_video_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'sample.mp4'
            output.write_bytes(b'fixture')
            with patch.object(kit, 'run') as run, self.assertRaises(ValueError):
                kit.render(Path(tmp), output)
            run.assert_not_called()
            self.assertEqual(output.read_bytes(), b'fixture')


if __name__ == '__main__':
    unittest.main()
