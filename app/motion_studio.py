"""Documentos Motion por projeto; preview/render compartilham props e composição."""
from pathlib import Path
from copy import deepcopy
import json, math, re, threading, uuid, time, shutil
import editing_actions as edits
import remotion_engine
LOCK=threading.RLock()
LAYOUTS={'full','zoom','panel','split','pip','support','stage'}
EFFECTS={'title','keyword','checklist','steps','comparison','flow','calendar','chart','funnel','cards','3d','alert','floating'}
PRESETS={'limpo','cinema','faixa','marcador','karaoke','impacto','roxo','palavra','editorial','ritmo','impacto-turquesa'}

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):
    p.parent.mkdir(parents=True,exist_ok=True);temp=p.with_name(p.name+'.'+uuid.uuid4().hex+'.tmp');temp.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(p)
def default():return {'version':1,'revision':0,'scenes':[],'assets':{},'captions':{'enabled':False,'preset':'impacto-turquesa','accent':'#20cbb6','size':100,'position':'lower','words':4},'undo':[],'redo':[]}
def get(directory):
    p=directory/'edit/motion.json';return read(p) if p.exists() else default()
def number(n,lo,hi,label):
    if isinstance(n,bool):raise ValueError(label+' inválido.')
    try:n=float(n)
    except (ValueError,TypeError):raise ValueError(label+' inválido.')
    if not math.isfinite(n) or not lo<=n<=hi:raise ValueError(f'{label}: use de {lo} a {hi}.')
    return n

def normalize(data,total,assets):
    scenes=data.get('scenes',[])
    if not isinstance(scenes,list) or len(scenes)>60:raise ValueError('Use até 60 inserções.')
    out=[];ids=set()
    for s in scenes:
        ident=str(s.get('id',''))
        if not re.fullmatch(r'[a-f0-9]{12}',ident) or ident in ids:raise ValueError('Identificador de cena inválido.')
        ids.add(ident);start=round(number(s.get('start'),0,max(0,total-.1),'Início')*30)/30
        duration=round(number(s.get('duration'),.1,total-start,'Duração')*30)/30
        kind=s.get('kind')
        if kind not in {'layout','element'}:raise ValueError('Tipo de inserção inválido.')
        layout=s.get('layout','full');effect=s.get('effect','title')
        if layout not in LAYOUTS or effect not in EFFECTS:raise ValueError('Composição ou efeito inválido.')
        asset=s.get('asset','')
        if asset and asset not in assets:raise ValueError('Mídia não pertence a este projeto.')
        if s.get('caption','keep') not in {'keep','move','hide'}:raise ValueError('Posição da legenda inválida.')
        items=s.get('items',[])
        if not isinstance(items,list) or len(items)>4 or any(not isinstance(v,str) or len(v)>45 for v in items):raise ValueError('Use até quatro itens de 45 caracteres.')
        item_times=s.get('item_times',[])
        if not isinstance(item_times,list) or (item_times and len(item_times)!=len(items)):raise ValueError('Tempos devem corresponder aos itens.')
        item_times=[number(v,0,duration,'Tempo do item') for v in item_times]
        if item_times!=sorted(item_times):raise ValueError('Tempos dos itens devem estar em ordem.')
        out.append({'item_times':item_times,'id':ident,'kind':kind,'start':start,'duration':duration,'startFrame':round(start*30),'durationInFrames':round(duration*30),'layout':layout,'effect':effect,'text':str(s.get('text',''))[:120],'items':items,'asset':asset,'slot':str(s.get('slot','Apoio visual'))[:60],'required':bool(s.get('required',False)),'fit':'cover' if s.get('fit')=='cover' else 'contain','focusX':number(s.get('focusX',50),0,100,'Foco horizontal'),'focusY':number(s.get('focusY',50),0,100,'Foco vertical'),'x':number(s.get('x',70),8,92,'Horizontal'),'y':number(s.get('y',35),10,80,'Vertical'),'size':number(s.get('size',72),32,120,'Tamanho'),'scale':number(s.get('scale',1.12),1,1.4,'Zoom'),'intensity':s.get('intensity') if s.get('intensity') in {'soft','balanced','energetic'} else 'soft','caption':s.get('caption','keep')})
    layouts=sorted([s for s in out if s['kind']=='layout'],key=lambda s:s['start'])
    if any(a['start']+a['duration']>b['start']+.02 for a,b in zip(layouts,layouts[1:])):raise ValueError('Composições não podem se sobrepor; ajuste seus intervalos.')
    c=data.get('captions',{});preset=c.get('preset','impacto-turquesa')
    if preset not in PRESETS:raise ValueError('Preset de legenda inválido.')
    accent=c.get('accent','#20cbb6')
    if not re.fullmatch(r'#[a-fA-F0-9]{6}',accent):raise ValueError('Cor inválida.')
    return {'version':1,'scenes':out,'captions':{'enabled':bool(c.get('enabled',False)),'preset':preset,'accent':accent,'size':number(c.get('size',100),85,115,'Tamanho da legenda'),'position':c.get('position') if c.get('position') in {'lower','middle','upper'} else 'lower','words':6 if c.get('words')==6 else 4}}

def snapshot(d):return {k:deepcopy(d[k]) for k in ('scenes','captions')}
def save(directory,data,total):
    with LOCK:
        d=get(directory)
        if data.get('revision')!=d['revision']:raise ValueError('Projeto atualizado em outra janela. Recarregue antes de salvar.')
        action=data.get('history')
        if action:
            if action not in {'undo','redo'}:raise ValueError('Histórico inválido.')
            target='redo' if action=='undo' else 'undo'
            if not d[action]:raise ValueError('Não há alterações para '+action+'.')
            d[target].append(snapshot(d));d.update(d[action].pop())
        else:
            n=normalize(data,total,d['assets']);d['undo'].append(snapshot(d));d['undo']=d['undo'][-100:];d['redo']=[];d.update(n)
        d['revision']+=1;write(directory/'edit/motion.json',d);return d

def words(directory):
    revised=directory/'edit/legendas-pontuadas.json'
    if revised.exists():return read(revised).get('words',[])
    if directory.name=='000d4a5527f24fb7a23677fd137f0b30':
        p=directory.parent.parent/'app/gaby-legenda-pontuada/revisao-pontuacao.json'
        if p.exists():return read(p)['words']
    p=directory/'edit/legendas.json'
    return read(p).get('words',[]) if p.exists() else []

def attach(directory,props,d=None):
    d=d or get(directory);props['motion']=snapshot(d);props['motion']['revision']=d['revision'];props['motion']['assets']={k:{**a,'url':remotion_engine.BASE_URL+a['url']} for k,a in d['assets'].items()};props['motion']['words']=words(directory);props['captions']=d['captions']['enabled'];props['title']='';props['cta']='';props['layout']='cheia';return props

def preview(directory,server):
    meta=server.read_json(directory/'projeto.json');settings=server.valid_settings({**meta['settings'],'engine':'remotion','layout':'cheia','background_mode':'original','title':''})
    path=server.remotion_engine.prepare(directory,meta,settings,False,server.command,server.probe,lambda *a:None)
    props=attach(directory,read(path));write(path,props);return {'document':get(directory),'props':props,'words':words(directory),'duration':props['durationInFrames']/30}

def upload(directory,body,name,server):
    ext=Path(name).suffix.lower()
    if ext not in {'.png','.jpg','.jpeg','.webp','.mp4','.mov','.webm'}:raise ValueError('Use PNG, JPG, WebP, MP4, MOV ou WebM.')
    ident=uuid.uuid4().hex[:12];dest=directory/'assets'/('motion-'+ident+ext);dest.parent.mkdir(exist_ok=True);dest.write_bytes(body)
    try:
        if ext in {'.png','.jpg','.jpeg','.webp'}:
            from PIL import Image
            with Image.open(dest) as im:im.verify()
            kind='image';duration=None
        else:duration=server.probe(dest)['duration'];kind='video'
    except Exception:
        dest.unlink();raise ValueError('Não foi possível ler essa mídia.')
    asset={'id':ident,'name':name[:150],'kind':kind,'duration':duration,'url':f'/media/{directory.name}/assets/{dest.name}'}
    with LOCK:
        d=get(directory);d['assets'][ident]=asset;d['revision']+=1;write(directory/'edit/motion.json',d)
    return asset

def suggest(directory,prompt,server):
    state=edits.get_state(directory)
    if not state:raise ValueError('Prepare a transcrição e o corte primeiro.')
    actions,summary=server.director.plan(state,'Somente overlay.add de texto ou motion. Não altere cortes, áudio, velocidade nem settings. Preserve espaço inferior de legendas e rosto. Poucas inserções ligadas às frases reais. '+str(prompt)[:1000],lambda *a:None)
    scenes=[]
    for a in actions:
        if a['type']!='overlay.add' or a['params'].get('kind') not in {'text','motion'}:raise ValueError('A IA propôs operações fora de Motion. Nada foi aplicado.')
        p=a['params'];scenes.append({'id':uuid.uuid4().hex[:12],'kind':'element','effect':'title' if p.get('kind')=='text' else p.get('motion','flow'),'start':p.get('start',0),'duration':p.get('duration',3),'text':p.get('text',''),'items':p.get('items',[]),'x':p.get('x',70),'y':p.get('y',30)})
    d=get(directory);validated=normalize({'scenes':scenes,'captions':d['captions']},edits.duration(state['document']),d['assets'])
    return {'summary':summary,'scenes':validated['scenes']}

def render_job(directory,data,server):
    d=get(directory);sample=bool(data.get('sample',True))
    for scene in d['scenes']:
        if scene['kind']=='element' and scene['effect'] not in {'3d'} and not scene['asset'] and not (scene['text'].strip() or any(v.strip() for v in scene['items'])):
            raise ValueError('Preencha o texto ou os itens da inserção antes de renderizar.')
    missing=[s['slot'] for s in d['scenes'] if s['required'] and not s['asset']]
    if missing:raise ValueError('Preencha os placeholders: '+', '.join(missing))
    for s in d['scenes']:
        asset=d['assets'].get(s['asset'])
        if asset and asset['kind']=='video' and asset['duration']+1/30<s['duration']:raise ValueError('A mídia de apoio é menor que a cena: '+asset['name'])
    ident=uuid.uuid4().hex;job={'id':ident,'project':directory.name,'action':'motion','state':'waiting','message':'Preparando Motion','progress':0};server.JOBS[ident]=job
    def work():
        try:
            with server.ENGINE:
                job.update(state='running',message='Renderizando Motion por frames',progress=10)
                state=edits.get_state(directory)
                if state:edits.materialize(directory,server.read_json(directory/'projeto.json'),server.command,server.probe,lambda *a:None)
                result=preview(directory,server);props=attach(directory,result['props'],d)
                if sample:
                    start=number(data.get('start',0),0,result['duration']-.1,'Início da amostra');seconds=min(number(data.get('seconds',15),4,20,'Amostra'),result['duration']-start)
                    props['offsetFrames']=round(start*30);props['durationInFrames']=round(seconds*30)
                    # Video and Audio read from the same full source at the sample offset.
                workdir=directory/'edit/motion-jobs'/ident;workdir.mkdir(parents=True);pp=workdir/'props.json';write(pp,props)
                output=directory/('amostras/motion-preview.mp4' if sample else 'final/motion-video.mp4');temp=workdir/'render.mp4'
                stdout,stderr=server.command(['node',server.APP/'remotion-project/render.cjs',pp,temp],cwd=server.APP/'remotion-project',timeout=7200)
                (workdir/'render.log').write_text(stdout+'\n'+stderr,encoding='utf-8');server.probe(temp);server.command(['ffmpeg','-v','error','-i',temp,'-f','null','-'])
                if output.exists():shutil.copy2(output,workdir/'previous.mp4')
                temp.replace(output);url=f'/media/{directory.name}/'+output.relative_to(directory).as_posix()
                manifest=server.ROOT/'Renders/NOVOS/podcast/LOTE-PODCAST.json'
                if manifest.exists():
                    for row in read(manifest)['items']:
                        if any(v.get('project')==directory.name for v in row.get('deliveries',[])):
                            dest=Path(row['folder'])/'MOTION';dest.mkdir(exist_ok=True)
                            # Each export keeps a unique revision; sample/full are explicit.
                            target=dest/f'{row["number"]:02}.{d["revision"]:02} - {"AMOSTRA" if sample else "Motion"} - {ident[:6]}.mp4';shutil.copy2(output,target);job['saved_path']=str(target);break
                job.update(state='done',progress=100,message='Motion pronto',url=url,revision=d['revision'])
        except Exception as e:job.update(state='failed',message=str(e),progress=0)
    threading.Thread(target=work,daemon=True).start();return job
