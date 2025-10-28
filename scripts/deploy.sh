#!/bin/bash

# Curva Mestra Production Deployment Script
# This script handles the complete deployment process for the Curva Mestra platform

set -e

echo "🚀 Starting Curva Mestra deployment process..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run 'firebase login' first."
    exit 1
fi

# Set the Firebase project
echo "📋 Setting Firebase project..."
firebase use curva-mestra

# Build all applications
echo "🔨 Building applications..."

# Build Functions
echo "  📦 Building Firebase Functions..."
cd functions
npm ci
npm run build
cd ..

# Build Client Application
echo "  📦 Building Client Application..."
cd client
npm ci
npm run build
cd ..

# Build Admin Application
echo "  📦 Building Admin Application..."
cd admin
npm ci
npm run build
cd ..

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."

# Deploy Firestore rules and indexes
echo "  📋 Deploying Firestore rules and indexes..."
firebase deploy --only firestore

# Deploy Firebase Functions
echo "  ⚡ Deploying Firebase Functions..."
firebase deploy --only functions

# Deploy Client Hosting
echo "  🌐 Deploying Client Application..."
firebase deploy --only hosting:client

# Deploy Admin Hosting
echo "  🌐 Deploying Admin Application..."
firebase deploy --only hosting:admin

# Deploy Storage rules
echo "  📁 Deploying Storage rules..."
firebase deploy --only storage

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your applications are now live at:"
echo "   Client: https://curva-mestra.web.app"
echo "   Admin:  https://curva-mestra-admin.web.app"
echo ""
echo "📊 You can monitor your deployment at:"
echo "   Firebase Console: https://console.firebase.google.com/project/curva-mestra"