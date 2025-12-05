# Quick Start Script - Art Hub Backend
# Run this script to set up and start the backend server

Write-Host "🎨 Art Hub Backend Setup" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
Write-Host "`nChecking PostgreSQL installation..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version
    Write-Host "✅ PostgreSQL installed" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL is not installed. Please install PostgreSQL from https://www.postgresql.org/" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location -Path $PSScriptRoot

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "`n⚙️  Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created" -ForegroundColor Green
    Write-Host "`n⚠️  IMPORTANT: Please edit .env and set the following:" -ForegroundColor Yellow
    Write-Host "   - DB_PASSWORD (your PostgreSQL password)" -ForegroundColor White
    Write-Host "   - JWT_SECRET (generate a random 32+ character string)" -ForegroundColor White
    Write-Host "`nPress any key after updating .env file..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "`n✅ .env file already exists" -ForegroundColor Green
}

# Load environment variables
Write-Host "`n📋 Loading environment variables..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$dbPassword = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
$jwtSecret = [Environment]::GetEnvironmentVariable("JWT_SECRET", "Process")

if ([string]::IsNullOrWhiteSpace($dbPassword) -or $dbPassword -eq "your_password_here") {
    Write-Host "❌ DB_PASSWORD not set in .env file" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($jwtSecret) -or $jwtSecret.Length -lt 32) {
    Write-Host "❌ JWT_SECRET must be at least 32 characters in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables loaded" -ForegroundColor Green

# Check if database exists
Write-Host "`n🗄️  Checking database..." -ForegroundColor Yellow
$dbName = [Environment]::GetEnvironmentVariable("DB_NAME", "Process")
$dbUser = [Environment]::GetEnvironmentVariable("DB_USER", "Process")

$env:PGPASSWORD = $dbPassword
$dbExists = psql -U $dbUser -lqt | Select-String -Pattern $dbName

if (-not $dbExists) {
    Write-Host "Creating database $dbName..." -ForegroundColor Yellow
    psql -U $dbUser -c "CREATE DATABASE $dbName;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database created" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Database already exists" -ForegroundColor Green
}

# Generate admin password hash
Write-Host "`n🔐 Generating admin password hash..." -ForegroundColor Yellow
$adminHash = node scripts/generate-admin-password.js

# Update migration file with admin hash
Write-Host "Updating migration file..." -ForegroundColor Yellow
$migrationFile = "migrations/001_initial_schema.sql"
$migrationContent = Get-Content $migrationFile -Raw
$migrationContent = $migrationContent -replace '\$2a\$10\$YourHashedPasswordHere', $adminHash.Trim()
Set-Content $migrationFile $migrationContent
Write-Host "✅ Migration file updated" -ForegroundColor Green

# Run migrations
Write-Host "`n🚀 Running database migrations..." -ForegroundColor Yellow
node migrations/run-migrations.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migrations may have already been run" -ForegroundColor Yellow
}

# Start the server
Write-Host "`n🚀 Starting backend server..." -ForegroundColor Cyan
Write-Host "Server will be available at: http://localhost:5000" -ForegroundColor White
Write-Host "API endpoints: http://localhost:5000/api/v1" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

npm run dev
