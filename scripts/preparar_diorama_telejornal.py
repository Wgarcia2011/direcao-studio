"""Adaptador próprio do Telejornal DARK. Timeline em segundos de SAÍDA.

Uso: python scripts/preparar-diorama-telejornal.py CONFIG.json [--validate-only]
Não publica nem chama o preparador legado. Assets e props ficam em public/projects/SLUG.
"""
import argparse, json, math, re, shutil, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REMOTION=ROOT/'motion/remotion'
SUPPORTED={'speaker','duo','headline','context','outro'}
REQUIRED={'speaker':['mediaRef','identity','sourceLabel','segmentIndex'],'duo':['panels','sourceLabel','simultaneityLabel'],'headline':['headline'],'context':['panels','sourceLabel','simultaneityLabel'],'outro':['src','title','cta']}
def fail(message): raise ValueError('Telejornal DARK: '+message)
def run(args): subprocess.run(list(map(str,args)),check=True)
def probe(p): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def validate(cfg,base):
    def strings(node):
        if isinstance(node,str):yield node
        elif isinstance(node,dict):
            for v in node.values():yield from strings(v)
        elif isinstance(node,list):
            for v in node:yield from strings(v)
    if any(re.search(r'SUBSTITUIR|PLACEHOLDER',value,re.I) for value in strings(cfg)):fail('há placeholders não resolvidos')
    for k in ['design','broadcast','assets','timeline','source','transcript','segments','canvas','outro','brand','audio','slug']:
        if k not in cfg:fail('campo obrigatório ausente: '+k)
    if cfg['composition']!='MotionDioramaTelejornalDark':fail('composição incorreta')
    if cfg['timebase']['timeline']!='output-seconds-before-outro':fail('timeline precisa usar segundos da saída')
    if cfg['timebase']['segments']!='source-seconds':fail('segments precisa usar segundos da fonte')
    canvas=cfg['canvas'];fps=canvas['fps']
    if canvas!={'width':1080,'height':1920,'fps':30}:fail('esta implementação suporta 1080×1920 a 30 fps')
    if not re.fullmatch(r'[a-z0-9-]+',cfg['slug']):fail('slug inválido')
    def exists(name):
        p=(base/name).resolve()
        if not p.is_file():fail('arquivo ausente: '+str(p))
        return p
    source=exists(cfg['source']);transcript=exists(cfg['transcript'])
    duration=float(probe(source)['format']['duration'])
    if not cfg['segments']:fail('não há trechos selecionados')
    prev=0
    for i,(s,e) in enumerate(cfg['segments']):
        if s<prev or e<=s or e>duration+.01:fail(f'segmento {i} inválido ou fora de ordem: {s}–{e}')
        if abs((e-s)*fps-round((e-s)*fps))>.01:fail(f'segmento {i} não está alinhado a frames')
        prev=e
    if len(cfg.get('segmentCrops',[]))!=len(cfg['segments']):fail('segmentCrops deve identificar cada plano')
    video=next(v for v in probe(source)['streams'] if v['codec_type']=='video')
    for crop in cfg['segmentCrops']:
        for rect in [crop]+([crop['transitionTo']] if crop.get('transitionTo') else []):
            if min(rect[k] for k in ['x','y','w','h'])<0 or rect['w']<=0 or rect['h']<=0 or rect['x']+rect['w']>video['width'] or rect['y']+rect['h']>video['height']:fail('crop fora da fonte')
    words=json.loads(transcript.read_text(encoding='utf-8'))['words']
    for w in words:
        if not all(k in w for k in ['w','s','e']) or w['e']<=w['s'] or not w['w'].strip():fail('palavra inválida na transcrição')
    for font in cfg['design']['fonts'].values():exists(font['src'])
    exists(cfg['brand']['src']);exists(cfg['outro']['src']);exists(cfg['audio']['mix'])
    assets={a['id']:a for a in cfg['assets']}
    if len(assets)!=len(cfg['assets']):fail('IDs de assets duplicados')
    for a in assets.values():
        exists(a['src'])
        if not a.get('rights'):fail('situação dos direitos ausente: '+a['id'])
    previous=0;used=[]
    for scene in cfg['timeline']:
        if scene['type'] not in SUPPORTED:fail('tipo de cena não implementado: '+scene['type'])
        for k in REQUIRED[scene['type']]:
            if not scene.get(k) and scene.get(k)!=0:fail(f"{scene['id']}: falta {k}")
        if abs(scene['from']-previous)>.005 or scene['to']<=scene['from']:fail('timeline tem gap, sobreposição ou ordem inválida em '+scene['id'])
        for t in [scene['from'],scene['to']]:
            if abs(t*fps-round(t*fps))>.01:fail('evento da timeline não alinhado a frames')
        if scene['type']=='speaker':
            i=scene['segmentIndex'];used.append(i)
            if i>=len(cfg['segments']):fail('segmentIndex inválido')
            s,e=cfg['segments'][i]
            if abs((scene['to']-scene['from'])-(e-s))>.005:fail('cena não preserva a duração da fala')
            if scene['mediaRef']!='source-cut':fail('speaker deve apontar para source-cut')
            for k in ['name','detail']:
                if not scene['identity'].get(k):fail('identificação ausente: '+k)
            if not scene.get('archive',{}).get('enabled'):fail('fala histórica sem identificação de arquivo')
        for panel in scene.get('panels',[]):
            if panel['assetRef'] not in assets:fail('assetRef ausente: '+panel['assetRef'])
            if not panel.get('name'):fail('painel sem identificação')
        if scene.get('panels') and len(scene['panels'])!=2:fail('duo/context desta implementação exigem dois painéis equivalentes')
        if scene['type']=='duo' and not scene.get('archive',{}).get('enabled'):fail('duo histórico sem identificação')
        previous=scene['to']
    if used!=list(range(len(cfg['segments']))):fail('falas fora da ordem original ou segmento sem cena')
    if cfg['outro']['duration']<3:fail('end card deve durar pelo menos 3 segundos')
    if abs(cfg['outro']['duration']*fps-round(cfg['outro']['duration']*fps))>.01:fail('outro não alinhado a frames')
    if cfg['broadcast']['live'] or cfg['broadcast']['breaking'] or cfg['broadcast']['ticker']['enabled']:fail('não usar ao vivo/urgente/ticker nesta aplicação histórica')
    if not cfg['broadcast']['fairComparison']['equalVisualWeight'] or not cfg['broadcast']['fairComparison']['equalAudioTreatment']:fail('comparação sem tratamento equivalente')
    if cfg['audio']['preserveSpeechSpeed'] is not True:fail('velocidade original obrigatória')
    if cfg['broadcast']['captions']['maxLines']!=2:fail('esta aplicação exige legendas de até duas linhas')
    if cfg['broadcast']['editorial']['originalSpeechSpeed']!=1:fail('não acelerar participantes')
    if cfg['audio']['music']['enabled']:exists(cfg['audio']['music']['src'])
    return source,words,previous,assets

def prepare(path,validate_only=False):
    cfg=json.loads(path.read_text(encoding='utf-8'));base=path.parent
    source,words,body,assets=validate(cfg,base)
    if validate_only:return {'valid':True,'bodySeconds':body,'totalSeconds':body+cfg['outro']['duration']}
    slug=cfg['slug'];dest=REMOTION/'public/projects'/slug;dest.mkdir(parents=True,exist_ok=True)
    qa=base/'preparo';qa.mkdir(exist_ok=True)
    prefix=f'projects/{slug}/'
    copied={}
    def copy(src):
        p=(base/src).resolve()
        if p not in copied:
            name=p.name
            if any(x==name for x in copied.values()):fail('assets com nomes de arquivo duplicados: '+name)
            shutil.copy2(p,dest/name);copied[p]=name
        return prefix+copied[p]
    media_frames=0;table=[];chunks=[];caption_pages=[]
    for i,((start,end),crop) in enumerate(zip(cfg['segments'],cfg['segmentCrops'])):
        d=end-start;scene=next(s for s in cfg['timeline'] if s['type']=='speaker' and s['segmentIndex']==i)
        clip=qa/f'clip-{i}.mov';chunks.append(clip)
        if crop.get('transitionTo'):
            end_crop=crop['transitionTo'];seconds=crop['transitionSeconds']
            if seconds<=0 or seconds>d:fail('duração inválida de reenquadramento')
            k=f'min(t/{seconds},1)'
            cw=f"({crop['w']}+({end_crop['w']}-{crop['w']})*{k})"
            factor=f'max(856/{cw},750/720)'
            cx=f"({crop['x']}+({end_crop['x']}-{crop['x']})*{k})"
            cy=f"({crop['y']}+({end_crop['y']}-{crop['y']})*{k})"
            vf=f"setpts=PTS-STARTPTS,scale=w='ceil(iw*{factor}/2)*2':h='ceil(ih*{factor}/2)*2':eval=frame,crop=856:750:x='{cx}*{factor}':y='{cy}*{factor}',setsar=1,fps=30"
        else:
            vf=f"crop={crop['w']}:{crop['h']}:{crop['x']}:{crop['y']},scale=856:750:force_original_aspect_ratio=increase,crop=856:750,setsar=1,fps=30"
        run(['ffmpeg','-v','error','-y','-ss',start,'-i',source,'-t',d,'-vf',vf,'-af',f'afade=t=in:d=0.025,afade=t=out:st={d-.025}:d=0.025','-c:v','libx264','-crf','18','-preset','fast','-c:a','pcm_s16le','-ar','48000',clip])
        picked=[w for w in words if w['s']>=start-.03 and w['e']<=end+.04]
        if not picked:fail('nenhuma palavra no segmento '+str(i))
        mapped=[{'text':w['w'],'startMs':round((scene['from']+max(0,w['s']-start))*1000),'endMs':round((scene['from']+min(d,w['e']-start))*1000),'timestampMs':None,'confidence':None} for w in picked]
        # Páginas curtas, palavras completas e quebra natural; nunca reduzir a fonte.
        group=[]
        for j,w in enumerate(mapped):
            group.append(w)
            n=len(' '.join(a['text'] for a in group))
            if len(group)>=6 or w['text'].endswith((',', '.', '?')) or j==len(mapped)-1 or (j+1<len(mapped) and n+1+len(mapped[j+1]['text'])>47):
                caption_pages.append({'startMs':group[0]['startMs'],'endMs':min(round(scene['to']*1000),group[-1]['endMs']+120),'words':group,'text':' '.join(a['text'] for a in group)});group=[]
        table.append({'segment':i,'sourceStart':start,'sourceEnd':end,'outputStart':scene['from'],'outputEnd':scene['to'],'cutOffset':media_frames/30,'speaker':scene['identity']['name'],'speech':' '.join(w['w'] for w in picked),'crop':crop})
        scene['mediaOffset']=media_frames/30;media_frames+=round(d*30)
    listing=qa/'concat.txt';listing.write_text('\n'.join(f"file '{p.as_posix()}'" for p in chunks),encoding='utf-8')
    run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',listing,'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',dest/'cut.mp4'])
    design=json.loads(json.dumps(cfg['design']))
    for font in design['fonts'].values():font['src']=copy(font['src'])
    resolved_assets=[{**a,'src':copy(a['src'])} for a in assets.values()]
    resolved_assets.append({'id':'source-cut','type':'video','src':prefix+'cut.mp4','rights':'Direitos não comprovados; ver tabela de fontes.','method':'Cortes reais a 1×, recorte por plano, concatenação em ordem original.'})
    music=cfg['audio']['music'];music_src=copy(music['src']) if music['enabled'] else None
    props={'variant':cfg['variant'],'canvas':cfg['canvas'],'durationInFrames':round((body+cfg['outro']['duration'])*30),'bodyDuration':body,'design':design,'broadcast':cfg['broadcast'],'assets':resolved_assets,'timeline':cfg['timeline'],'brand':{**cfg['brand'],'src':copy(cfg['brand']['src'])},'outro':{**cfg['outro'],'src':copy(cfg['outro']['src'])},'audio':{**cfg['audio'],'mix':copy(cfg['audio']['mix']),'music':{**music,'src':music_src}},'captionPages':caption_pages,'sourceMap':table,'cover':False}
    props_path=base/f"props-{cfg['variant']}.json";props_path.write_text(json.dumps(props,ensure_ascii=False,indent=2),encoding='utf-8');shutil.copy2(props_path,dest/props_path.name)
    (base/'correspondencia-fonte-saida.json').write_text(json.dumps(table,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'valid':True,'props':str(props_path),'durationInFrames':props['durationInFrames'],'sourceMap':table}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('config',type=Path);parser.add_argument('--validate-only',action='store_true');args=parser.parse_args()
    try:print(json.dumps(prepare(args.config.resolve(),args.validate_only),ensure_ascii=False,indent=2))
    except (ValueError,KeyError,FileNotFoundError,subprocess.CalledProcessError) as e:parser.exit(1,str(e)+'\n')
