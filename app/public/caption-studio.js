(() => {
  'use strict';
  const KEY='editor.caption-presets.v1';
  const presets=[
    {id:'limpo',name:'Limpo vivo',description:'Texto branco e uma entrada suave na palavra.',accent:'#ffffff',motion:'Entrada suave'},
    {id:'cinema',name:'Cinema',description:'Serifada, discreta, com destaque suave na fala.',accent:'#f5dfbb',motion:'Dissolver'},
    {id:'faixa',name:'Faixa podcast',description:'Fundo escuro e sublinhado que acompanha a fala.',accent:'#f5c568',motion:'Sublinhado'},
    {id:'marcador',name:'Marcador',description:'Uma palavra por vez recebe a marca turquesa.',accent:'#4ee2c0',motion:'Marca móvel'},
    {id:'karaoke',name:'Karaokê',description:'A cor acompanha cada palavra, sem mover a frase.',accent:'#ffe066',motion:'Cor por palavra'},
    {id:'impacto',name:'Impacto',description:'Caixa alta, contorno e ênfase no momento certo.',accent:'#ffe066',motion:'Pulso curto'},
    {id:'roxo',name:'Roxo em foco',description:'Um destaque roxo integrado à identidade do editor.',accent:'#b798ff',motion:'Realce suave'},
    {id:'palavra',name:'Uma palavra',description:'Cada palavra ocupa o palco, com uma entrada curta.',accent:'#4ee2c0',motion:'Troca de palavra'},
    {id:'editorial',name:'Editorial',description:'Faixa clara, texto escuro e destaque de cor.',accent:'#8250cf',motion:'Sublinhado'},
    {id:'ritmo',name:'Ritmo',description:'A frase se constrói à medida que as palavras chegam.',accent:'#ffb389',motion:'Revelar palavras'},
    {id:'impacto-turquesa',name:'Impacto turquesa',description:'Caixa alta branca com contorno preto e palavra em faixa turquesa.',accent:'#20cbb6',motion:'Destaque por palavra'}
  ];
  let selected='marcador',drafts={};
  try {
    const stored=JSON.parse(localStorage.getItem(KEY)||'null');
    if(stored?.version===1){drafts=stored.drafts||{};if(presets.some(p=>p.id===stored.selected))selected=stored.selected;}
  } catch { /* The catalog also works when local storage is unavailable. */ }
  const defaults=p=>({accent:p.accent,size:100,position:'lower',words:4});
  function config(p){
    const raw=drafts[p.id]||{};
    return {...defaults(p),accent:/^#[a-f\d]{6}$/i.test(raw.accent)?raw.accent:p.accent,
      size:[85,100,115].includes(raw.size)?raw.size:100,
      position:['lower','middle','upper'].includes(raw.position)?raw.position:'lower',
      words:[4,6].includes(raw.words)?raw.words:4};
  }
  const mode=document.createElement('button');mode.id='mode-caption';mode.textContent='LEGENDAR';mode.setAttribute('aria-pressed','false');
  document.querySelector('.editing-modes').append(mode);
  const studio=document.createElement('main');studio.id='caption-studio';studio.className='caption-studio';studio.hidden=true;studio.setAttribute('aria-labelledby','caption-studio-title');
  studio.innerHTML=`
    <header class="caption-heading"><div><h1 id="caption-studio-title">Legendar</h1><p>${presets.length} estilos para dar ritmo à fala. Compare e ajuste antes de escolher.</p></div><button id="caption-download" class="button quiet"><svg aria-hidden="true"><use href="#i-save"/></svg>Baixar os ${presets.length} presets</button></header>
    <p class="caption-scope">Biblioteca de estilos · a prévia usa um texto de demonstração. Os vídeos permanecem como estão.</p>
    <div class="caption-layout">
      <section class="caption-library" aria-labelledby="caption-library-title"><div class="caption-section-heading"><h2 id="caption-library-title">Escolha um preset</h2><span>${presets.length} estilos</span></div><div id="caption-catalog" class="caption-catalog" role="group" aria-label="Presets de legendas"></div></section>
      <section class="caption-workbench" aria-labelledby="caption-preview-title">
        <div class="caption-preview-heading"><h2 id="caption-preview-title">Marcador</h2><label>Formato da prévia<select id="caption-ratio"><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option></select></label></div>
        <div id="caption-demo" class="caption-demo" data-ratio="16:9" data-backdrop="dark" aria-label="Demonstração visual da legenda"><div class="caption-guide" aria-hidden="true"></div><div id="caption-demo-text" class="caption-example" data-position="lower"></div></div>
        <div class="caption-playback"><button id="caption-play" class="button quiet" aria-label="Reproduzir animação"><svg aria-hidden="true"><use href="#i-play"/></svg><span>Reproduzir</span></button><input id="caption-scrub" type="range" min="0" max="10" value="0" step="1" aria-label="Palavra da demonstração"><select id="caption-speed" aria-label="Velocidade da demonstração"><option value="750">Calmo</option><option value="520" selected>Normal</option><option value="350">Rápido</option></select></div>
        <p class="caption-demo-note">Tempos ilustrativos · até duas linhas por bloco. A guia indica uma margem de referência.</p>
        <label class="caption-text-field" for="caption-sample">Texto para testar<textarea id="caption-sample" maxlength="120" rows="2">O seu esforço merece continuar. Cada passo faz a diferença.</textarea></label>
        <fieldset class="caption-adjustments"><legend>Ajuste este preset</legend><label>Tamanho<select id="caption-size"><option value="85">Menor</option><option value="100" selected>Médio</option><option value="115">Maior</option></select></label><label>Posição<select id="caption-position"><option value="lower">Embaixo</option><option value="middle">Centro</option><option value="upper">Em cima</option></select></label><label>Palavras por bloco<select id="caption-words"><option value="4">Até 4</option><option value="6">Até 6</option></select></label><label>Cor do destaque<input id="caption-accent" type="color" value="#4ee2c0"></label><label>Fundo de teste<select id="caption-backdrop"><option value="dark">Escuro</option><option value="light">Claro</option></select></label><label>Movimento<input id="caption-motion" type="text" readonly value="Marca móvel"></label></fieldset>
        <div class="caption-save"><button id="caption-save" class="button primary">Salvar ajustes do preset</button><button id="caption-reset" class="button quiet">Restaurar este preset</button></div><p id="caption-draft-status" class="caption-draft-status" role="status">Ajustes de prévia. Nenhuma legenda aplicada.</p>
      </section>
    </div>`;
  document.querySelector('.workspace').after(studio);
  const get=id=>document.getElementById(id);
  const cards=new Map();
  function ink(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.38?'#10121a':'#ffffff';}
  function caption(node,p,words,index,options,compact=false){
    node.className=`caption-example caption-${p.id}${compact?' caption-mini':''}`;
    node.style.setProperty('--caption-accent',options.accent);node.style.setProperty('--caption-ink',ink(options.accent));node.style.setProperty('--caption-scale',options.size/100);
    node.replaceChildren();
    if(!words.length)return;
    const single=p.id==='palavra';
    const start=single?index:Math.floor(index/options.words)*options.words;
    const shown=single?[words[index]]:words.slice(start,start+options.words);
    const half=Math.ceil(shown.length/2);
    const lines=single||p.id==='impacto-turquesa'?[shown]:[shown.slice(0,half),shown.slice(half)].filter(line=>line.length);
    let offset=0;
    lines.forEach(line=>{
      const row=document.createElement('span');row.className='caption-line';
      line.forEach(text=>{
        const word=document.createElement('span');word.className='caption-word';word.textContent=text;
        const pos=start+offset++;word.classList.toggle('is-current',pos===index);word.classList.toggle('is-past',pos<index);word.classList.toggle('is-future',pos>index);
        row.append(word,document.createTextNode(' '));
      });node.append(row,document.createTextNode('\n'));
    });
  }
  presets.forEach((p,i)=>{
    const card=document.createElement('button');card.type='button';card.className='caption-preset';card.dataset.preset=p.id;card.setAttribute('aria-pressed',String(p.id===selected));
    card.setAttribute('aria-label',`${String(i+1).padStart(2,'0')} ${p.name}. ${p.description}`);
    const view=document.createElement('span');view.className='caption-preset-view';view.setAttribute('aria-hidden','true');
    const sample=document.createElement('span');caption(sample,p,p.id==='impacto-turquesa'?['Esse','segredo','que']:['Seu','esforço','vale','a','pena.'],p.id==='impacto-turquesa'?1:2,{...config(p),words:6},true);view.append(sample);
    const title=document.createElement('span');title.className='caption-preset-title';title.textContent=p.name;
    const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');title.prepend(number);
    const description=document.createElement('span');description.className='caption-preset-description';description.textContent=p.description;
    card.append(view,title,description);card.onclick=()=>choose(p.id);get('caption-catalog').append(card);cards.set(p.id,card);
  });
  let active=false,playing=false,index=0,timer=null;
  const words=()=>get('caption-sample').value.trim().split(/\s+/).filter(Boolean);
  function render(){
    const p=presets.find(p=>p.id===selected),text=words();index=Math.min(index,Math.max(0,text.length-1));
    const node=get('caption-demo-text');caption(node,p,text,index,config(p));node.dataset.position=config(p).position;
    get('caption-scrub').max=Math.max(0,text.length-1);get('caption-scrub').value=index;get('caption-scrub').disabled=!text.length;get('caption-play').disabled=!text.length;
    get('caption-demo').classList.toggle('caption-demo-empty',!text.length);
    get('caption-demo').setAttribute('aria-label',text.length?`Demonstração visual: ${p.name}`:'Digite um texto para ver a prévia');
  }
  function pause(){playing=false;clearInterval(timer);timer=null;get('caption-play').setAttribute('aria-label','Reproduzir animação');get('caption-play').querySelector('span').textContent='Reproduzir';get('caption-play').querySelector('use').setAttribute('href','#i-play');}
  function play(){pause();if(!active||!words().length)return;playing=true;get('caption-play').setAttribute('aria-label','Pausar animação');get('caption-play').querySelector('span').textContent='Pausar';get('caption-play').querySelector('use').setAttribute('href','#i-pause');timer=setInterval(()=>{if(document.hidden)return;index=(index+1)%words().length;render();},Number(get('caption-speed').value));}
  function choose(id){
    selected=id;index=0;const p=presets.find(p=>p.id===id),c=config(p);
    cards.forEach((card,key)=>{card.classList.toggle('selected',key===id);card.setAttribute('aria-pressed',String(key===id));});
    get('caption-preview-title').textContent=p.name;
    for(const key of ['size','position','words','accent'])get('caption-'+key).value=c[key];
    get('caption-motion').value=p.motion;get('caption-draft-status').textContent='Ajustes de prévia. Nenhuma legenda aplicada.';render();
  }
  mode.onclick=()=>window.setEditorMode('legendar');
  window.addEventListener('editor-mode',event=>{
    active=event.detail==='legendar';studio.hidden=!active;
    mode.classList.toggle('selected',active);mode.setAttribute('aria-pressed',String(active));
    if(active){video.pause();render();}else pause();
  });
  get('caption-play').onclick=()=>playing?pause():play();
  get('caption-scrub').oninput=()=>{pause();index=Number(get('caption-scrub').value);render();};
  get('caption-speed').onchange=()=>{if(playing)play();};
  get('caption-sample').oninput=()=>{index=0;if(!words().length)pause();render();};
  get('caption-ratio').onchange=()=>{get('caption-demo').dataset.ratio=get('caption-ratio').value;};
  get('caption-backdrop').onchange=()=>{get('caption-demo').dataset.backdrop=get('caption-backdrop').value;};
  for(const key of ['size','position','words','accent'])get('caption-'+key).addEventListener('input',()=>{
    const p=presets.find(p=>p.id===selected);drafts[selected]={...config(p),[key]:['size','words'].includes(key)?Number(get('caption-'+key).value):get('caption-'+key).value};
    get('caption-draft-status').textContent='Ajustes alterados. Salve para manter nesta biblioteca.';render();
    caption(cards.get(selected).querySelector('.caption-example'),p,p.id==='impacto-turquesa'?['Esse','segredo','que']:['Seu','esforço','vale','a','pena.'],p.id==='impacto-turquesa'?1:2,{...config(p),words:6},true);
  });
  function save(){
    try {localStorage.setItem(KEY,JSON.stringify({version:1,selected,drafts}));get('caption-draft-status').textContent='Preset salvo nesta biblioteca. Os vídeos não foram alterados.';}
    catch {get('caption-draft-status').textContent='Não foi possível salvar no navegador. Baixe a coleção de presets para guardar os ajustes.';}
  }
  get('caption-save').onclick=save;
  get('caption-reset').onclick=()=>{delete drafts[selected];choose(selected);const p=presets.find(p=>p.id===selected);caption(cards.get(selected).querySelector('.caption-example'),p,p.id==='impacto-turquesa'?['Esse','segredo','que']:['Seu','esforço','vale','a','pena.'],p.id==='impacto-turquesa'?1:2,{...config(p),words:6},true);save();};
  get('caption-download').onclick=()=>{
    const data={version:1,type:'caption-preview-presets',scope:'biblioteca de estilos; sem aplicação nos vídeos',presets:presets.map(p=>({...p,...config(p),max_lines:2}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`${presets.length}-presets-de-legendas.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  choose(selected);
})();
