# Deterministic database seeding PowerShell script for QueryTrust AI
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🌱 QueryTrust AI - Deterministic Synthetic Database Seeder" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "..\backend"
Set-Location $backendDir

Write-Host "1. Applying database migrations..." -ForegroundColor Yellow
python -m alembic upgrade head

Write-Host "2. Seeding deterministic synthetic networking assets..." -ForegroundColor Yellow
python -m app.seed.seed_data

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ Database seeding completed successfully!" -ForegroundColor Green
Write-Host "   - 5,000 networking devices" -ForegroundColor Gray
Write-Host "   - 50 enterprise sites" -ForegroundColor Gray
Write-Host "   - 6,000 service incidents" -ForegroundColor Gray
Write-Host "   - 25,000 multi-metric telemetry readings" -ForegroundColor Gray
Write-Host "   - 3 default system user roles (Admin, Analyst, Viewer)" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
