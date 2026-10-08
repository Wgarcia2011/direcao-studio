"""Editor local: arquivos, FFmpeg, Whisper e composições HyperFrames."""
from __future__ import annotations
import argparse
import hashlib
import html
import importlib.util
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse
import uuid
import editing_actions as edits
import deepseek_director as director
import motion_studio
import remotion_engine
import asset_registry
import automatic_edit
from types import SimpleNamespace
from assembly_flow import remap_transcript, apply_join_fades, CUT_PROFILES, protect_speech, breathing_volume_filter

APP = Path(__file__).resolve().parent
ROOT = APP.parent
PROJECTS = ROOT / "projetos"
PUBLIC = APP / "public"
TOKEN = secrets.token_urlsafe(32)
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()
ENGINE = threading.Semaphore(1)
STYLES = {"limpo", "roxo", "lettering", "perspectiva", "motion"}
FORMATS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}

def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))

def write_json(path, data):
    path = Path(path)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)

def command(args, cwd=None, timeout=1800):
    result = subprocess.run([str(a) for a in args], cwd=cwd, capture_output=True,
        text=True, encoding="utf-8", errors="replace", timeout=timeout,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        env={**os.environ, "PYTHONUTF8": "1", "HYPERFRAMES_NO_UPDATE_CHECK": "1",
             "DO_NOT_TRACK": "1", "HF_HUB_OFFLINE": "1"})
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout)[-3500:])
    return result.stdout, result.stderr

def probe(path):
    out, _ = command(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path], timeout=60)
    data = json.loads(out)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise ValueError("O arquivo não contém uma faixa de vídeo.")
    duration = float(data["format"].get("duration", 0))
    if not math.isfinite(duration) or not 0 < duration <= 600:
        raise ValueError("Use um vídeo com duração entre 1 segundo e 10 minutos nesta versão.")
    return {"duration": duration, "width": video["width"], "height": video["height"],
        "audio": any(s["codec_type"] == "audio" for s in data["streams"])}

def project_path(identifier):
    if not isinstance(identifier, str) or not re.fullmatch(r"[0-9a-f]{32}", identifier):
        raise ValueError("Projeto inválido.")
    directory = PROJECTS / identifier
    if not (directory / "projeto.json").is_file():
        raise ValueError("Projeto não encontrado.")
    return directory

def public_project(directory):
    data = read_json(directory / "projeto.json")
    data["source_url"] = f"/media/{data['id']}/brutos/original.mp4"
    data["clean_url"] = f"/media/{data['id']}/edit/limpo.mp4" if (directory / "edit/limpo.mp4").is_file() else None
    data["preview_url"] = f"/media/{data['id']}/amostras/preview.mp4" if data.get("preview_signature") and (directory / "amostras/preview.mp4").is_file() else None
    data["final_url"] = f"/media/{data['id']}/final/video.mp4" if (directory / "final/video.mp4").is_file() else None
    data["captions"] = read_json(directory / "edit/legendas.json") if (directory / "edit/legendas.json").is_file() else {"words": [], "blocks": []}
    if data.get("final_signature") and data["final_signature"] != signature(data, data["settings"], data["captions"]):
        data["final_url"] = None
    edit_state = edits.get_state(directory)
    if edit_state:
        data["edit_state"] = edits.public_state(directory, edit_state)
        data["base_url"] = f"/media/{data['id']}/edit/base-timeline.mp4"
        data["captions"] = edits.mapped_captions(edit_state)
        data["settings"] = edit_state["document"]["settings"]
        data["clean_duration"] = edits.duration(edit_state["document"])
        if data["edit_state"]["pending"]:
            data.update(preview_url=None, final_url=None, preview_signature=None, approved_signature=None)
    data["active_job"] = next(({k:j[k] for k in ("id", "project", "action", "state", "progress", "message")} for j in JOBS.values() if j["project"] == data["id"] and j["state"] in {"waiting", "running"}), None)
    return data

def keep_segments(total, silences, pad=.08):
    """Return the complement of removed silence, retaining short breaths."""
    removed = []
    for start, end in silences:
        a, b = max(0, start + pad), min(total, end - pad)
        if b > a:
            if removed and a <= removed[-1][1]:
                removed[-1][1] = max(b, removed[-1][1])
            else:
                removed.append([a, b])
    result, cursor = [], 0.0
    for a, b in removed:
        if a - cursor >= .05:
            result.append([round(cursor, 3), round(a, 3)])
        cursor = max(cursor, b)
    if total - cursor >= .05:
        result.append([round(cursor, 3), round(total, 3)])
    return result

def cut_silence(directory, meta, status, rhythm=None, clean_pauses=True, breaths=False):
    if rhythm is not None and rhythm not in CUT_PROFILES:
        raise ValueError('Escolha ritmo Natural, Equilibrado ou Ágil.')
    profile = CUT_PROFILES[rhythm] if rhythm else {'noise_db': -35, 'min_pause': .35, 'padding': .08}
    source = directory / "brutos/original.mp4"
    if not (directory / 'edit/limpo.mp4').is_file() and (directory / 'edit/legendas.json').is_file():
        shutil.copyfile(directory / 'edit/legendas.json', directory / 'edit/transcricao-original.json')
    if not meta["audio"]:
        raise ValueError("O vídeo não tem áudio. Você pode usar o original sem cortar silêncios.")
    status("Encontrando pausas no áudio", 12)
    _, stderr = command(["ffmpeg", "-hide_banner", "-nostats", "-i", source,
        "-af", f"silencedetect=noise={profile['noise_db']}dB:d={profile['min_pause']}", "-f", "null", "-"], timeout=300)
    spans, start = [], None
    for event, value in re.findall(r"silence_(start|end):\s*(-?[\d.]+)", stderr):
        if event == "start":
            start = max(0, float(value))
        elif start is not None:
            spans.append([start, min(meta["duration"], float(value))])
            start = None
    if start is not None:
        spans.append([start, meta["duration"]])
    if spans and spans[0][0] <= .05 and spans[-1][1] >= meta["duration"] - .05 and len(spans) == 1:
        raise ValueError(f"O áudio inteiro ficou abaixo de {profile['noise_db']} dB. Confira o volume ou use o original.")
    detected_spans = spans[:]
    original_transcript = directory / 'edit/transcricao-original.json'
    if original_transcript.is_file():
        spans = protect_speech(spans, read_json(original_transcript), profile['min_pause'])
    removal_spans = [[a + profile['padding'], b - profile['padding']] for a,b in spans if b-a>2*profile['padding']] if clean_pauses else []
    breath_candidates=[]
    if breaths:
        if not original_transcript.is_file():
            raise ValueError('A limpeza de respirações precisa da transcrição para proteger a fala.')
        status('Conferindo intervalos de baixo volume entre as palavras', 22)
        _, breath_log = command(['ffmpeg','-hide_banner','-nostats','-i',source,
            '-af','silencedetect=noise=-30dB:d=0.25','-f','null','-'],timeout=300)
        breath_start=None
        for event,value in re.findall(r'silence_(start|end):\s*(-?[\d.]+)',breath_log):
            if event=='start': breath_start=max(0,float(value))
            elif breath_start is not None:
                end=min(meta['duration'],float(value))
                if .25<=end-breath_start<=1.2: breath_candidates.append([breath_start,end])
                breath_start=None
        breath_candidates=protect_speech(breath_candidates,read_json(original_transcript),.25,margin=.10)
        # Leave a small lead-in/out, and only remove low-energy intervals bounded
        # by speech. This is a conservative candidate detector, not a classifier.
        words=read_json(original_transcript).get('words') or [w for b in read_json(original_transcript).get('blocks',[]) for w in b.get('words',[])]
        breath_candidates=[[a,b] for a,b in breath_candidates if any(w['e']<=a for w in words) and any(w['s']>=b for w in words)]
        if rhythm!='natural':removal_spans.extend([[a+.08,b-.08] for a,b in breath_candidates if b-a>.25])
    # Avoid overly fragmented montages: select the longest gaps conservatively.
    merged=[]
    for a,b in sorted(removal_spans):
        if merged and a<=merged[-1][1]: merged[-1][1]=max(b,merged[-1][1])
        else: merged.append([a,b])
    merged=sorted(sorted(merged,key=lambda span:span[1]-span[0],reverse=True)[:90])
    segments = keep_segments(meta['duration'],merged,0)
    if not segments:
        raise ValueError("Nenhum trecho audível encontrado. Use o original ou confira o áudio.")
    status("Juntando os trechos com respiros curtos", 30)
    parts, labels = [], []
    breath_filter=breathing_volume_filter(breath_candidates) if breaths and rhythm=='natural' else ''
    for index, (a, b) in enumerate(segments):
        parts.extend([f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{index}]",
            f"[0:a]{breath_filter}atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{index}]"])
        labels.extend([f"[v{index}]", f"[a{index}]"])
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segments)}:v=1:a=1[v][a]"
    (directory / "edit/cortes.ffmpeg").write_text(graph, encoding="utf-8")
    command(["ffmpeg", "-y", "-v", "error", "-i", source, "-filter_complex_script",
        directory / "edit/cortes.ffmpeg", "-map", "[v]", "-map", "[a]", "-c:v", "libx264",
        "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart",
        directory / "edit/limpo.mp4"])
    duration = probe(directory / "edit/limpo.mp4")["duration"]
    write_json(directory / "edit/cortes.json", {"segments": segments, "silences": spans,
        "detected_silences": detected_spans, "duration_in": meta["duration"], "duration_out": duration,
        "rhythm": rhythm or 'legacy', 'clean_pauses':clean_pauses,'breaths':breaths,
        'breath_mode':'attenuate' if breaths and rhythm=='natural' else 'trim',
        'breath_candidates':breath_candidates,'removed_intervals':merged, **profile})
    meta.update(clean_duration=duration, removed=max(0, meta["duration"] - duration), segments=segments,
        preview_signature=None, approved_signature=None)
    original_transcript = directory / "edit/transcricao-original.json"
    if original_transcript.is_file():
        mapped = remap_transcript(read_json(original_transcript), segments)
        write_json(directory / "edit/legendas.json", mapped)
        edits.write_srt(directory / 'edit/legendas.srt', mapped['blocks'])
    else:
        (directory / "edit/legendas.json").unlink(missing_ok=True)
    for filename in ["amostras/preview.mp4", "final/video.mp4"]:
        (directory / filename).unlink(missing_ok=True)
    write_json(directory / "projeto.json", meta)

def whisper_model():
    explicit = os.environ.get("VIDEO_EDITOR_WHISPER_MODEL")
    if explicit:
        folder = Path(explicit)
        if (folder / "model.bin").is_file():
            return folder
    local = ROOT / ".models/whisper-small"
    if (local / "model.bin").is_file():
        return local
    cached = Path.home() / ".cache/huggingface/hub/models--Systran--faster-whisper-small/snapshots"
    if cached.is_dir():
        for snapshot in sorted(cached.iterdir()):
            if (snapshot / "model.bin").is_file():
                return snapshot
    raise ValueError("Modelo Whisper local não encontrado. Configure VIDEO_EDITOR_WHISPER_MODEL com a pasta do modelo.")

def transcribe(directory, meta, status):
    if not meta["audio"]:
        raise ValueError("O vídeo não tem áudio para transcrever.")
    status("Transcrevendo a fala no seu computador", 15)
    script = ROOT / "kit/editor-video-ia/scripts/transcribe.py"
    source = directory / ("edit/limpo.mp4" if (directory / "edit/limpo.mp4").is_file() else "brutos/original.mp4")
    command([sys.executable, "-X", "utf8", script, source, directory / "edit/legendas.json",
        "--model", whisper_model(), "--lang", "pt", "--device", "cpu", "--srt", directory / "edit/legendas.srt"])
    if source.name == "original.mp4":
        shutil.copyfile(directory / "edit/legendas.json", directory / "edit/transcricao-original.json")
    meta.update(preview_signature=None, approved_signature=None)
    for filename in ["amostras/preview.mp4", "final/video.mp4"]:
        (directory / filename).unlink(missing_ok=True)
    write_json(directory / "projeto.json", meta)

def valid_settings(raw):
    settings = {"style": raw.get("style", "roxo"), "format": raw.get("format", "9:16"),
        "title": str(raw.get("title", ""))[:100], "captions": bool(raw.get("captions", True))}
    if settings["style"] not in STYLES or settings["format"] not in FORMATS:
        raise ValueError("Formato ou estilo inválido.")
    options={'acceleration':{'auto','cpu'},'engine':{'hyperframes','remotion'},'layout':{'cheia','moldura','quadro','contexto'},'theme':{'roxo','nutricao','ingles','arquitetura','marketing','quadro'},'background_mode':{'original','replace','depth'}}
    for key,allowed in options.items():
        if key in raw:
            if raw[key] not in allowed:raise ValueError('Configuração inválida: '+key)
            settings[key]=raw[key]
    if 'sample_start' in raw:settings['sample_start']=edits.number(raw['sample_start'],0,600,'Início da amostra')
    if 'sample_seconds' in raw:settings['sample_seconds']=edits.number(raw['sample_seconds'],4,15,'Duração da amostra')
    return settings

def signature(meta, settings, captions):
    direction = read_json(PROJECTS / meta["id"] / "edit/direcao.json") if meta.get("directed_edit") else None
    payload = {"source": meta["sha256"], "cuts": meta.get("segments"), "settings": settings, "captions": captions}
    state = edits.get_state(PROJECTS / meta["id"]) if meta.get("id") else None
    if state and edits.digest(state["document"]) != state["baseline"]:
        payload["timeline"] = state["document"]
    if direction is not None:
        payload["direction"] = direction
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def composition(directory, meta, settings, sample):
    """Author an offline, seekable HyperFrames composition from reviewed inputs."""
    if meta.get("directed_edit"):
        if settings["format"] != "9:16" or settings["style"] != "roxo":
            raise ValueError("Esta edição dirigida usa o formato vertical e o estilo Roxo. Título e legendas podem ser revisados.")
        from directed_edit import composition as directed_composition
        return directed_composition(directory, meta, settings, sample, APP)
    folder = directory / ("composicao/amostra" if sample else "composicao/final")
    assets = folder / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    source = directory / ("edit/limpo.mp4" if (directory / "edit/limpo.mp4").is_file() else "brutos/original.mp4")
    shutil.copyfile(source, assets / "video.mp4")
    duration = meta.get("clean_duration", meta["duration"])
    duration = min(5.0, duration) if sample else duration
    width, height = FORMATS[settings["format"]]
    # Draft samples retain the same composition and aspect ratio at half resolution.
    copy_sources = {"gsap.js": APP / "node_modules/gsap/dist/gsap.min.js",
        "inter.woff2": APP / "node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2",
        "syne.woff2": APP / "node_modules/@fontsource/syne/files/syne-latin-700-normal.woff2"}
    for name, path in copy_sources.items():
        shutil.copyfile(path, assets / name)
    captions = read_json(directory / "edit/legendas.json") if (directory / "edit/legendas.json").is_file() else {"blocks": []}
    clips = []
    if settings["captions"]:
        for i, block in enumerate(captions["blocks"]):
            if block["s"] >= duration:
                break
            spans = " ".join(f'<span id="w{i}-{j}" class="word {"key" if j == block.get("key") else ""}" data-word-start="{word["s"]}">{html.escape(word["w"])}</span>' for j, word in enumerate(block["words"]))
            clips.append(f'<div id="cap{i}" class="clip caption" data-start="{block["s"]}" data-duration="{max(.01, min(duration, block["e"])-block["s"])}" data-track-index="3">{spans}</div>')
    title = html.escape(settings["title"])
    decorated = settings["style"] != "limpo"
    effect = ""
    if settings["style"] == "perspectiva":
        effect = 'tl.fromTo("#film",{rotationY:-10,rotationZ:-2,scale:.86},{rotationY:5,rotationZ:1,scale:.91,duration:D,ease:"none"},0);'
    elif settings["style"] == "motion":
        effect = 'tl.fromTo("#film",{scale:1},{scale:1.08,duration:D,ease:"none"},0);'
    elif settings["style"] == "lettering":
        effect = 'tl.from("#titleText",{y:60,scale:.85,duration:.4,ease:"power3.out"},0);'
    font = 72 if width == 1080 else 76
    doc = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    @font-face{{font-family:Inter;src:url(assets/inter.woff2);font-weight:800}}
    @font-face{{font-family:Syne;src:url(assets/syne.woff2);font-weight:700}}
    *{{box-sizing:border-box}}body{{margin:0;background:#241934}}
    #stage{{position:relative;width:{width}px;height:{height}px;overflow:hidden;perspective:1800px}}
    .clip{{position:absolute;inset:0}}#film{{width:100%;height:100%;object-fit:contain;background:#241934}}
    .frame{{inset:3%;border:3px solid #9759ff;border-radius:28px;pointer-events:none}}
    .caption{{inset:auto 7% auto 7%;top:62%;text-align:center;font:800 {font}px/1.13 Inter;color:#fff;text-shadow:0 4px 16px #000;}}
    .word{{display:inline-block;opacity:.55}}.key{{color:#f5a962}}
    .title{{inset:12% 8% auto;display:flex;justify-content:center;text-align:center;color:#fff;font:700 {width*.075}px/1.05 Syne}}
    </style></head><body><div id="stage" data-composition-id="principal" data-width="{width}" data-height="{height}" data-start="0" data-duration="{duration}" data-fps="30">
    <video id="film" class="clip" src="assets/video.mp4" data-start="0" data-duration="{duration}" data-track-index="0" {'data-has-audio="true"' if meta['audio'] else 'muted'} playsinline></video>
    {f'<div id="frame" class="clip frame" data-start="0" data-duration="{duration}" data-track-index="1"></div>' if decorated else ''}
    {f'<div id="title" class="clip title" data-start="0" data-duration="{min(3,duration)}" data-track-index="2"><span id="titleText">{title}</span></div>' if title else ''}
    {''.join(clips)}</div><script src="assets/gsap.js"></script><script>
    const D={duration};const tl=gsap.timeline({{paused:true}});const clock={{value:0}};tl.to(clock,{{value:1,duration:D,ease:"none"}},0);
    {effect}
    document.querySelectorAll('.caption').forEach(el=>{{const t=Number(el.dataset.start);tl.from(el,{{scale:.9,duration:.18,ease:'power3.out'}},t);el.querySelectorAll('.word').forEach(w=>tl.to(w,{{opacity:1,duration:.04}},Number(w.dataset.wordStart)));}});
    window.__timelines={{principal:tl}};
    </script></body></html>'''
    (folder / "index.html").write_text(doc, encoding="utf-8")
    write_json(folder / "hyperframes.json", {"name": meta["name"], "description": "Composição local gerada pelo Direção Studio"})
    return folder

def render(directory, meta, settings, sample, status):
    captions = read_json(directory / "edit/legendas.json") if (directory / "edit/legendas.json").is_file() else {"blocks": []}
    sig = signature(meta, settings, captions)
    if not sample and meta.get("approved_signature") != sig:
        raise ValueError("Gere e aprove uma amostra com estas configurações antes de exportar o vídeo inteiro.")
    if sample:
        meta.update(preview_signature=None, approved_signature=None)
        write_json(directory / "projeto.json", meta)
    if settings.get('engine')=='remotion':
        remotion_engine.render(directory,meta,settings,sample,command,probe,status)
        meta['settings']=settings
        if sample:meta.update(preview_signature=sig,approved_signature=None)
        else:meta['final_signature']=sig
        write_json(directory/'projeto.json',meta)
        return
    status("Preparando a composição e as fontes locais", 12)
    folder = composition(directory, meta, settings, sample)
    edits.inject_overlays(folder, directory, sample, APP)
    entry = APP / "node_modules/hyperframes/bin/hyperframes.mjs"
    try:
        command(["node", entry, "lint", folder, "--json"], cwd=folder, timeout=60)
    except RuntimeError as error:
        (directory / "edit/render.log").write_text(str(error), encoding="utf-8")
        raise ValueError("A composição não passou na validação. Os detalhes estão em edit/render.log neste projeto.") from error
    status("Renderizando a amostra de 5 segundos" if sample else "Renderizando o vídeo aprovado", 35)
    output = directory / ("amostras/preview.mp4" if sample else "final/video.mp4")
    args = ["node", entry, "render", folder, "--output", output, "--fps", "30", "--workers", "1",
        "--quality", "draft" if sample else "standard", "--frames-cache-dir", directory / "edit/frame-cache"]
    try:
        stdout, stderr = command(args, cwd=folder, timeout=3600)
    except (RuntimeError, subprocess.TimeoutExpired) as error:
        (directory / "edit/render.log").write_text(str(error), encoding="utf-8")
        raise ValueError("Não foi possível renderizar. Os detalhes estão em edit/render.log neste projeto.") from error
    (directory / "edit/render.log").write_text(stdout + "\n" + stderr, encoding="utf-8")
    if not output.is_file():
        raise RuntimeError("O motor não entregou o vídeo. Consulte edit/render.log.")
    probe(output)
    meta["settings"] = settings
    if sample:
        meta["preview_signature"] = sig
        meta["approved_signature"] = None
    else:
        meta["final_signature"] = sig
    write_json(directory / "projeto.json", meta)

def start_job(identifier, action, settings=None, prompt=None, automatic=None):
    directory = project_path(identifier)
    if read_json(directory / "projeto.json").get("directed_edit") and action in {"cortar", "preparar", "limpar"}:
        raise ValueError("Esta versão já tem cortes editoriais de 30 segundos. Para refazer cortes automáticos, selecione o projeto original.")
    if edits.get_state(directory) and action in {"cortar", "preparar", "legendar", "limpar"}:
        raise ValueError("Esta timeline tem edição manual. Use os controles de trechos e legendas; cortes e transcrição automáticos continuam disponíveis no projeto original.")
    if action not in {"cortar", "legendar", "preparar", "amostra", "exportar", "editar", "montar", "dirigir", "preview-remotion", "limpar", "automatico"}:
        raise ValueError("Comando não reconhecido. Use cortar, legendar, preparar ou gerar amostra.")
    if action == "dirigir" and (not isinstance(prompt,str) or not 1 <= len(prompt.strip()) <= 2000):
        raise ValueError("Use uma instrução de até 2000 caracteres.")
    if action == 'automatico':
        automatic = automatic_edit.validate(automatic, read_json(directory / 'projeto.json'),
            edits.get_state(directory), (directory / 'edit/limpo.mp4').is_file(), director.status()['connected'], prompt)
    with LOCK:
        if any(j["project"] == identifier and j["state"] in {"waiting", "running"} for j in JOBS.values()):
            raise ValueError("Este projeto já está processando. Aguarde a conclusão.")
        job_id = uuid.uuid4().hex
        JOBS[job_id] = {"id": job_id, "project": identifier, "action": action, "state": "waiting", "progress": 0, "message": "Na fila de processamento"}
    def worker():
        job = JOBS[job_id]
        def status(message, progress):
            job.update(message=message, progress=progress, state="running")
        with ENGINE:
            try:
                meta = read_json(directory / "projeto.json")
                if action == 'automatico':
                    automatic_edit.validate(automatic, meta, edits.get_state(directory),
                        (directory / 'edit/limpo.mp4').is_file(), director.status()['connected'], prompt)
                    host = SimpleNamespace(**{key: globals()[key] for key in (
                        'edits', 'sys', 'ROOT', 'command', 'whisper_model', 'read_json', 'write_json',
                        'public_project', 'transcribe', 'cut_silence', 'probe', 'director', 'apply_join_fades', 'render')})
                    job['summary'] = automatic_edit.execute(directory, meta, automatic, settings or valid_settings({}),
                        prompt, status, lambda: job.get('cancelled', False), host)
                if action == "limpar":
                    if (directory / 'edit/limpo.mp4').is_file():
                        raise ValueError('Este vídeo já tem cortes. Ative a timeline para aplicar fades sem repetir a limpeza.')
                    if meta['audio'] and not (directory / 'edit/transcricao-original.json').is_file():
                        transcribe(directory, meta, status)
                    cut_silence(directory, meta, status)
                    edits.initialize(directory, meta, command, probe, status)
                    apply_join_fades(directory, edits)
                    status('Atualizando cortes, legendas e fades de áudio', 65)
                    edits.materialize(directory, meta, command, probe, status)
                    job['summary'] = 'Pausas retiradas e emendas suavizadas. Revise os cortes antes de seguir.'
                if action == "dirigir":
                    edit_state = edits.get_state(directory)
                    if not director.status()["connected"]: raise ValueError("Conecte sua chave DeepSeek no painel Direção.")
                    if not edit_state:
                        edits.initialize(directory, meta, command, probe, status)
                        edit_state = edits.get_state(directory)
                    if not edit_state["base_captions"]["blocks"] and meta["audio"]:
                        status("Preparando a transcrição local para o DeepSeek", 12)
                        command([sys.executable, "-X", "utf8", ROOT / "kit/editor-video-ia/scripts/transcribe.py", directory / "edit/base-timeline.mp4", directory / "edit/base-legendas.json", "--model", whisper_model(), "--lang", "pt", "--device", "cpu"])
                        edit_state["base_captions"] = read_json(directory / "edit/base-legendas.json")
                        edits.write(directory / "edit/timeline.json", edit_state)
                    actions, summary = director.plan(edit_state, prompt, status, lambda: job.get("cancelled", False))
                    with LOCK:
                        if job.get("cancelled"): raise ValueError("Edição cancelada antes de aplicar ações.")
                        edits.execute(directory, edit_state["revision"], actions)
                    job["summary"] = summary
                if action == "editar":
                    edits.initialize(directory, meta, command, probe, status)
                if action in {"montar", "amostra", "exportar", "preview-remotion"}:
                    edits.materialize(directory, meta, command, probe, status)
                    meta = read_json(directory / "projeto.json")
                if action in {"cortar", "preparar"}:
                    cut_silence(directory, meta, status)
                if action in {"legendar", "preparar"}:
                    transcribe(directory, meta, status)
                if action in {"amostra", "exportar"}:
                    render(directory, meta, settings or valid_settings({}), action == "amostra", status)
                if action=='preview-remotion':
                    remotion_engine.prepare(directory,meta,settings or valid_settings({}),False,command,probe,status)
                    meta['settings']=settings or valid_settings({})
                    write_json(directory/'projeto.json',meta)
                    job['summary']='Prévia Remotion pronta. Use o botão de abrir preview.'
                result = public_project(directory)
                result["active_job"] = None
                job.update(state="done", progress=100, message="Pronto para revisar", result=result)
            except Exception as error:
                job.update(state="error", message=str(error), progress=0)
    threading.Thread(target=worker, daemon=True).start()
    return JOBS[job_id]

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{self.address_string()} {format % args}", flush=True)

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def allowed_host(self):
        return self.headers.get("Host", "") in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}

    def send_file(self, path, template=False):
        if not path.is_file():
            self.send_error(404)
            return
        if template:
            body = path.read_text(encoding="utf-8").replace("__CSRF_TOKEN__", TOKEN).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        size, start, end = path.stat().st_size, 0, path.stat().st_size - 1
        requested_range = self.headers.get("Range")
        if requested_range:
            match = re.fullmatch(r"bytes=(\d+)-(\d*)", requested_range)
            if not match:
                self.send_error(416)
                return
            start = int(match[1])
            end = min(int(match[2]) if match[2] else end, end)
            if start > end:
                self.send_error(416)
                return
        self.send_response(206 if requested_range else 200)
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if requested_range:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("X-Content-Type-Options", "nosniff")
        origin=self.headers.get('Origin','')
        if re.fullmatch(r'http://(?:localhost|127\.0\.0\.1):\d+',origin):
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
        self.end_headers()
        with path.open("rb") as stream:
            stream.seek(start)
            left = end - start + 1
            while left:
                block = stream.read(min(left, 256 * 1024))
                if not block:
                    break
                self.wfile.write(block)
                left -= len(block)

    def do_GET(self):
        if not self.allowed_host():
            self.send_error(403)
            return
        path = unquote(urlparse(self.path).path)
        try:
            if path in {"/", "/index.html"}:
                self.send_file(PUBLIC / 'index.html', template=True)
            elif path.startswith("/original/"):
                original = (ROOT / "Arquivos/skills-bonus-completo/Skills-Bonus-Maquina-de-Edicao-IA").resolve()
                target = (original / path.removeprefix("/original/")).resolve()
                if not target.is_relative_to(original):
                    raise ValueError("Caminho inválido.")
                self.send_file(target)
            elif path == "/editor":
                self.send_file(PUBLIC / "index.html", template=True)
            elif path == "/api/ai/status":
                self.send_json(director.status())
            elif path == "/api/health":
                self.send_json({"ffmpeg": bool(shutil.which("ffmpeg")), "node": bool(shutil.which("node")),
                    "whisper": bool(importlib.util.find_spec("faster_whisper")), "hyperframes": (APP / "node_modules/hyperframes").is_dir(), "local": True})
            elif path == "/api/projects":
                records = [public_project(d) for d in PROJECTS.iterdir() if d.is_dir() and (d / "projeto.json").is_file()]
                self.send_json(sorted(records, key=lambda p:p["created"], reverse=True))
            elif path == '/api/motion':
                from urllib.parse import parse_qs
                directory=project_path(parse_qs(urlparse(self.path).query).get('project',[''])[0])
                self.send_json(motion_studio.preview(directory,__import__(__name__)))
            elif path == '/api/motion/presets':
                self.send_json(motion_studio.motion_presets.catalog())
            elif path == '/api/assets':
                self.send_json(asset_registry.assets())
            elif path == "/api/templates":
                self.send_json([read_json(p) for p in sorted((ROOT / "templates-salvos").glob("*.json"))])
            elif path.startswith("/api/jobs/"):
                job = JOBS.get(path.rsplit("/", 1)[1])
                self.send_json(job if job else {"message": "Tarefa não encontrada"}, 200 if job else 404)
            elif path.startswith("/media/"):
                parts = path.split("/", 3)
                directory = project_path(parts[2])
                media = parts[3] if len(parts) == 4 else ""
                if not re.fullmatch(r"assets/motion-[a-f0-9]{12}\.(png|jpg|jpeg|webp|mp4|mov|webm)",media) and media not in {"brutos/original.mp4", "edit/limpo.mp4", "amostras/preview.mp4", "final/video.mp4", "edit/legendas.srt", "edit/base-timeline.mp4", "final/antes-da-timeline.mp4", "amostras/motion-preview.mp4", "final/motion-video.mp4", "edit/remotion-props.json", "edit/remotion-sample.mp4", "edit/foreground-full.webm", "edit/foreground-sample.webm", "edit/matting-base-full.webm", "edit/matting-base-sample.webm"}:
                    raise ValueError("Arquivo não disponível.")
                if media=='edit/remotion-props.json':
                    props=read_json(directory/media);edit_state=edits.get_state(directory)
                    current=edit_state['document']['settings'] if edit_state else read_json(directory/'projeto.json')['settings']
                    if props.get('settings_snapshot')!=current or (edit_state and props.get('timeline_digest')!=edits.digest(edit_state['document'])):raise ValueError('A edição mudou. Prepare novamente o preview completo.')
                self.send_file(directory / media)
            else:
                target = (PUBLIC / (path.lstrip("/") or "index.html")).resolve()
                if not target.is_relative_to(PUBLIC.resolve()):
                    raise ValueError("Caminho inválido.")
                self.send_file(target, template=target.name == "index.html")
        except (ValueError, IndexError, FileNotFoundError) as error:
            self.send_json({"message": str(error)}, 400)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def do_POST(self):
        if not self.allowed_host() or self.headers.get("X-Editor-Token") != TOKEN:
            self.send_json({"message": "Sessão inválida. Reabra o aplicativo."}, 403)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            if self.path.startswith('/api/motion/upload?'):
                from urllib.parse import parse_qs
                directory=project_path(parse_qs(urlparse(self.path).query).get('project',[''])[0])
                if not 0<length<=60*1024*1024:raise ValueError('Use mídia de até 60 MB.')
                self.send_json(motion_studio.upload(directory,self.rfile.read(length),unquote(self.headers.get('X-File-Name','apoio.png')),__import__(__name__)),201)
                return
            if self.path=='/api/assets/upload':
                if not 0<length<=20*1024*1024:raise ValueError('Use uma imagem de até 20 MB.')
                with LOCK:
                    self.send_json(asset_registry.import_image(self.rfile.read(length),unquote(self.headers.get('X-File-Name','Imagem'))),201)
                return
            if self.path == "/api/upload":
                if not 0 < length <= 2 * 1024 * 1024 * 1024:
                    raise ValueError("Use um vídeo de até 2 GB.")
                identifier = uuid.uuid4().hex
                directory = PROJECTS / identifier
                for subdir in ["brutos", "edit", "amostras", "final", "composicao", "assets"]:
                    (directory / subdir).mkdir(parents=True, exist_ok=True)
                source = directory / "brutos/original.mp4"
                digest, left = hashlib.sha256(), length
                with source.open("wb") as stream:
                    while left:
                        block = self.rfile.read(min(left, 1024 * 1024))
                        if not block:
                            raise ValueError("A importação foi interrompida. Tente novamente.")
                        stream.write(block)
                        digest.update(block)
                        left -= len(block)
                info = probe(source)
                name = unquote(self.headers.get("X-File-Name", "Meu vídeo"))[:150]
                meta = {"id": identifier, "name": name, "created": time.time(), "sha256": digest.hexdigest(),
                    **info, "removed": 0, "segments": [[0, info["duration"]]], "settings": valid_settings({})}
                write_json(directory / "projeto.json", meta)
                self.send_json(public_project(directory), 201)
                return
            if not 0 < length <= 2 * 1024 * 1024:
                raise ValueError("Requisição inválida.")
            data = json.loads(self.rfile.read(length))
            if self.path in {'/api/motion','/api/motion/suggest','/api/motion/render','/api/motion/preset','/api/motion/approve'}:
                directory=project_path(data['project'])
                module=__import__(__name__)
                if self.path=='/api/motion/suggest':self.send_json(motion_studio.suggest(directory,data.get('prompt',''),module))
                elif self.path=='/api/motion/render':self.send_json(motion_studio.render_job(directory,data,module),202)
                elif self.path=='/api/motion/approve':self.send_json(motion_studio.approve(directory,data))
                elif self.path=='/api/motion/preset':
                    state=edits.get_state(directory)
                    source=directory/('edit/limpo.mp4' if (directory/'edit/limpo.mp4').exists() else 'brutos/original.mp4')
                    total=edits.duration(state['document']) if state else probe(source)['duration']
                    self.send_json(motion_studio.add_preset(directory,data,total))
                else:
                    source=directory/('edit/limpo.mp4' if (directory/'edit/limpo.mp4').exists() else 'brutos/original.mp4')
                    self.send_json(motion_studio.save(directory,data,probe(source)['duration']))
            elif self.path == "/api/ai/config":
                self.send_json(director.configure(data))
            elif self.path == "/api/jobs/cancel":
                job = JOBS.get(data.get("job"))
                if not job or job["action"] not in {"dirigir", "automatico"} or job['state'] not in {'waiting','running'}: raise ValueError("Esta tarefa não pode ser interrompida aqui.")
                job["cancelled"] = True
                self.send_json({"message":"Cancelamento solicitado. A etapa em andamento pode terminar; as seguintes não serão iniciadas."})
            elif self.path == "/api/jobs":
                self.send_json(start_job(data["project"], data["action"], valid_settings(data.get("settings", {})), data.get("prompt"), data.get('automatic')), 202)
            elif self.path in {"/api/actions", "/api/history"}:
                directory = project_path(data["project"])
                with LOCK:
                    if any(j["project"] == data["project"] and j["state"] in {"waiting", "running"} for j in JOBS.values()):
                        raise ValueError("Aguarde o processamento antes de editar.")
                    edits.execute(directory, data["revision"], data.get("actions"), data.get("history") if self.path == "/api/history" else None)
                self.send_json(public_project(directory))
            elif self.path == "/api/settings":
                directory = project_path(data["project"])
                with LOCK:
                    if any(j["project"] == data["project"] and j["state"] in {"waiting", "running"} for j in JOBS.values()):
                        raise ValueError("Aguarde o processamento antes de alterar as configurações.")
                    if edits.get_state(directory):
                        raise ValueError("Atualize as configurações pela timeline para manter o histórico.")
                    meta = read_json(directory / "projeto.json")
                    meta["settings"] = valid_settings(data.get("settings", {}))
                    meta.update(preview_signature=None, approved_signature=None)
                    write_json(directory / "projeto.json", meta)
                self.send_json(public_project(directory))
            elif self.path == "/api/approve":
                directory = project_path(data["project"])
                meta = read_json(directory / "projeto.json")
                state = edits.get_state(directory)
                if state and edits.digest(state["document"]) != state["materialized"]:
                    raise ValueError("Gere uma amostra da timeline atual antes de aprovar.")
                if data.get("approved") is False:
                    meta["approved_signature"] = None
                    write_json(directory / "projeto.json", meta)
                    self.send_json(public_project(directory))
                    return
                captions = read_json(directory / "edit/legendas.json") if (directory / "edit/legendas.json").is_file() else {"blocks": []}
                sig = signature(meta, valid_settings(data.get("settings", {})), captions)
                if meta.get("preview_signature") != sig or not (directory / "amostras/preview.mp4").is_file():
                    raise ValueError("Estas configurações ainda não têm uma amostra pronta.")
                meta["approved_signature"] = sig
                write_json(directory / "projeto.json", meta)
                self.send_json(public_project(directory))
            elif self.path == "/api/captions":
                directory = project_path(data["project"])
                with LOCK:
                    if any(j["project"] == data["project"] and j["state"] in {"waiting", "running"} for j in JOBS.values()):
                        raise ValueError("Aguarde o processamento antes de revisar as legendas.")
                edit_state = edits.get_state(directory)
                if edit_state:
                    blocks = edits.mapped_captions(edit_state)["blocks"]
                    index = int(data["index"])
                    if not 0 <= index < len(blocks): raise ValueError("Legenda inválida.")
                    with LOCK:
                        edits.execute(directory, data["revision"], [{"type":"caption.set","params":{"key":blocks[index]["source_key"],"text":data["text"]}}])
                    self.send_json(public_project(directory))
                    return
                captions = read_json(directory / "edit/legendas.json")
                index = int(data["index"])
                if not 0 <= index < len(captions["blocks"]):
                    raise ValueError("Legenda inválida.")
                text = str(data["text"]).strip()[:160]
                if not text:
                    raise ValueError("A legenda não pode ficar vazia.")
                block = captions["blocks"][index]
                tokens = text.split()
                delta = (block["e"] - block["s"]) / len(tokens)
                block.update(text=text, words=[{"w": word, "s": block["s"] + j*delta, "e": block["s"]+(j+1)*delta} for j, word in enumerate(tokens)], key=0, timing="manual-estimated")
                captions["words"] = [w for b in captions["blocks"] for w in b["words"]]
                write_json(directory / "edit/legendas.json", captions)
                meta = read_json(directory / "projeto.json")
                meta.update(preview_signature=None, approved_signature=None)
                write_json(directory / "projeto.json", meta)
                for filename in ["amostras/preview.mp4", "final/video.mp4"]:
                    (directory / filename).unlink(missing_ok=True)
                self.send_json(public_project(directory))
            elif self.path == "/api/template":
                directory = project_path(data["project"])
                name = re.sub(r"[^\w -]", "", str(data.get("name", "Meu estilo")))[:60].strip() or "Meu estilo"
                destination = ROOT / "templates-salvos" / f"{name}-{uuid.uuid4().hex[:6]}.json"
                write_json(destination, {"name": name, "settings": valid_settings(data.get("settings", {})), "prompt": str(data.get("prompt", ""))[:1000]})
                self.send_json({"message": "Estilo e instrução salvos em templates-salvos."})
            else:
                self.send_error(404)
        except Exception as error:
            self.send_json({"message": str(error)}, 400)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    options = parser.parse_args()
    remotion_engine.BASE_URL = f"http://127.0.0.1:{options.port}"
    PROJECTS.mkdir(exist_ok=True)
    (ROOT / "templates-salvos").mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", options.port), Handler)
    print(f"Direção Studio: http://127.0.0.1:{options.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

if __name__ == "__main__":
    main()
