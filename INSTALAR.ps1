param([switch]$BaixarWhisper, [switch]$BaixarMODNet)
$ErrorActionPreference = 'Stop'
function Invoke-Checked {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha ao executar $Executable (código $LASTEXITCODE)." }
}
foreach ($editorTool in @('python', 'node', 'npm.cmd', 'ffmpeg', 'ffprobe')) {
    if (-not (Get-Command $editorTool -ErrorAction SilentlyContinue)) {
        throw "$editorTool não encontrado. Instale Python 3.11+, Node 22+ e FFmpeg e reabra o terminal. Consulte README.md."
    }
}
Invoke-Checked python @('-c', 'import sys; assert sys.version_info >= (3,11), "Use Python 3.11 ou superior"')
$editorNodeVersion = (& node --version).Trim().TrimStart('v')
if ([version]$editorNodeVersion -lt [version]'22.0.0') { throw 'Use Node 22 ou superior.' }
$editorVenv = Join-Path $PSScriptRoot '.venv'
if (-not (Test-Path (Join-Path $editorVenv 'Scripts/python.exe'))) {
    Invoke-Checked python @('-m', 'venv', $editorVenv)
}
$editorInterpreter = Join-Path $editorVenv 'Scripts/python.exe'
Invoke-Checked $editorInterpreter @('-m', 'pip', 'install', '-r', (Join-Path $PSScriptRoot 'requirements-lock.txt'))
foreach ($editorFolder in @('app', 'app/remotion-project')) {
    Push-Location (Join-Path $PSScriptRoot $editorFolder)
    try { Invoke-Checked npm.cmd @('ci') } finally { Pop-Location }
}
Invoke-Checked $editorInterpreter @((Join-Path $PSScriptRoot 'scripts/preparar-fontes.py'))
Invoke-Checked node @((Join-Path $PSScriptRoot 'app/remotion-project/build-player.cjs'))
if ($BaixarWhisper) {
    Invoke-Checked $editorInterpreter @((Join-Path $PSScriptRoot 'scripts/baixar-whisper.py'))
}
if ($BaixarMODNet) {
    Invoke-Checked node @((Join-Path $PSScriptRoot 'app/remotion-project/download-model.mjs'))
}
Write-Host 'Instalação concluída. Execute .\INICIAR.ps1 e abra http://127.0.0.1:8765/editor.'
if (-not $BaixarWhisper) { Write-Host 'Para transcrever, baixe o Whisper com scripts/baixar-whisper.py ou configure VIDEO_EDITOR_WHISPER_MODEL.' }
