# PowerShell script to run Firestore migrations
# Usage: .\run-migration.ps1 -MigrationFile "001-add-clinic-fields.js"

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile,
    
    [Parameter(Mandatory=$false)]
    [string]$Project = "curva-mestra"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Running Firestore migration: $MigrationFile" -ForegroundColor Green

# Check if Firebase CLI is installed
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Firebase
try {
    firebase projects:list | Out-Null
} catch {
    Write-Host "❌ Not logged in to Firebase. Please run 'firebase login' first." -ForegroundColor Red
    exit 1
}

# Set the Firebase project
Write-Host "📋 Setting Firebase project to: $Project" -ForegroundColor Blue
firebase use $Project

# Check if migration file exists
$migrationPath = Join-Path $PSScriptRoot $MigrationFile
if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Migration file not found: $migrationPath" -ForegroundColor Red
    exit 1
}

# Run the migration
Write-Host "⚡ Executing migration..." -ForegroundColor Blue
try {
    node $migrationPath
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Migration process finished!" -ForegroundColor Green