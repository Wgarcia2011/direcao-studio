import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('editorial_film', ROOT/'scripts/editorial_film.py')
film = importlib.util.module_from_spec(spec)
spec.loader.exec_module(film)


class EditorialFilmTests(unittest.TestCase):
    def setUp(self):
        self.plan=json.loads((film.TEMPLATE/'demo.json').read_text(encoding='utf-8'))

    def test_demo_and_supported_sizes(self):
        for w,h in [(540,960),(720,1280),(1080,1920)]:
            self.plan.update(width=w,height=h)
            self.assertEqual(film.validar(self.plan),12)

    def test_invalid_temporal_and_layout_inputs(self):
        for change in [dict(duration=float('nan')),dict(duration=4.01),dict(kind='unknown'),
                       dict(title=['linha demasiado longa para o painel']),
                       dict(caption=[{'w':'fim','at':3.9}]),
                       dict(caption=[{'w':'a','at':2},{'w':'b','at':1}])]:
            with self.subTest(change=change):
                plan=copy.deepcopy(self.plan);plan['scenes'][0].update(change)
                with self.assertRaises(ValueError):film.validar(plan)

    def test_module_patch_fails_closed_on_other_version(self):
        self.assertEqual(film.substituir('before','before','after'),'after')
        for source in ('other','before before'):
            with self.assertRaises(ValueError):film.substituir(source,'before','after')

    def test_prepare_refuses_existing_folder(self):
        with self.assertRaisesRegex(ValueError,'ja existe'):
            film.preparar(film.TEMPLATE/'demo.json',film.TEMPLATE)


if __name__=='__main__':unittest.main()
