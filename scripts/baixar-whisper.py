"""Download explícito do modelo; os vídeos não são enviados."""
from pathlib import Path
from huggingface_hub import snapshot_download

destination = Path(__file__).resolve().parents[1] / '.models/whisper-small'
snapshot_download('Systran/faster-whisper-small', local_dir=str(destination),
                  allow_patterns=['*.json', '*.bin', '*.txt'])
print(f'Modelo Whisper disponível em {destination}')
