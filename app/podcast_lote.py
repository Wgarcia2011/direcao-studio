"""Lote local do podcast: transcrição, planos editoriais e entregas verificadas."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import threading
import time
import uuid

import server
from assembly_flow import apply_join_fades, breathing_volume_filter, protect_speech

ROOT = Path(__file__).resolve().parent.parent
BATCH = ROOT / 'Renders/NOVOS/podcast'
MANIFEST = BATCH / 'LOTE-PODCAST.json'
LOCK = threading.Lock()


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(4*1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def render_command(args, **kwargs):
    # Leave CPU available for the two transcription workers.
    args = list(args)
    if str(args[0]) == 'ffmpeg':
        if '-filter_complex_script' in args:
            graph = Path(args[args.index('-filter_complex_script')+1]).read_text(encoding='utf-8')
            video = re.search(r'^\[0:v\]trim=start=0\.0:end=([\d.]+),setpts=PTS-STARTPTS,fps=30,setsar=1\[v0\]',graph)
            audio = re.search(r'\[0:a\](atrim=start=0\.0:end=[\d.]+,asetpts=PTS-STARTPTS,volume=1,afade=[^;]+)\[a0\]',graph)
            if video and audio and 'concat=n=1:v=1:a=1' in graph:
                source = args[args.index('-i')+1]
                raw,_ = server.command(['ffprobe','-v','error','-select_streams','v:0',
                    '-show_entries','stream=codec_name,r_frame_rate,avg_frame_rate,sample_aspect_ratio',
                    '-of','json',source])
                stream = json.loads(raw)['streams'][0]
                if stream['codec_name']=='h264' and stream['r_frame_rate']=='30/1' and stream['avg_frame_rate']=='30/1' and stream.get('sample_aspect_ratio') in ('1:1',None):
                    # A continuous clip starting at frame zero needs no video
                    # re-encode; retain source quality and apply only audio fades.
                    return server.command(['ffmpeg','-y','-v','error','-i',source,
                        '-t',video.group(1),'-map','0:v:0','-map','0:a:0','-c:v','copy',
                        '-af',audio.group(1),'-c:a','aac','-ar','48000','-threads','4',
                        '-movflags','+faststart',args[-1]],**kwargs)
        args[1:1] = ['-filter_complex_threads','2']
        args[-1:-1] = ['-threads','4']
    return server.command(args, **kwargs)


def read():
    return server.read_json(MANIFEST)


def update(number, **fields):
    with LOCK:
        # Serialize updates across the render and transcription processes too.
        import msvcrt
        with (BATCH/'.lote.lock').open('a+b') as guard:
            if guard.tell() == 0:
                guard.write(b'0'); guard.flush()
            guard.seek(0)
            msvcrt.locking(guard.fileno(),msvcrt.LK_LOCK,1)
            try:
                data = read()
                row = next(x for x in data['items'] if x['number'] == number)
                row.update(fields)
                temp = MANIFEST.with_name(f'.lote-{uuid.uuid4().hex}.tmp')
                temp.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
                for attempt in range(20):
                    try:
                        temp.replace(MANIFEST)
                        break
                    except PermissionError:
                        if attempt == 19: raise
                        time.sleep(.05)
            finally:
                guard.seek(0)
                msvcrt.locking(guard.fileno(),msvcrt.LK_UNLCK,1)


def reading_text(words):
    rows, line = [], []
    for word in words:
        line.append(word)
        if word['w'].endswith(('.', '?', '!')) or word['e']-line[0]['s'] > 15:
            rows.append(f"[{line[0]['s']:.2f}–{line[-1]['e']:.2f}] " + ' '.join(w['w'] for w in line))
            line = []
    if line:
        rows.append(f"[{line[0]['s']:.2f}–{line[-1]['e']:.2f}] " + ' '.join(w['w'] for w in line))
    return '\n'.join(rows)


def prepare():
    for row in read()['items']:
        folder = Path(row['folder'])
        assert folder.resolve().is_relative_to(BATCH.resolve())
        (folder/'analise').mkdir(parents=True, exist_ok=True)
        if row.get('project'):
            continue
        if row['sha256'] == 'd5b4755a08c406a510b30f1211dd78fa8db6f36f4b7144663c6e01b9dca0cc77':
            project = '2c41abb1bde94aada9aedc52cb162da7'
        else:
            project = uuid.uuid4().hex
            directory = ROOT/'projetos'/project
            for sub in ['brutos', 'edit', 'amostras', 'final', 'composicao', 'assets']:
                (directory/sub).mkdir(parents=True, exist_ok=True)
            original = directory/'brutos/original.mp4'
            shutil.copy2(row['source'], original)
            assert sha(original) == row['sha256']
            meta = {'id': project, 'name': f"{row['number']:02d} — {Path(row['name']).stem}",
                    'created': time.time(), 'sha256': row['sha256'],
                    **{k: row[k] for k in ['duration', 'width', 'height', 'audio']},
                    'removed': 0, 'segments': [[0, row['duration']]],
                    'settings': server.valid_settings({'format':'16:9', 'captions':False, 'title':''})}
            server.write_json(directory/'projeto.json', meta)
        update(row['number'], project=project, status='imported')
        print('IMPORTADO', row['number'], row['name'], flush=True)


def transcribe_all():
    prepare()
    from faster_whisper import WhisperModel
    spec = importlib.util.spec_from_file_location('podcast_transcribe', ROOT/'kit/editor-video-ia/scripts/transcribe.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    model = WhisperModel(str(server.whisper_model()), device='cpu', compute_type='int8',
                         cpu_threads=8, num_workers=2)

    def one(row):
        directory = ROOT/'projetos'/row['project']
        path = directory/'edit/transcricao-original.json'
        if not path.exists():
            print('TRANSCREVENDO', row['number'], row['name'], flush=True)
            segments, _ = model.transcribe(str(directory/'brutos/original.mp4'), language='pt',
                                            word_timestamps=True, vad_filter=True, beam_size=5)
            words = [{'w': w.word.strip(), 's': round(w.start,3), 'e': round(w.end,3)}
                     for segment in segments for w in (segment.words or []) if w.word.strip()]
            captions = {'words': words, 'blocks': module.group(words,3,.4)}
            server.write_json(path, captions)
            server.write_json(directory/'edit/legendas.json', captions)
        captions = server.read_json(path)
        out = Path(row['folder'])/'analise'
        server.write_json(out/'transcricao-original.json', captions)
        (out/'transcricao-leitura.txt').write_text(reading_text(captions['words']), encoding='utf-8')
        update(row['number'], status='transcribed', word_count=len(captions['words']))
        print('TRANSCRICAO PRONTA', row['number'], len(captions['words']), flush=True)

    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = {pool.submit(one,row): row for row in read()['items']}
        for job in as_completed(jobs):
            try:
                job.result()
            except Exception as error:
                row = jobs[job]
                update(row['number'], status='transcription_error', error=str(error))
                print('ERRO', row['number'], str(error), flush=True)


def prepare_base(row):
    directory = ROOT/'projetos'/row['project']
    meta = server.read_json(directory/'projeto.json')
    if server.edits.get_state(directory):
        return directory, meta
    words = server.read_json(directory/'edit/transcricao-original.json')
    _, log = server.command(['ffmpeg','-hide_banner','-nostats','-i',directory/'brutos/original.mp4',
                            '-vn','-af','silencedetect=noise=-30dB:d=0.25','-f','null','-'],timeout=300)
    candidates, start = [], None
    for event,value in re.findall(r'silence_(start|end):\s*(-?[\d.]+)',log):
        if event == 'start':
            start = max(0,float(value))
        elif start is not None:
            end = min(row['duration'],float(value))
            if .25 <= end-start <= 1.2:
                candidates.append([start,end])
            start = None
    candidates = protect_speech(candidates,words,.25,margin=.10)
    candidates = [[a,b] for a,b in candidates if any(w['e']<=a for w in words['words'])
                  and any(w['s']>=b for w in words['words'])]
    volume = breathing_volume_filter(candidates).rstrip(',')
    args = ['ffmpeg','-y','-v','error','-i',directory/'brutos/original.mp4',
            '-map','0:v:0','-map','0:a:0','-c:v','copy']
    if volume:
        args += ['-af',volume]
    args += ['-c:a','aac','-ar','48000','-b:a','192k','-movflags','+faststart',directory/'edit/limpo.mp4']
    server.command(args)
    info = server.probe(directory/'edit/limpo.mp4')
    assert abs(info['duration']-row['duration']) < .15
    meta['clean_duration'] = row['duration']
    server.write_json(directory/'projeto.json',meta)
    server.write_json(directory/'edit/legendas.json',words)
    server.write_json(directory/'edit/cortes.json',{'rhythm':'natural','breath_mode':'attenuate',
                      'breath_candidates':candidates,'removed_intervals':[], 'segments':[[0,row['duration']]]})
    server.edits.initialize(directory,meta,server.command,server.probe,lambda s,p:None)
    return directory, meta


def render(number=None):
    for row in read()['items']:
        if number is not None and row['number'] != number:
            continue
        plan_path = Path(row['folder'])/'analise/planos.json'
        if not plan_path.exists():
            continue
        plans = server.read_json(plan_path)
        done = {r['filename']:r for r in row.get('deliveries',[])}
        source, source_meta = prepare_base(row)
        for plan in plans:
            if plan['filename'] in done and Path(done[plan['filename']]['path']).exists():
                continue
            ranges = plan['ranges']
            total = sum(b-a for a,b in ranges)
            assert total <= 150 and ranges and all(0 <= a < b <= row['duration'] for a,b in ranges)
            assert all(ranges[i][1] <= ranges[i+1][0] for i in range(len(ranges)-1))
            identifier = uuid.uuid4().hex
            directory = ROOT/'projetos'/identifier
            for sub in ['brutos','edit','amostras','final','composicao','assets']:
                (directory/sub).mkdir(parents=True,exist_ok=True)
            for relative in ['brutos/original.mp4','edit/base-timeline.mp4','edit/waveform.json','edit/cortes.json']:
                shutil.copy2(source/relative,directory/relative)
            state = deepcopy(server.edits.get_state(source))
            state.update(revision=0, undo=[], redo=[], audit=[])
            server.edits.write(directory/'edit/timeline.json',state)
            meta = {**source_meta,'id':identifier,'name':plan['title'],'created':time.time(),
                    'source_project':row['project'],'preview_signature':None,'approved_signature':None,'final_signature':None}
            server.write_json(directory/'projeto.json',meta)
            state = server.edits.execute(directory,0,[{'type':'timeline.select_ranges',
                    'params':{'ranges':[{'start':a,'end':b} for a,b in ranges]}}])
            apply_join_fades(directory,server.edits,.12)
            state = server.edits.get_state(directory)
            boundaries=[]
            words=state['base_captions']['words']
            for clip in state['document']['clips']:
                a,b=clip['in']/30,clip['out']/30
                # The timeline uses 30 fps; allow only its <= 1/2-frame rounding
                # at a chosen word edge, never a cut inside a spoken word.
                crossing=[w for w in words if w['s']+.02<a<w['e']-.02 or w['s']+.02<b<w['e']-.02]
                assert not crossing,crossing
                inside=[w for w in words if a<=w['s']<b]
                boundaries.append({'start':a,'end':b,'first_words':inside[:8],'last_words':inside[-8:]})
            print('RENDERIZANDO',row['number'],plan['filename'],flush=True)
            server.edits.materialize(directory,meta,render_command,server.probe,lambda s,p:None)
            media=directory/'edit/limpo.mp4'
            duration=server.probe(media)['duration']
            assert duration <= 150.05 and abs(duration-server.edits.duration(state['document']))<.1
            server.command(['ffmpeg','-v','error','-i',media,'-f','null','-'])
            output=Path(row['folder'])/plan['filename']
            assert not output.exists(),output
            shutil.copy2(media,output)
            checksum=sha(media)
            assert checksum==sha(output)
            report={**plan,'project':identifier,'path':str(output),'duration':duration,'sha256':checksum,
                    'source_sha256':row['sha256'],'boundaries':boundaries,'full_decode_verified':True,
                    'captions':False,'overlays':[],'speed':1.0}
            server.write_json(directory/'edit/plano-e-verificacao.json',report)
            server.write_json(Path(row['folder'])/'analise'/f"{output.stem}-verificacao.json",report)
            done[plan['filename']]=report
            update(row['number'],deliveries=list(done.values()),status='rendered')
            print('SALVO',output,duration,flush=True)


def finalize():
    data=read()
    for row in data['items']:
        # Recover published deliveries even after an interrupted index update.
        verified=[]
        for report_path in sorted((Path(row['folder'])/'analise').glob('*-verificacao.json')):
            report=server.read_json(report_path)
            if Path(report.get('path','')).is_file():
                verified.append(report)
        if verified:
            row['deliveries']=verified
            update(row['number'],deliveries=verified)
        if not row.get('deliveries'):
            continue
        folder=Path(row['folder']).resolve()
        original=folder/f"{row['number']:02d}.00 - ORIGINAL - {row['name']}"
        source=Path(row['source']).resolve()
        assert folder.is_relative_to(BATCH.resolve()) and source.is_relative_to(BATCH.resolve())
        if source!=original:
            assert not original.exists()
            shutil.move(str(source),str(original))
            assert sha(original)==row['sha256']
        update(row['number'],source=str(original),status='complete')
    data=read()
    lines=['LOTE PODCAST — cortes de até 2min30s','Perguntas reais e completas; contexto; conclusões; áudio natural; sem legendas/efeitos; velocidade original.','']
    for row in data['items']:
        lines.append(f"{row['number']:02d} — {row['name']} — {row['status']}")
        for cut in row.get('deliveries',[]):
            lines.append(f"  {cut['filename']} — {cut['duration']:.2f}s")
            lines.append(f"  {cut.get('context','')}")
    (BATCH/'INDICE-DOS-CORTES.txt').write_text('\n'.join(lines),encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['transcribe','render','finalize'])
    parser.add_argument('--number',type=int)
    args=parser.parse_args()
    if args.action=='transcribe':transcribe_all()
    elif args.action=='render':render(args.number)
    else:finalize()
