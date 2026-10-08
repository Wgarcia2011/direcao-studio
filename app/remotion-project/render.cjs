const fs=require('node:fs');const path=require('node:path');
const {bundle}=require('@remotion/bundler');
const {selectComposition,renderMedia}=require('@remotion/renderer');
(async()=>{
 const [propsPath,output]=process.argv.slice(2);if(!propsPath||!output)throw new Error('Informe props e saída.');
 const inputProps=JSON.parse(fs.readFileSync(propsPath,'utf8'));
 const serveUrl=await bundle({entryPoint:path.resolve(__dirname,'src/index.ts'),publicDir:path.resolve(__dirname,'public')});
 const composition=await selectComposition({serveUrl,id:'DirecaoStudio',inputProps});
 const acceleration=inputProps.acceleration==='cpu'?'disable':'if-possible';
 console.log(JSON.stringify({hardwareAcceleration:acceleration}));
 let reported=-30;
 const progressPath=path.join(path.dirname(propsPath),'remotion-progress.json');
 const report=p=>{if(p.renderedFrames<reported+30&&p.renderedFrames!==composition.durationInFrames)return;reported=p.renderedFrames;const data={frames:p.renderedFrames,encodedFrames:p.encodedFrames,total:composition.durationInFrames,output,updated:Date.now()};fs.writeFileSync(progressPath+'.tmp',JSON.stringify(data));fs.renameSync(progressPath+'.tmp',progressPath);console.log(JSON.stringify(data));};
 report({renderedFrames:0,encodedFrames:0});
 await renderMedia({serveUrl,composition,inputProps,codec:'h264',audioCodec:'aac',outputLocation:path.resolve(output),concurrency:2,timeoutInMilliseconds:60000,offthreadVideoCacheSizeInBytes:268435456,hardwareAcceleration:acceleration,...(acceleration==='disable'?{crf:20}:{videoBitrate:'8M'}),onProgress:report});
 console.log(JSON.stringify({ok:true,output,frames:composition.durationInFrames,width:composition.width,height:composition.height}));
})().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});
