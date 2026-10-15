# Offline evaluation benchmark PowerShell runner for QueryTrust AI
param (
    [string]$Mode = "guarded"
)

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "..\backend"
Set-Location $backendDir

python -m app.evaluation.run_cli --mode $Mode
