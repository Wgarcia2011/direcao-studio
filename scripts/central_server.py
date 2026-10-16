"""Central local de planejamento. Somente Concat edita a timeline."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
CENTRAL = ROOT / 'central'
PUBLIC = {'index.html', 'style.css', 'app.js', 'catalog.json',
          'fonts/Manrope.ttf', 'fonts/Sora.ttf', 'motion-player.js', 'motion-preview.html'}


def executable(root=ROOT):
    config = root / 'config.local.json'
    path = root / 'vendor/concat/PFiles64/Concat/concat.exe'
    if config.is_file():
        path = Path(json.loads(config.read_text(encoding='utf-8-sig'))['executable'])
    if path.name.lower() != 'concat.exe' or not path.is_file():
        raise ValueError('Configure o Concat com INSTALAR.ps1.')
    return path


def allowed_host(host, port):
    return host in {f'127.0.0.1:{port}', f'localhost:{port}'}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, status, body, content_type='application/json; charset=utf-8'):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(body)

    def check_host(self):
        return allowed_host(self.headers.get('Host'), self.server.server_port)

    def do_GET(self):
        if not self.check_host():
            self.reply(403, {'error': 'Host recusado'})
            return
        name = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        if name == 'api/health':
            self.reply(200, {'app': 'direcao-central', 'editor': 'concat', 'motion': ['remotion', 'hyperframes']})
        elif name in PUBLIC and (CENTRAL / name).is_file():
            self.reply(200, (CENTRAL / name).read_bytes(), mimetypes.guess_type(name)[0] or 'application/octet-stream')
        else:
            self.reply(404, {'error': 'Arquivo nao disponivel'})

    def do_POST(self):
        port = self.server.server_port
        if not self.check_host() or self.headers.get('Origin') not in {f'http://127.0.0.1:{port}', f'http://localhost:{port}'}:
            self.reply(403, {'error': 'Origem recusada'})
            return
        if self.path != '/api/open-editor' or self.headers.get('Content-Type') != 'application/json':
            self.reply(404, {'error': 'Acao nao disponivel'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 0 or length > 1024:
                raise ValueError('payload')
            if json.loads(self.rfile.read(length)) != {}:
                raise ValueError('payload')
            path = executable()
            subprocess.Popen([str(path)], cwd=path.parent)
            self.reply(200, {'opened': True})
        except (OSError, ValueError, KeyError):
            self.reply(409, {'error': 'Configure o Concat com INSTALAR.ps1.'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8790)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('Porta invalida')
    with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
        print(f'Central: http://127.0.0.1:{args.port}', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    main()
