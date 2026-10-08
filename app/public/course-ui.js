'use strict';
(async function(){
 $('workflow-prepare').onclick=()=>{document.querySelector('.media-panel').scrollIntoView({behavior:'smooth',block:'start'});$('add-file').focus();};
 $('workflow-direct').onclick=()=>{panelTab('direcao');$('prompt').focus();};
 $('workflow-review').onclick=()=>{panelTab('legendas');document.getElementById('tab-legendas').scrollIntoView({behavior:'smooth',block:'start'});};
 $('workflow-reuse').onclick=()=>{document.querySelector('.media-panel').scrollIntoView({behavior:'smooth',block:'start'});$('saved-styles').focus();};
 const panel=document.createElement('details');panel.id='course-library';panel.className='course-library';
 const summary=document.createElement('summary');summary.textContent='Biblioteca do projeto';panel.append(summary);
 const note=document.createElement('p');note.className='fine-print';note.textContent='Comandos de edição e seus assets locais. Escolher um comando prepara o pedido; nada é enviado automaticamente.';panel.append(note);
 const nav=document.createElement('button');nav.className='button quiet';nav.textContent='Biblioteca';nav.onclick=()=>{panelTab('direcao');panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'});};document.querySelector('.top-actions').prepend(nav);
 document.getElementById('tab-direcao').append(panel);
 function heading(text){const h=document.createElement('h3');h.textContent=text;panel.append(h);}
 try{
 const response=await fetch('course/catalog.json');if(!response.ok)throw new Error('Biblioteca indisponível. Atualize a página.');const catalog=await response.json();
 heading('Preparar uma direção');
 const label=document.createElement('label');label.className='edit-field';label.textContent='Modelo de comando';const select=document.createElement('select');select.id='course-method';label.htmlFor='course-method';catalog.methods.forEach(m=>select.add(new Option(m.title,m.id)));label.append(select);panel.append(label);
 const use=document.createElement('button');use.className='button quiet';use.textContent='Usar no pedido';use.onclick=()=>{const m=catalog.methods.find(m=>m.id===select.value);$('prompt').value=m.prompt;$('prompt').focus();toast(m.prompt.includes('[')?'Complete os campos entre colchetes antes de enviar.':'Comando preparado. Revise e envie quando estiver pronto.');};panel.append(use);
 heading('Imagens da biblioteca');
 const hint=document.createElement('p');hint.className='fine-print';hint.textContent='Inserir adiciona uma imagem no cursor por até 3 segundos. Ative a edição em Montagem. Depois ajuste tempo, posição e escala em Elementos. Dados e ofertas dos exemplos só devem entrar quando forem verdadeiros para seu vídeo.';panel.append(hint);
 const gallery=document.createElement('div');gallery.className='course-assets';panel.append(gallery);
 catalog.assets.forEach(a=>{const row=document.createElement('div');row.className='course-asset';const img=document.createElement('img');img.src=a.url;img.alt=a.title;img.loading='lazy';const body=document.createElement('div');const name=document.createElement('span');name.textContent=a.title;const button=document.createElement('button');button.className='button quiet';button.textContent='Inserir imagem';button.setAttribute('aria-label','Inserir '+a.title);button.onclick=async()=>{if(state.busy){toast('Aguarde o processamento atual.');return;}if(!editState()){toast('Selecione um vídeo e ative a edição em Montagem.');panelTab('montagem');return;}const start=Math.min(window.editPlayhead(),Math.max(0,editState().duration-.1));await change([{type:'overlay.add',params:{kind:'image',asset:a.id,start,duration:Math.min(3,editState().duration-start),x:76,y:30,scale:1}}]);};body.append(name,button);row.append(img,body);gallery.append(row);});
 if(!catalog.lessons.length&&!catalog.resources.length){const empty=document.createElement('p');empty.className='fine-print';empty.textContent='Importe suas imagens pelo painel de mídia. Materiais do curso não acompanham esta instalação.';panel.append(empty);return;}
 heading('Comandos originais das aulas');
 const lessonLabel=document.createElement('label');lessonLabel.className='edit-field';lessonLabel.textContent='Aula';const lessonSelect=document.createElement('select');lessonSelect.id='course-lesson';lessonLabel.htmlFor='course-lesson';catalog.lessons.forEach((l,i)=>lessonSelect.add(new Option(l.title,String(i))));lessonLabel.append(lessonSelect);panel.append(lessonLabel);
 const text=document.createElement('textarea');text.id='course-lesson-text';text.readOnly=true;text.rows=8;text.setAttribute('aria-label','Comandos originais da aula');text.value=catalog.lessons[0]?.text||'';lessonSelect.onchange=()=>text.value=catalog.lessons[Number(lessonSelect.value)].text;panel.append(text);
 const limits=document.createElement('p');limits.className='fine-print';limits.textContent='As aulas citam Remotion e ferramentas externas. São referências para consulta; o editor continua usando HyperFrames. Instalação, publicação, geração externa e leitura visual automática não são executadas por esses comandos.';panel.append(limits);
 heading('Guia, roteiros e planilhas');
 const links=document.createElement('ul');links.className='course-resources';catalog.resources.forEach(r=>{const li=document.createElement('li');const a=document.createElement('a');a.href=r.url;a.textContent=r.title+' · '+r.type.toUpperCase();a.download='';li.append(a);links.append(li);});panel.append(links);
 }catch(e){note.textContent=e.message;}
})();
