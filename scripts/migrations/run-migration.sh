#!/bin/bash

# Bash script to run Firestore migrations
# Usage: ./run-migration.sh 001-add-clinic-fields.js [project-id]

set -e

MIGRATION_FILE="$1"
PROJECT="${2:-curva-mestra}"

if [ -z "$MIGRATION_FILE" ]; then
    echo "❌ Usage: $0 <migration-file> [project-id]"
    echo "   Example: $0 001-add-clinic-fields.js"
    exit 1
fi

echo "🚀 Running Firestore migration: $MIGRATION_FILE"

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
echo "📋 Setting Firebase project to: $PROJECT"
firebase use "$PROJECT"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_PATH="$SCRIPT_DIR/$MIGRATION_FILE"

# Check if migration file exists
if [ ! -f "$MIGRATION_PATH" ]; then
    echo "❌ Migration file not found: $MIGRATION_PATH"
    exit 1
fi

# Run the migration
echo "⚡ Executing migration..."
if node "$MIGRATION_PATH"; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi

echo "🎉 Migration process finished!"