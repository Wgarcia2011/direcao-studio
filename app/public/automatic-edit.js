(() => {
  'use strict';
  const workspace=document.querySelector('.workspace');
  const switcher=document.createElement('nav');switcher.className='editing-modes';switcher.setAttribute('aria-label','Modo de edição');
  switcher.innerHTML='<button class="selected" id="mode-guided" aria-pressed="true">Edição por etapas</button><button id="mode-automatic" aria-pressed="false">Edição automática</button>';
  document.querySelector('.workflow-nav').before(switcher);
  const host=document.createElement('section');host.className='automatic-editor';host.hidden=true;host.setAttribute('aria-label','Edição automática');
  host.innerHTML=`<div class="station-heading"><h1>Escolha o que fazer.<br>Deixe a edição trabalhar.</h1><span id="auto-engine-label">Rotinas locais</span></div>
  <p class="auto-intro">Marque as operações ou descreva o resultado. A edição mantém o original e prepara uma amostra para você conferir.</p>
  <div class="auto-source"><div><strong id="auto-project-name">Insira um vídeo para começar</strong><span id="auto-project-facts"></span></div><button class="button quiet" id="auto-import">Inserir vídeo</button><button class="button quiet" id="auto-projects">Trocar projeto</button></div>
  <section class="auto-clean-stage" aria-label="Primeiro, limpar respirações"><h2>Primeiro, limpe as respirações.</h2><p>No ritmo Natural, reduz o volume das respirações leves e mantém os quadros e a fala. Depois, escolha a duração e peça à IA um corte pelo contexto.</p><button class="button primary" id="auto-clean-breaths">Limpar respirações</button><span id="auto-clean-help" role="status"></span></section>
  <fieldset class="auto-duration"><legend>Duração do corte</legend>
    <label class="auto-duration-enable"><input type="checkbox" id="auto-story" checked><span>Selecionar as melhores falas com IA</span></label>
    <div class="auto-duration-presets" role="group" aria-label="Duração desejada">
      <label><input type="radio" name="auto-duration" value="30" checked><span>30 s</span></label>
      <label><input type="radio" name="auto-duration" value="45"><span>45 s</span></label>
      <label><input type="radio" name="auto-duration" value="60"><span>60 s</span></label>
      <label><input type="radio" name="auto-duration" value="120"><span>120 s</span></label>
      <label><input type="radio" name="auto-duration" value="custom"><span>Personalizado</span></label>
    </div>
    <label class="auto-target" id="auto-target-row" hidden>Tempo personalizado em segundos<input id="auto-target" type="number" min="1" max="600" step="1" value="30" aria-describedby="auto-duration-hint"></label>
    <p id="auto-duration-hint">A IA escolhe trechos com começo, sentido e conclusão. O editor confere a duração antes de aplicar.</p>
  </fieldset>
  <div class="auto-rhythm"><label for="auto-rhythm">Pausas e respirações</label><select id="auto-rhythm" aria-describedby="auto-rhythm-hint"><option value="natural" selected>Natural · cortes mais suaves</option><option value="balanced">Equilibrado · ritmo de conversa</option><option value="agile">Ágil · pausas mais curtas</option></select><p id="auto-rhythm-hint"></p></div>
  <fieldset class="auto-options"><legend>Operações básicas</legend>
    <label><input type="checkbox" id="auto-transcribe" checked><span><strong>Analisar e transcrever</strong><small>Fala e tempos das palavras no computador.</small></span></label>
    <label><input type="checkbox" id="auto-cut" checked><span><strong>Limpar pausas longas</strong><small id="auto-cut-hint">Reduz pausas de baixo volume sem atravessar palavras.</small></span></label>
    <label><input type="checkbox" id="auto-breaths"><span><strong>Limpar respirações leves</strong><small id="auto-breaths-hint">Limpeza conservadora de intervalos de baixo volume entre palavras. Confira na amostra.</small></span></label>
    <label><input type="checkbox" id="auto-fades" checked><span><strong>Suavizar as emendas</strong><small id="auto-fades-hint">Fades curtos de áudio entre os trechos.</small></span></label>
    <label><input type="checkbox" id="auto-captions" checked><span><strong>Inserir legendas</strong><small>Legendas sincronizadas com a fala.</small></span></label>
  </fieldset>
  <label class="auto-prompt-label" for="auto-prompt">Ou escreva a direção da edição</label><textarea id="auto-prompt" maxlength="1400" rows="3" placeholder="Ex.: selecione as falas mais importantes para 30 segundos, adicione um título curto e um motion com três ideias do vídeo."></textarea>
  <fieldset class="auto-options auto-complex"><legend>Mais opções com IA</legend>
    <label><input type="checkbox" id="auto-title"><span><strong>Criar um título</strong><small>Um gancho curto baseado na fala real.</small></span></label>
    <label><input type="checkbox" id="auto-motion"><span><strong>Adicionar motion explicativo</strong><small>Textos e diagramas sincronizados ao conteúdo.</small></span></label>
    <label><input type="checkbox" id="auto-images"><span><strong>Usar imagens da biblioteca</strong><small>Somente imagens disponíveis no projeto.</small></span></label>
  </fieldset>
  <p class="auto-ai-note" id="auto-ai-note">As opções básicas funcionam localmente. Texto livre e opções com IA usam a conexão DeepSeek.</p>
  <div id="auto-connection"></div>
  <div class="auto-output"><label><input type="checkbox" id="auto-preview" checked>Gerar uma amostra ao terminar</label><span>Formato e estilo seguem a composição atual.</span><button class="button quiet" id="auto-style">Ajustar formato e estilo</button></div>
  <div class="auto-plan" aria-live="polite"><strong>O que será feito</strong><p id="auto-plan-text"></p></div>
  <div class="auto-buttons"><button class="button primary" id="auto-run">Executar edição automática</button><button class="button quiet" id="auto-stop" hidden>Parar após a etapa atual</button><button class="button quiet" id="auto-review" hidden>Revisar resultado →</button></div><p id="auto-blocker" class="station-help" role="status"></p>`;
  const operation=document.querySelector('.reference-operation');operation.prepend(host);
  const complexOptions=document.createElement('details');complexOptions.className='auto-complex-options';
  const complexSummary=document.createElement('summary');complexSummary.textContent='Opções mais complexas com IA';
  const complexFields=host.querySelector('.auto-complex');complexFields.querySelector('legend').className='sr-only';
  complexFields.before(complexOptions);complexOptions.append(complexSummary,complexFields);
  const connection=document.querySelector('.deepseek-panel'), connectionParent=connection.parentElement;
  let mode='guided',lastProject=null;
  function activate(value){
    mode=value;document.body.dataset.editorMode=value;host.hidden=value!=='automatic';
    document.getElementById('mode-guided').classList.toggle('selected',value==='guided');document.getElementById('mode-guided').setAttribute('aria-pressed',String(value==='guided'));
    document.getElementById('mode-automatic').classList.toggle('selected',value==='automatic');document.getElementById('mode-automatic').setAttribute('aria-pressed',String(value==='automatic'));
    if(value==='automatic'){document.getElementById('auto-connection').append(connection);}else{connectionParent.prepend(connection);}
    update();
    window.dispatchEvent(new CustomEvent('editor-mode',{detail:value}));
  }
  window.setEditorMode=activate;
  function targetSeconds(){
    if(!document.getElementById('auto-story').checked)return null;
    const selected=host.querySelector('input[name="auto-duration"]:checked').value;
    return Number(selected==='custom'?document.getElementById('auto-target').value:selected);
  }
  function targetError(){
    const target=targetSeconds(),p=state.project;
    if(target===null)return '';
    if(p&&!p.audio)return 'A seleção de falas precisa de um vídeo com áudio. Desmarque a seleção com IA para usar as outras operações.';
    if(!Number.isFinite(target)||target<1||target>600)return 'Escolha uma duração entre 1 e 600 segundos.';
    const available=p?.edit_state?.duration??p?.clean_duration??p?.duration;
    if(p&&target>available+1/30)return `Este vídeo tem ${timeLabel(available)}. Escolha um corte menor ou insira um vídeo mais longo.`;
    return '';
  }
  function instruction(){
    const parts=[];
    if(document.getElementById('auto-story').checked)parts.push(`Resuma a fala para ${targetSeconds()} segundos. Use timeline.select_ranges para escolher as falas mais relevantes pelo conteúdo, preservando contexto, começo e conclusão. Some os intervalos para atingir a duração escolhida, sem cortar palavras. A duração deste controle tem prioridade sobre outras durações no texto.`);
    if(document.getElementById('auto-title').checked)parts.push('Adicione um título curto baseado no conteúdo real do vídeo.');
    if(document.getElementById('auto-motion').checked)parts.push('Adicione poucos textos e um motion explicativo sincronizado às ideias reais da fala, usando o motor Remotion.');
    if(document.getElementById('auto-images').checked)parts.push('Insira imagens pertinentes da biblioteca disponível, sem inventar imagens externas.');
    const text=document.getElementById('auto-prompt').value.trim();if(text)parts.push(text);
    if(parts.length){const rhythm=document.getElementById('auto-rhythm').value;parts.push(`Ritmo ${rhythm==='natural'?'natural, com respiros e emendas suaves':rhythm==='balanced'?'equilibrado, preservando pausas de compreensão':'ágil, sem cortar palavras ou conclusões'}. Revise a sequência inteira: preserve frases completas, ordem dos argumentos, referentes, ressalvas e conclusão. Prefira cortes entre frases e folga de respiração; distribua a folga necessária para a duração nas pausas. Não sacrifique sentido para caber no tempo.`);}
    return parts.join('\n');
  }
  function config(){const result={};for(const key of ['transcribe','cut','breaths','fades','captions','preview'])result[key]=document.getElementById('auto-'+key).checked;result.ai=Boolean(instruction());result.rhythm=document.getElementById('auto-rhythm').value;const target=targetSeconds();if(target!==null)result.target_seconds=target;return result;}
  const hasOperations=cfg=>['transcribe','cut','breaths','fades','captions','preview','ai'].some(key=>cfg[key]);
  function update(){
    const p=state.project, cutLocked=!!p&&(!!p.edit_state||!!p.clean_url||!!p.directed_edit);
    if(p?.id!==lastProject){lastProject=p?.id;document.getElementById('auto-cut').checked=!!p?.audio&&!cutLocked;for(const key of ['transcribe','captions'])document.getElementById('auto-'+key).checked=!!p?.audio;document.getElementById('auto-fades').checked=!!p?.audio;document.getElementById('auto-review').hidden=true;}
    host.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=state.busy);
    for(const key of ['transcribe','cut','breaths','captions','fades']){const el=document.getElementById('auto-'+key);el.disabled=state.busy||!p?.audio||(['cut','breaths'].includes(key)&&cutLocked);}
    if(cutLocked){document.getElementById('auto-cut').checked=false;document.getElementById('auto-breaths').checked=false;}
    document.getElementById('auto-breaths-hint').textContent=cutLocked?'Use uma cópia do original para limpar respirações.':'Intervalos de baixo volume entre palavras, com margens de proteção. Nem toda respiração é identificada; confira a amostra.';
    document.getElementById('auto-clean-breaths').disabled=state.busy||!p?.audio||cutLocked;
    document.getElementById('auto-clean-help').textContent=state.busy?'Processando a etapa atual.':!p?'Insira um vídeo para começar.':!p.audio?'Este vídeo não tem áudio.':cutLocked?'Montagem disponível. Continue abaixo com a seleção de falas pela IA.':'Não precisa de conexão com IA. Respirações leves são detectadas de forma conservadora.';
    document.getElementById('auto-cut-hint').textContent=cutLocked?'Montagem existente preservada. Use o original para limpar pausas novamente.':'Reduz pausas de baixo volume, protegendo palavras pela transcrição.';
    const rhythms={natural:{pause:'0,65',padding:'0,18',fade:'0,18'},balanced:{pause:'0,45',padding:'0,12',fade:'0,12'},agile:{pause:'0,30',padding:'0,08',fade:'0,08'}},rhythm=rhythms[document.getElementById('auto-rhythm').value];
    document.getElementById('auto-rhythm-hint').textContent=`Limpa pausas a partir de ${rhythm.pause} s, mantendo ${rhythm.padding} s em cada lado. Palavras transcritas são protegidas. Respirações audíveis podem permanecer; confira as emendas na amostra.`;
    document.getElementById('auto-fades-hint').textContent=`Fades de áudio de ${rhythm.fade} s entre os trechos, sem sobrepor as falas.`;
    document.getElementById('auto-project-name').textContent=p?.name||'Insira um vídeo para começar';document.getElementById('auto-project-facts').textContent=p?`${timeLabel(p.clean_duration||p.duration)} · ${p.width} × ${p.height} · ${p.captions.blocks.length} blocos de fala`:'';
    const cfg=config(), ai=cfg.ai;
    document.getElementById('auto-engine-label').textContent=ai?(deepSeekConnected?'IA conectada':'IA precisa de conexão'):'Rotinas locais';
    document.getElementById('auto-ai-note').textContent=ai?'DeepSeek recebe a instrução, a transcrição e os tempos. O vídeo fica local. O uso da API pode ser cobrado.':'As operações selecionadas são locais. Texto livre e opções mais complexas usam DeepSeek.';
    const durationEnabled=document.getElementById('auto-story').checked;
    host.querySelectorAll('input[name="auto-duration"]').forEach(el=>el.disabled=state.busy||!durationEnabled);
    const custom=host.querySelector('input[name="auto-duration"]:checked').value==='custom';
    document.getElementById('auto-target-row').hidden=!durationEnabled||!custom;
    document.getElementById('auto-target').disabled=state.busy||!durationEnabled;
    const durationError=targetError();document.getElementById('auto-target').setAttribute('aria-invalid',String(Boolean(durationError&&custom)));
    document.getElementById('auto-duration-hint').textContent=durationError||(durationEnabled?'A IA escolhe trechos com começo, sentido e conclusão. O editor confere a duração antes de aplicar.':'A duração atual será mantida pelas operações locais. Texto livre ainda pode pedir cortes à IA.');
    document.getElementById('auto-duration-hint').classList.toggle('duration-error',Boolean(durationError));
    const sequence=[];if(cfg.transcribe||cfg.captions||cfg.cut||cfg.breaths||ai)sequence.push('Preparar a transcrição');if(cfg.cut)sequence.push('Limpar pausas longas');if(cfg.breaths)sequence.push('Limpar respirações leves');if(ai)sequence.push(durationEnabled?`Selecionar falas, revisar contexto e montar ${targetSeconds()} s`:'Interpretar o pedido e aplicar ações validadas');if(cfg.fades)sequence.push('Suavizar emendas');if(cfg.captions)sequence.push('Inserir legendas');sequence.push(cfg.preview?'Gerar amostra para revisão':'Atualizar a montagem');document.getElementById('auto-plan-text').textContent=sequence.join(' → ');
    let blocker=!p?'Insira um vídeo ou escolha um projeto.':durationError?durationError:ai&&!deepSeekConnected?'Conecte o DeepSeek abaixo para executar o pedido com IA.':!hasOperations(cfg)?'Marque ao menos uma operação.':state.busy?'Processando. A revisão será liberada ao terminar.':'A edição automática não exporta o vídeo completo. Confira a amostra antes de aprovar.';
    const run=document.getElementById('auto-run');run.disabled=state.busy||!p||Boolean(durationError)||(ai&&!deepSeekConnected)||!hasOperations(cfg);run.textContent=durationEnabled&&!durationError?`Criar corte de ${targetSeconds()} s com IA`:'Executar edição automática';document.getElementById('auto-blocker').textContent=blocker;
    document.getElementById('auto-stop').hidden=!(state.busy&&state.job?.action==='automatico');document.getElementById('auto-import').disabled=state.busy;document.getElementById('auto-style').disabled=state.busy||!p;document.getElementById('auto-projects').disabled=state.busy;document.getElementById('auto-review').disabled=state.busy;
    window.deepSeekBusy?.(state.busy);
  }
  document.getElementById('mode-guided').onclick=()=>activate('guided');document.getElementById('mode-automatic').onclick=()=>activate('automatic');
  document.getElementById('auto-clean-breaths').onclick=()=>{
    if(state.busy||!state.project)return;
    document.getElementById('auto-review').hidden=true;
    runAction('automatico',{transcribe:false,cut:false,breaths:true,fades:true,captions:false,preview:false,ai:false,rhythm:document.getElementById('auto-rhythm').value},'');
  };
  document.getElementById('auto-import').onclick=()=>document.getElementById('video-file').click();
  document.getElementById('auto-projects').onclick=()=>{activate('guided');document.querySelector('.assembly-step').click();};
  document.getElementById('auto-style').onclick=()=>{activate('guided');document.querySelectorAll('.assembly-step')[3].click();};
  document.getElementById('auto-review').onclick=()=>{activate('guided');document.querySelectorAll('.assembly-step')[4].click();};
  document.getElementById('assembly-new').addEventListener('click',()=>activate('guided'));
  document.getElementById('deepseek-shortcut').addEventListener('click',()=>{activate('guided');document.querySelectorAll('.assembly-step')[3].click();document.querySelector('[data-tab=direcao]').click();connection.open=true;document.getElementById('deepseek-key').focus();});
  const libraryButton=[...document.querySelectorAll('.top-actions button')].find(button=>button.textContent==='Biblioteca');
  libraryButton?.addEventListener('click',()=>{activate('guided');document.querySelectorAll('.assembly-step')[3].click();document.querySelector('[data-tab=direcao]').click();document.getElementById('course-library').open=true;});
  host.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',update));
  document.getElementById('auto-run').onclick=()=>{
    const p=state.project;if(!p||state.busy)return;const prompt=instruction();
    const durationError=targetError();if(durationError){toast(durationError);return;}
    if(prompt.length>2000){toast('Encurte a instrução para até 2000 caracteres.');return;}
    document.getElementById('auto-review').hidden=true;runAction('automatico',config(),prompt);
  };
  document.getElementById('auto-stop').onclick=async()=>{try{status((await api('/api/jobs/cancel',{job:state.job.id})).message);}catch(error){toast(error.message);}};
  window.addEventListener('editor-state',update);window.addEventListener('editor-ai-status',update);
  window.addEventListener('editor-job-done',event=>{if(event.detail==='automatico'){document.getElementById('auto-review').hidden=false;update();}});
  new MutationObserver(update).observe(document.getElementById('status'),{childList:true,subtree:true});
  activate('guided');
})();
