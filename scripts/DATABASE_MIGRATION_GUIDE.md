# Database Migration Guide - Clinic Management Enhancement

This guide covers the database schema updates required for the enhanced clinic management functionality.

## Overview

The migration includes:
1. **New clinic fields**: status, updated_at, cnpj, email, phone, city
2. **Database indexes**: Optimized queries for search and filtering
3. **Security rules**: Updated validation and access control

## Prerequisites

- Firebase CLI installed and configured
- Proper Firebase project permissions
- Node.js runtime for migration scripts
- Database backup (recommended)

## Migration Steps

### Step 1: Backup Database (Recommended)

Before running any migrations, create a backup of your Firestore database through the Firebase Console.

### Step 2: Run Data Migration

Add new fields to existing clinic documents:

**Windows (PowerShell):**
```powershell
.\scripts\migrations\run-migration.ps1 -MigrationFile "001-add-clinic-fields.js"
```

**Unix/Linux/macOS:**
```bash
./scripts/migrations/run-migration.sh 001-add-clinic-fields.js
```

**Direct execution:**
```bash
firebase use curva-mestra
node scripts/migrations/001-add-clinic-fields.js
```

### Step 3: Deploy Database Indexes

Deploy the new Firestore indexes for optimized queries:

**Windows (PowerShell):**
```powershell
.\scripts\deploy-indexes.ps1
```

**Unix/Linux/macOS:**
```bash
./scripts/deploy-indexes.sh
```

**Direct execution:**
```bash
firebase deploy --only firestore:indexes
```

### Step 4: Deploy Security Rules

Update Firestore security rules with new field validation:

**Windows (PowerShell):**
```powershell
.\scripts\deploy-rules.ps1
```

**Unix/Linux/macOS:**
```bash
./scripts/deploy-rules.sh
```

**Direct execution:**
```bash
firebase deploy --only firestore:rules
```

### Step 5: Verify Migration

After completing all steps, verify the migration:

1. **Check clinic documents** in Firebase Console
2. **Verify new indexes** are building/active
3. **Test security rules** with the Firebase Rules Playground
4. **Run application tests** to ensure functionality

## New Database Schema

### Clinic Document Structure

```javascript
{
  clinic_id: "string",
  name: "string",
  cnpj: "string",              // New - Brazilian tax ID
  email: "string",             // New - clinic contact email
  phone: "string",             // New - clinic contact phone
  address: "string",
  city: "string",              // New - extracted from address
  admin_user_id: "string",
  status: "active|inactive",   // New - clinic status
  created_at: "timestamp",
  updated_at: "timestamp",     // New - last update timestamp
  settings: {
    timezone: "string",
    notification_preferences: {}
  }
}
```

### New Indexes

1. **Clinic Search Index**: `(name, cnpj, status)`
2. **Status Filter Index**: `(status, created_at)`
3. **Name Sort Index**: `(status, name)`
4. **City Sort Index**: `(status, city)`
5. **Audit Logs Index**: `(resource_id, timestamp)`
6. **Audit Logs by Type**: `(resource_type, resource_id, timestamp)`

### Audit Logs Collection

```javascript
{
  audit_log_id: "string",
  user_id: "string",
  action_type: "created|updated|status_changed",
  resource_type: "clinic",
  resource_id: "string",
  timestamp: "timestamp",
  details: {
    clinic_id: "string",
    clinic_name: "string",
    changes: {},
    old_status: "string",
    new_status: "string"
  }
}
```

## Security Rules Updates

### New Validation Functions

- `isValidClinicStatus()`: Validates clinic status values
- `isValidCNPJ()`: Validates Brazilian CNPJ format
- `isValidBrazilianPhone()`: Validates Brazilian phone format

### Enhanced Clinic Rules

- **Create**: Validates all new required fields and formats
- **Update**: Validates field changes and maintains data integrity
- **Read**: Maintains existing access control patterns

### Audit Logs Rules

- **Read**: System admins can read all, clinic admins can read their clinic's logs
- **Create**: Server-side only with proper validation
- **Update/Delete**: Immutable logs, admin-only deletion

## Troubleshooting

### Common Issues

1. **Migration fails with permission errors**
   - Ensure you're logged in with proper Firebase permissions
   - Verify project ID is correct

2. **Index deployment takes too long**
   - Index creation can take several minutes for large datasets
   - Monitor progress in Firebase Console

3. **Security rules validation errors**
   - Test rules in Firebase Console Rules Playground
   - Check for syntax errors in validation functions

4. **Existing data doesn't match new schema**
   - Run the data migration script first
   - Verify all existing clinics have required fields

### Rollback Procedure

If issues occur:

1. **Restore database** from backup
2. **Revert security rules** using Firebase Console
3. **Remove new indexes** if necessary
4. **Contact development team** for assistance

## Post-Migration Tasks

After successful migration:

1. **Update application code** to use new fields
2. **Test all clinic management features**
3. **Monitor application performance**
4. **Update documentation** and training materials

## Requirements Covered

This migration addresses the following requirements:

- **1.2**: Clinic information display with new fields
- **2.2**: Enhanced clinic creation with validation
- **3.2**: Improved clinic editing capabilities
- **4.2**: Clinic status management
- **1.3, 1.4, 1.5**: Search and filtering optimization
- **6.5**: Audit log access and querying

## Support

For issues or questions:
1. Check console output for detailed error messages
2. Review Firebase Console for database status
3. Contact the development team with specific error details