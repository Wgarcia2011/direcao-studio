param(
    [ValidateSet('iniciar','status','parar')][string]$Acao = 'status',
    [string]$Config = (Join-Path $PSScriptRoot '../.models/local-ai/config.json')
)
$ErrorActionPreference = 'Stop'
$taskConfigPath = (Resolve-Path -LiteralPath $Config).Path
$taskLocal = Split-Path $taskConfigPath
$taskCfg = Get-Content -Raw -LiteralPath $taskConfigPath | ConvertFrom-Json
$taskStatePath = Join-Path $taskLocal 'server-state.json'
$taskEndpoint = [uri]$taskCfg.semantic.endpoint
if ($taskEndpoint.Host -ne '127.0.0.1' -or $taskEndpoint.Scheme -ne 'http') { throw 'Somente HTTP 127.0.0.1 permitido' }
if ($Acao -eq 'status') {
    Invoke-RestMethod -Uri ($taskCfg.semantic.endpoint + '/health') -TimeoutSec 5
    exit
}
if ($Acao -eq 'parar') {
    $taskState = Get-Content -Raw -LiteralPath $taskStatePath | ConvertFrom-Json
    $taskRunning = Get-Process -Id $taskState.pid -ErrorAction Stop
    if ($taskRunning.Path -ne $taskCfg.semantic.server -or $taskRunning.StartTime.ToUniversalTime().ToString('o') -ne $taskState.started) {
        throw 'PID não corresponde ao servidor registrado; parada recusada'
    }
    Stop-Process -Id $taskRunning.Id
    exit
}
if (Get-NetTCPConnection -LocalPort $taskEndpoint.Port -State Listen -ErrorAction SilentlyContinue) {
    throw 'Porta ocupada; confira o servidor existente antes de iniciar outro'
}
$taskArguments = @('-m',('"'+$taskCfg.semantic.model_path+'"'),'--alias',$taskCfg.semantic.model,
    '--host','127.0.0.1','--port',([string]$taskEndpoint.Port),'-c','4096','-t','4','-ngl','0','--parallel','1','--no-webui')
$taskServer = Start-Process -FilePath $taskCfg.semantic.server -ArgumentList $taskArguments -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $taskLocal 'server-stdout.log') -RedirectStandardError (Join-Path $taskLocal 'server-stderr.log')
@{pid=$taskServer.Id; started=$taskServer.StartTime.ToUniversalTime().ToString('o'); model=$taskCfg.semantic.model_path} |
    ConvertTo-Json | Set-Content -LiteralPath $taskStatePath -Encoding utf8
Write-Output "Servidor CPU iniciado em $($taskCfg.semantic.endpoint), PID $($taskServer.Id). Consulte -Acao status antes de analisar."
