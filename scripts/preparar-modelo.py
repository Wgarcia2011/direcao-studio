"""Obtém o modelo embutido e duas fixtures sintéticas, sem versioná-los."""
import hashlib
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = ('https://raw.githubusercontent.com/jub0t/Concat/'
        'afe8383cef9ec0ce17b4c8f438292d848fbfaf21/')
RESOURCES = {
    'src/crates/concat-vision/models/selfie-segmentation.onnx':
        '3241ac4ad8aa35bdaf33946776db29f7c283a413aa0b0dacb9483594b4531aad',
    'src/crates/concat-media/fixtures/starts-at-1.4s.ts':
        'f3a7eba713e5b977cf2cac0f29adf183cf285fc74e25f0574f40f13d374130c9',
    'src/crates/concat-media/fixtures/tone-at-1s.ts':
        '56037c7bd26eaf2d446792998d110e66a66b5128625089a7a5b1074ce7152f62',
}


def main():
    for relative, expected in RESOURCES.items():
        target = ROOT / 'editor' / relative
        if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            continue
        with urlopen(BASE + relative, timeout=60) as response:
            data = response.read(2 * 1024 * 1024)
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError('Checksum incorreto: recurso nao foi salvo.')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print('Modelo e fixtures sinteticas verificados (ignorados pelo Git).')


if __name__ == '__main__':
    main()
