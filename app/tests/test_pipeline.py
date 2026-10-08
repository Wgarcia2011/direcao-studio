import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys
import shutil
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("editor_server", ROOT / "server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class Boundaries(unittest.TestCase):
    def test_join_fades_do_not_consume_first_and_last_words(self):
        from assembly_flow import speech_safe_fades
        words={'words':[{'s':.02,'e':.98}]}
        self.assertEqual(speech_safe_fades(words,0,1,.09,.09),(.02,.020000000000000018))
    def test_zero_duration_whisper_words_survive_remapping(self):
        data={'blocks':[{'text':'Então seguimos','words':[{'w':'Então','s':1,'e':1},{'w':'seguimos','s':1,'e':1.5}]}]}
        mapped=server.remap_transcript(data,[[.5,2]])
        self.assertEqual([w['w'] for w in mapped['words']],['Então','seguimos'])
        self.assertGreater(mapped['words'][0]['e'],mapped['words'][0]['s'])
    def test_breath_option_is_separate_from_long_pause_cleaning(self):
        with tempfile.TemporaryDirectory(prefix='breath-check-') as temporary:
            directory=Path(temporary)
            for folder in ['brutos','edit']:(directory/folder).mkdir()
            source=directory/'brutos/original.mp4'
            server.command(['ffmpeg','-y','-v','error','-f','lavfi','-i','color=c=purple:s=320x240:r=30:d=4',
                '-f','lavfi','-i','sine=frequency=440:duration=4','-af',"volume=0.01:enable='between(t,1,1.55)'",
                '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',source])
            meta={'id':'0'*32,'sha256':'test','settings':server.valid_settings({}),**server.probe(source)}
            captions={'words':[{'w':'Antes','s':.2,'e':.8},{'w':'Depois','s':1.7,'e':2.4}],'blocks':[]}
            server.write_json(directory/'edit/transcricao-original.json',captions)
            original=source.read_bytes()
            server.cut_silence(directory,meta,lambda *args:None,'natural',clean_pauses=False,breaths=True)
            self.assertAlmostEqual(meta['clean_duration'],meta['duration'],delta=.06)
            self.assertEqual(server.read_json(directory/'edit/cortes.json')['breath_mode'],'attenuate')
            self.assertIn("volume='1-0.65",(directory/'edit/cortes.ffmpeg').read_text())
            server.cut_silence(directory,meta,lambda *args:None,'agile',clean_pauses=False,breaths=True)
            report=server.read_json(directory/'edit/cortes.json')
            self.assertTrue(report['breaths'])
            self.assertFalse(report['clean_pauses'])
            self.assertGreater(meta['removed'],.2)
            for start,end in report['removed_intervals']:
                self.assertFalse(any(start<w['e'] and end>w['s'] for w in captions['words']))
            self.assertEqual(source.read_bytes(),original)

    def test_low_energy_speech_is_protected_from_pause_removal(self):
        captions={'words':[{'s':1.4,'e':1.8,'w':'ressalva'}]}
        safe=server.protect_speech([[1,3]],captions,.3)
        self.assertEqual(len(safe),2)
        for a,b in safe:
            self.assertFalse(a<1.8 and b>1.4)
        segments=server.keep_segments(4,safe,.18)
        self.assertTrue(any(a<=1.4 and b>=1.8 for a,b in segments))
        self.assertEqual(server.protect_speech([[1,1.5]],{'words':[]},.65),[])

    def test_transcript_remaps_across_cut_and_keeps_original(self):
        original = {'blocks': [{'s': .5, 'e': 4, 'text': 'Antes pausa depois', 'words': [
            {'w':'Antes', 's':.5, 'e':1}, {'w':'pausa', 's':2, 'e':2.5}, {'w':'depois', 's':3.5, 'e':4}]}]}
        result = server.remap_transcript(original, [[0, 1.5], [3, 5]])
        self.assertEqual([w['w'] for w in result['words']], ['Antes', 'depois'])
        self.assertEqual(result['words'][1]['s'], 2)
        self.assertEqual(original['blocks'][0]['words'][2]['s'], 3.5)

    def test_silence_complement_and_breaths(self):
        self.assertEqual(server.keep_segments(10, [[2, 4], [7, 8]], .1), [[0, 2.1], [3.9, 7.1], [7.9, 10]])
        self.assertEqual(server.keep_segments(10, [], .1), [[0, 10]])

    def test_paths_and_settings(self):
        with self.assertRaises(ValueError):
            server.project_path("../outside")
        with self.assertRaises(ValueError):
            server.valid_settings({"format": "bad"})

    def test_review_is_bound_to_inputs(self):
        settings = server.valid_settings({})
        before = server.signature({"sha256": "a"}, settings, {"blocks": []})
        after = server.signature({"sha256": "a"}, {**settings, "title": "novo"}, {"blocks": []})
        self.assertNotEqual(before, after)

    def test_real_ffmpeg_preserves_source_and_removes_known_pause(self):
        with tempfile.TemporaryDirectory(prefix="editor-check-") as temporary:
            directory = Path(temporary)
            (directory / "brutos").mkdir()
            (directory / "edit").mkdir()
            for d in ["amostras", "final"]:
                (directory / d).mkdir()
            source = directory / "brutos/original.mp4"
            server.command(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=purple:s=320x240:r=30:d=4", "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-af", "volume=0:enable='between(t,1,2)'", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", source])
            original = source.read_bytes()
            meta = {"id": "0"*32, "sha256": "a", "name": "fixture", "settings":server.valid_settings({}), **server.probe(source)}
            server.write_json(directory / "projeto.json", meta)
            profile_durations = {}
            for rhythm in ['natural', 'agile']:
                profile_dir = directory / rhythm
                (profile_dir / 'brutos').mkdir(parents=True)
                (profile_dir / 'edit').mkdir()
                shutil.copyfile(source, profile_dir / 'brutos/original.mp4')
                server.cut_silence(profile_dir, dict(meta), lambda *args:None, rhythm)
                profile_durations[rhythm] = server.probe(profile_dir / 'edit/limpo.mp4')['duration']
                report = server.read_json(profile_dir / 'edit/cortes.json')
                self.assertEqual(report['rhythm'], rhythm)
            self.assertGreater(profile_durations['natural'], profile_durations['agile'] + .1)
            server.write_json(directory / 'edit/legendas.json', {'words': [], 'blocks': [
                {'s': .2, 'e': .5, 'text': 'Antes', 'words': [{'w':'Antes','s':.2,'e':.5}]},
                {'s': 2.5, 'e': 3, 'text': 'Depois', 'words': [{'w':'Depois','s':2.5,'e':3}]}]})
            server.cut_silence(directory, meta, lambda *args:None)
            self.assertEqual(source.read_bytes(), original)

            self.assertGreater(meta["removed"], .6)
            self.assertLess(meta["removed"], 1.2)
            self.assertTrue(server.probe(directory / "edit/limpo.mp4")["audio"])
            mapped = server.read_json(directory / 'edit/legendas.json')
            self.assertEqual([w['w'] for w in mapped['words']], ['Antes', 'Depois'])
            self.assertLess(mapped['words'][1]['s'], 2.5)
            self.assertTrue((directory / 'edit/transcricao-original.json').is_file())
            self.assertIn('Depois', (directory / 'edit/legendas.srt').read_text(encoding='utf-8'))
            server.edits.initialize(directory, meta, server.command, server.probe, lambda *args:None)
            automatic_options = server.automatic_edit.validate({'fades':True,'captions':True}, meta,
                server.edits.get_state(directory), True, False, '')
            summary = server.automatic_edit.execute(directory, meta, automatic_options, meta['settings'], '',
                lambda *args:None, lambda:False, server)
            self.assertIn('Fades', summary)
            timeline = server.edits.get_state(directory)
            self.assertEqual(len(timeline['document']['transitions']), 1)
            self.assertEqual(timeline['document']['transitions'][0]['duration'], .12)
            self.assertGreaterEqual(timeline['revision'], 1)
            server.edits.materialize(directory, meta, server.command, server.probe, lambda *args:None)
            self.assertTrue(server.probe(directory / 'edit/limpo.mp4')['audio'])
            self.assertEqual(source.read_bytes(), original)

            # A simulated AI selects noncontiguous speech; real FFmpeg materializes
            # the requested duration while preserving the original and undo history.
            options = server.automatic_edit.validate({'ai':True,'fades':True,'captions':True,'target_seconds':1.5},
                meta, server.edits.get_state(directory), True, True, 'Selecione as falas para 1,5 segundos')
            response = {'choices':[{'message':{'tool_calls':[{'function':{'name':'edit_timeline','arguments':json.dumps({
                'summary':'Falas escolhidas', 'coherence_review':{key:'Revisão simulada' for key in ('opening','development','conclusion','context_check')}, 'actions':[{'type':'timeline.select_ranges','params':{
                    'ranges':[{'start':0,'end':.9},{'start':2.2,'end':2.8}]}}]})}}]}}]}
            def selected_plan(state,prompt,progress,cancelled,**kwargs):
                self.assertEqual(kwargs,{'expected_target':1.5,'require_selection':True})
                return server.director.parse_response(response,state,**kwargs)
            with patch.object(server.director,'plan',side_effect=selected_plan):
                summary = server.automatic_edit.execute(directory,meta,options,meta['settings'],
                    'Selecione as falas para 1,5 segundos',lambda *args:None,lambda:False,server)
            self.assertIn('1.5 s validado',summary)
            self.assertAlmostEqual(server.edits.duration(server.edits.get_state(directory)['document']),1.5)
            self.assertAlmostEqual(server.probe(directory/'edit/limpo.mp4')['duration'],1.5,delta=.06)
            self.assertEqual(source.read_bytes(),original)

if __name__ == "__main__":
    unittest.main()
