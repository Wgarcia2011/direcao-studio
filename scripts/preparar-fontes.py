"""Copie fontes distribuíveis das dependências para os motores locais."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
for family in ('inter', 'syne'):
    package = root / f'app/node_modules/@fontsource/{family}'
    source = package / f'files/{family}-latin-400-normal.woff2'
    if not source.exists():
        raise SystemExit(f'Execute npm ci em app antes: {source}')
    folder = root / 'app/public/fonts'
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, folder / f'{family}.woff2')
    for license_name in ('LICENSE', 'LICENSE.txt'):
        if (package / license_name).exists():
            shutil.copy2(package / license_name, folder / f'{family}-LICENSE.txt')
            break
# Use Manrope with its bundled OFL instead of copying a Windows system font.
for folder in (root / 'app/public/fonts', root / 'app/remotion-project/public/fonts'):
    folder.mkdir(parents=True, exist_ok=True)
    for name in ('manrope-400.ttf', 'manrope-700.ttf', 'manrope-OFL.txt', 'sora-700.ttf', 'sora-OFL.txt'):
        shutil.copy2(root / 'app/public/assets' / name, folder / name)
    shutil.copy2(root / 'app/public/assets/manrope-700.ttf', folder / 'caption-impact.ttf')
