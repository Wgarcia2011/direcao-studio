"""Contrato da CLI contra a API real, sem projetos/mídias do usuário."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
import cli
import remotion_engine


class LocalCLI(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.projects = self.root / 'projetos'
        self.projects.mkdir()
        self.patch = patch.object(server, 'PROJECTS', self.projects)
        self.patch.start()
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        self.worker = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.worker.start()
        self.client = cli.Client(self.http.server_port)

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.worker.join()
        self.patch.stop()
        self.temp.cleanup()

    def test_stream_import_actions_and_export_gate(self):
        video = self.root / 'synthetic.mp4'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
                        'color=c=purple:s=160x90:r=30:d=2', '-f', 'lavfi', '-i',
                        'sine=frequency=440:duration=2', '-c:v', 'libx264', '-c:a',
                        'aac', '-shortest', str(video)], check=True)
        digest = hashlib.sha256(video.read_bytes()).hexdigest()
        project = self.client.upload(video)
        identifier = project['id']
        job = self.client.request('/api/jobs', {'project': identifier, 'action': 'editar', 'settings': project['settings']})
        deadline = time.monotonic() + 30
        while job['state'] in ('waiting', 'running') and time.monotonic() < deadline:
            time.sleep(.05)
            job = self.client.request('/api/jobs/' + job['id'])
        self.assertEqual(job['state'], 'done', job.get('message'))
        edited = self.client.request('/api/actions', {'project': identifier, 'revision': 0, 'actions': [
            {'type': 'overlay.add', 'params': {'kind': 'text', 'text': 'Teste', 'start': 0, 'duration': 1}}]})
        self.assertEqual(edited['edit_state']['revision'], 1)
        with self.assertRaises(cli.urllib.error.HTTPError):
            self.client.request('/api/actions', {'project': identifier, 'revision': 0, 'actions': []})
        with self.assertRaises(cli.urllib.error.HTTPError):
            self.client.request('/api/approve', {'project': identifier, 'settings': project['settings']})
        original = self.projects / identifier / 'brutos/original.mp4'
        self.assertEqual(hashlib.sha256(original.read_bytes()).hexdigest(), digest)
        self.assertTrue(self.client.request('/api/health')['local'])

    def test_cli_returns_nonzero_for_failed_job(self):
        with patch.object(cli.Client, 'request', return_value={'state': 'error', 'message': 'Falha controlada'}), \
             patch.object(sys, 'argv', ['cli.py', 'job', 'test']), \
             patch.object(sys, 'stderr', io.StringIO()) as output:
            self.assertEqual(cli.main(), 1)
            self.assertEqual(json.loads(output.getvalue())['error'], 'Falha controlada')

    def test_configurable_render_origin(self):
        root = self.root / 'origin'
        (root / 'brutos').mkdir(parents=True)
        (root / 'edit').mkdir()
        (root / 'brutos/original.mp4').write_bytes(b'synthetic fixture')
        with patch.object(remotion_engine, 'BASE_URL', 'http://127.0.0.1:8876'), \
             patch.object(remotion_engine, 'PROJECT', self.root / 'remotion'), \
             patch.object(remotion_engine.asset_registry, 'assets', return_value=[]):
            props = remotion_engine.prepare(root, {'id': 'a'*32, 'audio': False},
                server.valid_settings({}), False, lambda *a, **k: ('', ''),
                lambda p: {'duration': 2}, lambda *a: None)
        self.assertTrue(json.loads(props.read_text())['source'].startswith('http://127.0.0.1:8876/'))


if __name__ == '__main__':
    unittest.main()
