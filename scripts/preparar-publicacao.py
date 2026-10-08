"""Monte uma distribuição limpa sem modificar os projetos e o Git interno."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'exportacao-github/direcao-studio'
DEST.mkdir(parents=True, exist_ok=True)


def copy(relative):
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / relative, target)
    if target.suffix in {'.js', '.cjs', '.py', '.txt'}:
        content = target.read_text(encoding='utf-8-sig')
        content = '\n'.join(line.rstrip() for line in content.splitlines()).rstrip() + '\n'
        target.write_text(content, encoding='utf-8')


for name in ('.gitignore', 'README.md', 'CLAUDE.md', 'requirements.txt', 'requirements-lock.txt', 'INSTALAR.ps1', 'INICIAR.ps1'):
    copy(Path(name))
for name in ('meia-briefing-de-edicao', 'meia-legendas-e-enquadramento',
             'meia-revisao-economia', 'remotion-best-practices'):
    source = ROOT / '.agents/skills' / name
    for path in source.rglob('*'):
        if path.is_file():
            copy(path.relative_to(ROOT))
    # Claude discovers the project skills here; references remain in one place.
    entry = DEST / '.claude/skills' / name / 'SKILL.md'
    entry.parent.mkdir(parents=True, exist_ok=True)
    header = (source / 'SKILL.md').read_text(encoding='utf-8').split('---', 2)[1]
    canonical = f'../../../.agents/skills/{name}/SKILL.md'
    entry.write_text('---' + header + '---\n\n'
        f'Leia integralmente a [skill completa]({canonical}) antes de executar.\n'
        'Os arquivos de referência e apoio acompanham a skill completa; resolva\n'
        'os caminhos relativos a partir da pasta dela. Aplique somente as\n'
        'orientações pertinentes ao pedido e respeite a autorização do usuário.\n',
        encoding='utf-8')
for folder in ('docs', 'scripts'):
    for path in (ROOT / folder).glob('*'):
        if path.is_file():
            copy(path.relative_to(ROOT))
modules = ['server', 'cli', 'assembly_flow', 'asset_registry', 'automatic_edit',
           'deepseek_director', 'directed_edit', 'editing_actions', 'matting_cpu',
           'motion_studio', 'podcast_lote', 'remotion_engine']
for name in modules:
    copy(Path('app') / (name + '.py'))
copy(Path('app/THIRD_PARTY_NOTICES.txt'))
for path in (ROOT / 'app/third-party').glob('*'):
    if path.is_file():
        copy(path.relative_to(ROOT))
for name in ('package.json', 'package-lock.json'):
    copy(Path('app') / name)
for path in (ROOT / 'app/public').glob('*'):
    if path.is_file() and path.suffix in {'.js', '.css', '.html'} and path.name != 'remotion-player.js':
        copy(path.relative_to(ROOT))
for path in (ROOT / 'app/public/assets').glob('*'):
    if path.name in {'manrope-400.ttf', 'manrope-700.ttf', 'sora-700.ttf', 'manrope-OFL.txt', 'sora-OFL.txt'}:
        copy(path.relative_to(ROOT))
for path in (ROOT / 'app/tests').glob('test_*.py'):
    copy(path.relative_to(ROOT))
for folder in ('src',):
    for path in (ROOT / 'app/remotion-project' / folder).rglob('*'):
        if path.is_file() and path.suffix in {'.ts', '.tsx', '.css'}:
            copy(path.relative_to(ROOT))
for name in ('package.json', 'package-lock.json', '.gitignore', '.prettierrc',
             'eslint.config.mjs', 'tsconfig.json', 'remotion.config.ts', 'render.cjs',
             'download-model.mjs', 'build-player.cjs'):
    copy(Path('app/remotion-project') / name)
copy(Path('kit/editor-video-ia/scripts/transcribe.py'))
# The runtime keeps the catalog API, with no assets/documents from the course.
catalog = json.loads((ROOT / 'app/public/course/catalog.json').read_text(encoding='utf-8'))
clean = {'methods': catalog['methods'], 'assets': [], 'lessons': [], 'resources': [], 'source': 'Direção Studio'}
folder = DEST / 'app/public/course'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'catalog.json').write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding='utf-8')
index = DEST / 'app/public/index.html'
text = index.read_text(encoding='utf-8')
import re
text = re.sub(r'<a href="course/(?:pacote|resources)/[^\"]+"[^>]*>.*?</a>', '', text)
index.write_text(text, encoding='utf-8')
course = DEST / 'app/public/course-ui.js'
text = course.read_text(encoding='utf-8').replace('Métodos, comandos e imagens dos arquivos fornecidos.', 'Comandos de edição e seus assets locais.').replace('Imagens da aula de cripto', 'Imagens da biblioteca')
course.write_text(text, encoding='utf-8')
(DEST / 'SKILL.md').write_text('''---
name: direcao-studio
description: Edite vídeos locais pelo chat usando a CLI validada do Direção Studio.
---

# Direção Studio

Leia CLAUDE.md, README.md e docs/CLI.md na raiz do projeto antes de operar.
Use app/cli.py e os motores existentes. Preserve brutos e contexto da fala.
Gere uma amostra, apresente ao usuário e exporte após sua aprovação explícita.
Não inclua vídeos, projetos locais, modelos ou chaves no Git.
''', encoding='utf-8')
(DEST / 'LEIA-ME.txt').write_text('Instalação e uso: README.md. Claude Code: CLAUDE.md e docs/CLI.md.\n', encoding='utf-8')
print(DEST)
