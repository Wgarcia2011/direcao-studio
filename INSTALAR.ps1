[CmdletBinding()]
param([string]$ExecutavelLocal, [string]$PacoteMSI)
$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot 'config.local.json'
if ($ExecutavelLocal) {
    $exe = (Resolve-Path -LiteralPath $ExecutavelLocal).Path
    if ([IO.Path]::GetFileName($exe) -ne 'concat.exe') { throw 'Informe o concat.exe da distribuicao completa.' }
} else {
    if ($env:OS -ne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem) {
        throw 'Este instalador requer Windows x86_64.'
    }
    $vendor = Join-Path $PSScriptRoot 'vendor'
    New-Item -ItemType Directory -Force -Path $vendor | Out-Null
    if (-not $PacoteMSI) {
        $PacoteMSI = Join-Path $vendor 'Concat-0.2.7-windows-x86_64.msi'
        if (-not (Test-Path -LiteralPath $PacoteMSI)) {
            Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/jub0t/Concat/releases/download/v0.2.7/Concat-0.2.7-windows-x86_64.msi' -OutFile $PacoteMSI
        }
    }
    $PacoteMSI = (Resolve-Path -LiteralPath $PacoteMSI).Path
    $expected = '3F9EDBECC9191503CE9CED58F5B2B603E462B256FA4E27FEF9EE746083D84CC2'
    if ((Get-FileHash -LiteralPath $PacoteMSI -Algorithm SHA256).Hash -ne $expected) {
        throw 'Checksum do MSI incorreto. Nada foi executado; remova o pacote e tente novamente.'
    }
    $destination = Join-Path $vendor 'concat'
    $exe = Join-Path $destination 'PFiles64/Concat/concat.exe'
    if (Test-Path -LiteralPath $exe) { throw 'Distribuicao existente: use -ExecutavelLocal para preserva-la.' }
    $process = Start-Process msiexec.exe -WindowStyle Hidden -Wait -PassThru -ArgumentList @('/a', ('"' + $PacoteMSI + '"'), '/qn', ('TARGETDIR="' + $destination + '"'))
    if ($process.ExitCode -notin @(0,3010)) { throw "Falha na extracao MSI: $($process.ExitCode)." }
    # Pasta portable vazia: o proprio aplicativo cria suas preferencias e credenciais.
    New-Item -ItemType Directory -Force -Path (Join-Path (Split-Path $exe -Parent) 'portable') | Out-Null
}
if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'concat.exe nao encontrado apos a instalacao.' }
if (-not (Test-Path -LiteralPath (Join-Path (Split-Path $exe -Parent) 'avcodec-62.dll'))) {
    throw 'Distribuicao incompleta: mantenha o executavel e todas as DLLs juntos.'
}
@{executable=$exe} | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Write-Host 'Configurado. Execute INICIAR.ps1 para abrir o unico editor, Concat.'
Write-Host 'API pelo chat: Python 3.11+ e servidor local habilitado nas configuracoes do Concat.'
