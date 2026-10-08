'use strict';
const $ = (id) => document.getElementById(id);
const video = $('video');
const state = { projects: [], templates: [], project: null, busy: false, style: 'roxo', sample: false, job: null, prompt: '', polling: false };
const token = document.querySelector('meta[name="editor-token"]').content;
const timeLabel = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden = true, 6000); }
function settings() { return { style: state.style, format: $('format').value, title: $('title').value, captions: $('captions-toggle').checked,...(window.remotionSettings?.()||{}) }; }
async function api(path, data) {
 const response = await fetch(path, data ? {method:'POST', headers:{'Content-Type':'application/json','X-Editor-Token':token},body:JSON.stringify(data)} : {});
 const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Não foi possível concluir.'); return result;
}
function status(message, error=false, progress=null) {
 const box=$('status'); box.classList.toggle('error',error); box.replaceChildren();const text=document.createElement('p');text.textContent=message;box.append(text);
 if(progress!==null){const bar=document.createElement('progress');bar.max=100;bar.value=progress;bar.setAttribute('aria-label',message);box.append(bar);}
}
function setBusy(value) {
 state.busy=value; const ready=Boolean(state.project)&&!value;
 document.querySelectorAll('[data-action]').forEach(b=>b.disabled=!ready);
 ['play','seek','safe-toggle','save-template','send-prompt'].forEach(id=>$(id).disabled=!ready);
 ['format','title','captions-toggle'].forEach(id=>$(id).disabled=value);
 $('saved-styles').disabled=value||Boolean(state.project?.directed_edit);document.querySelectorAll('.caption-row input,.project-item').forEach(e=>e.disabled=value);
 document.querySelectorAll('[data-style]').forEach(b=>b.disabled=value);
 $('video-file').disabled=value;$('add-file').disabled=value;$('import-main').disabled=value;
 $('approve').disabled=!ready||!state.project?.preview_signature;
 $('export').disabled=!ready||!state.project?.approved_signature;$('export').textContent=state.project?.final_url&&state.project?.final_signature?'Baixar MP4':'Exportar MP4';
 window.setAdvancedBusy?.(value);window.setEditBusy?.(value);window.deepSeekBusy?.(value);if(state.project?.edit_state){document.querySelectorAll('[data-action]').forEach(b=>{if(['cortar','legendar','preparar'].includes(b.dataset.action))b.disabled=true;});}
 $('view-sample').disabled=!state.project?.preview_url||value;$('view-final').disabled=!state.project?.final_url||value;if(state.project?.directed_edit&&settings().engine!=='remotion'){$('format').disabled=true;document.querySelectorAll('[data-style]').forEach(b=>b.disabled=true);}
 window.dispatchEvent(new Event('editor-state'));
}
function renderProjects() {
 const list=$('project-list');list.replaceChildren();
 if(!state.projects.length){const p=document.createElement('p');p.className='empty-note';p.textContent='Seus vídeos aparecem aqui depois da importação.';list.append(p);return;}
 state.projects.forEach(project=>{const button=document.createElement('button');button.className='project-item'+(state.project?.id===project.id?' selected':'');
 button.disabled=state.busy;const icon=document.createElement('span');icon.className='file-icon';icon.innerHTML='<svg><use href="#i-play"/></svg>';
 const info=document.createElement('div');const title=document.createElement('strong');title.textContent=project.name;const detail=document.createElement('small');detail.textContent=`${timeLabel(project.clean_duration||project.duration)} · ${project.directed_edit?1080:project.width} × ${project.directed_edit?1920:project.height}`;info.append(title,detail);button.append(icon,info);button.onclick=()=>selectProject(project);list.append(button);});
}
function selectProject(project, reset=true) {
 state.project=project;state.style=project.settings?.style||'roxo';$('format').value=project.settings?.format||'9:16';$('title').value=project.settings?.title||'';$('captions-toggle').checked=project.settings?.captions!==false;
 $('project-name').textContent=project.name;$('empty-preview').hidden=true;$('stage').hidden=false;$('preview-indicator').hidden=false;
 $('approve').checked=Boolean(project.approved_signature);document.querySelector('.approval span').textContent=project.approved_signature&&project.approval_source?'Exportação autorizada no pedido':'Revisei e aprovei esta amostra';updateStyleButtons();renderProjects();renderTimeline();renderCaptions();window.renderEditPanel?.();window.fillAdvanced?.();setBusy(state.busy);
 if(reset){setView(project.final_url?'final':false);status(project.final_url?'Edição final pronta. Assista ao vídeo completo ou baixe o MP4.':project.preview_signature?'Amostra pronta. Confira a versão renderizada antes de aprovar.':'Material pronto. Escolha os cortes, as legendas ou a amostra.');}else updateOverlay();
 if(project.active_job&&!state.polling){state.job=project.active_job;setBusy(true);pollJob();}
}
function setView(sample) {
 if(!state.project)return;video.pause();window.prepareEditView?.();const final=sample==='final';state.sample=Boolean(sample);state.final=final;$('view-source').classList.toggle('selected',!sample);$('view-sample').classList.toggle('selected',sample===true);$('view-final').classList.toggle('selected',final);
 state.virtual=!sample&&Boolean(state.project.edit_state?.pending);
 video.src=(state.virtual?state.project.base_url:final?state.project.final_url:sample?state.project.preview_url:(state.project.clean_url||state.project.source_url))+(sample?`?v=${Date.now()}`:'');
 $('preview-indicator').textContent=state.virtual?'Prévia dos cortes · atualize a montagem para conferir áudio e zoom':final?'Edição final · vídeo completo':sample?'Amostra renderizada · até 5 segundos':'Prévia ao vivo · renderize para conferir os efeitos';
 $('title-overlay').hidden=sample;$('caption-overlay').hidden=sample;document.querySelector('.preview-frame').hidden=sample;
 $('stage').dataset.style=sample?'limpo':state.style;updateOverlay();
}
function renderTimeline() {
 const p=state.project;const duration=p.clean_duration||p.duration;$('ruler-end').textContent=timeLabel(duration);$('ruler-mid').textContent=timeLabel(duration/2);
 $('duration-note').textContent=p.removed?`${p.removed.toFixed(1)} s ${p.directed_edit?'retirados na seleção editorial':'de pausas retiradas'} · ${p.segments.length} trechos`:'Original preservado';
 const track=$('video-track');track.replaceChildren();if(p.edit_state){p.edit_state.clips.forEach((c,i)=>{const clip=document.createElement('button');clip.className='clip-bar';clip.dataset.clip=c.id;clip.style.left=String(c.start/duration*100)+'%';clip.style.width=String(c.duration/duration*100)+'%';clip.textContent=`Trecho ${i+1}`;clip.title=`Trecho ${i+1}: ${c.source_start.toFixed(2)}–${c.source_end.toFixed(2)} s da cópia de trabalho`;clip.onclick=()=>window.selectEditClip(c.id);track.append(clip);});}else p.segments.forEach((s,i)=>{const clip=document.createElement('span');clip.className='clip-bar';clip.style.flex=String(s[1]-s[0]);clip.textContent=i===0?p.name:`Trecho ${i+1}`;track.append(clip);});if(p.directed_edit&&!p.edit_state){const closing=document.createElement('span');closing.className='clip-bar';closing.style.flex=String(Math.max(0,duration-p.segments.reduce((total,s)=>total+s[1]-s[0],0)));closing.textContent='Encerramento';track.append(closing);}
 const caps=$('caption-track');caps.replaceChildren();if(p.captions.blocks.length){p.captions.blocks.forEach(b=>{const clip=document.createElement('button');clip.className='caption-bar';clip.style.left=`${b.s/duration*100}%`;clip.style.width=`${Math.max(.5,(b.e-b.s)/duration*100)}%`;clip.textContent=b.text;clip.title=b.text;clip.onclick=()=>{if(state.sample&&!state.final)setView(false);window.editSeek?window.editSeek(b.s):video.currentTime=b.s;};caps.append(clip);});}else{const empty=document.createElement('span');empty.className='empty-track';empty.textContent='A transcrição aparecerá aqui';caps.append(empty);}
 const elements=$('element-track');elements.replaceChildren();$('element-track-row').hidden=!p.edit_state?.overlays.length;p.edit_state?.overlays.forEach(o=>{const b=document.createElement('button');b.className='caption-bar';b.style.left=`${o.start/duration*100}%`;b.style.width=`${o.duration/duration*100}%`;b.textContent=o.kind==='image'?o.asset:o.kind==='text'?o.text:'3D';b.onclick=()=>{document.querySelector('[data-tab=montagem]').click();$('element-details').open=true;$('edit-overlay').value=o.id;$('edit-overlay').dispatchEvent(new Event('change'));};elements.append(b);});
 const audio=$('audio-track');audio.replaceChildren();audio.classList.toggle('ready',p.audio);const note=document.createElement('span');note.className='empty-track';note.textContent=p.audio?'Áudio original · preservado nos trechos mantidos':'Sem faixa de áudio';audio.append(note);window.drawWaveform?.();
}
function renderCaptions() {
 const list=$('caption-list');list.replaceChildren();if(!state.project.captions.blocks.length){const p=document.createElement('p');p.className='empty-note';p.textContent='Transcreva seu vídeo para revisar as legendas.';list.append(p);return;}
 state.project.captions.blocks.forEach((block,index)=>{const row=document.createElement('div');row.className='caption-row';const seek=document.createElement('button');seek.textContent=timeLabel(block.s);seek.title='Ir para esta legenda';seek.onclick=()=>{if(state.sample&&!state.final)setView(false);window.editSeek?window.editSeek(block.s):video.currentTime=block.s;};const input=document.createElement('input');input.value=block.text;input.maxLength=160;input.setAttribute('aria-label',`Legenda ${index+1}`);input.title=block.timing==='manual-estimated'?'Tempos redistribuídos por estimativa manual':'Tempos da transcrição';input.onchange=async()=>{try{const p=await api('/api/captions',{project:state.project.id,index,text:input.value,revision:state.project.edit_state?.revision});state.projects=state.projects.map(x=>x.id===p.id?p:x);selectProject(p);status('Legenda salva. Gere uma nova amostra para conferir a sincronia.');}catch(e){toast(e.message);input.value=block.text;}};row.append(seek,input);list.append(row);});
}
function updateOverlay() {
 if(!state.project||state.sample)return;const t=window.editPlayhead?window.editPlayhead():video.currentTime||0;const block=state.project.captions.blocks.find(b=>t>=b.s&&t<b.e);const box=$('caption-overlay');box.replaceChildren();
 if(block&&$('captions-toggle').checked)block.words.forEach((w,i)=>{const span=document.createElement('span');span.textContent=w.w+' ';span.className=t>=w.s&&t<=w.e?'current':t>w.e?'past':'';box.append(span);});
 window.drawEditOverlays?.();
 $('title-overlay').textContent=t<3?$('title').value:'';
 const ratio={'9:16':[9,16],'16:9':[16,9],'1:1':[1,1]}[$('format').value];$('stage').style.aspectRatio=`${ratio[0]}/${ratio[1]}`;
}
function invalidate() {if(!state.project||state.busy)return;state.project.preview_signature=null;state.project.approved_signature=null;state.project.final_url=null;state.project.final_signature=null;$('approve').checked=false;setBusy(false);if(state.sample)setView(false);updateOverlay();status('Configuração alterada. Gere uma nova amostra antes de exportar.');}
function updateStyleButtons(){document.querySelectorAll('[data-style]').forEach(b=>b.classList.toggle('selected',b.dataset.style===state.style));$('stage').dataset.style=state.style;}
async function upload(file){
 if(!file||state.busy)return;if(file.size>2*1024*1024*1024){toast('Use um vídeo de até 2 GB.');return;}setBusy(true);status('Importando o vídeo para a pasta do projeto…',false,10);
 try{const response=await fetch('/api/upload',{method:'POST',headers:{'X-Editor-Token':token,'X-File-Name':encodeURIComponent(file.name),'Content-Type':'application/octet-stream'},body:file});const p=await response.json();if(!response.ok)throw new Error(p.message);state.projects.unshift(p);selectProject(p);status('Material importado. Escolha os cortes, a transcrição ou um estilo.');}catch(e){status(e.message,true);toast(e.message);}finally{setBusy(false);$('video-file').value='';renderProjects();}
}
async function runAction(action, automatic=null, promptOverride=null){
 if(!state.project||state.busy)return;video.pause();setBusy(true);renderProjects();
 try{state.job=await api('/api/jobs',{project:state.project.id,action,settings:settings(),prompt:promptOverride??$('prompt').value.trim(),automatic});window.deepSeekBusy?.(true);status(state.job.message,false,state.job.progress);pollJob();}catch(e){status(e.message,true);setBusy(false);renderProjects();}
}
async function pollJob(){
 state.polling=true;
 try{const job=await api('/api/jobs/'+state.job.id);status(job.message,job.state==='error',job.state==='running'||job.state==='waiting'?job.progress:null);
 if(job.state==='done'){state.polling=false;state.projects=state.projects.map(p=>p.id===job.result.id?job.result:p);selectProject(job.result);setBusy(false);renderProjects();if(['dirigir','limpar','automatico'].includes(job.action))status(job.summary||'Ações aplicadas. Gere uma amostra para conferir a edição.');if(['amostra','automatico'].includes(job.action)&&job.result.preview_url){setView(true);status(job.action==='automatico'?job.summary:'Amostra pronta. Assista, revise e marque a aprovação para exportar.');}if(job.action==='exportar'&&job.result.final_url){download(job.result.final_url,'video-editado.mp4');status('MP4 exportado. O arquivo também está na pasta final do projeto.');}window.dispatchEvent(new CustomEvent('editor-job-done',{detail:job.action}));}
 else if(job.state==='error'){state.polling=false;setBusy(false);state.projects=await api('/api/projects');const updated=state.projects.find(p=>p.id===state.project.id);if(updated)selectProject(updated);renderProjects();status(job.message,true);}else setTimeout(pollJob,1200);
 }catch(e){state.polling=false;status('Falha ao consultar o processamento. '+e.message,true);setBusy(false);renderProjects();}
}
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();}
function sendPrompt(){
 const original=$('prompt').value.trim();if(/\[[^\]]+\]/.test(original)){toast('Complete os campos entre colchetes antes de enviar.');return;}if(window.useDeepSeek?.()){runAction('dirigir');return;}if(window.tryEditCommand?.(original))return;state.prompt=original;const text=original.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();if(!text){toast('Escreva uma instrução primeiro.');return;}
 if(/\b(3d|efeito|elemento|placeholder|colagen|colagem|emenda)\w*|\b\d+\s*(segundo|seg|s)\b/.test(text)){status('Esse pedido exige uma edição dirigida com seleção de cenas e efeitos. O campo executa apenas cortes de pausas, transcrição e amostras. Envie a instrução ao Codex para dirigir a edição completa.',true);return;}
 if(/amostra|previa/.test(text))runAction('amostra');
 else if(/(corta|cortar|pausa|silencio)/.test(text)&&/(legenda|transcri)/.test(text))runAction('preparar');
 else if(/corta|cortar|pausa|silencio/.test(text))runAction('cortar');
 else if(/legenda|transcri/.test(text))runAction('legendar');
 else toast('Nesta versão, use comandos de cortar pausas, colocar legendas ou gerar amostra. Para estilo e título, abra Estilo.');
}
['add-file','import-main'].forEach(id=>$(id).onclick=()=>$('video-file').click());$('video-file').onchange=()=>upload($('video-file').files[0]);
const drop=$('drop-zone');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');upload(e.dataTransfer.files[0]);};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>runAction(b.dataset.action));document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>$('prompt').value=b.dataset.command);
$('send-prompt').onclick=sendPrompt;$('prompt').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();sendPrompt();}};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('selected',x===b));['direcao','legendas','estilo','montagem'].forEach(id=>$('tab-'+id).hidden=id!==b.dataset.tab);});
document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{state.style=b.dataset.style;updateStyleButtons();window.persistEditSettings?window.persistEditSettings():invalidate();});['format','title','captions-toggle'].forEach(id=>$(id).onchange=()=>window.persistEditSettings?window.persistEditSettings():invalidate());
$('safe-toggle').onclick=()=>$('safe-guide').classList.toggle('active');$('view-source').onclick=()=>setView(false);$('view-sample').onclick=()=>setView(true);$('view-final').onclick=()=>setView('final');
$('play').onclick=()=>{if(video.paused)video.play().catch(e=>toast('Não foi possível reproduzir: '+e.message));else video.pause();};video.onplay=()=>{$('play').setAttribute('aria-label','Pausar vídeo');};video.onpause=()=>{$('play').setAttribute('aria-label','Reproduzir vídeo');};
video.addEventListener('play',()=>$('play').querySelector('use').setAttribute('href','#i-pause'));video.addEventListener('pause',()=>$('play').querySelector('use').setAttribute('href','#i-play'));
video.onloadedmetadata=()=>{$('seek').max=state.virtual?state.project.edit_state.duration:video.duration;window.editSourceLoaded?.();updateTime();};function updateTime(){$('time').replaceChildren(document.createTextNode(timeLabel(window.editPlayhead?window.editPlayhead():video.currentTime||0)+' '));const total=document.createElement('span');total.textContent='/ '+timeLabel(state.virtual?state.project.edit_state.duration:Number.isFinite(video.duration)?video.duration:0);$('time').append(total);$('seek').value=window.editPlayhead?window.editPlayhead():video.currentTime||0;updateOverlay();}video.ontimeupdate=()=>{window.editAdvance?.();updateTime();};$('seek').oninput=()=>{window.editSeek?window.editSeek(Number($('seek').value)):video.currentTime=Number($('seek').value);updateTime();};video.onerror=()=>{if(state.project)toast('O navegador não conseguiu reproduzir este formato. Corte os silêncios para gerar uma cópia MP4 compatível.');};
$('approve').onchange=async()=>{const approved=$('approve').checked;try{const p=await api('/api/approve',{project:state.project.id,settings:settings(),approved});state.project=p;state.projects=state.projects.map(x=>x.id===p.id?p:x);setBusy(false);status(approved?'Amostra aprovada. O vídeo inteiro pode ser exportado.':'Aprovação retirada. Revise a amostra para exportar.');}catch(e){$('approve').checked=false;toast(e.message);}};
$('export').onclick=()=>{if(state.project?.final_url&&state.project?.final_signature){download(state.project.final_url,'video-editado.mp4');status('Baixando a edição final já renderizada.');}else runAction('exportar');};$('save-template').onclick=async()=>{try{const r=await api('/api/template',{project:state.project.id,name:state.project.name.replace(/\.[^.]+$/,''),settings:settings(),prompt:state.prompt});toast(r.message);await loadTemplates();}catch(e){toast(e.message);}};
async function loadTemplates(){state.templates=await api('/api/templates');const menu=$('saved-styles');menu.replaceChildren(new Option('Escolher um estilo salvo',''));state.templates.forEach((t,i)=>menu.add(new Option(t.name,String(i))));}
$('saved-styles').onchange=()=>{const i=$('saved-styles').value;if(i==='')return;const t=state.templates[Number(i)];state.style=t.settings.style;$('format').value=t.settings.format;$('title').value=t.settings.title;$('captions-toggle').checked=t.settings.captions;$('prompt').value=t.prompt||'';window.applyAdvancedSettings?.(t.settings);updateStyleButtons();window.persistEditSettings?window.persistEditSettings():invalidate();toast('Estilo aplicado. Gere uma amostra para conferir.');};
async function init(){try{const [health,projects]=await Promise.all([api('/api/health'),api('/api/projects')]);$('engine-status').textContent=health.ffmpeg&&health.node&&health.whisper&&health.hyperframes?'FFmpeg · Whisper · Remotion · HyperFrames — local':'Falta uma dependência. Consulte LEIA-ME.txt.';state.projects=projects;renderProjects();if(projects.length)selectProject(projects[0]);}catch(e){$('engine-status').textContent='Servidor local indisponível';toast(e.message);}}
init();loadTemplates().catch(e=>toast(e.message));
