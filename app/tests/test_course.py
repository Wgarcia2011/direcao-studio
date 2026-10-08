from copy import deepcopy
from pathlib import Path
import io
import json
import sys
import tempfile
import unittest
from unittest.mock import patch

APP=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(APP))
import editing_actions as e
import asset_registry
import shutil
from PIL import Image
import deepseek_director as ai


def fixture():
    doc={'clips':[{'id':'clip-a','in':0,'out':120,'zoom':1,'volume':1}], 'overlays':[], 'transitions':[], 'settings':{'style':'roxo','format':'9:16','title':'','captions':True},'slots':{},'caption_edits':{}}
    return {'schema_version':1,'revision':0,'base_frames':120,'base_info':{},'base_captions':{'words':[], 'blocks':[{'s':.2,'e':1,'text':'Olá mundo','key':1,'words':[{'w':'Olá','s':.2,'e':.5},{'w':'mundo','s':.6,'e':.9}]}]}, 'base_direction':None,'document':doc,'baseline':e.digest(doc),'materialized':e.digest(doc),'undo':[],'redo':[],'audit':[]}


def response(actions,target=None):
    data={'summary':'Edição validada','actions':actions}
    if target is not None:data['target_seconds']=target
    return {'choices':[{'message':{'tool_calls':[{'function':{'name':'edit_timeline','arguments':json.dumps(data)}}]}}]}


class CourseImages(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.app = Path(self.directory.name)
        course = self.app / 'public/course/assets'
        course.mkdir(parents=True)
        Image.new('RGB', (8, 8), 'purple').save(course / 'icone-bitcoin.png')
        (course.parent / 'catalog.json').write_text(json.dumps({'assets': [{'id': 'icone-bitcoin', 'url': 'course/assets/icone-bitcoin.png'}]}), encoding='utf-8')
        three = self.app / 'node_modules/three/build'
        three.mkdir(parents=True)
        for name in ('three.module.js', 'three.core.js'):
            shutil.copy2(APP / 'node_modules/three/build' / name, three / name)
        self.registry = patch.object(asset_registry, 'APP', self.app)
        self.registry.start()

    def tearDown(self):
        self.registry.stop()
        self.directory.cleanup()

    def test_registered_image_is_allowed_but_paths_are_rejected(self):
        state=fixture()
        e.apply_one(state['document'],{'type':'overlay.add','params':{'kind':'image','asset':'icone-bitcoin'}},state)
        self.assertEqual(state['document']['overlays'][0]['asset'],'icone-bitcoin')
        for asset in ['../../secret','https://outside/image.png','missing']:
            state=fixture()
            with self.assertRaises(ValueError):e.apply_one(state['document'],{'type':'overlay.add','params':{'kind':'image','asset':asset}},state)

    def test_render_copies_image_into_self_contained_composition(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp);(folder/'assets').mkdir();(folder/'edit').mkdir()
            state=fixture()
            e.apply_one(state['document'],{'type':'overlay.add','params':{'kind':'image','asset':'icone-bitcoin','start':0}},state)
            e.write(folder/'edit/timeline.json',state)
            (folder/'index.html').write_text('<body><div id="stage"></div><script src="assets/gsap.js"></script></body>',encoding='utf-8')
            e.inject_overlays(folder,folder,True,self.app)
            self.assertTrue((folder/'assets/icone-bitcoin.png').is_file())
            markup=(folder/'index.html').read_text(encoding='utf-8')
            self.assertIn('src="assets/icone-bitcoin.png"',markup)
            self.assertIn('data-duration="3"',markup)
