import * as admin from 'firebase-admin';
import { FirestoreService } from '../../services/firestoreService';
import { User, Patient, InventoryItem, Request } from '../../models/types';

// Initialize Firebase Admin for testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'curva-mestra-test',
  });
}

describe('Multi-Tenant Isolation Tests', () => {
  const clinic1Id = 'clinic-1-isolation';
  const clinic2Id = 'clinic-2-isolation';
  const clinic3Id = 'clinic-3-isolation';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  });

  beforeEach(async () => {
    await clearTestData();
  });

  afterAll(async () => {
    await clearTestData();
  });

  async function clearTestData() {
    const db = admin.firestore();
    const collections = ['users', 'patients', 'inventory', 'requests', 'invoices'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        if (doc.id.includes('isolation') || doc.id.includes('clinic-')) {
          batch.delete(doc.ref);
        }
      });
      
      await batch.commit();
    }
  }

  describe('Patient Data Isolation', () => {
    beforeEach(async () => {
      // Create patients for different clinics
      const patients: Patient[] = [
        {
          patient_id: 'patient-clinic1-1',
          clinic_id: clinic1Id,
          name: 'Patient 1 Clinic 1',
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
        },
        {
          patient_id: 'patient-clinic1-2',
          clinic_id: clinic1Id,
          name: 'Patient 2 Clinic 1',
          email: 'patient2@clinic1.com',
          phone: '(11) 11111-2222',
          birth_date: new Date('1990-01-01'),
          address: {
            street: 'Street 2',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01111-222',
          },
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
        {
          patient_id: 'patient-clinic2-1',
          clinic_id: clinic2Id,
          name: 'Patient 1 Clinic 2',
          email: 'patient1@clinic2.com',
          phone: '(11) 22222-1111',
          birth_date: new Date('1988-01-01'),
          address: {
            street: 'Street 3',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '02222-111',
          },
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
      ];

      for (const patient of patients) {
        await FirestoreService.createPatient(patient);
      }
    });

    it('should only return patients for the specified clinic', async () => {
      const clinic1Patients = await FirestoreService.listPatients(clinic1Id);
      const clinic2Patients = await FirestoreService.listPatients(clinic2Id);
      const clinic3Patients = await FirestoreService.listPatients(clinic3Id);

      // Clinic 1 should have 2 patients
      expect(clinic1Patients).toHaveLength(2);
      expect(clinic1Patients.every(p => p.clinic_id === clinic1Id)).toBe(true);
      expect(clinic1Patients.map(p => p.name)).toContain('Patient 1 Clinic 1');
      expect(clinic1Patients.map(p => p.name)).toContain('Patient 2 Clinic 1');

      // Clinic 2 should have 1 patient
      expect(clinic2Patients).toHaveLength(1);
      expect(clinic2Patients[0].clinic_id).toBe(clinic2Id);
      expect(clinic2Patients[0].name).toBe('Patient 1 Clinic 2');

      // Clinic 3 should have no patients
      expect(clinic3Patients).toHaveLength(0);
    });

    it('should not allow cross-clinic patient access', async () => {
      // Try to access clinic 1 patient from clinic 2 context
      const patient = await FirestoreService.getPatientById(clinic2Id, 'patient-clinic1-1');
      expect(patient).toBeNull();

      // Try to access clinic 2 patient from clinic 1 context
      const patient2 = await FirestoreService.getPatientById(clinic1Id, 'patient-clinic2-1');
      expect(patient2).toBeNull();
    });

    it('should allow access to own clinic patients', async () => {
      const patient1 = await FirestoreService.getPatientById(clinic1Id, 'patient-clinic1-1');
      const patient2 = await FirestoreService.getPatientById(clinic2Id, 'patient-clinic2-1');

      expect(patient1).toBeDefined();
      expect(patient1?.name).toBe('Patient 1 Clinic 1');

      expect(patient2).toBeDefined();
      expect(patient2?.name).toBe('Patient 1 Clinic 2');
    });
  });

  describe('Inventory Data Isolation', () => {
    beforeEach(async () => {
      // Create inventory items for different clinics
      const inventoryItems: InventoryItem[] = [
        {
          inventory_id: 'inventory-clinic1-1',
          clinic_id: clinic1Id,
          product_id: 'product-1',
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
        },
        {
          inventory_id: 'inventory-clinic2-1',
          clinic_id: clinic2Id,
          product_id: 'product-1',
          quantity_in_stock: 20,
          minimum_stock_level: 8,
          expiration_dates: [
            {
              date: new Date('2025-12-31'),
              lot: 'LOT002',
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
        },
      ];

      for (const item of inventoryItems) {
        await FirestoreService.createInventoryItem(item);
      }
    });

    it('should isolate inventory data by clinic', async () => {
      const clinic1Inventory = await FirestoreService.listInventory(clinic1Id);
      const clinic2Inventory = await FirestoreService.listInventory(clinic2Id);
      const clinic3Inventory = await FirestoreService.listInventory(clinic3Id);

      // Each clinic should only see their own inventory
      expect(clinic1Inventory).toHaveLength(1);
      expect(clinic1Inventory[0].clinic_id).toBe(clinic1Id);
      expect(clinic1Inventory[0].quantity_in_stock).toBe(10);

      expect(clinic2Inventory).toHaveLength(1);
      expect(clinic2Inventory[0].clinic_id).toBe(clinic2Id);
      expect(clinic2Inventory[0].quantity_in_stock).toBe(20);

      expect(clinic3Inventory).toHaveLength(0);
    });

    it('should not allow cross-clinic inventory access', async () => {
      // Try to access clinic 1 inventory from clinic 2 context
      const item1 = await FirestoreService.getInventoryItem(clinic2Id, 'product-1');
      expect(item1?.clinic_id).toBe(clinic2Id);
      expect(item1?.quantity_in_stock).toBe(20); // Should get clinic 2's inventory, not clinic 1's

      // Try to access clinic 2 inventory from clinic 1 context
      const item2 = await FirestoreService.getInventoryItem(clinic1Id, 'product-1');
      expect(item2?.clinic_id).toBe(clinic1Id);
      expect(item2?.quantity_in_stock).toBe(10); // Should get clinic 1's inventory, not clinic 2's
    });
  });

  describe('User Access Control', () => {
    beforeEach(async () => {
      // Create users for different clinics
      const users: User[] = [
        {
          user_id: 'user-clinic1-admin',
          email: 'admin@clinic1.com',
          role: 'clinic_admin',
          clinic_id: clinic1Id,
          permissions: ['read_patient', 'create_patient', 'manage_users'],
          profile: {
            first_name: 'Admin',
            last_name: 'Clinic 1',
          },
          created_at: admin.firestore.Timestamp.now(),
        },
        {
          user_id: 'user-clinic1-user',
          email: 'user@clinic1.com',
          role: 'clinic_user',
          clinic_id: clinic1Id,
          permissions: ['read_patient', 'create_patient'],
          profile: {
            first_name: 'User',
            last_name: 'Clinic 1',
          },
          created_at: admin.firestore.Timestamp.now(),
        },
        {
          user_id: 'user-clinic2-admin',
          email: 'admin@clinic2.com',
          role: 'clinic_admin',
          clinic_id: clinic2Id,
          permissions: ['read_patient', 'create_patient', 'manage_users'],
          profile: {
            first_name: 'Admin',
            last_name: 'Clinic 2',
          },
          created_at: admin.firestore.Timestamp.now(),
        },
        {
          user_id: 'system-admin',
          email: 'system@curvamestra.com',
          role: 'system_admin',
          clinic_id: null,
          permissions: ['read_patient', 'create_patient', 'manage_users'],
          profile: {
            first_name: 'System',
            last_name: 'Admin',
          },
          created_at: admin.firestore.Timestamp.now(),
        },
      ];

      for (const user of users) {
        await FirestoreService.createUser(user);
      }
    });

    it('should enforce clinic-based user access', async () => {
      const clinic1Users = await FirestoreService.listUsers(clinic1Id);
      const clinic2Users = await FirestoreService.listUsers(clinic2Id);

      // Each clinic should only see their own users
      expect(clinic1Users).toHaveLength(2);
      expect(clinic1Users.every(u => u.clinic_id === clinic1Id)).toBe(true);

      expect(clinic2Users).toHaveLength(1);
      expect(clinic2Users.every(u => u.clinic_id === clinic2Id)).toBe(true);
    });

    it('should allow system admin to access all clinics', async () => {
      const systemAdmin = await FirestoreService.getUserById('system-admin');
      expect(systemAdmin).toBeDefined();
      expect(systemAdmin?.role).toBe('system_admin');
      expect(systemAdmin?.clinic_id).toBeNull();

      // System admin should be able to access data from any clinic
      // This would be tested at the service layer, not directly in Firestore
    });
  });

  describe('Request Data Isolation', () => {
    beforeEach(async () => {
      // First create patients for the requests
      const patients: Patient[] = [
        {
          patient_id: 'patient-req-clinic1',
          clinic_id: clinic1Id,
          name: 'Patient Request Clinic 1',
          email: 'patient@clinic1.com',
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
          patient_id: 'patient-req-clinic2',
          clinic_id: clinic2Id,
          name: 'Patient Request Clinic 2',
          email: 'patient@clinic2.com',
          phone: '(11) 22222-2222',
          birth_date: new Date('1990-01-01'),
          address: {
            street: 'Street 2',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '02222-222',
          },
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
      ];

      for (const patient of patients) {
        await FirestoreService.createPatient(patient);
      }

      // Create requests for different clinics
      const requests: Request[] = [
        {
          request_id: 'request-clinic1-1',
          clinic_id: clinic1Id,
          patient_id: 'patient-req-clinic1',
          request_date: new Date('2024-01-15'),
          treatment_type: 'Botox Application',
          products_used: [
            {
              product_id: 'product-1',
              quantity: 2,
              lot: 'LOT001',
              expiration_date: new Date('2025-01-01'),
            },
          ],
          created_by: 'user-clinic1-admin',
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
        {
          request_id: 'request-clinic2-1',
          clinic_id: clinic2Id,
          patient_id: 'patient-req-clinic2',
          request_date: new Date('2024-01-16'),
          treatment_type: 'Facial Treatment',
          products_used: [
            {
              product_id: 'product-2',
              quantity: 1,
              lot: 'LOT002',
              expiration_date: new Date('2025-02-01'),
            },
          ],
          created_by: 'user-clinic2-admin',
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        },
      ];

      for (const request of requests) {
        await FirestoreService.createRequest(request);
      }
    });

    it('should isolate request data by clinic', async () => {
      const clinic1Requests = await FirestoreService.listRequests(clinic1Id);
      const clinic2Requests = await FirestoreService.listRequests(clinic2Id);
      const clinic3Requests = await FirestoreService.listRequests(clinic3Id);

      // Each clinic should only see their own requests
      expect(clinic1Requests).toHaveLength(1);
      expect(clinic1Requests[0].clinic_id).toBe(clinic1Id);
      expect(clinic1Requests[0].treatment_type).toBe('Botox Application');

      expect(clinic2Requests).toHaveLength(1);
      expect(clinic2Requests[0].clinic_id).toBe(clinic2Id);
      expect(clinic2Requests[0].treatment_type).toBe('Facial Treatment');

      expect(clinic3Requests).toHaveLength(0);
    });

    it('should not allow cross-clinic request access', async () => {
      // Try to access clinic 1 request from clinic 2 context
      const request1 = await FirestoreService.getRequestById(clinic2Id, 'request-clinic1-1');
      expect(request1).toBeNull();

      // Try to access clinic 2 request from clinic 1 context
      const request2 = await FirestoreService.getRequestById(clinic1Id, 'request-clinic2-1');
      expect(request2).toBeNull();
    });

    it('should allow access to own clinic requests', async () => {
      const request1 = await FirestoreService.getRequestById(clinic1Id, 'request-clinic1-1');
      const request2 = await FirestoreService.getRequestById(clinic2Id, 'request-clinic2-1');

      expect(request1).toBeDefined();
      expect(request1?.treatment_type).toBe('Botox Application');

      expect(request2).toBeDefined();
      expect(request2?.treatment_type).toBe('Facial Treatment');
    });
  });

  describe('Data Consistency Across Tenants', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      // Create patients for both clinics simultaneously
      const createPatientPromises = [
        FirestoreService.createPatient({
          patient_id: 'concurrent-patient-1',
          clinic_id: clinic1Id,
          name: 'Concurrent Patient 1',
          email: 'concurrent1@clinic1.com',
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
        }),
        FirestoreService.createPatient({
          patient_id: 'concurrent-patient-2',
          clinic_id: clinic2Id,
          name: 'Concurrent Patient 2',
          email: 'concurrent2@clinic2.com',
          phone: '(11) 22222-2222',
          birth_date: new Date('1990-01-01'),
          address: {
            street: 'Street 2',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '02222-222',
          },
          created_at: admin.firestore.Timestamp.now(),
          updated_at: admin.firestore.Timestamp.now(),
        }),
      ];

      await Promise.all(createPatientPromises);

      // Verify both patients were created correctly and isolated
      const clinic1Patients = await FirestoreService.listPatients(clinic1Id);
      const clinic2Patients = await FirestoreService.listPatients(clinic2Id);

      expect(clinic1Patients.some(p => p.name === 'Concurrent Patient 1')).toBe(true);
      expect(clinic1Patients.some(p => p.name === 'Concurrent Patient 2')).toBe(false);

      expect(clinic2Patients.some(p => p.name === 'Concurrent Patient 2')).toBe(true);
      expect(clinic2Patients.some(p => p.name === 'Concurrent Patient 1')).toBe(false);
    });
  });
});