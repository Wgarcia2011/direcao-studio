"""Contrato do cliente testado contra um servidor sintetico, sem videos."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import socket
import threading
import unittest

spec = importlib.util.spec_from_file_location('rpc', Path(__file__).resolve().parents[1] / 'scripts/concat_rpc.py')
rpc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rpc)


class FakeServer:
    def __init__(self, handler):
        self.handler = handler
        self.socket = socket.socket()
        self.socket.bind(('127.0.0.1', 0))
        self.socket.listen(1)
        self.socket.settimeout(5)
        self.port = self.socket.getsockname()[1]
        self.requests = []
        self.errors = []

    def __enter__(self):
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()
        return self

    def run(self):
        try:
            with self.socket.accept()[0] as connection, connection.makefile('rwb') as stream:
                def read():
                    value = json.loads(stream.readline())
                    self.requests.append(value)
                    return value

                def send(value):
                    stream.write((json.dumps(value) + '\n').encode())
                    stream.flush()

                self.handler(read, send)
        except Exception as error:
            self.errors.append(error)

    def __exit__(self, *args):
        self.thread.join(6)
        self.socket.close()
        if not args[0] and self.errors:
            raise self.errors[0]

    def settings(self):
        return {'server': {'enabled': True, 'listen': f'127.0.0.1:{self.port}', 'token': 'synthetic-secret'}}


def auth(read, send):
    assert read()['params']['token'] == 'synthetic-secret'
    send({'id': 0, 'result': {}})


class ClientTests(unittest.TestCase):
    def test_auth_and_utf8_params(self):
        def handler(read, send):
            auth(read, send)
            self.assertEqual(read()['params']['name'], 'Edição')
            send({'id': 1, 'result': {'ok': True}})
        with FakeServer(handler) as server:
            settings = server.settings()
            settings['server']['enabled'] = False  # Preferencia salva por outra janela.
            self.assertTrue(rpc.invoke(settings, 'project.create', {'name': 'Edição'})['result']['ok'])
            self.assertEqual(len(server.requests), 2)

    def test_export_event_before_reply_and_unrelated_event(self):
        def handler(read, send):
            auth(read, send)
            read()
            send({'method': 'export.done', 'params': {'job': 'other'}})
            send({'method': 'export.done', 'params': {'job': 'j1'}})
            send({'id': 1, 'result': {'job': 'j1'}})
        with FakeServer(handler) as server:
            self.assertEqual(rpc.invoke(server.settings(), 'export.run', {}, wait=True)['params']['job'], 'j1')

    def test_failed_export_is_failure(self):
        def handler(read, send):
            auth(read, send)
            read()
            send({'id': 1, 'result': {'job': 'j1'}})
            send({'method': 'export.failed', 'params': {'job': 'j1'}})
        with FakeServer(handler) as server, self.assertRaises(rpc.RpcError):
            rpc.invoke(server.settings(), 'export.run', {}, wait=True)

    def test_mutation_is_never_retried_after_disconnect(self):
        def handler(read, send):
            auth(read, send)
            read()
        with FakeServer(handler) as server:
            with self.assertRaises(rpc.RpcError):
                rpc.invoke(server.settings(), 'edit.apply', {})
            self.assertEqual([r['method'] for r in server.requests], ['auth', 'edit.apply'])

    def test_auth_error_does_not_disclose_token(self):
        def handler(read, send):
            read()
            send({'id': 0, 'error': {'message': 'synthetic-secret'}})
        with FakeServer(handler) as server:
            with self.assertRaises(rpc.RpcError) as caught:
                rpc.invoke(server.settings(), 'version', {})
            self.assertNotIn('synthetic-secret', str(caught.exception))

    def test_reject_remote_endpoint(self):
        settings = {'server': {'enabled': True, 'listen': '192.0.2.1:7420', 'token': 'x'}}
        with self.assertRaises(rpc.RpcError):
            rpc.endpoint(settings)

    def test_export_requires_review_intent(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
            rpc.main(['export.run'])
        self.assertEqual(caught.exception.code, 2)

    def test_read_failure_returns_nonzero_without_private_path(self):
        output = io.StringIO()
        with contextlib.redirect_stderr(output):
            self.assertEqual(rpc.main(['version', '--settings', '/missing/private/settings.json']), 1)
        self.assertNotIn('private', output.getvalue())


if __name__ == '__main__':
    unittest.main()
