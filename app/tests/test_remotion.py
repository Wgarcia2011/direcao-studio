import json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server,remotion_engine as engine,deepseek_director as director
import editing_actions as edits
from copy import deepcopy
from test_course import fixture

class RemotionIntegration(unittest.TestCase):
    def test_motion_items_keep_their_speech_times(self):
        state=fixture();doc=deepcopy(state['document'])
        edits.apply_one(doc,{'type':'overlay.add','params':{'kind':'motion','motion':'checklist','items':['Amigo','Professor'],'duration':3,'item_times':[0,1.5]}},state)
        self.assertEqual(doc['overlays'][0]['item_times'],[0,1.5])

    def test_motion_rejects_out_of_order_or_missing_item_times(self):
        for times in ([2,1],[0],[0,4]):
            state=fixture();doc=deepcopy(state['document'])
            with self.assertRaises(ValueError):
                edits.apply_one(doc,{'type':'overlay.add','params':{'kind':'motion','items':['Amigo','Professor'],'duration':3,'item_times':times}},state)

    def test_invalid_acceleration_is_rejected(self):
        with self.assertRaises(ValueError):server.valid_settings({'acceleration':'unknown'})
        self.assertEqual(server.valid_settings({'format':'16:9','acceleration':'cpu'})['format'],'16:9')

    def test_transcript_includes_the_end_of_long_video(self):
        blocks=[{'s':i,'e':i+1,'text':str(i)} for i in range(1001)]
        context=director.transcript_context(blocks)
        self.assertLessEqual(len(context),400)
        self.assertEqual(context[0]['start'],0)
        self.assertEqual(context[-1]['end'],1001)
        self.assertEqual(' '.join(b['text'] for b in context),' '.join(b['text'] for b in blocks))

    def test_local_sample_keeps_global_timing_and_full_props(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder);(d/'edit').mkdir();(d/'brutos').mkdir();(d/'brutos/original.mp4').write_bytes(b'original')
            full=d/'edit/remotion-props.json';full.write_text('full preview')
            calls=[]
            def command(args,**kwargs):calls.append(args);return '',''
            settings=server.valid_settings({'format':'16:9','sample_start':16,'sample_seconds':8})
            with patch.object(engine.edits,'get_state',return_value=None),patch.object(engine.asset_registry,'assets',return_value=[]),patch.object(engine,'PROJECT',d/'project'):
                out=engine.prepare(d,{'id':'a'*32,'audio':True},settings,True,command,lambda _: {'duration':20},lambda *_:None)
            props=json.loads(out.read_text())
            self.assertEqual((props['width'],props['height']),(1920,1080))
            self.assertEqual((props['offsetFrames'],props['durationInFrames'],props['totalDurationInFrames']),(480,120,600))
            self.assertEqual(calls[0][calls[0].index('-ss')+1],'16.0')
            self.assertEqual(full.read_text(),'full preview')
            self.assertEqual((d/'brutos/original.mp4').read_bytes(),b'original')

if __name__=='__main__':unittest.main()
