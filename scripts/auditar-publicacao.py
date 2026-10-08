"""Audita a lista rastreada, sem imprimir conteúdos ou segredos."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VIDEO = {'.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.mpeg', '.mpg',
         '.m2ts', '.ts', '.wmv', '.flv', '.gif', '.mts', '.vob', '.ogv', '.3gp'}
FORBIDDEN = {'node_modules', '__pycache__', '.venv', '.gpu-venv', '.models',
             '.remotion', 'projetos', 'Renders', 'backups', 'Arquivos', 'models',
             'local-assets', 'templates-salvos', 'exportacao-github', 'validacao-github'}


def is_video(path):
    # .ts is also TypeScript: keep text source, reject MPEG transport streams.
    if path.suffix.lower() == '.ts':
        try:
            path.read_text(encoding='utf-8')
            return False
        except UnicodeError:
            return True
    with path.open('rb') as stream:
        prefix = stream.read(16)
    return (path.suffix.lower() in VIDEO or prefix[4:8] == b'ftyp'
            or prefix[:4] == b'\x1aE\xdf\xa3'
            or (prefix[:4] == b'RIFF' and prefix[8:12] == b'AVI '))


def main():
    result = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True, check=True)
    paths = [Path(p) for p in result.stdout.decode('utf-8').split('\0') if p]
    problems = []
    total = 0
    for relative in paths:
        path = ROOT / relative
        if not path.is_file():
            problems.append(f'Arquivo ausente: {relative}')
            continue
        total += path.stat().st_size
        if FORBIDDEN.intersection(relative.parts) or any(p.startswith('.env') and p != '.env.example' for p in relative.parts):
            problems.append(f'Arquivo local indevido: {relative}')
        if is_video(path):
            problems.append(f'Vídeo: {relative}')
        if path.stat().st_size > 50 * 1024**2:
            problems.append(f'Arquivo grande: {relative}')
    for problem in problems:
        print(problem, file=sys.stderr)
    print(f'{len(paths)} arquivos, {total / 1024**2:.2f} MB, {len(problems)} problemas.')
    return bool(problems)


if __name__ == '__main__':
    sys.exit(main())
