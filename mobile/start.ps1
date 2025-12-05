# Quick Start - Mobile App
# Run this to start the React Native mobile app

Write-Host "📱 Art Hub Mobile App Setup" -ForegroundColor Cyan
Write-Host "==========================`n" -ForegroundColor Cyan

# Navigate to mobile directory
Set-Location -Path $PSScriptRoot

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Install iOS pods (Mac only)
if ($IsMacOS) {
    Write-Host "`n📱 Installing iOS dependencies..." -ForegroundColor Yellow
    Set-Location ios
    pod install
    Set-Location ..
    Write-Host "✅ iOS dependencies installed" -ForegroundColor Green
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nTo run the app:" -ForegroundColor Cyan
Write-Host "  iOS:     npm run ios" -ForegroundColor White
Write-Host "  Android: npm run android" -ForegroundColor White
Write-Host "`nMake sure the backend is running on http://localhost:5000" -ForegroundColor Yellow
Write-Host "`nStarting Metro bundler..." -ForegroundColor Cyan

npm start
