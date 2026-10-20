"""Baixa artefatos públicos compactos para CPU; saída deve ficar em .models (fora do Git)."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import tarfile
import urllib.request
import zipfile

ARTIFACTS = [
    ('llama-cpu.zip', 'https://github.com/ggml-org/llama.cpp/releases/download/b11756/llama-b11756-bin-win-cpu-x64.zip',
     'd164195b8f3e92f8fd92bc3a5c0eeaef8707b2f1a979e36360ce8192ebf4fbb3'),
    ('Qwen3-4B-Q4_K_M.gguf', 'https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf',
     '7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'),
    ('segmentation.tar.bz2', 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2', None),
    ('wespeaker.onnx', 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/wespeaker_en_voxceleb_resnet34_LM.onnx', None),
    ('LICENSE-QWEN3', 'https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/LICENSE', None),
    ('LICENSE-WESPEAKER', 'https://raw.githubusercontent.com/wenet-e2e/wespeaker/master/LICENSE', None),
]


def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def download(root, entry):
    name, url, expected = entry
    path = root / name
    if not path.exists():
        part = path.with_suffix(path.suffix + '.part')
        with urllib.request.urlopen(url, timeout=60) as response, part.open('xb') as f:
            while data := response.read(1024 * 1024):
                f.write(data)
        if expected and sha(part) != expected:
            raise ValueError(f'Checksum divergente: {name}')
        part.rename(path)
    digest = sha(path)
    if expected and digest != expected:
        raise ValueError(f'Checksum divergente: {name}')
    print(f'Conferido {name}: {path.stat().st_size} bytes', flush=True)
    return {'name': name, 'source': url, 'sha256': digest, 'bytes': path.stat().st_size,
            'verified_against_publisher_digest': bool(expected)}


def preparar(root):
    root = Path(root).resolve()
    if '.models' not in root.parts:
        raise ValueError('Destino deve estar dentro de .models para evitar versionamento')
    root.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        records = list(pool.map(lambda item: download(root, item), ARTIFACTS))
    runtime = root / 'llama-cpu'
    if not runtime.exists():
        with zipfile.ZipFile(root / 'llama-cpu.zip') as archive:
            for name in archive.namelist():
                if not (runtime / name).resolve().is_relative_to(runtime):
                    raise ValueError('Caminho inseguro em zip')
            archive.extractall(runtime)
    segmentation = root / 'sherpa-onnx-pyannote-segmentation-3-0'
    if not segmentation.exists():
        with tarfile.open(root / 'segmentation.tar.bz2') as archive:
            archive.extractall(root, filter='data')
    config = {'version': 1, 'semantic': {'provider': 'llama.cpp', 'endpoint': 'http://127.0.0.1:11435',
              'model': 'qwen-local', 'model_path': str(root / ARTIFACTS[1][0]),
              'server': str(next(runtime.rglob('llama-server.exe')))},
              'diarization': {'provider': 'sherpa-onnx', 'segmentation': str(segmentation / 'model.onnx'),
                              'embedding': str(root / 'wespeaker.onnx'), 'num_speakers': -1, 'max_distance': .35},
              'artifacts': records}
    (root / 'config.json').write_text(json.dumps(config, indent=2), encoding='utf-8')
    return root / 'config.json'


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pasta', type=Path, required=True)
    print(preparar(p.parse_args().pasta))
