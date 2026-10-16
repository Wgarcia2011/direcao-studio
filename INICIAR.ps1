[CmdletBinding()]
param([string]$Projeto, [switch]$Verificar)
$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot 'config.local.json'
$exe = Join-Path $PSScriptRoot 'vendor/concat/PFiles64/Concat/concat.exe'
if (Test-Path -LiteralPath $configPath) {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $exe = $config.executable
}
if (-not $exe -or -not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw 'Concat nao encontrado. Execute INSTALAR.ps1; consulte README.md.'
}
if ($Verificar) { Write-Output $exe; return }
$launch = @{ FilePath = $exe; WorkingDirectory = (Split-Path $exe -Parent) }
if ($Projeto) {
    $resolved = (Resolve-Path -LiteralPath $Projeto).Path
    if (-not (Test-Path -LiteralPath (Join-Path $resolved 'concat.json'))) {
        throw 'Escolha uma pasta de projeto Concat contendo concat.json.'
    }
    $launch.ArgumentList = '"' + $resolved + '"'
}
# Janela visivel: este e o editor solicitado pelo usuario.
Start-Process @launch
