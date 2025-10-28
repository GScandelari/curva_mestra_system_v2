import * as admin from 'firebase-admin';
import { FirestoreService } from '../../services/firestoreService';
import { User, Patient, InventoryItem, Product } from '../../models/types';

// Initialize Firebase Admin for testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'curva-mestra-test',
  });
}

describe('Firestore Integration Tests', () => {
  const testClinicId = 'test-clinic-integration';
  const testUserId = 'test-user-integration';
  const testPatientId = 'test-patient-integration';
  const testProductId = 'test-product-integration';

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  });

  beforeEach(async () => {
    // Clear test data before each test
    await clearTestData();
  });

  afterAll(async () => {
    // Clean up after all tests
    await clearTestData();
  });

  async function clearTestData() {
    const db = admin.firestore();
    
    // Delete test documents
    const collections = ['users', 'clinics', 'patients', 'products', 'inventory', 'requests', 'invoices'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        if (doc.id.includes('test-') || doc.id.includes('integration')) {
          batch.delete(doc.ref);
        }
      });
      
      await batch.commit();
    }
  }

  describe('User Operations', () => {
    it('should create and retrieve user', async () => {
      const userData: User = {
        user_id: testUserId,
        email: 'test@integration.com',
        role: 'clinic_admin',
        clinic_id: testClinicId,
        permissions: ['read_patient', 'create_patient'],
        profile: {
          first_name: 'Test',
          last_name: 'User',
          phone: '(11) 99999-9999',
        },
        created_at: admin.firestore.Timestamp.now(),
        last_login: admin.firestore.Timestamp.now(),
      };

      // Create user
      await FirestoreService.createUser(userData);

      // Retrieve user
      const retrievedUser = await FirestoreService.getUserById(testUserId);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.user_id).toBe(userData.user_id);
      expect(retrievedUser?.email).toBe(userData.email);
      expect(retrievedUser?.role).toBe(userData.role);
    });

    it('should update user permissions', async () => {
      const userData: User = {
        user_id: testUserId,
        email: 'test@integration.com',
        role: 'clinic_user',
        clinic_id: testClinicId,
        permissions: ['read_patient'],
        profile: {
          first_name: 'Test',
          last_name: 'User',
        },
        created_at: admin.firestore.Timestamp.now(),
      };

      await FirestoreService.createUser(userData);

      // Update permissions
      const newPermissions = ['read_patient', 'create_patient', 'update_patient'];
      await FirestoreService.updateUser(testUserId, { permissions: newPermissions });

      // Verify update
      const updatedUser = await FirestoreService.getUserById(testUserId);
      expect(updatedUser?.permissions).toEqual(newPermissions);
    });

    it('should find user by email', async () => {
      const userData: User = {
        user_id: testUserId,
        email: 'unique@integration.com',
        role: 'clinic_admin',
        clinic_id: testClinicId,
        permissions: ['read_patient'],
        profile: {
          first_name: 'Test',
          last_name: 'User',
        },
        created_at: admin.firestore.Timestamp.now(),
      };

      await FirestoreService.createUser(userData);

      const foundUser = await FirestoreService.getUserByEmail('unique@integration.com');
      expect(foundUser).toBeDefined();
      expect(foundUser?.user_id).toBe(testUserId);
    });
  });

  describe('Patient Operations', () => {
    it('should create and retrieve patient', async () => {
      const patientData: Patient = {
        patient_id: testPatientId,
        clinic_id: testClinicId,
        name: 'João Silva',
        email: 'joao@integration.com',
        phone: '(11) 99999-9999',
        birth_date: new Date('1990-01-01'),
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234-567',
        },
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
      };

      await FirestoreService.createPatient(patientData);

      const retrievedPatient = await FirestoreService.getPatientById(testClinicId, testPatientId);
      expect(retrievedPatient).toBeDefined();
      expect(retrievedPatient?.name).toBe(patientData.name);
      expect(retrievedPatient?.email).toBe(patientData.email);
    });

    it('should list patients for clinic', async () => {
      // Create multiple patients
      const patients: Patient[] = [
        {
          patient_id: 'patient-1',
          clinic_id: testClinicId,
          name: 'Patient One',
          email: 'patient1@integration.com',
          phone: '(11) 11111-1111',
          birth_date: new Date('1985-01-01'),
          address: {
            street: 'Street 1',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01111-111',
          },
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
        {
          patient_id: 'patient-2',
          clinic_id: testClinicId,
          name: 'Patient Two',
          email: 'patient2@integration.com',
          phone: '(11) 22222-2222',
          birth_date: new Date('1990-01-01'),
          address: {
            street: 'Street 2',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '02222-222',
          },
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
      ];

      for (const patient of patients) {
        await FirestoreService.createPatient(patient);
      }

      const patientList = await FirestoreService.listPatients(testClinicId);
      expect(patientList.length).toBe(2);
      expect(patientList.map(p => p.name)).toContain('Patient One');
      expect(patientList.map(p => p.name)).toContain('Patient Two');
    });

    it('should enforce clinic isolation', async () => {
      const patient1: Patient = {
        patient_id: 'patient-clinic-1',
        clinic_id: 'clinic-1',
        name: 'Patient Clinic 1',
        email: 'patient1@clinic1.com',
        phone: '(11) 11111-1111',
        birth_date: new Date('1985-01-01'),
        address: {
          street: 'Street 1',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01111-111',
        },
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
      };

      const patient2: Patient = {
        patient_id: 'patient-clinic-2',
        clinic_id: 'clinic-2',
        name: 'Patient Clinic 2',
        email: 'patient2@clinic2.com',
        phone: '(11) 22222-2222',
        birth_date: new Date('1990-01-01'),
        address: {
          street: 'Street 2',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '02222-222',
        },
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
      };

      await FirestoreService.createPatient(patient1);
      await FirestoreService.createPatient(patient2);

      // Clinic 1 should only see their patient
      const clinic1Patients = await FirestoreService.listPatients('clinic-1');
      expect(clinic1Patients.length).toBe(1);
      expect(clinic1Patients[0].name).toBe('Patient Clinic 1');

      // Clinic 2 should only see their patient
      const clinic2Patients = await FirestoreService.listPatients('clinic-2');
      expect(clinic2Patients.length).toBe(1);
      expect(clinic2Patients[0].name).toBe('Patient Clinic 2');
    });
  });

  describe('Inventory Operations', () => {
    beforeEach(async () => {
      // Create a test product first
      const productData: Product = {
        product_id: testProductId,
        name: 'Test Product',
        description: 'A test product for integration tests',
        rennova_code: 'REN-TEST123',
        category: 'Facial',
        unit_type: 'ml',
        status: 'approved',
        approval_history: [],
        created_at: admin.firestore.Timestamp.now(),
      };

      await FirestoreService.createProduct(productData);
    });

    it('should create and retrieve inventory item', async () => {
      const inventoryData: InventoryItem = {
        inventory_id: 'inventory-test-1',
        clinic_id: testClinicId,
        product_id: testProductId,
        quantity_in_stock: 10,
        minimum_stock_level: 5,
        expiration_dates: [
          {
            date: new Date('2025-12-31'),
            lot: 'LOT001',
            quantity: 10,
          },
        ],
        last_update: admin.firestore.Timestamp.now(),
        last_movement: {
          type: 'in',
          quantity: 10,
          reference_id: 'initial-stock',
          timestamp: admin.firestore.Timestamp.now(),
        },
      };

      await FirestoreService.createInventoryItem(inventoryData);

      const retrievedItem = await FirestoreService.getInventoryItem(testClinicId, testProductId);
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem?.quantity_in_stock).toBe(10);
      expect(retrievedItem?.expiration_dates).toHaveLength(1);
    });

    it('should update inventory quantities', async () => {
      const inventoryData: InventoryItem = {
        inventory_id: 'inventory-test-2',
        clinic_id: testClinicId,
        product_id: testProductId,
        quantity_in_stock: 20,
        minimum_stock_level: 5,
        expiration_dates: [
          {
            date: new Date('2025-12-31'),
            lot: 'LOT001',
            quantity: 20,
          },
        ],
        last_update: admin.firestore.Timestamp.now(),
        last_movement: {
          type: 'in',
          quantity: 20,
          reference_id: 'initial-stock',
          timestamp: admin.firestore.Timestamp.now(),
        },
      };

      await FirestoreService.createInventoryItem(inventoryData);

      // Update inventory
      const updates = {
        quantity_in_stock: 15,
        expiration_dates: [
          {
            date: new Date('2025-12-31'),
            lot: 'LOT001',
            quantity: 15,
          },
        ],
        last_movement: {
          type: 'out' as const,
          quantity: 5,
          reference_id: 'consumption',
          timestamp: admin.firestore.Timestamp.now(),
        },
      };

      await FirestoreService.updateInventoryItem(testClinicId, testProductId, updates);

      const updatedItem = await FirestoreService.getInventoryItem(testClinicId, testProductId);
      expect(updatedItem?.quantity_in_stock).toBe(15);
      expect(updatedItem?.last_movement.type).toBe('out');
    });

    it('should list inventory with filters', async () => {
      // Create multiple inventory items
      const items = [
        {
          inventory_id: 'inventory-filter-1',
          clinic_id: testClinicId,
          product_id: 'product-1',
          quantity_in_stock: 10,
          minimum_stock_level: 5,
        },
        {
          inventory_id: 'inventory-filter-2',
          clinic_id: testClinicId,
          product_id: 'product-2',
          quantity_in_stock: 2, // Low stock
          minimum_stock_level: 5,
        },
      ];

      for (const item of items) {
        const inventoryData: InventoryItem = {
          ...item,
          expiration_dates: [
            {
              date: new Date('2025-12-31'),
              lot: 'LOT001',
              quantity: item.quantity_in_stock,
            },
          ],
          last_update: admin.firestore.Timestamp.now(),
          last_movement: {
            type: 'in',
            quantity: item.quantity_in_stock,
            reference_id: 'initial-stock',
            timestamp: admin.firestore.Timestamp.now(),
          },
        };

        await FirestoreService.createInventoryItem(inventoryData);
      }

      const allInventory = await FirestoreService.listInventory(testClinicId);
      expect(allInventory.length).toBeGreaterThanOrEqual(2);

      // Test filtering by low stock
      const lowStockItems = allInventory.filter(item => 
        item.quantity_in_stock < item.minimum_stock_level
      );
      expect(lowStockItems.length).toBe(1);
      expect(lowStockItems[0].product_id).toBe('product-2');
    });
  });

  describe('Transaction Operations', () => {
    it('should handle concurrent inventory updates', async () => {
      const inventoryData: InventoryItem = {
        inventory_id: 'inventory-concurrent',
        clinic_id: testClinicId,
        product_id: testProductId,
        quantity_in_stock: 100,
        minimum_stock_level: 10,
        expiration_dates: [
          {
            date: new Date('2025-12-31'),
            lot: 'LOT001',
            quantity: 100,
          },
        ],
        last_update: admin.firestore.Timestamp.now(),
        last_movement: {
          type: 'in',
          quantity: 100,
          reference_id: 'initial-stock',
          timestamp: admin.firestore.Timestamp.now(),
        },
      };

      await FirestoreService.createInventoryItem(inventoryData);

      // Simulate concurrent updates
      const updates = [
        { quantity_in_stock: 95, consumed: 5 },
        { quantity_in_stock: 90, consumed: 10 },
        { quantity_in_stock: 85, consumed: 15 },
      ];

      const updatePromises = updates.map(async (update, index) => {
        const updateData = {
          quantity_in_stock: update.quantity_in_stock,
          expiration_dates: [
            {
              date: new Date('2025-12-31'),
              lot: 'LOT001',
              quantity: update.quantity_in_stock,
            },
          ],
          last_movement: {
            type: 'out' as const,
            quantity: update.consumed,
            reference_id: `concurrent-update-${index}`,
            timestamp: admin.firestore.Timestamp.now(),
          },
        };

        return FirestoreService.updateInventoryItem(testClinicId, testProductId, updateData);
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Verify final state
      const finalItem = await FirestoreService.getInventoryItem(testClinicId, testProductId);
      expect(finalItem).toBeDefined();
      expect(finalItem?.quantity_in_stock).toBeLessThan(100);
    });
  });
});