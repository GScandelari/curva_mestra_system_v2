# Curva Mestra Production Deployment Script (PowerShell)
# This script handles the complete deployment process for the Curva Mestra platform

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Curva Mestra deployment process..." -ForegroundColor Green

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

# Build all applications
Write-Host "🔨 Building applications..." -ForegroundColor Blue

# Build Functions
Write-Host "  📦 Building Firebase Functions..." -ForegroundColor Cyan
Set-Location functions
npm ci
npm run build
Set-Location ..

# Build Client Application
Write-Host "  📦 Building Client Application..." -ForegroundColor Cyan
Set-Location client
npm ci
npm run build
Set-Location ..

# Build Admin Application
Write-Host "  📦 Building Admin Application..." -ForegroundColor Cyan
Set-Location admin
npm ci
npm run build
Set-Location ..

# Deploy to Firebase
Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Blue

# Deploy Firestore rules and indexes
Write-Host "  📋 Deploying Firestore rules and indexes..." -ForegroundColor Cyan
firebase deploy --only firestore

# Deploy Firebase Functions
Write-Host "  ⚡ Deploying Firebase Functions..." -ForegroundColor Cyan
firebase deploy --only functions

# Deploy Client Hosting
Write-Host "  🌐 Deploying Client Application..." -ForegroundColor Cyan
firebase deploy --only hosting:client

# Deploy Admin Hosting
Write-Host "  🌐 Deploying Admin Application..." -ForegroundColor Cyan
firebase deploy --only hosting:admin

# Deploy Storage rules
Write-Host "  📁 Deploying Storage rules..." -ForegroundColor Cyan
firebase deploy --only storage

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your applications are now live at:" -ForegroundColor Blue
Write-Host "   Client: https://curva-mestra.web.app" -ForegroundColor White
Write-Host "   Admin:  https://curva-mestra-admin.web.app" -ForegroundColor White
Write-Host ""
Write-Host "📊 You can monitor your deployment at:" -ForegroundColor Blue
Write-Host "   Firebase Console: https://console.firebase.google.com/project/curva-mestra" -ForegroundColor White