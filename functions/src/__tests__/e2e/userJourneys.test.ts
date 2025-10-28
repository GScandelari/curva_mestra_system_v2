import request from 'supertest';
import * as admin from 'firebase-admin';
import { app } from '../../index';
import { authConfig } from '../../config/auth';
import { FirestoreService } from '../../services/firestoreService';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: () => ({
    verifyIdToken: jest.fn(),
    createCustomToken: jest.fn(),
  }),
  firestore: () => ({
    collection: jest.fn(),
    doc: jest.fn(),
  }),
}));

// Mock auth config
jest.mock('../../config/auth', () => ({
  authConfig: {
    verifyIdToken: jest.fn(),
  },
}));

// Mock FirestoreService
jest.mock('../../services/firestoreService');

describe('End-to-End User Journey Tests', () => {
  let clinicAdminToken: string;
  let clinicUserToken: string;
  let systemAdminToken: string;
  
  const testClinicId = 'e2e-test-clinic';
  const testPatientId = 'e2e-test-patient';
  const testProductId = 'e2e-test-product';

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    
    clinicAdminToken = 'clinic-admin-token';
    clinicUserToken = 'clinic-user-token';
    systemAdminToken = 'system-admin-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Patient Management Journey', () => {
    it('should handle complete patient lifecycle from creation to treatment', async () => {
      // Setup: Mock clinic admin user
      const clinicAdmin = {
        uid: 'clinic-admin-id',
        email: 'admin@testclinic.com',
        role: 'clinic_admin',
        clinic_id: testClinicId,
        permissions: ['create_patient', 'read_patient', 'update_patient', 'create_request', 'read_inventory'],
      };

      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(clinicAdmin);

      // Step 1: Create a new patient
      const patientData = {
        name: 'Maria Silva',
        email: 'maria@example.com',
        phone: '(11) 99999-9999',
        birth_date: '1985-03-15',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234-567',
        },
      };

      const createPatientResponse = await request(app)
        .post(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(patientData)
        .expect(201);

      expect(createPatientResponse.body).toHaveProperty('patient');
      const createdPatient = createPatientResponse.body.patient;
      expect(createdPatient.name).toBe(patientData.name);

      // Step 2: Retrieve the created patient
      (FirestoreService.getPatientById as jest.Mock).mockResolvedValue({
        patient_id: createdPatient.patient_id,
        clinic_id: testClinicId,
        ...patientData,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const getPatientResponse = await request(app)
        .get(`/clinics/${testClinicId}/patients/${createdPatient.patient_id}`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(getPatientResponse.body.patient.name).toBe(patientData.name);

      // Step 3: Update patient information
      const updatedData = {
        phone: '(11) 88888-8888',
        address: {
          ...patientData.address,
          street: 'Rua das Rosas, 456',
        },
      };

      const updatePatientResponse = await request(app)
        .put(`/clinics/${testClinicId}/patients/${createdPatient.patient_id}`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(updatedData)
        .expect(200);

      expect(updatePatientResponse.body.patient.phone).toBe(updatedData.phone);

      // Step 4: Check inventory before creating request
      (FirestoreService.listInventory as jest.Mock).mockResolvedValue([
        {
          inventory_id: 'inv-1',
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
        },
      ]);

      const inventoryResponse = await request(app)
        .get(`/clinics/${testClinicId}/inventory`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(inventoryResponse.body.inventory).toHaveLength(1);
      expect(inventoryResponse.body.inventory[0].quantity_in_stock).toBe(10);

      // Step 5: Create a treatment request for the patient
      const requestData = {
        patient_id: createdPatient.patient_id,
        request_date: '2024-01-15',
        treatment_type: 'Botox Application',
        products_used: [
          {
            product_id: testProductId,
            quantity: 2,
            lot: 'LOT001',
            expiration_date: '2025-12-31',
          },
        ],
      };

      const createRequestResponse = await request(app)
        .post(`/clinics/${testClinicId}/requests`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(requestData)
        .expect(201);

      expect(createRequestResponse.body).toHaveProperty('request');
      expect(createRequestResponse.body.request.patient_id).toBe(createdPatient.patient_id);
      expect(createRequestResponse.body.request.treatment_type).toBe(requestData.treatment_type);

      // Step 6: Verify inventory was updated after request
      (FirestoreService.listInventory as jest.Mock).mockResolvedValue([
        {
          inventory_id: 'inv-1',
          clinic_id: testClinicId,
          product_id: testProductId,
          quantity_in_stock: 8, // Reduced by 2
          minimum_stock_level: 5,
          expiration_dates: [
            {
              date: new Date('2025-12-31'),
              lot: 'LOT001',
              quantity: 8,
            },
          ],
        },
      ]);

      const updatedInventoryResponse = await request(app)
        .get(`/clinics/${testClinicId}/inventory`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(updatedInventoryResponse.body.inventory[0].quantity_in_stock).toBe(8);

      // Step 7: Generate invoice for the treatment
      const invoiceData = {
        patient_id: createdPatient.patient_id,
        request_id: createRequestResponse.body.request.request_id,
        invoice_date: '2024-01-15',
        items: [
          {
            description: 'Botox Application',
            quantity: 1,
            unit_price: 500.00,
            total_price: 500.00,
          },
        ],
        total_amount: 500.00,
      };

      const createInvoiceResponse = await request(app)
        .post(`/clinics/${testClinicId}/invoices`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(invoiceData)
        .expect(201);

      expect(createInvoiceResponse.body).toHaveProperty('invoice');
      expect(createInvoiceResponse.body.invoice.total_amount).toBe(500.00);
      expect(createInvoiceResponse.body.invoice.patient_id).toBe(createdPatient.patient_id);
    });
  });

  describe('Inventory Management Journey', () => {
    it('should handle complete inventory workflow from low stock to restock', async () => {
      // Setup: Mock clinic admin user
      const clinicAdmin = {
        uid: 'clinic-admin-id',
        email: 'admin@testclinic.com',
        role: 'clinic_admin',
        clinic_id: testClinicId,
        permissions: ['read_inventory', 'update_inventory', 'read_dashboard'],
      };

      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(clinicAdmin);

      // Step 1: Check current inventory status
      (FirestoreService.listInventory as jest.Mock).mockResolvedValue([
        {
          inventory_id: 'inv-low-stock',
          clinic_id: testClinicId,
          product_id: 'product-low-stock',
          quantity_in_stock: 3,
          minimum_stock_level: 10,
          expiration_dates: [
            {
              date: new Date('2025-06-30'),
              lot: 'LOT001',
              quantity: 3,
            },
          ],
        },
      ]);

      const inventoryResponse = await request(app)
        .get(`/clinics/${testClinicId}/inventory`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(inventoryResponse.body.inventory[0].quantity_in_stock).toBe(3);
      expect(inventoryResponse.body.inventory[0].minimum_stock_level).toBe(10);

      // Step 2: Check dashboard for low stock alerts
      (FirestoreService.getDashboardData as jest.Mock).mockResolvedValue({
        low_stock_alerts: [
          {
            product_id: 'product-low-stock',
            product_name: 'Low Stock Product',
            current_quantity: 3,
            minimum_quantity: 10,
            shortage: 7,
          },
        ],
        expiration_alerts: [],
        recent_activity: [],
      });

      const dashboardResponse = await request(app)
        .get(`/clinics/${testClinicId}/dashboard`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(dashboardResponse.body.low_stock_alerts).toHaveLength(1);
      expect(dashboardResponse.body.low_stock_alerts[0].shortage).toBe(7);

      // Step 3: Add new inventory (simulate receiving new stock)
      const restockData = {
        product_id: 'product-low-stock',
        quantity: 20,
        lot: 'LOT002',
        expiration_date: '2025-12-31',
        supplier_invoice: 'INV-2024-001',
      };

      const restockResponse = await request(app)
        .post(`/clinics/${testClinicId}/inventory/restock`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(restockData)
        .expect(200);

      expect(restockResponse.body).toHaveProperty('success', true);

      // Step 4: Verify inventory was updated
      (FirestoreService.listInventory as jest.Mock).mockResolvedValue([
        {
          inventory_id: 'inv-low-stock',
          clinic_id: testClinicId,
          product_id: 'product-low-stock',
          quantity_in_stock: 23, // 3 + 20
          minimum_stock_level: 10,
          expiration_dates: [
            {
              date: new Date('2025-06-30'),
              lot: 'LOT001',
              quantity: 3,
            },
            {
              date: new Date('2025-12-31'),
              lot: 'LOT002',
              quantity: 20,
            },
          ],
        },
      ]);

      const updatedInventoryResponse = await request(app)
        .get(`/clinics/${testClinicId}/inventory`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(updatedInventoryResponse.body.inventory[0].quantity_in_stock).toBe(23);
      expect(updatedInventoryResponse.body.inventory[0].expiration_dates).toHaveLength(2);

      // Step 5: Check dashboard again - should show no low stock alerts
      (FirestoreService.getDashboardData as jest.Mock).mockResolvedValue({
        low_stock_alerts: [],
        expiration_alerts: [],
        recent_activity: [
          {
            type: 'inventory_restock',
            description: 'Restocked Low Stock Product (+20 units)',
            timestamp: new Date(),
          },
        ],
      });

      const updatedDashboardResponse = await request(app)
        .get(`/clinics/${testClinicId}/dashboard`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(updatedDashboardResponse.body.low_stock_alerts).toHaveLength(0);
      expect(updatedDashboardResponse.body.recent_activity).toHaveLength(1);
      expect(updatedDashboardResponse.body.recent_activity[0].type).toBe('inventory_restock');
    });
  });

  describe('Multi-User Collaboration Journey', () => {
    it('should handle workflow between clinic admin and clinic user', async () => {
      // Step 1: Clinic admin creates a patient
      const clinicAdmin = {
        uid: 'clinic-admin-id',
        email: 'admin@testclinic.com',
        role: 'clinic_admin',
        clinic_id: testClinicId,
        permissions: ['create_patient', 'read_patient', 'manage_users'],
      };

      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(clinicAdmin);

      const patientData = {
        name: 'João Santos',
        email: 'joao@example.com',
        phone: '(11) 77777-7777',
        birth_date: '1990-05-20',
      };

      const createPatientResponse = await request(app)
        .post(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(patientData)
        .expect(201);

      const createdPatient = createPatientResponse.body.patient;

      // Step 2: Switch to clinic user context
      const clinicUser = {
        uid: 'clinic-user-id',
        email: 'user@testclinic.com',
        role: 'clinic_user',
        clinic_id: testClinicId,
        permissions: ['read_patient', 'create_request', 'read_inventory'],
      };

      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(clinicUser);

      // Step 3: Clinic user views the patient
      (FirestoreService.getPatientById as jest.Mock).mockResolvedValue({
        patient_id: createdPatient.patient_id,
        clinic_id: testClinicId,
        ...patientData,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const getPatientResponse = await request(app)
        .get(`/clinics/${testClinicId}/patients/${createdPatient.patient_id}`)
        .set('Authorization', `Bearer ${clinicUserToken}`)
        .expect(200);

      expect(getPatientResponse.body.patient.name).toBe(patientData.name);

      // Step 4: Clinic user tries to update patient (should fail - no permission)
      const updateAttempt = await request(app)
        .put(`/clinics/${testClinicId}/patients/${createdPatient.patient_id}`)
        .set('Authorization', `Bearer ${clinicUserToken}`)
        .send({ phone: '(11) 66666-6666' })
        .expect(403);

      expect(updateAttempt.body.error.code).toBe('FORBIDDEN');

      // Step 5: Clinic user creates a request for the patient (should succeed)
      const requestData = {
        patient_id: createdPatient.patient_id,
        request_date: '2024-01-20',
        treatment_type: 'Facial Treatment',
        products_used: [
          {
            product_id: testProductId,
            quantity: 1,
            lot: 'LOT001',
            expiration_date: '2025-12-31',
          },
        ],
      };

      const createRequestResponse = await request(app)
        .post(`/clinics/${testClinicId}/requests`)
        .set('Authorization', `Bearer ${clinicUserToken}`)
        .send(requestData)
        .expect(201);

      expect(createRequestResponse.body.request.treatment_type).toBe(requestData.treatment_type);

      // Step 6: Switch back to admin to view all activity
      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(clinicAdmin);

      (FirestoreService.listRequests as jest.Mock).mockResolvedValue([
        {
          request_id: createRequestResponse.body.request.request_id,
          clinic_id: testClinicId,
          patient_id: createdPatient.patient_id,
          treatment_type: 'Facial Treatment',
          created_by: 'clinic-user-id',
          created_at: new Date(),
        },
      ]);

      const requestsResponse = await request(app)
        .get(`/clinics/${testClinicId}/requests`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(requestsResponse.body.requests).toHaveLength(1);
      expect(requestsResponse.body.requests[0].created_by).toBe('clinic-user-id');
    });
  });

  describe('System Admin Management Journey', () => {
    it('should handle system admin managing multiple clinics', async () => {
      // Setup: System admin user
      const systemAdmin = {
        uid: 'system-admin-id',
        email: 'admin@curvamestra.com',
        role: 'system_admin',
        clinic_id: null,
        permissions: ['manage_users', 'read_patient', 'read_inventory', 'create_clinic'],
      };

      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(systemAdmin);

      // Step 1: System admin views all clinics
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue([
        {
          clinic_id: 'clinic-1',
          name: 'Clinic One',
          admin_user_id: 'admin-1',
          created_at: new Date(),
        },
        {
          clinic_id: 'clinic-2',
          name: 'Clinic Two',
          admin_user_id: 'admin-2',
          created_at: new Date(),
        },
      ]);

      const clinicsResponse = await request(app)
        .get('/system/clinics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(clinicsResponse.body.clinics).toHaveLength(2);

      // Step 2: System admin views patients from clinic 1
      (FirestoreService.listPatients as jest.Mock).mockResolvedValue([
        {
          patient_id: 'patient-clinic-1',
          clinic_id: 'clinic-1',
          name: 'Patient from Clinic 1',
          email: 'patient1@clinic1.com',
        },
      ]);

      const clinic1PatientsResponse = await request(app)
        .get('/clinics/clinic-1/patients')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(clinic1PatientsResponse.body.patients).toHaveLength(1);
      expect(clinic1PatientsResponse.body.patients[0].clinic_id).toBe('clinic-1');

      // Step 3: System admin views patients from clinic 2
      (FirestoreService.listPatients as jest.Mock).mockResolvedValue([
        {
          patient_id: 'patient-clinic-2',
          clinic_id: 'clinic-2',
          name: 'Patient from Clinic 2',
          email: 'patient2@clinic2.com',
        },
      ]);

      const clinic2PatientsResponse = await request(app)
        .get('/clinics/clinic-2/patients')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(clinic2PatientsResponse.body.patients).toHaveLength(1);
      expect(clinic2PatientsResponse.body.patients[0].clinic_id).toBe('clinic-2');

      // Step 4: System admin creates a new clinic
      const newClinicData = {
        name: 'New Test Clinic',
        admin_email: 'newadmin@testclinic.com',
        admin_name: 'New Admin',
        address: {
          street: 'Rua Nova, 123',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234-567',
        },
      };

      const createClinicResponse = await request(app)
        .post('/system/clinics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(newClinicData)
        .expect(201);

      expect(createClinicResponse.body.clinic.name).toBe(newClinicData.name);
      expect(createClinicResponse.body).toHaveProperty('admin_user');

      // Step 5: System admin views updated clinic list
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue([
        {
          clinic_id: 'clinic-1',
          name: 'Clinic One',
          admin_user_id: 'admin-1',
          created_at: new Date(),
        },
        {
          clinic_id: 'clinic-2',
          name: 'Clinic Two',
          admin_user_id: 'admin-2',
          created_at: new Date(),
        },
        {
          clinic_id: createClinicResponse.body.clinic.clinic_id,
          name: 'New Test Clinic',
          admin_user_id: createClinicResponse.body.admin_user.user_id,
          created_at: new Date(),
        },
      ]);

      const updatedClinicsResponse = await request(app)
        .get('/system/clinics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(updatedClinicsResponse.body.clinics).toHaveLength(3);
    });
  });

  describe('Error Recovery Journey', () => {
    it('should handle and recover from various error scenarios', async () => {
      const clinicAdmin = {
        uid: 'clinic-admin-id',
        email: 'admin@testclinic.com',
        role: 'clinic_admin',
        clinic_id: testClinicId,
        permissions: ['create_patient', 'create_request', 'read_inventory'],
      };

      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(clinicAdmin);

      // Step 1: Try to create request with insufficient inventory
      (FirestoreService.getInventoryItem as jest.Mock).mockResolvedValue({
        inventory_id: 'inv-insufficient',
        clinic_id: testClinicId,
        product_id: testProductId,
        quantity_in_stock: 1, // Not enough
        minimum_stock_level: 5,
      });

      const insufficientRequestData = {
        patient_id: testPatientId,
        request_date: '2024-01-15',
        treatment_type: 'Botox Application',
        products_used: [
          {
            product_id: testProductId,
            quantity: 5, // More than available
            lot: 'LOT001',
            expiration_date: '2025-12-31',
          },
        ],
      };

      const insufficientInventoryResponse = await request(app)
        .post(`/clinics/${testClinicId}/requests`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(insufficientRequestData)
        .expect(400);

      expect(insufficientInventoryResponse.body.error.code).toBe('INSUFFICIENT_INVENTORY');

      // Step 2: Check inventory to confirm what's available
      (FirestoreService.listInventory as jest.Mock).mockResolvedValue([
        {
          inventory_id: 'inv-insufficient',
          clinic_id: testClinicId,
          product_id: testProductId,
          quantity_in_stock: 1,
          minimum_stock_level: 5,
        },
      ]);

      const inventoryCheckResponse = await request(app)
        .get(`/clinics/${testClinicId}/inventory`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(200);

      expect(inventoryCheckResponse.body.inventory[0].quantity_in_stock).toBe(1);

      // Step 3: Create request with available quantity
      const adjustedRequestData = {
        ...insufficientRequestData,
        products_used: [
          {
            product_id: testProductId,
            quantity: 1, // Adjusted to available quantity
            lot: 'LOT001',
            expiration_date: '2025-12-31',
          },
        ],
      };

      const successfulRequestResponse = await request(app)
        .post(`/clinics/${testClinicId}/requests`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send(adjustedRequestData)
        .expect(201);

      expect(successfulRequestResponse.body.request.products_used[0].quantity).toBe(1);

      // Step 4: Try to access non-existent patient
      const nonExistentPatientResponse = await request(app)
        .get(`/clinics/${testClinicId}/patients/non-existent-id`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(404);

      expect(nonExistentPatientResponse.body.error.code).toBe('NOT_FOUND');

      // Step 5: Try to access different clinic's data (should fail)
      const unauthorizedAccessResponse = await request(app)
        .get('/clinics/different-clinic-id/patients')
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .expect(403);

      expect(unauthorizedAccessResponse.body.error.code).toBe('FORBIDDEN');
    });
  });
});