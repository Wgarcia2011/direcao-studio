param([ValidateRange(1,65535)][int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$editorInterpreter = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path $editorInterpreter)) {
    $editorInterpreter = (Get-Command python -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
}
$editorModel = Join-Path $PSScriptRoot '.models/whisper-small'
if (-not $env:VIDEO_EDITOR_WHISPER_MODEL -and (Test-Path (Join-Path $editorModel 'model.bin'))) {
    $env:VIDEO_EDITOR_WHISPER_MODEL = $editorModel
}
Write-Host "Direcao Studio - abra http://127.0.0.1:$Port/editor no navegador."
Write-Host 'Para encerrar, pressione Ctrl+C neste terminal.'
& $editorInterpreter -X utf8 (Join-Path $PSScriptRoot 'app\server.py') --port $Port
exit $LASTEXITCODE
