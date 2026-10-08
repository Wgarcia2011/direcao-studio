"""Preserve speech timing through automatic silence cuts."""
from copy import deepcopy

CUT_PROFILES = {
    'natural': {'label': 'Natural', 'noise_db': -38, 'min_pause': .65, 'padding': .18, 'fade': .18},
    'balanced': {'label': 'Equilibrado', 'noise_db': -35, 'min_pause': .45, 'padding': .12, 'fade': .12},
    'agile': {'label': 'Ágil', 'noise_db': -32, 'min_pause': .30, 'padding': .08, 'fade': .08},
}


def breathing_volume_filter(intervals):
    """Gentle gain ramps inside protected gaps, preserving video time."""
    envelopes=[f"max(0,min(1,min((t-{a+.08:.6f})/0.04,({b-.08:.6f}-t)/0.04)))" for a,b in intervals if b-a>.25]
    if not envelopes:return ''
    return "volume='1-0.65*min(1,"+'+'.join(envelopes)+")':eval=frame,"


def speech_safe_fades(captions, start, end, fade_in, fade_out):
    words=captions.get('words') or [w for b in captions.get('blocks',[]) for w in b.get('words',[])]
    speech=[w for w in words if w['e']>start and w['s']<end]
    if speech:
        fade_in=min(fade_in,max(.006,min(w['s'] for w in speech)-start))
        fade_out=min(fade_out,max(.01,end-max(w['e'] for w in speech)))
    return fade_in,fade_out


def protect_speech(silences, captions, min_pause, margin=.06):
    """Remove speech intervals from low-energy candidates before cutting audio."""
    words = captions.get('words') or [w for b in captions.get('blocks', []) for w in b.get('words', [])]
    guards = sorted((max(0, w['s'] - margin), w['e'] + margin) for w in words)
    safe = []
    for start, end in silences:
        remaining = [(start, end)]
        for a, b in guards:
            if a >= end: break
            if b <= start: continue
            split = []
            for left, right in remaining:
                if b <= left or a >= right: split.append((left, right))
                else:
                    if left < a: split.append((left, a))
                    if b < right: split.append((b, right))
            remaining = split
        safe.extend([[a, b] for a, b in remaining if b - a >= min_pause])
    return safe


def remap_transcript(captions, segments):
    blocks, cursor = [], 0.0
    for start, end in segments:
        for block in captions.get('blocks', []):
            words = []
            for word in block.get('words', []):
                # A word crossing a boundary belongs to the segment containing
                # its midpoint. Clamp its visible timing to that segment.
                midpoint = (word['s'] + word['e']) / 2
                if start <= midpoint < end:
                    new = deepcopy(word)
                    new.update(s=round(cursor + max(start, word['s']) - start, 3),
                               e=round(cursor + min(end, word['e']) - start, 3))
                    if word['e'] == word['s'] and new['e'] == new['s']:
                        new['e'] = round(min(cursor + end - start, new['s'] + 1 / 30), 3)
                    if new['e'] > new['s']:
                        words.append(new)
            if words:
                new = deepcopy(block)
                new.update(words=words, text=' '.join(w['w'] for w in words),
                           s=words[0]['s'], e=words[-1]['e'], key=0)
                blocks.append(new)
        cursor += end - start
    return {**captions, 'blocks': blocks, 'words': [w for b in blocks for w in b['words']]}


def apply_join_fades(directory, edits, seconds=.12):
    state = edits.get_state(directory)
    actions = [{'type': 'transition.set', 'params': {'clip_id': c['id'], 'duration': seconds}}
               for c in state['document']['clips'][:-1]]
    for offset in range(0, len(actions), 20):
        state = edits.execute(directory, state['revision'], actions[offset:offset+20])
