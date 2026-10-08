'use strict';
let deepSeekConnected=false;
function showDeepSeek(info){deepSeekConnected=info.connected;$('deepseek-status').textContent=info.connected?`Chave DeepSeek carregada · ${info.model}`:'DeepSeek desconectado';$('deepseek-model').value=info.model;$('deepseek-disconnect').disabled=!info.connected;$('deepseek-use').disabled=!info.connected;window.dispatchEvent(new Event('editor-ai-status'));}
$('deepseek-connect').onclick=async()=>{const key=$('deepseek-key').value;$('deepseek-key').value='';try{showDeepSeek(await api('/api/ai/config',{key,model:$('deepseek-model').value}));$('deepseek-use').checked=true;toast('DeepSeek conectado nesta sessão. Os próximos envios podem executar ações de edição.');}catch(e){toast(e.message);}};
$('deepseek-disconnect').onclick=async()=>{try{showDeepSeek(await api('/api/ai/config',{disconnect:true}));}catch(e){toast(e.message);}};
window.useDeepSeek=()=>deepSeekConnected&&$('deepseek-use').checked;
window.deepSeekBusy=function(busy){$('deepseek-connect').disabled=busy;$('deepseek-disconnect').disabled=busy||!deepSeekConnected;$('deepseek-key').disabled=busy;$('deepseek-model').disabled=busy;$('deepseek-stop').hidden=!(busy&&state.job?.action==='dirigir');};
$('deepseek-stop').onclick=async()=>{try{const result=await api('/api/jobs/cancel',{job:state.job.id});status(result.message);}catch(e){toast(e.message);}};
api('/api/ai/status').then(showDeepSeek).catch(()=>{$('deepseek-status').textContent='Reabra o editor para conectar o DeepSeek.';});

$('deepseek-shortcut').onclick=()=>{document.querySelector('[data-tab=direcao]').click();document.querySelector('.deepseek-panel').open=true;$('deepseek-key').focus();};
