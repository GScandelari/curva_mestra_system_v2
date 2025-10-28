# PowerShell script to deploy Firestore security rules
# This script deploys the updated Firestore security rules for clinic management

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Firestore security rules..." -ForegroundColor Green

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

# Deploy Firestore rules
Write-Host "🔒 Deploying Firestore security rules..." -ForegroundColor Blue
try {
    firebase deploy --only firestore:rules
    Write-Host "✅ Firestore security rules deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to deploy security rules: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Security rules deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🔒 Updated security rules for:" -ForegroundColor Blue
Write-Host "   • New clinic fields (status, cnpj, email, phone, city)" -ForegroundColor White
Write-Host "   • Clinic field validation (CNPJ, phone, email formats)" -ForegroundColor White
Write-Host "   • Audit logs collection access control" -ForegroundColor White
Write-Host "   • Enhanced clinic status management" -ForegroundColor White