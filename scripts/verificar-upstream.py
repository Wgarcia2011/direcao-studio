"""Verifica o snapshot importado sem precisar acessar a pasta original."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'editor'


def main():
    manifest = json.loads((ROOT / 'UPSTREAM.json').read_text(encoding='utf-8'))
    problems = []
    for name, expected in manifest['sha256'].items():
        path = ROOT / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            problems.append(name)
    for name in problems:
        print('Fonte ausente ou alterado:', name)
    print(f"{len(manifest['sha256'])} arquivos upstream; {len(problems)} divergencias.")
    return bool(problems)


if __name__ == '__main__':
    raise SystemExit(main())
