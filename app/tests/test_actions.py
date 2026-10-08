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
import deepseek_director as ai


def fixture():
    doc={'clips':[{'id':'clip-a','in':0,'out':120,'zoom':1,'volume':1}], 'overlays':[], 'transitions':[], 'settings':{'style':'roxo','format':'9:16','title':'','captions':True},'slots':{},'caption_edits':{}}
    return {'schema_version':1,'revision':0,'base_frames':120,'base_info':{},'base_captions':{'words':[], 'blocks':[{'s':.2,'e':1,'text':'Olá mundo','key':1,'words':[{'w':'Olá','s':.2,'e':.5},{'w':'mundo','s':.6,'e':.9}]}]}, 'base_direction':None,'document':doc,'baseline':e.digest(doc),'materialized':e.digest(doc),'undo':[],'redo':[],'audit':[]}


def response(actions,target=None):
    data={'summary':'Edição validada','actions':actions}
    data['coherence_review']={key:'Revisão simulada' for key in ('opening','development','conclusion','context_check')}
    if target is not None:data['target_seconds']=target
    return {'choices':[{'message':{'tool_calls':[{'function':{'name':'edit_timeline','arguments':json.dumps(data)}}]}}]}


class Actions(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.p=Path(self.temp.name);(self.p/'edit').mkdir();e.write(self.p/'edit/timeline.json',fixture())
    def tearDown(self):self.temp.cleanup()
    def test_atomic_batch_rejects_without_publishing_first_action(self):
        before=(self.p/'edit/timeline.json').read_bytes()
        with self.assertRaises(ValueError):e.execute(self.p,0,[{'type':'overlay.add','params':{'text':'TÍTULO'}},{'type':'clip.trim','params':{'clip_id':'clip-a','start':0,'end':999}}])
        self.assertEqual(before,(self.p/'edit/timeline.json').read_bytes())
    def test_history_survives_reload_and_detects_stale_revision(self):
        e.execute(self.p,0,[{'type':'clip.split','params':{'clip_id':'clip-a','time':2}}]);self.assertEqual(len(e.get_state(self.p)['document']['clips']),2)
        with self.assertRaises(ValueError):e.execute(self.p,0,[{'type':'timeline.limit','params':{'seconds':1}}])
        e.execute(self.p,1,history='undo');self.assertEqual(len(e.get_state(self.p)['document']['clips']),1)
        e.execute(self.p,2,history='redo');self.assertEqual(e.get_state(self.p)['revision'],3);self.assertEqual(len(e.get_state(self.p)['document']['clips']),2)
    def test_source_ranges_remap_words_to_output(self):
        state=e.execute(self.p,0,[{'type':'timeline.select_ranges','params':{'ranges':[{'start':.1,'end':1.1},{'start':2,'end':3}]}}])
        self.assertEqual(e.duration(state['document']),2)
        words=e.mapped_captions(state)['words'];self.assertAlmostEqual(words[0]['s'],.1);self.assertEqual(words[1]['w'],'mundo')
    def test_word_at_frame_boundary_is_kept_without_negative_time(self):
        state=fixture();state['document']['clips'][0]['in']=6
        state['base_captions']['blocks'][0]['words'][0]['s']=.197
        words=e.mapped_captions(state)['words']
        self.assertEqual(words[0]['w'],'Olá');self.assertEqual(words[0]['s'],0)
    def test_audio_transition_adaptation_uses_half_duration_per_side(self):
        transitions=[{'clipAId':'a','clipBId':'b','duration':.2,'params':{'audioFade':True}}]
        self.assertEqual(e.transition_audio_fades(transitions,'a'),(0,.1));self.assertEqual(e.transition_audio_fades(transitions,'b'),(.1,0))
    def test_generated_tool_plan_is_validated_without_mutating_state(self):
        state=fixture();before=deepcopy(state)
        actions,_=ai.parse_response(response([{'type':'timeline.limit','params':{'seconds':2}}],2),state)
        self.assertEqual(state,before);self.assertEqual(actions[0]['type'],'timeline.limit')
        with self.assertRaises(ValueError):ai.parse_response(response([{'type':'clip.remove','params':{'clip_id':'outside'}}]),state)
        with self.assertRaises(ValueError):ai.parse_response(response([{'type':'timeline.limit','params':{'seconds':2}}],3),state)
    def test_deepseek_transport_sends_only_bounded_text_context(self):
        fake=response([{'type':'overlay.add','params':{'kind':'text','text':'Título','start':0}}])
        with patch.object(ai,'KEY','test-key-only'),patch.object(ai,'MODEL','deepseek-flash'),patch.object(ai.urllib.request,'urlopen',return_value=io.BytesIO(json.dumps(fake).encode())) as transport:
            actions,_=ai.plan(fixture(),'Adicione um título',lambda *args:None)
            req=transport.call_args.args[0];payload=json.loads(req.data)
            self.assertEqual(req.full_url,ai.ENDPOINT);self.assertFalse(payload['stream']);self.assertEqual(actions[0]['type'],'overlay.add')
            self.assertNotIn('video.mp4',payload['messages'][1]['content']);self.assertNotIn('test-key-only',payload['messages'][1]['content'])
    def test_duration_control_overrides_prompt_and_retries_wrong_length(self):
        state=fixture()
        wrong=response([{'type':'timeline.select_ranges','params':{'ranges':[{'start':0,'end':1}]}}],1)
        correct=response([{'type':'timeline.select_ranges','params':{'ranges':[{'start':0,'end':1},{'start':2,'end':3}]}}],2)
        with patch.object(ai,'KEY','test-key-only'),patch.object(ai.urllib.request,'urlopen',side_effect=[
                io.BytesIO(json.dumps(wrong).encode()),io.BytesIO(json.dumps(correct).encode())]) as transport:
            actions,_=ai.plan(state,'Resuma para 3 segundos',lambda *args:None,
                expected_target=2,require_selection=True)
            self.assertEqual(transport.call_count,2)
            payload=json.loads(transport.call_args_list[0].args[0].data)
            self.assertIn('"requested_target_seconds": 2',payload['messages'][1]['content'])
            self.assertEqual(actions[0]['type'],'timeline.select_ranges')
        with self.assertRaisesRegex(ValueError,'Selecione as falas'):
            ai.parse_response(response([{'type':'timeline.limit','params':{'seconds':2}}]),state,2,True)
        with self.assertRaisesRegex(ValueError,'precisa ter'):
            ai.parse_response(wrong,state,2,True)
        missing=response([{'type':'timeline.select_ranges','params':{'ranges':[{'start':0,'end':2}]}}])
        payload=json.loads(missing['choices'][0]['message']['tool_calls'][0]['function']['arguments'])
        del payload['coherence_review']
        missing['choices'][0]['message']['tool_calls'][0]['function']['arguments']=json.dumps(payload)
        with self.assertRaisesRegex(ValueError,'coherence_review'):
            ai.parse_response(missing,state,2,True)

    def test_unknown_action_and_invalid_color_do_not_publish(self):
        with self.assertRaises(ValueError):e.execute(self.p,0,[{'type':'exec.shell','params':{}}])
        with self.assertRaises(ValueError):e.execute(self.p,0,[{'type':'overlay.add','params':{'color':'url(https://outside/)'}}])
        self.assertEqual(e.get_state(self.p)['revision'],0)


if __name__=='__main__':unittest.main()
