param([ValidateRange(1,65535)][int]$Port = 8790, [switch]$SemNavegador)
$ErrorActionPreference = 'Stop'
$python = (Get-Command python -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$url = "http://127.0.0.1:$Port"
$ready = $false
try { $ready = (Invoke-RestMethod "$url/api/health" -TimeoutSec 2).app -eq 'direcao-central' } catch {}
if (-not $ready) {
    $script = Join-Path $PSScriptRoot 'scripts/central_server.py'
    $process = Start-Process -FilePath $python -WindowStyle Hidden -PassThru -ArgumentList @('"' + $script + '"', '--port', $Port)
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try { $ready = (Invoke-RestMethod "$url/api/health" -TimeoutSec 1).app -eq 'direcao-central' } catch {}
        if ($ready -or $process.HasExited) { break }
    }
}
if (-not $ready) { throw 'Central nao iniciou. Confira Python 3.11+ ou escolha outra porta com -Port.' }
if (-not $SemNavegador) { Start-Process $url }
Write-Host "Central de ideias: $url"
