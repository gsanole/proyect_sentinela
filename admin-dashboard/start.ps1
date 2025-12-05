# Quick Start - Admin Dashboard
# Run this to start the React admin dashboard

Write-Host "🖥️  Art Hub Admin Dashboard Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Navigate to admin directory
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

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nAdmin Dashboard will open at: http://localhost:3000" -ForegroundColor White
Write-Host "Default admin credentials:" -ForegroundColor Yellow
Write-Host "  Email:    admin@arthubmke.com" -ForegroundColor White
Write-Host "  Password: Admin123!" -ForegroundColor White
Write-Host "`n⚠️  Make sure the backend is running on http://localhost:5000" -ForegroundColor Yellow
Write-Host "`nStarting development server..." -ForegroundColor Cyan

npm start
