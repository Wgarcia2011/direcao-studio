"""Smoke test com vídeo sintético local: CLI, prévia e exportação Remotion."""
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0


def main():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    cache = ROOT / 'app/.cache'
    cache.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=cache) as folder:
        folder = Path(folder)
        source = folder / 'synthetic.mp4'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
            'color=c=purple:s=320x180:r=30:d=2', '-f', 'lavfi', '-i',
            'sine=frequency=440:duration=2', '-c:v', 'libx264', '-c:a', 'aac',
            '-shortest', str(source)], check=True, creationflags=flags)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        with (folder / 'server.log').open('wb') as log:
            process = subprocess.Popen([sys.executable, '-X', 'utf8', str(ROOT / 'app/server.py'),
                '--port', str(port)], cwd=ROOT, stdout=log, stderr=log, creationflags=flags)
            try:
                ready = False
                for _ in range(100):
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=1):
                            ready = True
                            break
                    except OSError:
                        time.sleep(.1)
                if not ready:
                    raise RuntimeError('Servidor não iniciou.')

                def cli(*args):
                    result = subprocess.run([sys.executable, str(ROOT / 'app/cli.py'), '--port', str(port), *args],
                        cwd=ROOT, capture_output=True, text=True, encoding='utf-8', creationflags=flags)
                    if result.returncode:
                        raise RuntimeError(result.stderr)
                    return json.loads(result.stdout)

                identifier = cli('import', str(source))['id']
                if '--transcribe' in sys.argv:
                    cli('run', identifier, 'legendar', '--wait')
                cli('run', identifier, 'editar', '--wait')
                actions = {'revision': 0, 'actions': [
                    {'type': 'timeline.limit', 'params': {'seconds': 1}},
                    {'type': 'settings.set', 'params': {'engine': 'remotion', 'acceleration': 'cpu', 'captions': False, 'title': 'Teste local'}},
                    {'type': 'overlay.add', 'params': {'kind': 'text', 'text': 'CLI validada', 'start': 0, 'duration': 1}}]}
                plan = folder / 'actions.json'
                plan.write_text(json.dumps(actions), encoding='utf-8')
                cli('actions', identifier, str(plan))
                cli('run', identifier, 'amostra', '--wait')
                # Approval here belongs only to the generated test fixture.
                cli('approve', identifier, '--reviewed')
                cli('run', identifier, 'exportar', '--wait')
                final = ROOT / 'projetos' / identifier / 'final/video.mp4'
                original = final.parents[1] / 'brutos/original.mp4'
                assert hashlib.sha256(original.read_bytes()).hexdigest() == digest
                info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
                    '-show_format', '-of', 'json', str(final)], creationflags=flags))
                assert abs(float(info['format']['duration']) - 1) < .1
                assert any(stream['codec_type'] == 'audio' for stream in info['streams'])
                print(json.dumps({'ok': True, 'project': identifier, 'port': port,
                    'duration': info['format']['duration'], 'original_preserved': True}, indent=2))
            finally:
                if os.name == 'nt':
                    # Windows venv launchers may spawn a child interpreter.
                    subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
                else:
                    process.terminate()
                process.wait(timeout=30)


if __name__ == '__main__':
    main()
