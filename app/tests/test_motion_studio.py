import unittest, tempfile
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import motion_studio as motion

class MotionTests(unittest.TestCase):
    def scene(self,**kw):return {'id':'abcdef123456','kind':'layout','start':2,'duration':4,'layout':'zoom',**kw}
    def test_normalizes_frames_and_rejects_overlap(self):
        d=motion.normalize({'scenes':[self.scene(start=2.01)]},12,{})
        self.assertEqual(d['scenes'][0]['startFrame'],60)
        with self.assertRaises(ValueError):motion.normalize({'scenes':[self.scene(),self.scene(id='abcdef123457',start=4)]},12,{})
    def test_unregistered_media_and_nonfinite_rejected(self):
        with self.assertRaises(ValueError):motion.normalize({'scenes':[self.scene(asset='unknown')]},12,{})
        with self.assertRaises(ValueError):motion.normalize({'scenes':[self.scene(start=float('nan'))]},12,{})
    def test_history_isolation_and_conflict(self):
        with tempfile.TemporaryDirectory() as td:
            a=Path(td)/'a';b=Path(td)/'b'
            d=motion.save(a,{'revision':0,'scenes':[self.scene()]},12)
            self.assertEqual(motion.get(b)['scenes'],[])
            self.assertEqual(d['revision'],1)
            with self.assertRaises(ValueError):motion.save(a,{'revision':0,'scenes':[]},12)
            motion.save(a,{'revision':1,'history':'undo'},12)
            self.assertEqual(motion.get(a)['scenes'],[])
            motion.save(a,{'revision':2,'history':'redo'},12)
            self.assertEqual(len(motion.get(a)['scenes']),1)
    def test_item_anchor_times_validated(self):
        scene=self.scene(kind='element',effect='flow',items=['Estudar','Revisar'],item_times=[0,2])
        self.assertEqual(motion.normalize({'scenes':[scene]},12,{})['scenes'][0]['item_times'],[0,2])
        for invalid in ([2,1],[0,5],[0], [0,float('nan')]):
            with self.assertRaises(ValueError):motion.normalize({'scenes':[{**scene,'item_times':invalid}]},12,{})

    def test_caption_policy_validated(self):
        with self.assertRaises(ValueError):motion.normalize({'scenes':[self.scene(caption='invalid')]},12,{})
        d=motion.normalize({'scenes':[self.scene(caption='hide')],'captions':{'enabled':True,'preset':'impacto-turquesa'}},12,{})
        self.assertEqual(d['scenes'][0]['caption'],'hide')

if __name__=='__main__':unittest.main()
