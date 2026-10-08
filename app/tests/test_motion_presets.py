import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import motion_presets as presets
import motion_studio as motion
import server


class DynamicPresets(unittest.TestCase):
    def test_six_presets_are_valid_and_preserve_speech_offsets(self):
        self.assertEqual(len(presets.catalog()),6)
        for row in presets.catalog():
            scene=presets.build({'preset':row['id'],'start':1,'duration':3})
            if scene['items']:scene['item_times']=[i*.8 for i in range(len(scene['items']))]
            doc=motion.normalize({'scenes':[scene]},8,{})
            self.assertEqual(doc['scenes'][0]['startFrame'],30)
            self.assertEqual(doc['scenes'][0]['intensity'],'energetic')
            self.assertEqual(doc['scenes'][0]['item_times'],scene.get('item_times',[]))

    def test_invalid_preset_pair_color_and_comparison_are_rejected(self):
        for override in ({'effect':'flow'},{'accent':'url(secret)'},{'preset':'missing'},{'box_width':95},{'labels':['Só um']}):
            scene=presets.build({'preset':'dynamic-title'});scene.update(override)
            with self.assertRaises(ValueError):motion.normalize({'scenes':[scene]},6,{})
        with self.assertRaises(ValueError):
            motion.normalize({'scenes':[presets.build({'preset':'comparison','items':['Só um']})]},6,{})

    def test_preset_add_is_revision_checked_and_undoable(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            added=motion.add_preset(folder,{'revision':0,'preset':'dynamic-title'},6)
            self.assertEqual(added['scenes'][0]['preset'],'dynamic-title')
            before=(folder/'edit/motion.json').read_bytes()
            with self.assertRaises(ValueError):motion.add_preset(folder,{'revision':0,'preset':'flow'},6)
            self.assertEqual((folder/'edit/motion.json').read_bytes(),before)
            motion.save(folder,{'revision':1,'history':'undo'},6)
            self.assertEqual(motion.get(folder)['scenes'],[])

    def test_motion_approval_requires_sample_and_expires_after_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp);(folder/'edit').mkdir();(folder/'amostras').mkdir()
            (folder/'projeto.json').write_text(json.dumps({'sha256':'fixture','segments':[[0,6]],'settings':{}}))
            with self.assertRaises(ValueError):motion.approve(folder,{'reviewed':True})
            motion.add_preset(folder,{'revision':0,'preset':'dynamic-title'},6)
            sig=motion.review_signature(folder)
            motion.write(folder/'edit/motion-review.json',{'preview_signature':sig})
            (folder/'amostras/motion-preview.mp4').write_bytes(b'test fixture')
            with self.assertRaises(ValueError):motion.approve(folder,{'reviewed':False})
            self.assertTrue(motion.approve(folder,{'reviewed':True})['approved'])
            motion.add_preset(folder,{'revision':1,'preset':'impact-word'},6)
            with self.assertRaises(ValueError):motion.approve(folder,{'reviewed':True})
            with self.assertRaisesRegex(ValueError,'aprove'):
                motion.render_job(folder,{'sample':False},server)

    def test_failed_motion_job_uses_cli_error_contract(self):
        from cli import wait_job
        with self.assertRaisesRegex(ValueError,'falhou'):
            wait_job(None,{'state':'error','message':'falhou'},1)


if __name__=='__main__':unittest.main()
