$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$runtime = Join-Path $root '.local-model\ollama.exe'
if (-not (Test-Path $runtime)) { throw 'Local Ollama runtime missing. See README for model setup.' }
$env:OLLAMA_MODELS = Join-Path $root '.local-model\models'
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:LLM_MODE = 'ollama'
# TODO: Replace this candidate with the model approved by the hackathon organisers.
if (-not $env:LLM_MODEL) { $env:LLM_MODEL = 'qwen:1.8b' }
if (-not $env:LLM_TIMEOUT_MS) { $env:LLM_TIMEOUT_MS = '120000' }
Write-Host "Local AI: $env:LLM_MODEL. In the app, open an agreement and select Helper model."
Write-Host 'Press Ctrl+C to stop the demo.'
& npx concurrently -k -n MODEL,HELPER,WEB -- "`"$runtime`" serve" "npm:dev:helper" "npm:dev:web"

