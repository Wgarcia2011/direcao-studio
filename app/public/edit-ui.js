'use strict';
let selectedClip=null, selectedOverlay=null, virtualIndex=0, desiredTime=0;
const editState=()=>state.project?.edit_state;
const n=id=>Number($(id).value);
function panelTab(name){document.querySelector(`[data-tab="${name}"]`).click();}
window.editPlayhead=function(){const e=editState();if(state.virtual&&e){const c=e.clips[virtualIndex]||e.clips[0];return Math.max(0,Math.min(e.duration,c.start+(video.currentTime-c.source_start)));}return video.currentTime||0;};
window.editSeek=function(t){desiredTime=t;const e=editState();if(state.virtual&&e){virtualIndex=Math.max(0,e.clips.findIndex(c=>t<c.start+c.duration-.001));if(t>=e.duration)virtualIndex=e.clips.length-1;const c=e.clips[virtualIndex];if(video.readyState>=1)video.currentTime=c.source_start+Math.max(0,Math.min(c.duration-.01,t-c.start));}else if(video.readyState>=1)video.currentTime=t;window.dispatchEvent(new CustomEvent('timeline-seek',{detail:t}));};
window.prepareEditView=function(){desiredTime=0;virtualIndex=0;};
window.editSourceLoaded=function(){window.editSeek(desiredTime);};
window.editAdvance=function(){const e=editState();if(!state.virtual||!e||video.paused)return;const c=e.clips[virtualIndex];if(video.currentTime>=c.source_end-.025){if(virtualIndex<e.clips.length-1){virtualIndex++;video.currentTime=e.clips[virtualIndex].source_start;}else video.pause();}};
window.renderEditPanel=function(){const e=editState();$('edit-enable').hidden=Boolean(e);$('editing-controls').hidden=!e;$('edit-hint').textContent=e?'Selecione um trecho. Cada mudança é salva e pode ser desfeita.':'Ative a timeline para aparar, dividir e inserir elementos. O MP4 atual terá uma cópia de segurança.';
if(!e){$('timeline-tools').hidden=true;return;}$('timeline-tools').hidden=false;
if(!e.clips.some(c=>c.id===selectedClip))selectedClip=e.clips[0].id;
const menu=$('edit-clip');menu.replaceChildren();e.clips.forEach((c,i)=>menu.add(new Option(`Trecho ${i+1} · ${c.duration.toFixed(2)} s`,c.id)));menu.value=selectedClip;
const c=e.clips.find(c=>c.id===selectedClip);$('clip-in').value=c.source_start.toFixed(3);$('clip-out').value=c.source_end.toFixed(3);$('clip-zoom').value=c.zoom;$('clip-volume').value=c.volume;
const fade=e.transitions.find(t=>t.clipAId===c.id);$('clip-fade').value=fade?.duration||0;
$('edit-summary').textContent=`${e.clips.length} trechos · ${e.duration.toFixed(2)} s · ${e.pending?'prévia para atualizar':'cortes atualizados'}`;
const elements=$('edit-overlay');elements.replaceChildren(new Option('Escolha um elemento',''));e.overlays.forEach((o,i)=>elements.add(new Option(o.kind==='motion'?('Motion: '+o.motion):o.kind==='image'?o.asset:o.kind==='text'?o.text:`${o.model==='cube'?'Cubo':o.model==='sphere'?'Esfera':'Anel'} 3D ${i+1}`,o.id)));
if(!e.overlays.some(o=>o.id===selectedOverlay))selectedOverlay=null;elements.value=selectedOverlay||'';
$('overlay-fields').hidden=!selectedOverlay;
if(selectedOverlay){const o=e.overlays.find(o=>o.id===selectedOverlay);$('overlay-text-row').hidden=o.kind!=='text';$('overlay-model-row').hidden=o.kind!=='3d';$('overlay-text').value=o.text;$('overlay-model').value=o.model;$('overlay-start').value=o.start;$('overlay-duration').value=o.duration;$('overlay-x').value=o.x;$('overlay-y').value=o.y;$('overlay-color').value=o.color;$('overlay-font').value=o.font_size;$('overlay-scale').value=o.scale;}
$('slot-controls').hidden=!Object.keys(e.slots).length;if(Object.keys(e.slots).length){$('slot-brand').value=e.slots.brand||'';$('slot-cta').value=e.slots.cta||'';}
$('edit-history').replaceChildren();e.history.slice().reverse().forEach(h=>{const li=document.createElement('li');li.textContent=h.label;$('edit-history').append(li);});
document.querySelectorAll('#video-track button[data-clip]').forEach(b=>{b.classList.toggle('selected',b.dataset.clip===selectedClip);b.setAttribute('aria-pressed',String(b.dataset.clip===selectedClip));});
window.setEditBusy(state.busy);window.drawWaveform();
};
window.setEditBusy=function(busy){const e=editState();document.querySelectorAll('#editing-controls input,#editing-controls select,#editing-controls button,#video-track button[data-clip]').forEach(el=>el.disabled=busy);['edit-undo','timeline-undo'].forEach(id=>$(id).disabled=busy||!e?.can_undo);['edit-redo','timeline-redo'].forEach(id=>$(id).disabled=busy||!e?.can_redo);$('timeline-build').disabled=busy||!e?.pending;};
window.selectEditClip=function(id){selectedClip=id;const c=editState()?.clips.find(c=>c.id===id);if(c){if(state.sample)setView(false);window.editSeek(c.start);panelTab('montagem');window.renderEditPanel();}};
window.drawWaveform=function(){const e=editState();if(!e)return;const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=62;canvas.className='waveform';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Forma de onda do áudio da timeline');const ctx=canvas.getContext('2d');ctx.fillStyle='#8edbc4';const peaks=e.waveform;const step=canvas.width/Math.max(1,peaks.length);peaks.forEach((p,i)=>{const h=Math.max(1,p*canvas.height*.92);ctx.fillRect(i*step,(canvas.height-h)/2,Math.max(.7,step),h);});$('audio-track').replaceChildren(canvas);};
window.drawEditOverlays=function(){const host=$('live-overlays');host.replaceChildren();if(state.sample)return;const t=window.editPlayhead();editState()?.overlays.filter(o=>t>=o.start&&t<o.start+o.duration).forEach(o=>{const div=document.createElement('div');div.className='live-element';div.textContent=o.kind==='motion'?('Motion: '+o.motion):o.kind==='image'?o.asset:o.kind==='text'?o.text:`${o.model==='cube'?'Cubo':o.model==='sphere'?'Esfera':'Anel'} 3D`;div.style.left=o.x+'%';div.style.top=o.y+'%';div.style.color=o.color;div.style.fontSize=(o.font_size/1080*$('stage').clientWidth)+'px';if(o.kind==='3d'||o.kind==='motion')div.classList.add('placement-marker');if(o.kind==='image'){div.style.width='auto';div.replaceChildren();const img=document.createElement('img');img.src=(o.asset.startsWith('local-')?'local-assets/':'course/assets/')+o.asset+'.png';img.alt=o.asset;img.style.width=(320*o.scale/1080*$('stage').clientWidth)+'px';img.style.height='auto';div.append(img);}host.append(div);});};
async function change(actions,history=null){if(!editState()||state.busy)return;video.pause();setBusy(true);
try{const p=await api(history?'/api/history':'/api/actions',{project:state.project.id,revision:editState().revision,actions,history});state.projects=state.projects.map(x=>x.id===p.id?p:x);selectProject(p);status(p.edit_state.pending?'Alterações salvas. Atualize a prévia dos cortes ou gere uma amostra com os efeitos.':'Histórico restaurado.');}catch(e){status(e.message,true);toast(e.message);}finally{setBusy(false);}}
window.applyEditActions=change;
const params=()=>({clip_id:selectedClip});
$('edit-clip').onchange=()=>window.selectEditClip($('edit-clip').value);
$('clip-trim').onclick=()=>change([{type:'clip.trim',params:{...params(),start:n('clip-in'),end:n('clip-out')}}]);
$('clip-split').onclick=()=>change([{type:'clip.split',params:{...params(),time:window.editPlayhead()}}]);
$('clip-remove').onclick=()=>change([{type:'clip.remove',params:params()}]);
$('clip-before').onclick=()=>change([{type:'clip.move',params:{...params(),direction:-1}}]);
$('clip-after').onclick=()=>change([{type:'clip.move',params:{...params(),direction:1}}]);
$('clip-adjust').onclick=()=>change([{type:'clip.update',params:{...params(),zoom:n('clip-zoom'),volume:n('clip-volume')}},{type:'transition.set',params:{...params(),duration:n('clip-fade')}}].filter(a=>a.type!=='transition.set'||editState().clips.at(-1).id!==selectedClip));
['edit-undo','timeline-undo'].forEach(id=>$(id).onclick=()=>change(null,'undo'));['edit-redo','timeline-redo'].forEach(id=>$(id).onclick=()=>change(null,'redo'));
$('timeline-edit').onclick=()=>panelTab('montagem');
$('overlay-add-text').onclick=async()=>{await change([{type:'overlay.add',params:{kind:'text',text:'Seu texto',start:Math.min(window.editPlayhead(),Math.max(0,editState().duration-3))}}]);selectedOverlay=editState().overlays.at(-1)?.id;$('element-details').open=true;window.renderEditPanel();};
$('overlay-add-3d').onclick=async()=>{await change([{type:'overlay.add',params:{kind:'3d',start:Math.min(window.editPlayhead(),Math.max(0,editState().duration-3)),x:76,y:70}}]);selectedOverlay=editState().overlays.at(-1)?.id;$('element-details').open=true;window.renderEditPanel();};
$('edit-overlay').onchange=()=>{selectedOverlay=$('edit-overlay').value||null;window.renderEditPanel();};
$('overlay-save').onclick=()=>change([{type:'overlay.update',params:{id:selectedOverlay,text:$('overlay-text').value,model:$('overlay-model').value,start:n('overlay-start'),duration:n('overlay-duration'),x:n('overlay-x'),y:n('overlay-y'),font_size:n('overlay-font'),scale:n('overlay-scale'),color:$('overlay-color').value}}]);
$('overlay-remove').onclick=()=>change([{type:'overlay.remove',params:{id:selectedOverlay}}]);
$('slot-save').onclick=()=>change([{type:'slot.set',params:{key:'brand',text:$('slot-brand').value}},{type:'slot.set',params:{key:'cta',text:$('slot-cta').value}}]);
window.persistEditSettings=async function(){if(editState())return change([{type:'settings.set',params:settings()}]);if(!state.project||state.busy)return;try{const updated=await api('/api/settings',{project:state.project.id,settings:settings()});state.project.settings=updated.settings;state.project.approved_signature=null;invalidate();}catch(e){toast(e.message);}};
window.tryEditCommand=function(text){if(!editState())return false;let match;
if((match=text.match(/^(?:reduza|corte|limite|mantenha).*?(\d+(?:[.,]\d+)?)\s*(?:segundos?|s)\.?$/i))){change([{type:'timeline.limit',params:{seconds:Number(match[1].replace(',','.'))}}]);return true;}
if(/^desfazer\.?$/i.test(text)){change(null,'undo');return true;}if(/^refazer\.?$/i.test(text)){change(null,'redo');return true;}
if((match=text.match(/^(?:adicione|coloque|insira) (?:um )?(?:texto|titulo)\s+["“](.+)["”]\.?$/i))){change([{type:'overlay.add',params:{kind:'text',text:match[1],start:0}}]);return true;}
if((match=text.match(/^(?:adicione|coloque|insira) (?:um |uma )?(cubo|esfera|anel)(?: 3d)?\.?$/i))){change([{type:'overlay.add',params:{kind:'3d',model:{cubo:'cube',esfera:'sphere',anel:'torus'}[match[1].toLowerCase()],start:0,x:76,y:70}}]);return true;}
return false;};
window.renderEditPanel();
