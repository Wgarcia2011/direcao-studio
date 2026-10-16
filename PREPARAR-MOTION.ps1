param([ValidateSet('Remotion','HyperFrames','Ambos')][string]$Engine = 'Ambos')
$ErrorActionPreference = 'Stop'
$folders = if ($Engine -eq 'Ambos') { @('remotion','hyperframes') } else { @($Engine.ToLowerInvariant()) }
foreach ($folder in $folders) {
    Push-Location (Join-Path $PSScriptRoot "motion/$folder")
    try {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar $folder." }
        & npm.cmd run lint
        if ($LASTEXITCODE -ne 0) { throw "Verificacao falhou: $folder." }
        if ($folder -eq 'remotion') {
            & node build-player.cjs
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao reconstruir Player Remotion.' }
        }
    } finally { Pop-Location }
}
Write-Host 'Motores de criacao preparados. Montagem final: Concat.'
