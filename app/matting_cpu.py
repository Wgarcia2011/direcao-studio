"""MODNet local em ONNX Runtime CPU, usando o modelo oficial já baixado."""
from pathlib import Path
import json,subprocess,sys,time
import numpy as np
from PIL import Image
import onnxruntime as ort

def separate(source,output,model,mode='auto'):
    started=time.perf_counter()
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(source)]))['streams'][0]
    w,h=info['width'],info['height'];ratio=512/min(w,h)
    mw=max(32,int(w*ratio)//32*32);mh=max(32,int(h*ratio)//32*32)
    options=ort.SessionOptions();options.intra_op_num_threads=4;options.inter_op_num_threads=1
    providers=['CPUExecutionProvider']
    if mode!='cpu' and 'DmlExecutionProvider' in ort.get_available_providers():
        options.enable_mem_pattern=False;options.execution_mode=ort.ExecutionMode.ORT_SEQUENTIAL
        providers=['DmlExecutionProvider','CPUExecutionProvider']
    session=ort.InferenceSession(str(model),sess_options=options,providers=providers)
    backend=session.get_providers()[0]
    print(json.dumps({'provider':backend,'mode':mode}),flush=True)
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True);temp=output.with_name(output.stem+'-cpu-temp.webm')
    count=0
    with (output.parent/'matting-cpu.log').open('wb') as log:
        dec=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-vf','fps=30','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE,stderr=log)
        enc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{w}x{h}','-r','30','-i','pipe:0','-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0','-crf','24','-deadline','realtime','-cpu-used','5',str(temp)],stdin=subprocess.PIPE,stderr=log)
        try:
            while True:
                data=dec.stdout.read(w*h*3)
                if not data:break
                if len(data)!=w*h*3:raise RuntimeError('Frame incompleto na decodificação.')
                image=Image.frombytes('RGB',(w,h),data)
                resized=np.asarray(image.resize((mw,mh),Image.Resampling.BILINEAR),dtype=np.float32)/255
                inputs=((resized-.5)/.5).transpose(2,0,1)[None].copy()
                alpha=session.run(None,{session.get_inputs()[0].name:inputs})[0][0,0]
                alpha=Image.fromarray((np.clip(alpha,0,1)*255).astype(np.uint8)).resize((w,h),Image.Resampling.BILINEAR)
                image.putalpha(alpha);enc.stdin.write(image.tobytes());count+=1
                if count%30==0:print(json.dumps({'backend':backend,'frames':count}),flush=True)
            enc.stdin.close();dec.stdout.close()
            if dec.wait()!=0 or enc.wait()!=0:raise RuntimeError('Falha no codec. Consulte matting-cpu.log.')
            if not count:raise RuntimeError('Nenhum frame decodificado.')
            subprocess.check_call(['ffprobe','-v','error',str(temp)],stdout=subprocess.DEVNULL,stderr=log)
            temp.replace(output)
        except BaseException:
            dec.kill();enc.kill();dec.wait();enc.wait();raise
    print(json.dumps({'ok':True,'backend':backend,'frames':count,'width':w,'height':h,'elapsed_seconds':round(time.perf_counter()-started,2)}),flush=True)

if __name__=='__main__':separate(*sys.argv[1:5])
