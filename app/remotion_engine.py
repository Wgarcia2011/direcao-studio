"""Mesmo componente React no Player, Studio e MP4; sem alterar originais."""
from pathlib import Path
import hashlib,json,math,shutil,sys
import editing_actions as edits
import asset_registry
APP=Path(__file__).resolve().parent
PROJECT=APP/'remotion-project'
BASE_URL='http://127.0.0.1:8765'
def json_write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def prepare(directory,meta,settings,sample,command,probe,status):
    source=directory/('edit/limpo.mp4' if (directory/'edit/limpo.mp4').exists() else 'brutos/original.mp4')
    state=edits.get_state(directory)
    total_seconds=probe(source)['duration'];offset=float(settings.get('sample_start',0)) if sample else 0
    if offset>=total_seconds:raise ValueError('O início da amostra precisa estar dentro do vídeo.')
    seconds=min(float(settings.get('sample_seconds',8)),total_seconds-offset) if sample else total_seconds
    if sample:
        excerpt=directory/'edit/remotion-sample.mp4'
        command(['ffmpeg','-y','-v','error','-i',source,'-ss',str(offset),'-t',str(seconds),'-vf','fps=30','-c:v','libx264','-crf','18','-c:a','aac','-movflags','+faststart',excerpt])
        source=excerpt
    prefix='/media/'+meta['id']+'/'
    props={'width':{'9:16':1080,'16:9':1920,'1:1':1080}[settings['format']],'height':{'9:16':1920,'16:9':1080,'1:1':1080}[settings['format']],
        'durationInFrames':max(1,round(seconds*30)),'totalDurationInFrames':round(total_seconds*30),'offsetFrames':round(offset*30),'foreground':None,'brand':'','cta':'','source':BASE_URL+prefix+source.relative_to(directory).as_posix(),
        'audio':meta['audio'],'title':settings['title'],'captions':settings['captions'],'layout':settings.get('layout','moldura'),'theme':settings.get('theme','roxo'),
        'backgroundMode':settings.get('background_mode','original'),'elements':state['document']['overlays'] if state else [],'blocks':[],
        'timeline_digest':edits.digest(state['document']) if state else None,'settings_snapshot':settings,'acceleration':settings.get('acceleration','auto'),
        'assets':{a['id']:'http://127.0.0.1:8765/'+a['url'] for a in asset_registry.assets()}}
    captions=directory/'edit/legendas.json'
    if captions.exists():props['blocks']=json.loads(captions.read_text(encoding='utf-8'))['blocks']
    if state:props.update(brand=state['document']['slots'].get('brand',''),cta=state['document']['slots'].get('cta',''))
    if props['backgroundMode']!='original':
        status('Separando apresentador e fundo localmente',20)
        # A amostra e o vídeo integral possuem caches diferentes; mesma fonte e mesmos frames.
        with source.open('rb') as stream:source_sha256=hashlib.file_digest(stream,'sha256').hexdigest()
        digest=source_sha256[:16]+'-'+str(props['durationInFrames'])
        suffix='sample' if sample else 'full'
        foreground=directory/('edit/foreground-'+suffix+'.webm');base=directory/('edit/matting-base-'+suffix+'.webm');cache=directory/('edit/matting-cache-'+suffix+'.json')
        if not foreground.exists() or not cache.exists() or json.loads(cache.read_text(encoding='utf-8')).get('key')!=digest:
            clipped=directory/'edit/matting-input.mp4'
            command(['ffmpeg','-y','-i',source,'-t',str(seconds),'-vf','fps=30','-an','-c:v','libx264','-crf','18',clipped])
            model=PROJECT/'models/modnet-v1/onnx/model.onnx'
            if not model.exists():
                command(['node',PROJECT/'download-model.mjs'],cwd=PROJECT,timeout=600)
            mode=settings.get('acceleration','auto')
            gpu_python=APP/'.gpu-venv/Scripts/python.exe'
            interpreter=gpu_python if mode=='auto' and gpu_python.exists() else sys.executable
            try:
                mat_out,mat_err=command([interpreter,'-X','utf8',APP/'matting_cpu.py',clipped,foreground,model,mode],cwd=APP,timeout=7200)
            except Exception:
                if interpreter==sys.executable:raise
                status('GPU indisponível; continuando recorte em CPU',20)
                mat_out,mat_err=command([sys.executable,'-X','utf8',APP/'matting_cpu.py',clipped,foreground,model,'cpu'],cwd=APP,timeout=7200)
            (directory/'edit/matting-provider.log').write_text(mat_out+'\n'+mat_err,encoding='utf-8')
            info=probe(foreground)
            if abs(info['duration']-seconds)>.08:raise ValueError('O recorte não entregou a duração esperada.')
            json_write(cache,{'key':digest,'frames':props['durationInFrames'],'source_sha256':source_sha256})
        props['foreground']=BASE_URL+prefix+'edit/'+foreground.name
    out=directory/('edit/remotion-sample-props.json' if sample else 'edit/remotion-props.json');json_write(out,props)
    public_project=PROJECT/'public/projects'/meta['id'];public_project.mkdir(parents=True,exist_ok=True)
    # Studio uses the same props via --props; every project retains its own JSON.
    if not sample:
        shutil.copy2(out,public_project/'props.json')
        shutil.copy2(out,PROJECT/'public/current-props.json')
    return out
def render(directory,meta,settings,sample,command,probe,status):
    props=prepare(directory,meta,settings,sample,command,probe,status)
    output=directory/('amostras/preview.mp4' if sample else 'final/video.mp4')
    temp=output.with_name('remotion-output.mp4');status('Renderizando por frames no Remotion',40)
    try:
        stdout,stderr=command(['node',PROJECT/'render.cjs',props,temp],cwd=PROJECT,timeout=7200)
        probe(temp)
    except Exception as error:
        (directory/'edit/render.log').write_text(str(error),encoding='utf-8');raise ValueError('Falha no Remotion. Veja edit/render.log; os arquivos anteriores foram preservados.') from error
    (directory/'edit/render.log').write_text(stdout+'\n'+stderr,encoding='utf-8')
    if output.exists():shutil.copy2(output,output.with_name('antes-do-remotion.mp4'))
    temp.replace(output)
    return output
