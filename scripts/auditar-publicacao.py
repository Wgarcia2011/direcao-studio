"""Audita somente arquivos rastreados, sem imprimir conteudos ou segredos."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_DIRS = {'vendor', 'target', 'node_modules', '__pycache__', '.venv',
                  'portable', 'projetos', 'Renders', 'backups', 'versoes-do-editor',
                  'skills-locais', '.models', 'app', 'kit'}
FORBIDDEN_EXT = {'.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.mpeg', '.mpg',
                 '.m2ts', '.wmv', '.flv', '.gif', '.mts', '.vob', '.ogv', '.3gp',
                 '.mp3', '.wav', '.flac', '.aac', '.onnx', '.bin', '.exe', '.dll',
                 '.msi', '.zip', '.log', '.pyc'}


def problem(relative, path):
    if FORBIDDEN_DIRS.intersection(relative.parts):
        return True
    if relative.name in {'config.local.json', 'settings.json', 'dados-privados.json'}:
        return True
    if any(part.startswith('.env') and part != '.env.example' for part in relative.parts):
        return True
    if path.suffix.lower() in FORBIDDEN_EXT or path.stat().st_size > 50 * 1024**2:
        return True
    with path.open('rb') as stream:
        prefix = stream.read(16)
    # Assinaturas de video tambem pegam arquivos com extensao enganosa.
    if prefix[4:8] == b'ftyp' or prefix[:4] == b'\x1aE\xdf\xa3':
        return True
    if prefix[:4] == b'RIFF' and prefix[8:12] in {b'AVI ', b'WAVE'}:
        return True
    if path.suffix.lower() == '.ts':
        try:
            path.read_text(encoding='utf-8')
        except UnicodeError:
            return True
    return False


def main():
    data = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT)
    paths = [Path(p) for p in data.decode('utf-8').split('\0') if p]
    problems = []
    total = 0
    for relative in paths:
        path = ROOT / relative
        if not path.is_file():
            problems.append(relative)
            continue
        total += path.stat().st_size
        if problem(relative, path):
            problems.append(relative)
    for relative in problems:
        print(f'Arquivo indevido ou ausente: {relative}', file=sys.stderr)
    print(f'{len(paths)} arquivos, {total / 1024**2:.2f} MB, {len(problems)} problemas.')
    return bool(problems)


if __name__ == '__main__':
    sys.exit(main())
