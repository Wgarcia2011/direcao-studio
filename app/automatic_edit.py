"""Compose selected local operations and validated AI timeline actions."""
import math
from assembly_flow import CUT_PROFILES

FLAGS = {'transcribe', 'cut', 'breaths', 'fades', 'captions', 'preview', 'ai'}


def validate(raw, meta, timeline, has_clean, connected, prompt):
    if not isinstance(raw, dict) or set(raw) - (FLAGS | {'target_seconds', 'rhythm'}):
        raise ValueError('Escolha apenas as opções disponíveis na edição automática.')
    if any(type(value) is not bool for key, value in raw.items() if key in FLAGS):
        raise ValueError('As opções de edição devem ser marcadas ou desmarcadas.')
    options = {key: raw.get(key, False) for key in FLAGS}
    target = raw.get('target_seconds')
    if target is not None:
        if not meta['audio']:
            raise ValueError('A seleção de falas por duração precisa de um vídeo com áudio.')
        if isinstance(target, bool) or not isinstance(target, (int, float)) or not math.isfinite(target) or not 1 <= target <= 600:
            raise ValueError('Escolha uma duração entre 1 e 600 segundos.')
        if not options['ai']:
            raise ValueError('A seleção de falas por duração precisa estar no modo com IA.')
        available = sum(c['out'] - c['in'] for c in timeline['document']['clips']) / 30 if timeline else meta.get('clean_duration', meta.get('duration', 0))
        if target > available + 1 / 30:
            raise ValueError(f'O vídeo disponível tem {available:.2f} s. Escolha um corte menor ou insira um vídeo mais longo.')
        options['target_seconds'] = target
    if not any(options.values()):
        raise ValueError('Marque uma operação ou escreva uma instrução com IA.')
    rhythm = raw.get('rhythm', 'balanced')
    if not isinstance(rhythm, str) or rhythm not in CUT_PROFILES:
        raise ValueError('Escolha ritmo Natural, Equilibrado ou Ágil.')
    options['rhythm'] = rhythm
    if (options['cut'] or options['breaths']) and (timeline or has_clean or meta.get('directed_edit')):
        raise ValueError('A montagem já tem cortes. Para limpar pausas novamente, use o projeto original.')
    if not meta['audio'] and any(options[key] for key in ('transcribe', 'cut', 'breaths', 'captions')):
        raise ValueError('Este vídeo não tem áudio. Desmarque transcrição, pausas e legendas.')
    if options['ai']:
        if not connected:
            raise ValueError('Conecte o DeepSeek para executar instruções livres e opções com IA.')
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 2000:
            raise ValueError('Escreva uma instrução com IA de até 2000 caracteres.')
    elif prompt and str(prompt).strip():
        raise ValueError('Selecione o modo com IA para executar a instrução escrita.')
    return options


def execute(directory, meta, options, settings, prompt, progress, cancelled, host):
    completed = []

    def checkpoint():
        if cancelled():
            raise ValueError('Edição interrompida. Etapas já concluídas foram preservadas; nenhuma nova etapa foi iniciada.')

    checkpoint()
    timeline = host.edits.get_state(directory)
    needs_speech = meta['audio'] and (options['transcribe'] or options['captions'] or options['ai'] or options['cut'] or options.get('breaths'))
    if needs_speech:
        if timeline and not timeline['base_captions']['blocks']:
            progress('Transcrevendo a cópia de trabalho sem alterar os cortes existentes', 8)
            host.command([host.sys.executable, '-X', 'utf8', host.ROOT / 'kit/editor-video-ia/scripts/transcribe.py',
                          directory / 'edit/base-timeline.mp4', directory / 'edit/base-legendas.json',
                          '--model', host.whisper_model(), '--lang', 'pt', '--device', 'cpu'])
            timeline['base_captions'] = host.read_json(directory / 'edit/base-legendas.json')
            host.edits.write(directory / 'edit/timeline.json', timeline)
            meta.update(preview_signature=None, approved_signature=None, final_signature=None)
            host.write_json(directory / 'projeto.json', meta)
        elif not timeline and not host.public_project(directory)['captions']['blocks']:
            host.transcribe(directory, meta, lambda message, value: progress(message, 5 + value * .2))
        completed.append('Transcrição disponível')
    checkpoint()
    if options['cut'] or options.get('breaths'):
        host.cut_silence(directory, meta, lambda message, value: progress(message, 25 + value * .2),
            options.get('rhythm', 'balanced'), clean_pauses=options['cut'], breaths=options.get('breaths', False))
        if options['cut']: completed.append('Pausas longas limpas')
        if options.get('breaths'): completed.append('Respirações suavizadas sem retirar quadros' if options.get('rhythm')=='natural' else 'Limpeza conservadora de respirações leves')
    checkpoint()
    host.edits.initialize(directory, meta, host.command, host.probe, lambda message, value: progress(message, 45 + value * .1))
    timeline = host.edits.get_state(directory)
    selected_settings = {**settings, 'captions': options['captions']}
    host.edits.execute(directory, timeline['revision'], [{'type': 'settings.set', 'params': selected_settings}])
    checkpoint()
    if options['ai']:
        timeline = host.edits.get_state(directory)
        target = options.get('target_seconds')
        planning_options = {}
        if target is not None:
            available = host.edits.duration(timeline['document'])
            if target > available + 1 / 30:
                raise ValueError(f'Após retirar pausas, restaram {available:.2f} s. Escolha um corte menor ou desmarque a retirada de pausas.')
            planning_options = {'expected_target': target, 'require_selection': True}
        actions, summary = host.director.plan(timeline, prompt,
            lambda message, value: progress(message, 52 + value * .2), cancelled, **planning_options)
        checkpoint()
        host.edits.execute(directory, timeline['revision'], actions)
        completed.append(summary)
        if target is not None:
            completed.append(f'Corte de {target:g} s validado')
    checkpoint()
    if options['fades'] and meta['audio']:
        profile = CUT_PROFILES[options.get('rhythm', 'balanced')]
        host.apply_join_fades(directory, host.edits, profile['fade'])
        completed.append(f"Fades de áudio de {profile['fade']:g} s · ritmo {profile['label']}")
    checkpoint()
    host.edits.materialize(directory, meta, host.command, host.probe, lambda message, value: progress(message, 65 + value * .1))
    checkpoint()
    meta = host.read_json(directory / 'projeto.json')
    current_settings = host.edits.get_state(directory)['document']['settings']
    if options['preview']:
        host.render(directory, meta, current_settings, True, lambda message, value: progress(message, 75 + value * .24))
        completed.append('Amostra pronta para revisão')
    else:
        completed.append('Montagem pronta; gere uma amostra antes de exportar')
    return ' · '.join(completed)
