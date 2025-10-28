#!/bin/bash

# Bash script to deploy Firestore security rules
# This script deploys the updated Firestore security rules for clinic management

set -e

echo "🚀 Deploying Firestore security rules..."

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

# Deploy Firestore rules
echo "🔒 Deploying Firestore security rules..."
if firebase deploy --only firestore:rules; then
    echo "✅ Firestore security rules deployed successfully!"
else
    echo "❌ Failed to deploy security rules!"
    exit 1
fi

echo "🎉 Security rules deployment completed!"
echo ""
echo "🔒 Updated security rules for:"
echo "   • New clinic fields (status, cnpj, email, phone, city)"
echo "   • Clinic field validation (CNPJ, phone, email formats)"
echo "   • Audit logs collection access control"
echo "   • Enhanced clinic status management"