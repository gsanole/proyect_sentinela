# Master Start Script
# Starts all three components: Backend, Mobile, Admin Dashboard

Write-Host "🎨 Art Hub - Master Startup Script" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan

$rootPath = $PSScriptRoot

# Function to start a component in a new window
function Start-Component {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Script
    )
    
    Write-Host "Starting $Name..." -ForegroundColor Yellow
    
    $scriptPath = Join-Path $Path $Script
    
    Start-Process powershell -ArgumentList "-NoExit", "-File", $scriptPath
    
    Write-Host "✅ $Name started in new window" -ForegroundColor Green
}

Write-Host "This will start all components in separate windows:`n" -ForegroundColor White
Write-Host "  1. Backend API (http://localhost:5000)" -ForegroundColor Cyan
Write-Host "  2. Mobile App Metro bundler" -ForegroundColor Cyan
Write-Host "  3. Admin Dashboard (http://localhost:3000)" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Continue? (Y/N)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host "`nStarting components..." -ForegroundColor Cyan

# Start Backend
Start-Component -Name "Backend API" -Path (Join-Path $rootPath "backend") -Script "start.ps1"
Start-Sleep -Seconds 2

# Start Mobile
Start-Component -Name "Mobile App" -Path (Join-Path $rootPath "mobile") -Script "start.ps1"
Start-Sleep -Seconds 2

# Start Admin Dashboard
Start-Component -Name "Admin Dashboard" -Path (Join-Path $rootPath "admin-dashboard") -Script "start.ps1"

Write-Host "`n✅ All components started!" -ForegroundColor Green
Write-Host "`nComponent URLs:" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:5000" -ForegroundColor White
Write-Host "  Admin:     http://localhost:3000" -ForegroundColor White
Write-Host "  Mobile:    Run 'npm run ios' or 'npm run android' in the Mobile window" -ForegroundColor White
Write-Host "`nPress any key to exit this window..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
