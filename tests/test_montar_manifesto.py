"""Contrato de montagem contra estado sintético; sem aplicativo ou vídeo pessoal."""
import copy
import json
from pathlib import Path
import socketserver
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import manifesto_analise as ma
import montar_manifesto as mm
import concat_rpc as rpc


class SyntheticConcat:
    def __init__(self, source, fail=None):
        self.source, self.fail = source, fail
        self.calls = []
        self.doc = {'activeTimelineId': 'tl-real', 'media': [], 'timelines': [
            {'id': 'tl-real', 'tracks': [{'id': 'track-real', 'visible': True, 'muted': False}], 'clips': []}]}

    def call(self, method, params):
        self.calls.append((method, copy.deepcopy(params)))
        if self.fail == method:
            raise TimeoutError('synthetic timeout')
        clips = self.doc['timelines'][0]['clips']
        result = {}
        if method == 'version':
            result = {'apiVersion': '1', 'capabilities': ['events', 'json-rpc']}
        elif method == 'project.document':
            result = self.doc
        elif method == 'media.import':
            self.doc['media'] = [{'id': 'media-real', 'path': str(self.source), 'duration': 15, 'width': 1920, 'height': 1080}]
        elif method == 'edit.apply':
            cmd = params['command']
            if cmd['op'] == 'addClip':
                cid = f'clip-{len(clips)}'
                clips.append({'id': cid, 'mediaId': cmd['mediaId'], 'trackId': cmd['trackId'],
                              'start': cmd['start'], 'duration': 15, 'sourceStart': 0})
                result = {'createdId': cid}
            elif cmd['op'] == 'trimClip':
                c = next(c for c in clips if c['id'] == cmd['clipId'])
                if cmd['edge'] == 'start':
                    c['start'] += cmd['delta']
                    c['sourceStart'] += cmd['delta']
                    c['duration'] -= cmd['delta']
                else:
                    c['duration'] += cmd['delta']
            elif cmd['op'] == 'moveClips':
                for move in cmd['moves']:
                    next(c for c in clips if c['id'] == move['clipId']).update(start=move['start'], trackId=move['trackId'])
            elif cmd['op'] == 'addTextClip':
                cid = f'text-{len(clips)}'
                clips.append({'id': cid, 'start': cmd['start'], 'duration': cmd['duration'], 'text': cmd['style']})
                result = {'createdId': cid}
            elif cmd['op'] == 'updateClip':
                next(c for c in clips if c['id'] == cmd['clipId']).update(cmd['patch'])
        return copy.deepcopy(result)


class MontageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=Path.home())
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.source = self.base / 'synthetic.txt'
        self.source.write_text('fixture sintetica', encoding='utf-8')
        words = [{'w': 'Pergunta?', 's': 2, 'e': 5}, {'w': 'Resposta.', 's': 8, 'e': 12}]
        candidates = [dict(start=w['s'], end=w['e'], text=w['w'], score=50,
                           criteria={'fixture': 50}, rationale='sintético') for w in words]
        self.manifest = ma.criar(self.source, 15, {'words': words},
                                {'version': 1, 'method': 'fixture', 'candidates': candidates}, 'sintetico')

    def run_mount(self, fake):
        return mm.montar(self.manifest, ['cut-0002', 'cut-0001'], self.base, 'Revisao', self.base / 'evidence', fake.call)

    def test_mount_verifies_source_offsets_and_order_and_closes_without_export(self):
        fake = SyntheticConcat(self.source)
        self.run_mount(fake)
        clips = fake.doc['timelines'][0]['clips']
        self.assertEqual([(c['sourceStart'], c['start'], c['duration']) for c in clips], [(8, 0, 4), (2, 4, 3)])
        methods = [m for m, _ in fake.calls]
        self.assertEqual(methods[-1], 'project.close')
        self.assertFalse(any(m.startswith('export.') for m in methods))
        for i, method in enumerate(methods):
            if method == 'edit.apply':
                self.assertEqual(methods[i + 1], 'project.document')
        result = ma.ler(self.base / 'evidence/resultado.json')
        self.assertEqual(result['review']['status'], 'pending')

    def test_timeout_never_retries_or_closes_and_leaves_journal(self):
        fake = SyntheticConcat(self.source, fail='edit.apply')
        with self.assertRaises(TimeoutError):
            self.run_mount(fake)
        self.assertEqual(sum(m == 'edit.apply' for m, _ in fake.calls), 1)
        self.assertNotIn('project.close', [m for m, _ in fake.calls])
        journal = [json.loads(line) for line in (self.base / 'evidence/operacoes.jsonl').read_text(encoding='utf-8').splitlines()]
        self.assertEqual(journal[-1]['state'], 'stopped')
        self.assertEqual(journal[-2]['state'], 'pending')
        with self.assertRaises(FileExistsError):
            self.run_mount(fake)

    def test_preset_and_native_captions(self):
        fake = SyntheticConcat(self.source)
        mm.montar(self.manifest, ['cut-0002'], self.base, 'Revisao', self.base / 'evidence',
                  fake.call, preset='shorts', captions=True)
        create = next(params for method, params in fake.calls if method == 'project.create')
        self.assertEqual(create['video']['height'], 1920)
        text = next(c for c in fake.doc['timelines'][0]['clips'] if c['id'].startswith('text-'))
        self.assertEqual(text['text']['content'], 'Resposta.')
        self.assertEqual(text['duration'], 4)

    def test_framing_crop_matches_requested_center(self):
        fake = SyntheticConcat(self.source)
        framing = {'manifest_sha256': ma.hash_json(self.manifest),
                   'suggestions': [{'candidate_id': 'cut-0002', 'center_x': .5, 'requires_manual_framing': False}]}
        mm.montar(self.manifest, ['cut-0002'], self.base, 'Revisao', self.base / 'evidence',
                  fake.call, preset='shorts', framing=framing)
        crop = fake.doc['timelines'][0]['clips'][0]['crop']
        self.assertAlmostEqual(crop['left'], crop['right'])
        self.assertGreater(crop['left'], 0)

    def test_silence_removal_protects_words_and_remaps(self):
        m = copy.deepcopy(self.manifest)
        c = m['candidates'][0]
        c.update(end=12, text='Pergunta? Resposta.')
        m['analysis']['detections'] = {'silences': [{'start': 5, 'end': 8}]}
        plan = ma.plano_concat(m, ['cut-0001'])
        result = mm.retirar_silencios(plan, m)
        self.assertEqual(len(result['clips']), 2)
        self.assertAlmostEqual(result['duration'], 7.3)
        self.assertEqual([w['w'] for c in result['clips'] for w in c['words']], ['Pergunta?', 'Resposta.'])
        self.assertEqual(result['clips'][1]['source_in'], 7.85)

    def test_preflight_refuses_changed_source_and_existing_project(self):
        fake = SyntheticConcat(self.source)
        (self.base / 'Revisao').mkdir()
        with self.assertRaises(ValueError):
            self.run_mount(fake)
        self.assertFalse(fake.calls)
        self.source.write_text('alterada')
        with self.assertRaises(ValueError):
            self.run_mount(fake)

    def test_document_mismatch_stops_before_save(self):
        fake = SyntheticConcat(self.source)
        original = fake.call
        def broken(method, params):
            result = original(method, params)
            if method == 'project.document' and result['timelines'][0]['clips']:
                result['timelines'][0]['clips'][0]['sourceStart'] = 99
            return result
        fake.call = broken
        with self.assertRaises(ValueError):
            self.run_mount(fake)
        self.assertNotIn('project.save', [m for m, _ in fake.calls])

    def test_actual_rpc_transport_with_synthetic_server(self):
        fake = SyntheticConcat(self.source)
        class Handler(socketserver.StreamRequestHandler):
            def handle(self):
                auth = json.loads(self.rfile.readline())
                assert auth['method'] == 'auth' and auth['params']['token'] == 'fixture-token'
                self.wfile.write(b'{"id":0,"result":{}}\n')
                self.wfile.flush()
                req = json.loads(self.rfile.readline())
                response = {'id': req['id'], 'result': fake.call(req['method'], req['params'])}
                self.wfile.write((json.dumps(response) + '\n').encode())
                self.wfile.flush()
        with socketserver.TCPServer(('127.0.0.1', 0), Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                settings = {'server': {'listen': f'127.0.0.1:{server.server_address[1]}', 'token': 'fixture-token'}}
                def call(method, params):
                    return rpc.invoke(settings, method, params)['result']
                mm.montar(self.manifest, ['cut-0002', 'cut-0001'], self.base, 'Revisao', self.base / 'evidence', call)
            finally:
                server.shutdown()
                thread.join()
        self.assertEqual(len(fake.doc['timelines'][0]['clips']), 2)
        self.assertNotIn('fixture-token', (self.base / 'evidence/operacoes.jsonl').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
