/**
 * Migration Script: Add new fields to existing clinics
 * 
 * This script adds the following fields to existing clinic documents:
 * - status: 'active' (default)
 * - updated_at: current timestamp
 * - cnpj: placeholder value
 * - email: placeholder value
 * - phone: placeholder value
 * - city: placeholder value
 * 
 * Requirements: 1.2, 2.2, 3.2, 4.2
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function migrateClinics() {
  console.log('🚀 Starting clinic fields migration...');
  
  try {
    // Get all existing clinics
    const clinicsSnapshot = await db.collection('clinics').get();
    
    if (clinicsSnapshot.empty) {
      console.log('ℹ️  No clinics found to migrate.');
      return;
    }
    
    console.log(`📋 Found ${clinicsSnapshot.size} clinics to migrate.`);
    
    const batch = db.batch();
    let migratedCount = 0;
    
    clinicsSnapshot.forEach((doc) => {
      const clinicData = doc.data();
      const clinicRef = db.collection('clinics').doc(doc.id);
      
      // Check if migration is needed (if status field doesn't exist)
      if (!clinicData.status) {
        const updates = {
          status: 'active',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        // Add placeholder values for new required fields if they don't exist
        if (!clinicData.cnpj) {
          updates.cnpj = '00.000.000/0000-00'; // Placeholder CNPJ format
        }
        
        if (!clinicData.email) {
          updates.email = `contato@${clinicData.name.toLowerCase().replace(/\s+/g, '')}.com.br`;
        }
        
        if (!clinicData.phone) {
          updates.phone = '(11) 99999-9999'; // Placeholder Brazilian phone format
        }
        
        if (!clinicData.city) {
          // Try to extract city from address if available
          if (clinicData.address && typeof clinicData.address === 'string') {
            const addressParts = clinicData.address.split(',');
            updates.city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : 'São Paulo';
          } else {
            updates.city = 'São Paulo'; // Default city
          }
        }
        
        batch.update(clinicRef, updates);
        migratedCount++;
        
        console.log(`✅ Prepared migration for clinic: ${clinicData.name} (${doc.id})`);
      } else {
        console.log(`⏭️  Clinic already migrated: ${clinicData.name} (${doc.id})`);
      }
    });
    
    if (migratedCount > 0) {
      console.log(`💾 Committing ${migratedCount} clinic updates...`);
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} clinics.`);
    } else {
      console.log('ℹ️  All clinics are already up to date.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  try {
    const clinicsSnapshot = await db.collection('clinics').get();
    let verifiedCount = 0;
    let errorCount = 0;
    
    clinicsSnapshot.forEach((doc) => {
      const clinicData = doc.data();
      const requiredFields = ['status', 'updated_at', 'cnpj', 'email', 'phone', 'city'];
      const missingFields = requiredFields.filter(field => !clinicData[field]);
      
      if (missingFields.length === 0) {
        verifiedCount++;
        console.log(`✅ Clinic verified: ${clinicData.name} (${doc.id})`);
      } else {
        errorCount++;
        console.log(`❌ Clinic missing fields: ${clinicData.name} (${doc.id}) - Missing: ${missingFields.join(', ')}`);
      }
    });
    
    console.log(`📊 Verification complete: ${verifiedCount} verified, ${errorCount} errors`);
    
    if (errorCount > 0) {
      throw new Error(`Migration verification failed: ${errorCount} clinics have missing fields`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateClinics();
    await verifyMigration();
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  migrateClinics,
  verifyMigration,
};