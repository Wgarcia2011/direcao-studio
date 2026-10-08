"""Gere uma demonstração local dos seis presets, sem mídia do usuário."""
from pathlib import Path
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'Renders/TESTES-MOTION'
FLAGS=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0


def main():
    DEST.mkdir(parents=True,exist_ok=True)
    fixture=DEST/'fundo-sintetico.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i',
        'color=c=0x100c18:s=1080x1920:r=30:d=18','-c:v','libx264',
        '-preset','ultrafast','-pix_fmt','yuv420p',str(fixture)],check=True,creationflags=FLAGS)
    image=Image.new('RGB',(1200,750),'#151020');draw=ImageDraw.Draw(image)
    font=ImageFont.truetype(str(ROOT/'app/public/assets/manrope-700.ttf'),64)
    small=ImageFont.truetype(str(ROOT/'app/public/assets/manrope-700.ttf'),30)
    draw.rounded_rectangle((45,45,1155,705),radius=40,fill='#241934',outline='#b798ff',width=5)
    draw.text((105,90),'Ideia → resultado',font=font,fill='#ffffff')
    for i,height in enumerate((120,210,310,390)):
        x=150+i*220;draw.rounded_rectangle((x,600-height,x+125,600),radius=18,fill='#4ee2c0' if i==3 else '#b798ff')
    draw.text((100,635),'VISUAL SINTÉTICO • SEM DADOS REAIS',font=small,fill='#b798ff')
    image_path=DEST/'imagem-sintetica.png';image.save(image_path)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=(DEST/'servidor-teste.log').open('wb')
    process=subprocess.Popen([sys.executable,'-X','utf8',str(ROOT/'app/server.py'),'--port',str(port)],
        cwd=ROOT,stdout=log,stderr=log,creationflags=FLAGS)
    try:
        ready=False
        for _ in range(100):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=1):ready=True;break
            except OSError:time.sleep(.1)
        if not ready:raise RuntimeError('Servidor de teste não iniciou.')
        def cli(*args):
            result=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'app/cli.py'),'--port',str(port),*args],
                cwd=ROOT,capture_output=True,text=True,encoding='utf-8',creationflags=FLAGS)
            if result.returncode:raise RuntimeError(result.stderr)
            return json.loads(result.stdout)
        project=cli('import',str(fixture));identifier=project['id']
        plan=DEST/'config-teste.json'
        settings={**project['settings'],'format':'9:16','engine':'remotion','acceleration':'cpu','title':'','captions':False}
        plan.write_text(json.dumps(settings),encoding='utf-8');cli('settings',identifier,str(plan))
        asset=cli('motion-upload',identifier,str(image_path))
        examples=[
            {'preset':'dynamic-title','text':'Sua ideia ganha movimento'},
            {'preset':'impact-word','text':'IMPACTO'},
            {'preset':'image-card','text':'Imagem com movimento','asset':asset['id']},
            {'preset':'checklist','items':['Escolha a fala','Sincronize o motion','Confira a amostra'],'item_times':[0,.65,1.3]},
            {'preset':'comparison','text':'Fica fácil comparar','items':['Sem contexto','Com clareza'],'item_times':[0,.5]},
            {'preset':'flow','items':['Entender','Aplicar','Evoluir'],'item_times':[0,.65,1.3]},
        ]
        doc=cli('motion-show',identifier)['document']
        for i,example in enumerate(examples):
            data={**example,'revision':doc['revision'],'start':i*3,'duration':3,'intensity':'energetic'}
            plan.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
            doc=cli('motion-preset',identifier,str(plan))
        print(f'Renderizando os seis presets: projeto {identifier}, porta {port}',flush=True)
        result=cli('motion-render',identifier,'--seconds','18','--wait')
        output=DEST/'dinamico-seis-presets.mp4'
        shutil.copy2(ROOT/'projetos'/identifier/'amostras/motion-preview.mp4',output)
        info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(output)],creationflags=FLAGS))
        if abs(float(info['format']['duration'])-18)>.1:raise RuntimeError('Duração da demonstração divergente.')
        for i in range(6):
            subprocess.run(['ffmpeg','-y','-v','error','-ss',str(i*3+1.6),'-i',str(output),'-frames:v','1',
                '-update','1',str(DEST/f'preset-{i+1}.png')],check=True,creationflags=FLAGS)
        (DEST/'resultado.json').write_text(json.dumps({'project':identifier,'sample':str(output),
            'duration':info['format']['duration'],'revision':doc['revision'],'job':result['id']},indent=2),encoding='utf-8')
        print(json.dumps({'ok':True,'sample':str(output),'project':identifier,'duration':info['format']['duration']},indent=2),flush=True)
    finally:
        if os.name=='nt':subprocess.run(['taskkill','/PID',str(process.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=FLAGS)
        else:process.terminate()
        process.wait(timeout=30);log.close()


if __name__=='__main__':main()
