# Database Migrations

This directory contains database migration scripts for the Curva Mestra system.

## Migration Scripts

### 001-add-clinic-fields.js
Adds new required fields to existing clinic documents:
- `status`: Set to 'active' by default
- `updated_at`: Current timestamp
- `cnpj`: Placeholder CNPJ value
- `email`: Generated placeholder email
- `phone`: Placeholder Brazilian phone number
- `city`: Extracted from address or default to 'São Paulo'

**Requirements covered**: 1.2, 2.2, 3.2, 4.2

## Running Migrations

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged in to Firebase: `firebase login`
3. Node.js installed

### Windows (PowerShell)
```powershell
.\scripts\migrations\run-migration.ps1 -MigrationFile "001-add-clinic-fields.js"
```

### Unix/Linux/macOS (Bash)
```bash
./scripts/migrations/run-migration.sh 001-add-clinic-fields.js
```

### Direct Node.js execution
```bash
# Set Firebase project first
firebase use curva-mestra

# Run migration
node scripts/migrations/001-add-clinic-fields.js
```

## Migration Process

1. **Backup**: Always backup your database before running migrations
2. **Test**: Run migrations on a test environment first
3. **Verify**: Each migration includes verification steps
4. **Monitor**: Check the console output for any errors

## Safety Features

- **Idempotent**: Migrations can be run multiple times safely
- **Verification**: Each migration verifies its changes
- **Batch Operations**: Uses Firestore batch operations for consistency
- **Error Handling**: Comprehensive error handling and logging

## Adding New Migrations

1. Create a new migration file with incremental numbering: `002-description.js`
2. Follow the existing pattern with proper error handling
3. Include verification steps
4. Update this README with the new migration details

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure you're logged in with proper Firebase permissions
2. **Project Not Found**: Verify the project ID is correct
3. **Network Issues**: Check your internet connection and Firebase status

### Getting Help

If you encounter issues:
1. Check the console output for detailed error messages
2. Verify your Firebase project settings
3. Ensure all prerequisites are met
4. Contact the development team if issues persist