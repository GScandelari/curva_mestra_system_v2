#!/bin/bash

# Bash script to deploy Firestore indexes
# This script deploys the updated Firestore indexes for clinic management

set -e

echo "🚀 Deploying Firestore indexes..."

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

# Deploy Firestore indexes
echo "📊 Deploying Firestore indexes..."
if firebase deploy --only firestore:indexes; then
    echo "✅ Firestore indexes deployed successfully!"
else
    echo "❌ Failed to deploy indexes!"
    exit 1
fi

echo "🎉 Index deployment completed!"
echo ""
echo "📋 New indexes added for:"
echo "   • Clinic search (name, cnpj, status)"
echo "   • Clinic status filtering"
echo "   • Clinic sorting by name and city"
echo "   • Audit logs by resource_id and timestamp"
echo ""
echo "⏳ Note: Index creation may take several minutes to complete in Firebase."