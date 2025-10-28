# PowerShell script to deploy Firestore indexes
# This script deploys the updated Firestore indexes for clinic management

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Firestore indexes..." -ForegroundColor Green

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
Write-Host "📋 Setting Firebase project..." -ForegroundColor Blue
firebase use curva-mestra

# Deploy Firestore indexes
Write-Host "📊 Deploying Firestore indexes..." -ForegroundColor Blue
try {
    firebase deploy --only firestore:indexes
    Write-Host "✅ Firestore indexes deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to deploy indexes: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Index deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 New indexes added for:" -ForegroundColor Blue
Write-Host "   • Clinic search (name, cnpj, status)" -ForegroundColor White
Write-Host "   • Clinic status filtering" -ForegroundColor White
Write-Host "   • Clinic sorting by name and city" -ForegroundColor White
Write-Host "   • Audit logs by resource_id and timestamp" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Note: Index creation may take several minutes to complete in Firebase." -ForegroundColor Yellow