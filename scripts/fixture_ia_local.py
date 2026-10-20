"""Cria conversa sintética PT-BR com duas vozes OneCore já instaladas no Windows."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import wave
import manifesto_analise as ma

TURNS = [
    ('Daniel', 'A análise semântica identifica o assunto e avalia se uma explicação tem contexto suficiente para ser entendida sozinha.'),
    ('Maria', 'A diarização separa os intervalos de fala de pessoas diferentes. Ela cria rótulos de voz, mas não revela a identidade de ninguém.'),
    ('Daniel', 'Por exemplo, uma pergunta completa e a sua resposta podem formar um bom corte. Uma frase que depende de algo mencionado antes precisa de revisão.'),
    ('Maria', 'O editor Concat recebe os trechos selecionados e as legendas. A exportação final depende da aprovação humana da amostra atual.'),
]

SEMANTIC_CASES = [
    ('A fotossíntese é o processo pelo qual as plantas usam luz solar para produzir alimento a partir de água e gás carbônico.', True),
    ('Por isso ele fez aquilo. Isso mudou tudo, como eu já expliquei antes.', False),
    ('Para reduzir o ruído de um áudio, diminua os sons de fundo sem cortar a voz principal.', True),
    ('Ele fez isso por causa daquilo que vimos antes. Depois aconteceu aquela outra coisa.', False),
]


def fixture_semantica(folder):
    folder = Path(folder)
    source = folder / 'semantic-source.txt'
    with source.open('x', encoding='utf-8') as f:
        f.write('\n'.join(text for text, _ in SEMANTIC_CASES))
    words, candidates, at = [], [], 0
    for text, _ in SEMANTIC_CASES:
        start = at
        for word in text.split():
            words.append({'w': word, 's': at, 'e': at + .25})
            at += .25
        candidates.append({'start': start, 'end': at, 'text': text, 'score': 50,
                           'criteria': {'fixture': 50}, 'rationale': 'fixture textual sintética'})
        at += 1
    manifest = ma.criar(source, at, {'words': words}, {'version': 1, 'method': 'fixture', 'candidates': candidates}, 'fixture')
    ma.salvar(folder / 'semantic-manifest.json', manifest)
    ma.salvar(folder / 'semantic-expected.json', {c['id']: case[1] for c, case in zip(manifest['candidates'], SEMANTIC_CASES)})


def criar(folder):
    folder = Path(folder).resolve()
    folder.mkdir(parents=True, exist_ok=False)
    shell = shutil.which('pwsh') or shutil.which('powershell')
    if not shell:
        raise ValueError('Fixture exige Windows com vozes Daniel/Maria instaladas')
    def quote(s):
        return "'" + str(s).replace("'", "''") + "'"
    script = "$ErrorActionPreference='Stop'\n"
    for i, (voice, text) in enumerate(TURNS):
        token = f'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens\\MSTTS_V110_ptBR_{voice}M'
        script += ("$voice=New-Object -ComObject SAPI.SpVoice\n$token=New-Object -ComObject SAPI.SpObjectToken\n"
                   f"$token.SetId({quote(token)})\n$voice.Voice=$token\n"
                   "$stream=New-Object -ComObject SAPI.SpFileStream\n"
                   f"$stream.Open({quote(folder / f'turn-{i}.wav')},3,$false)\n"
                   f"$voice.AudioOutputStream=$stream\n$voice.Speak({quote(text)}) | Out-Null\n$stream.Close()\n")
    subprocess.run([shell, '-NoProfile', '-Command', script], check=True, capture_output=True)
    reference, frames = [], []
    rate = 16000
    silence = b'\0\0' * (rate // 2)
    frames.append(silence)
    at = .5
    for i, (voice, text) in enumerate(TURNS):
        normalized = folder / f'turn-{i}-16k.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(folder / f'turn-{i}.wav'),
                        '-ac', '1', '-ar', str(rate), '-c:a', 'pcm_s16le', str(normalized)], check=True)
        with wave.open(str(normalized)) as source:
            data = source.readframes(source.getnframes())
        duration = len(data) / (2 * rate)
        reference.append({'start': at, 'end': at + duration, 'speaker': voice, 'text': text})
        frames.extend([data, silence])
        at += duration + .5
    audio = folder / 'conversation.wav'
    with wave.open(str(audio), 'wb') as output:
        output.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        output.writeframes(b''.join(frames))
    (folder / 'reference.json').write_text(json.dumps({'synthetic': True, 'turns': reference}, ensure_ascii=False, indent=2), encoding='utf-8')
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30',
                    '-i', str(audio), '-shortest', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac',
                    str(folder / 'conversation.mp4')], check=True)
    fixture_semantica(folder)
    return folder


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pasta', type=Path, required=True)
    print(criar(p.parse_args().pasta))
