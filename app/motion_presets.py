"""Presets editáveis; os tempos continuam sendo os da fala escolhida."""
import uuid

PRESETS = {
    'dynamic-title': {'title': 'Título cinético', 'effect': 'title', 'text': 'Sua ideia em movimento', 'items': []},
    'impact-word': {'title': 'Palavra de impacto', 'effect': 'keyword', 'text': 'AGORA', 'items': []},
    'image-card': {'title': 'Card com imagem', 'effect': 'cards', 'text': 'Veja na prática', 'items': []},
    'checklist': {'title': 'Checklist em sequência', 'effect': 'checklist', 'text': '', 'items': ['Primeiro passo', 'Segundo passo', 'Terceiro passo']},
    'comparison': {'title': 'Comparação lado a lado', 'effect': 'comparison', 'text': 'Qual caminho?', 'items': ['Antes', 'Depois']},
    'flow': {'title': 'Fluxo com conexões', 'effect': 'flow', 'text': '', 'items': ['Entender', 'Aplicar', 'Evoluir']},
}


def catalog():
    return [{'id': key, **value, 'intensity': 'energetic'} for key, value in PRESETS.items()]


def build(data):
    key = data.get('preset')
    if key not in PRESETS:
        raise ValueError('Preset de Motion não reconhecido.')
    template = PRESETS[key]
    result = {'id': uuid.uuid4().hex[:12], 'kind': 'element', 'effect': template['effect'],
        'preset': key, 'text': template['text'], 'items': list(template['items']),
        'start': 0, 'duration': 3, 'x': 50, 'y': 42, 'size': 76,
        'intensity': 'energetic', 'accent': '#4ee2c0', 'accent2': '#b798ff',
        'caption': 'keep', 'asset': '', 'fit': 'contain',
        'required': key=='image-card', 'slot': 'Imagem do card'}
    allowed = {'start', 'duration', 'text', 'items', 'item_times', 'x', 'y', 'size',
               'intensity', 'accent', 'accent2', 'caption', 'asset', 'fit', 'box_width', 'labels', 'eyebrow'}
    result.update({key: value for key, value in data.items() if key in allowed})
    return result
