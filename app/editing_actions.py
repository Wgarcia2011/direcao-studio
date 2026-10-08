"""Timeline local versionada, ações atômicas, histórico e montagem FFmpeg."""
from copy import deepcopy
from pathlib import Path
import hashlib
import html
import json
import math
import re
import struct
import time
import uuid
from assembly_flow import speech_safe_fades

FPS = 30


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, value):
    p = Path(path); temp = p.with_suffix(p.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8'); temp.replace(p)


def digest(doc):
    return hashlib.sha256(json.dumps(doc, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def number(value, low, high, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{label}: use um número entre {low} e {high}.')
    return value


def get_state(directory):
    path = directory / 'edit/timeline.json'
    return read(path) if path.is_file() else None


def duration(doc):
    return sum(c['out'] - c['in'] for c in doc['clips']) / FPS


def transition_audio_fades(transitions, clip_id):
    """Adapted from OpenReel getTrackTransitionAudioFades (MIT; see notices)."""
    fade_in = fade_out = 0
    for t in transitions:
        if not t['params'].get('audioFade'):
            continue
        length = max(0, t['duration'])
        if t.get('clipBId'):
            if t['clipAId'] == clip_id: fade_out = max(fade_out, length / 2)
            if t['clipBId'] == clip_id: fade_in = max(fade_in, length / 2)
        elif t['clipAId'] == clip_id:
            if t.get('edge') == 'in': fade_in = max(fade_in, length)
            else: fade_out = max(fade_out, length)
    return fade_in, fade_out


def initialize(directory, meta, command, probe, status):
    import shutil
    if get_state(directory): return
    status('Preparando uma cópia de trabalho para a timeline', 15)
    source = directory / ('edit/limpo.mp4' if (directory / 'edit/limpo.mp4').is_file() else 'brutos/original.mp4')
    base = directory / 'edit/base-timeline.mp4'
    shutil.copyfile(source, base)
    info = probe(base); frames = round(min(info['duration'], meta.get('clean_duration', meta['duration'])) * FPS)
    if (directory / 'final/video.mp4').is_file():
        shutil.copyfile(directory / 'final/video.mp4', directory / 'final/antes-da-timeline.mp4')
    captions = read(directory / 'edit/legendas.json') if (directory / 'edit/legendas.json').is_file() else {'words': [], 'blocks': []}
    if not captions['blocks'] and source.name == 'original.mp4' and (directory / 'edit/transcricao-original.json').is_file(): captions = read(directory / 'edit/transcricao-original.json')
    direction = read(directory / 'edit/direcao.json') if meta.get('directed_edit') else None
    boundary = [0]
    if source.name == 'limpo.mp4':
        seconds = 0
        for a,b in meta.get('segments', []):
            seconds += b-a
            edge = min(frames, round(seconds*FPS))
            if edge > boundary[-1]: boundary.append(edge)
    if boundary[-1] < frames: boundary.append(frames)
    clips = [{'id':uuid.uuid4().hex[:12], 'in':a, 'out':b, 'zoom':1, 'volume':1} for a,b in zip(boundary,boundary[1:]) if b-a>=2]
    doc = {'clips':clips, 'overlays':[], 'transitions':[], 'settings':meta['settings'], 'slots':direction['slots'] if direction else {}, 'caption_edits':{}}
    state = {'schema_version':1, 'revision':0, 'base_frames':frames, 'base_info':info, 'base_captions':captions,
        'base_direction':direction, 'document':doc, 'baseline':digest(doc), 'materialized':digest(doc), 'undo':[], 'redo':[], 'audit':[]}
    # An interrupted initializer can be retried; no state is published until all assets exist.
    status('Desenhando o áudio para a linha do tempo', 45)
    raw = directory / 'edit/waveform.pcm'
    if info['audio']:
        command(['ffmpeg','-y','-v','error','-i',base,'-vn','-ac','1','-ar','8000','-f','s16le',raw])
        from array import array
        samples = array('h'); samples.frombytes(raw.read_bytes())
        peaks = [round(max(abs(v) for v in samples[i:i+160])/32768,4) for i in range(0,len(samples),160)]
        write(directory / 'edit/waveform.json', {'rate':50,'peaks':peaks}); raw.unlink()
    else: write(directory / 'edit/waveform.json', {'rate':50,'peaks':[]})
    write(directory / 'edit/timeline.json', state)


def normalize(doc, state):
    if not 1 <= len(doc['clips']) <= 100: raise ValueError('Mantenha de 1 a 100 trechos na timeline.')
    for c in doc['clips']:
        if not isinstance(c['in'],int) or not isinstance(c['out'],int) or not 0 <= c['in'] < c['out'] <= state['base_frames'] or c['out']-c['in'] < 2:
            raise ValueError('O trecho precisa ter pelo menos dois quadros e ficar dentro do material.')
        number(c['zoom'],1,1.4,'Zoom'); number(c['volume'],0,2,'Volume')
    if duration(doc) > 600: raise ValueError('A timeline pode ter até 10 minutos.')
    ids={c['id'] for c in doc['clips']}
    pairs={(a['id'],b['id']) for a,b in zip(doc['clips'],doc['clips'][1:])}
    doc['transitions']=[t for t in doc['transitions'] if (t['clipAId'],t.get('clipBId')) in pairs]
    total=duration(doc)
    for o in doc['overlays']:
        o['start']=min(o['start'],max(0,total-.1));o['duration']=min(o['duration'],total-o['start'])
    return doc


def apply_one(doc, action, state):
    kind=action.get('type');p=action.get('params',{})
    def clip():
        for i,c in enumerate(doc['clips']):
            if c['id']==p.get('clip_id'): return i,c
        raise ValueError('Selecione um trecho válido da timeline.')
    if kind=='clip.trim':
        _,c=clip();c['in']=round(number(p['start'],0,state['base_frames']/FPS,'Entrada')*FPS);c['out']=round(number(p['end'],0,state['base_frames']/FPS,'Saída')*FPS)
        label='Aparar trecho'
    elif kind=='clip.split':
        i,c=clip();start=sum(x['out']-x['in'] for x in doc['clips'][:i]);point=round(number(p['time'],0,duration(doc),'Posição')*FPS)-start+c['in']
        if not c['in']+2<=point<=c['out']-2: raise ValueError('Posicione o cursor dentro do trecho, longe de suas bordas.')
        right={**c,'id':uuid.uuid4().hex[:12],'in':point};c['out']=point;doc['clips'].insert(i+1,right);label='Dividir trecho'
    elif kind=='clip.remove':
        i,_=clip();doc['clips'].pop(i);label='Retirar trecho e fechar espaço'
    elif kind=='clip.move':
        i,c=clip();delta=p.get('direction')
        if delta not in (-1,1):raise ValueError('Escolha mover para antes ou depois.')
        target=i+delta
        if not 0<=target<len(doc['clips']):raise ValueError('O trecho já está nesta ponta da timeline.')
        doc['clips'].pop(i);doc['clips'].insert(target,c);label='Reordenar trecho'
    elif kind=='clip.update':
        _,c=clip()
        for key,lo,hi in [('zoom',1,1.4),('volume',0,2)]:
            if key in p:c[key]=number(p[key],lo,hi,key)
        label='Ajustar zoom e áudio'
    elif kind=='transition.set':
        i,c=clip()
        if i==len(doc['clips'])-1:raise ValueError('Selecione um trecho que tenha outro depois dele.')
        length=number(p['duration'],0,.5,'Fade de áudio');b=doc['clips'][i+1]
        doc['transitions']=[t for t in doc['transitions'] if t['clipAId']!=c['id']]
        if length:doc['transitions'].append({'clipAId':c['id'],'clipBId':b['id'],'duration':length,'params':{'audioFade':True}})
        label='Suavizar emenda de áudio'
    elif kind=='timeline.limit':
        target=round(number(p['seconds'],.1,duration(doc),'Duração')*FPS);out=[]
        for c in doc['clips']:
            take=min(target,c['out']-c['in'])
            if take>=2:out.append({**c,'out':c['in']+take})
            target-=take
            if target<=0:break
        doc['clips']=out;label='Manter os primeiros segundos'
    elif kind=='timeline.select_ranges':
        ranges=p.get('ranges')
        if not isinstance(ranges,list) or not 1<=len(ranges)<=40:raise ValueError('Selecione de 1 a 40 intervalos.')
        doc['clips']=[{'id':uuid.uuid4().hex[:12],'in':round(number(r['start'],0,state['base_frames']/FPS,'Entrada')*FPS),'out':round(number(r['end'],0,state['base_frames']/FPS,'Saída')*FPS),'zoom':1,'volume':1} for r in ranges]
        label='Selecionar e montar os trechos'
    elif kind in ('overlay.add','overlay.update'):
        if kind=='overlay.add':
            if len(doc['overlays'])>=20:raise ValueError('Use até 20 elementos por projeto.')
            o={'id':uuid.uuid4().hex[:12],'kind':p.get('kind','text'),'text':'Seu texto','start':0,'duration':3,'x':50,'y':30,'font_size':72,'color':'#f5a962','scale':1,'model':'cube'};doc['overlays'].append(o)
        else:
            o=next((o for o in doc['overlays'] if o['id']==p.get('id')),None)
            if o is None:raise ValueError('Elemento não encontrado.')
        if o['kind'] not in ('text','3d','image','motion'):raise ValueError('Escolha texto, imagem ou elemento 3D.')
        if o['kind']=='image':
            asset=p.get('asset',o.get('asset',''))
            from asset_registry import resolve_asset
            resolve_asset(asset)
            o['asset']=asset
        for key,lo,hi in [('start',0,duration(doc)),('duration',.1,600),('x',8,88),('y',10,80),('font_size',32,130),('scale',.3,2)]:
            if key in p:o[key]=number(p[key],lo,hi,key)
        if 'text' in p:o['text']=str(p['text']).strip()[:120] or 'Seu texto'
        if 'color' in p:
            if not re.fullmatch(r'#[0-9a-fA-F]{6}',str(p['color'])):raise ValueError('Cor inválida.')
            o['color']=p['color']
        if 'model' in p:
            if p['model'] not in ('cube','sphere','torus','building','laptop','clock','shield','growth'):raise ValueError('Escolha cubo, esfera ou anel.')
            o['model']=p['model']
        if 'layer' in p:
            if p['layer'] not in {'front','behind'}:raise ValueError('Camada inválida.')
            o['layer']=p['layer']
        if o['kind']=='motion':
            motion=p.get('motion',o.get('motion','flow'))
            if motion not in {'flow','calendar','plate','checklist','chart','funnel','cards'}:raise ValueError('Motion inválido.')
            items=p.get('items',o.get('items',[o['text']]))
            if not isinstance(items,list) or not 1<=len(items)<=4 or any(not isinstance(t,str) or not 1<=len(t)<=45 for t in items):raise ValueError('Use de 1 a 4 itens, com até 45 caracteres cada.')
            o.update(motion=motion,items=items)
            if 'item_times' in p:
                times=p['item_times']
                if not isinstance(times,list) or len(times)!=len(items):raise ValueError('Use um tempo para cada item da lista.')
                times=[number(t,0,o['duration'],'Tempo do item') for t in times]
                if times!=sorted(times):raise ValueError('Os tempos da lista precisam estar em ordem.')
                o['item_times']=times
        label='Inserir elemento'  if kind.endswith('add') else 'Ajustar elemento'
    elif kind=='overlay.remove':
        old=len(doc['overlays']);doc['overlays']=[o for o in doc['overlays'] if o['id']!=p.get('id')]
        if len(doc['overlays'])==old:raise ValueError('Elemento não encontrado.')
        label='Retirar elemento'
    elif kind=='slot.set':
        if p.get('key') not in doc['slots']:raise ValueError('Slot não encontrado nesta composição.')
        doc['slots'][p['key']]=str(p['text']).strip()[:120];label='Atualizar marca ou chamada'
    elif kind=='settings.set':
        from server import valid_settings
        new=valid_settings({**doc['settings'],**p})
        if state['base_direction'] and new.get('engine')!='remotion' and (new['style']!='roxo' or new['format']!='9:16'):raise ValueError('Esta composição dirigida usa Roxo e 9:16.')
        doc['settings']=new;label='Atualizar estilo e título'
    elif kind=='caption.set':
        key=str(p.get('key',''));text=str(p.get('text','')).strip()[:160]
        if not re.fullmatch(r'\d+',key) or int(key)>=len(state['base_captions']['blocks']) or not text:raise ValueError('Legenda inválida.')
        doc['caption_edits'][key]=text;label='Revisar legenda'
    else:raise ValueError('Ação não reconhecida. Nenhuma mudança foi aplicada.')
    normalize(doc,state);return label


def execute(directory, revision, actions=None, history=None):
    state=get_state(directory)
    if not state:raise ValueError('Ative a edição da timeline primeiro.')
    if revision!=state['revision']:raise ValueError('O projeto mudou em outra janela. Reabra-o para continuar.')
    before=deepcopy(state['document'])
    if history:
        if history not in ('undo','redo'):raise ValueError('Escolha desfazer ou refazer.')
        source=state['undo'] if history=='undo' else state['redo']
        target=state['redo'] if history=='undo' else state['undo']
        if not source:raise ValueError('Nenhuma alteração para desfazer ou refazer.')
        entry=source.pop();target.append({'document':before,'label':entry['label']});state['document']=entry['document'];label=('Desfazer: ' if history=='undo' else 'Refazer: ')+entry['label']
    else:
        if not isinstance(actions,list) or not 1<=len(actions)<=20:raise ValueError('Envie de 1 a 20 ações por operação.')
        doc=deepcopy(before);labels=[apply_one(doc,a,state) for a in actions]
        if doc==before: return state
        label=' · '.join(dict.fromkeys(labels));state['undo'].append({'document':before,'label':label});state['undo']=state['undo'][-100:];state['redo']=[];state['document']=doc
    state['revision']+=1;state['audit'].append({'revision':state['revision'],'label':label,'time':time.time()});state['audit']=state['audit'][-100:]
    write(directory/'edit/timeline.json',state);return state


def mapped_captions(state):
    result=[];cursor=0
    for c in state['document']['clips']:
        a,b=c['in']/FPS,c['out']/FPS
        for i,block in enumerate(state['base_captions']['blocks']):
            words=[dict(w,w=w['w'],s=round(cursor+max(a,w['s'])-a,3),e=round(cursor+min(b,max(w['e'],w['s']+.03))-a,3)) for w in block['words'] if w['s']>=a-.02 and w['e']<=b+.02 and w['s']<b-.005 and w['e']>=w['s']]
            if not words:continue
            new={'s':words[0]['s'],'e':min(cursor+b-a,round(words[-1]['e']+.12,3)),'words':words,'text':' '.join(w['w'] for w in words),'key':min(block.get('key',0),len(words)-1),'source_key':str(i)}
            if str(i) in state['document']['caption_edits']:
                tokens=state['document']['caption_edits'][str(i)].split();step=(new['e']-new['s'])/len(tokens)
                new.update(text=' '.join(tokens),words=[{'w':w,'s':new['s']+j*step,'e':new['s']+(j+1)*step} for j,w in enumerate(tokens)],key=0,timing='manual-estimated')
            result.append(new)
        cursor+=b-a
    return {'blocks':result,'words':[w for b in result for w in b['words']]}


def public_state(directory, state):
    doc=state['document'];cursor=0;clips=[]
    for i,c in enumerate(doc['clips']):
        length=(c['out']-c['in'])/FPS;clips.append({**c,'index':i,'start':round(cursor,3),'duration':round(length,3),'source_start':c['in']/FPS,'source_end':c['out']/FPS});cursor+=length
    peaks=[];wave=read(directory/'edit/waveform.json')
    if wave['peaks']:
        for c in doc['clips']:peaks.extend(wave['peaks'][int(c['in']/FPS*50):int(c['out']/FPS*50)])
    stride=max(1,math.ceil(len(peaks)/1800));peaks=[max(peaks[i:i+stride]) for i in range(0,len(peaks),stride)]
    return {'revision':state['revision'],'clips':clips,'duration':round(cursor,3),'pending':digest(doc)!=state['materialized'],'overlays':doc['overlays'],'settings':doc['settings'],'slots':doc['slots'],
        'can_undo':bool(state['undo']),'can_redo':bool(state['redo']),'history':state['audit'][-8:],'waveform':peaks,'transitions':doc['transitions'],'base_frames':state['base_frames']}


def remap_direction(state):
    plan=deepcopy(state['base_direction']);doc=state['document'];total=duration(doc);plan.update(duration=total,closing_start=total,cards=[],shots=[],slots=doc['slots']);cursor=0
    for c in doc['clips']:
        a,b=c['in']/FPS,c['out']/FPS
        for key in ('cards','shots'):
            for item in state['base_direction'][key]:
                lo,hi=max(a,item['s']),min(b,item['e'])
                if hi>lo+.02:plan[key].append({**item,'s':round(cursor+lo-a,3),'e':round(cursor+hi-a,3)})
        old_start=state['base_direction']['closing_start']
        if b>old_start:plan['closing_start']=min(plan['closing_start'],cursor+max(a,old_start)-a)
        cursor+=b-a
    return plan


def write_srt(path, blocks):
    def stamp(seconds):
        ms=max(0,round(seconds*1000));hours,ms=divmod(ms,3600000);minutes,ms=divmod(ms,60000);seconds,ms=divmod(ms,1000)
        return f'{hours:02}:{minutes:02}:{seconds:02},{ms:03}'
    text=''.join(f"{i+1}\n{stamp(b['s'])} --> {stamp(b['e'])}\n{b['text']}\n\n" for i,b in enumerate(blocks))
    path=Path(path);temp=path.with_suffix('.srt.tmp');temp.write_text(text,encoding='utf-8');temp.replace(path)


def materialize(directory, meta, command, probe, status):
    state=get_state(directory)
    if not state or digest(state['document'])==state['materialized']:return
    doc=state['document'];status('Montando os cortes e os ajustes de áudio da timeline',20)
    info=state['base_info'];w,h=info['width'],info['height'];parts=[];labels=[]
    for i,c in enumerate(doc['clips']):
        a,b=c['in']/FPS,c['out']/FPS;length=b-a;z=c['zoom']
        zoom=f',scale=trunc(iw*{z}/2)*2:trunc(ih*{z}/2)*2,crop={w}:{h}' if z>1 else ''
        parts.append(f'[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS,fps=30{zoom},setsar=1[v{i}]');labels.append(f'[v{i}]')
        if info['audio']:
            fi,fo=transition_audio_fades(doc['transitions'],c['id']);fi=min(max(.006,fi),length/2);fo=min(max(.01,fo),length/2)
            fi,fo=speech_safe_fades(state['base_captions'],a,b,fi,fo)
            parts.append(f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,volume={c["volume"]},afade=t=in:d={fi},afade=t=out:st={length-fo}:d={fo}[a{i}]');labels.append(f'[a{i}]')
    graph=';'.join(parts)+';'+''.join(labels)+f'concat=n={len(doc["clips"])}:v=1:a={int(info["audio"])}[v]'+('[a]' if info['audio'] else '')
    path=directory/'edit/timeline.ffmpeg';path.write_text(graph,encoding='utf-8');temp=directory/'edit/timeline-montado.mp4'
    args=['ffmpeg','-y','-v','error','-i',directory/'edit/base-timeline.mp4','-filter_complex_script',path,'-map','[v]']
    if info['audio']:args+=['-map','[a]','-c:a','aac','-ar','48000']
    args+=['-t',duration(doc),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',temp]
    media_digest=digest({'clips':doc['clips'],'transitions':doc['transitions']})
    if state.get('materialized_media')!=media_digest or not (directory/'edit/limpo.mp4').exists():
        command(args);probe(temp);temp.replace(directory/'edit/limpo.mp4')
    state['materialized_media']=media_digest
    write(directory/'edit/legendas.json',mapped_captions(state))
    write_srt(directory/'edit/legendas.srt',mapped_captions(state)['blocks'])
    if state['base_direction']:write(directory/'edit/direcao.json',remap_direction(state))
    meta.update(clean_duration=duration(doc),segments=[[c['in']/FPS,c['out']/FPS] for c in doc['clips']],settings=doc['settings'],preview_signature=None,approved_signature=None,final_signature=None)
    write(directory/'projeto.json',meta);state['materialized']=digest(doc);write(directory/'edit/timeline.json',state)


def inject_overlays(folder, directory, sample, app):
    state=get_state(directory)
    if not state:return
    import shutil
    doc=state['document'];total=min(5,duration(doc)) if sample else duration(doc);overlays=[o for o in doc['overlays'] if o['start']<total]
    if not overlays:return
    if any(o['kind']=='motion' or o.get('layer')=='behind' or o.get('model') in {'building','laptop','clock','shield','growth'} for o in overlays):raise ValueError('Selecione Remotion em Estilo para renderizar motion ou camadas avançadas.')
    for name in ['three.module.js','three.core.js']:shutil.copyfile(app/'node_modules/three/build'/name,folder/'assets'/name)
    markup=[]
    for o in overlays:
        length=min(o['duration'],total-o['start']);ident='edit-'+o['id']
        css=f'inset:auto;position:absolute;left:{o["x"]}%;top:{o["y"]}%;transform:translate(-50%,-50%);z-index:30;'
        if o['kind']=='text':markup.append(f'<div id="{ident}" class="clip editor-overlay" style="{css}font:800 {o["font_size"]}px/1.1 Inter;color:{o["color"]};width:80%;text-align:center;text-shadow:0 4px 15px #000c;" data-start="{o["start"]}" data-duration="{length}" data-track-index="7">{html.escape(o["text"])}</div>')
        elif o['kind']=='image':
            from asset_registry import resolve_asset
            source=app/'public'/resolve_asset(o['asset'])['url']
            shutil.copyfile(source,folder/'assets'/source.name)
            markup.append(f'<img id="{ident}" class="clip editor-overlay" src="assets/{source.name}" alt="" style="{css}width:{320*o["scale"]}px;height:auto;object-fit:contain" data-start="{o["start"]}" data-duration="{length}" data-track-index="8">')
        else:markup.append(f'<canvas id="{ident}" class="clip editor-overlay" style="{css}width:{260*o["scale"]}px;height:{260*o["scale"]}px" data-start="{o["start"]}" data-duration="{length}" data-track-index="8"></canvas>')
    data=json.dumps(overlays,ensure_ascii=False).replace('</','<\\/')
    script=r'''<script type="module">
import * as THREE from './assets/three.module.js';
const overlays=__DATA__;
function install(){const tl=window.__timelines.principal;const scenes=[];
overlays.forEach(o=>{const id='#edit-'+o.id;tl.from(id,{opacity:0,y:18,duration:Math.min(.2,o.duration,Number(document.querySelector('#stage').dataset.duration)-o.start),ease:'power3.out'},o.start);
if(o.kind==='3d'){const el=document.querySelector(id),r=new THREE.WebGLRenderer({canvas:el,alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(260,260,false);r.setPixelRatio(2);const s=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,100);cam.position.z=6;const geo=o.model==='sphere'?new THREE.SphereGeometry(1,32,24):o.model==='torus'?new THREE.TorusGeometry(.8,.3,20,48):new THREE.BoxGeometry(1.6,1.6,1.6);const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:o.color,metalness:.35,roughness:.28}));s.add(mesh,new THREE.AmbientLight(0xffffff,2));const l=new THREE.DirectionalLight(0xffffff,4);l.position.set(-3,4,5);s.add(l);scenes.push({r,s,cam,mesh,o});}});
const prior=tl.eventCallback('onUpdate');const draw=()=>{if(prior)prior();scenes.forEach(({r,s,cam,mesh,o})=>{const t=tl.time()-o.start;mesh.rotation.set(.2,t*.55,.15);r.render(s,cam);});};tl.eventCallback('onUpdate',draw);draw();}
if(window.__timelines?.principal)install();else window.addEventListener('composition-ready',install,{once:true});
</script>'''.replace('__DATA__',data)
    p=folder/'index.html';text=p.read_text(encoding='utf-8').replace('</div><script src="assets/gsap.js">',''.join(markup)+'</div><script src="assets/gsap.js">')
    text=text.replace('window.__timelines={principal:tl};','window.__timelines={principal:tl};window.dispatchEvent(new Event("composition-ready"));').replace('window.__timelines={principal:tl};','window.__timelines={principal:tl};')
    text=text.replace('</body>',script+'</body>');p.write_text(text,encoding='utf-8')
