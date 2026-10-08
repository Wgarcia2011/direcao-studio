(() => {
  'use strict';
  const names = ['Inserir vídeo','Analisar e transcrever','Cortes e fades','Composição','Revisar','Exportar'];
  const titles = ['Tudo começa pelo seu vídeo.','Entenda a gravação antes de cortar.','Retire as pausas. Preserve o respiro.','Dê forma à edição.','Confira antes de entregar.','Seu vídeo, pronto para sair.'];
  const descriptions = [
    'Importe o arquivo original ou continue um projeto. A cópia original fica preservada.',
    'Confira duração, formato e áudio. Transcreva a fala e revise nomes e palavras antes da limpeza.',
    'Detecte pausas, junte os trechos e aplique fades de áudio de 0,12 s nas emendas. Depois, confira os cortes.',
    'Escolha o formato, as legendas e a identidade. Imagens, textos e motion entram depois da montagem.',
    'Gere uma amostra do trecho mais difícil. Assista e aprove; alterações exigem uma nova amostra.',
    'Com a amostra aprovada, renderize o vídeo completo. O MP4 fica salvo na pasta do projeto.'
  ];
  let station=0, projectId=null, firstProject=true;
  const visits = new Map();
  const nav = document.querySelector('.workflow-nav');
  nav.replaceChildren(); nav.classList.add('assembly-rail'); nav.setAttribute('aria-label','Etapas da edição');
  const rail = names.map((name,index) => {
    const button=document.createElement('button');button.className='assembly-step';
    const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
    const label=document.createElement('span');label.textContent=name;button.append(number,label);
    button.onclick=()=>go(index);nav.append(button);return button;
  });
  const panel=document.createElement('section');panel.className='assembly-station';panel.setAttribute('aria-label','Etapa atual');
  panel.innerHTML='<div class="station-heading"><h1 id="station-title"></h1><span id="station-position"></span></div><p id="station-description"></p><div id="station-facts" class="station-facts"></div><div class="station-actions"><button id="station-primary" class="button primary"></button><button id="station-next" class="button quiet">Continuar →</button></div><p id="station-help" class="station-help"></p>';
  const operation=document.querySelector('.reference-operation');operation.prepend(panel);
  const material=document.querySelector('.reference-materials');material.open=true;
  panel.append(material);
  const advanced=document.createElement('details');advanced.className='assembly-adjustments';
  const summary=document.createElement('summary');summary.textContent='Ajustes da etapa';advanced.append(summary);
  const direction=document.querySelector('.direction-panel');direction.before(advanced);advanced.append(direction);
  const approval=document.querySelector('.approval');panel.append(approval);
  const next=document.getElementById('station-next'), primary=document.getElementById('station-primary');
  const fadeAll=document.createElement('button');fadeAll.className='button quiet';fadeAll.textContent='Fades em todas as emendas';fadeAll.onclick=()=>fades();document.querySelector('.station-actions').append(fadeAll);
  const oldActions=document.querySelector('.action-list');oldActions.hidden=true;
  const command=document.querySelector('.prompt-box'), suggestions=document.querySelector('.suggestions');
  const commandDetails=document.createElement('details');commandDetails.className='assembly-command';
  const commandSummary=document.createElement('summary');commandSummary.textContent='Dar uma instrução específica';commandDetails.append(commandSummary,command,suggestions);operation.insertBefore(commandDetails,document.querySelector('.timeline'));
  const finish=document.createElement('button');finish.className='button quiet';finish.id='assembly-new';finish.textContent='Novo vídeo';finish.onclick=()=>{go(0);document.getElementById('video-file').click();};document.querySelector('.top-actions').prepend(finish);
  function eligible() {
    const p=state.project, e=p?.edit_state;
    return [!!p,!!p&&(!p.audio||p.captions.blocks.length>0),!!e,!!p,!!p?.approved_signature,!!p?.final_signature&&!!p.final_url];
  }
  function tab(name){document.querySelector(`[data-tab="${name}"]`).click();}
  function go(index){
    station=index; if(state.project)visits.set(state.project.id,index);
    if(index>=4&&!document.getElementById('remotion-preview')?.hidden)document.getElementById('close-remotion')?.click();
    if(index===0){material.open=true;advanced.open=false;}
    else {material.open=false;advanced.open=[1,3].includes(index);tab(index===1?'legendas':index===2?'montagem':index===3?'estilo':'direcao');}
    render();
  }
  async function fades(){
    if(!state.project?.edit_state||state.busy)return;
    const id=state.project.id;
    const actions=state.project.edit_state.clips.slice(0,-1).map(c=>({type:'transition.set',params:{clip_id:c.id,duration:.12}}));
    for(let i=0;i<actions.length;i+=20){await window.applyEditActions(actions.slice(i,i+20));if(state.project.id!==id||document.getElementById('status').classList.contains('error'))return;}
    if(actions.length)runAction('montar');else {status('Um único trecho: não há emendas para suavizar.');go(3);}
  }
  primary.onclick=()=>{
    const p=state.project;if(state.busy)return;
    if(station===0){document.getElementById('video-file').click();return;}
    if(!p)return;
    if(station===1){if(!p.audio)go(2);else if(p.captions.blocks.length){advanced.open=true;tab('legendas');}else runAction('legendar');}
    if(station===2){if(p.edit_state){advanced.open=true;tab('montagem');}else if(p.clean_url||p.directed_edit||!p.audio){runAction('editar');}else runAction('limpar');}
    if(station===3){advanced.open=true;tab('estilo');direction.scrollIntoView({behavior:'smooth',block:'nearest'});}
    if(station===4){if(p.preview_signature){setView(true);video.play().catch(e=>toast(e.message));}else runAction('amostra');}
    if(station===5)document.getElementById('export').click();
  };
  next.onclick=()=>{if(!state.busy&&eligible()[station])go(Math.min(5,station+1));};
  function render(){
    const p=state.project, done=eligible(), e=p?.edit_state;
    rail.forEach((b,i)=>{b.classList.toggle('current',i===station);b.classList.toggle('completed',done[i]);if(i===station)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.title=done[i]?'Pronta para continuar':names[i];});
    document.getElementById('station-title').textContent=titles[station];
    document.getElementById('station-position').textContent=`Etapa ${station+1} de 6`;
    document.getElementById('station-description').textContent=descriptions[station];
    const facts=document.getElementById('station-facts');facts.replaceChildren();
    if(p){const values=[`${timeLabel(p.duration)} original`,`${p.width} × ${p.height}`,p.audio?'Com áudio':'Sem áudio'];if(station>0)values.push(`${p.captions.blocks.length} blocos de fala`);if(e)values.push(`${e.clips.length} trechos · ${timeLabel(e.duration)} editado`);values.forEach(value=>{const span=document.createElement('span');span.textContent=value;facts.append(span);});}
    const labels=['Inserir outro vídeo',p?.captions.blocks.length?'Revisar transcrição':p?.audio===false?'Continuar sem transcrição':'Analisar e transcrever',e?'Conferir cortes e fades':p?.clean_url||p?.directed_edit||p?.audio===false?'Preparar timeline editável':'Cortar pausas + aplicar fades','Ajustar composição',p?.preview_signature?'Assistir à amostra':'Gerar amostra',p?.final_url&&p?.final_signature?'Baixar MP4':'Exportar vídeo completo'];
    primary.textContent=p?labels[station]:station===0?'Inserir vídeo':'Insira um vídeo primeiro';
    primary.disabled=state.busy||(station>0&&!p)||(station===1&&!!e&&!p.captions.blocks.length&&p.audio)||(station===2&&!e&&!p.clean_url&&!p.directed_edit&&!done[1])||(station===5&&!p.approved_signature);
    next.hidden=station===5;next.disabled=state.busy||!done[station];
    fadeAll.hidden=station!==2||!e;fadeAll.disabled=state.busy||!e||e.clips.length<2||!p.audio;
    approval.hidden=station!==4;advanced.hidden=station===0;commandDetails.hidden=![2,3].includes(station);
    material.hidden=station!==0;
    document.getElementById('station-help').textContent=state.busy?'Processando no seu computador. Você poderá continuar quando terminar.':station===1&&e&&!p.captions.blocks.length?'Esta timeline já foi editada. Transcreva o projeto original para preservar a montagem.':station===2&&!done[1]?'Primeiro transcreva a fala na etapa 2.':station===2&&e?'A montagem existente será preservada. Os fades podem ser desfeitos em Montagem.':station===4&&!p?.approved_signature?'Assista à amostra e marque a aprovação abaixo para liberar a exportação.':station===5&&!p?.approved_signature?'Volte à revisão e aprove a amostra atual.':station===0?'Você também pode escolher um projeto salvo no painel de material.':'Você pode voltar às etapas anteriores a qualquer momento.';
    document.querySelector('.workspace').classList.toggle('landscape-preview',p?.settings?.format==='16:9');
    document.querySelector('.workspace').dataset.station=String(station);
  }
  function update(){
    if(projectId!==state.project?.id){projectId=state.project?.id;station=visits.get(projectId)??(firstProject?station:state.project?.approved_signature?5:state.project?.preview_signature?4:state.project?.edit_state?3:state.project?.captions.blocks.length?2:state.project?1:0);if(projectId)firstProject=false;go(station);}
    render();
  }
  window.addEventListener('editor-state',update);
  window.addEventListener('editor-job-done',event=>{
    if(event.detail==='legendar')go(2);
    if(['limpar','montar'].includes(event.detail))go(2);
    if(event.detail==='editar')go(2);
    if(event.detail==='amostra')go(4);
    if(event.detail==='exportar')go(5);
  });
  new MutationObserver(render).observe(document.getElementById('status'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.getElementById('approve').addEventListener('change',()=>setTimeout(render,0));
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{advanced.open=true;}));
  document.getElementById('deepseek-shortcut').addEventListener('click',()=>{advanced.open=true;});
  update();
})();
