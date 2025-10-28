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

describe('Performance and Load Tests', () => {
  let authToken: string;
  const testClinicId = 'perf-test-clinic';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    authToken = 'performance-test-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default authenticated user
    const mockUser = {
      uid: 'perf-test-user',
      email: 'perf@test.com',
      role: 'clinic_admin',
      clinic_id: testClinicId,
      permissions: ['read_patient', 'create_patient', 'read_inventory', 'create_request'],
    };

    (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('Response Time Tests', () => {
    it('should respond to patient list requests within acceptable time', async () => {
      // Mock large patient dataset
      const mockPatients = Array.from({ length: 100 }, (_, i) => ({
        patient_id: `patient-${i}`,
        clinic_id: testClinicId,
        name: `Patient ${i}`,
        email: `patient${i}@test.com`,
        phone: `(11) ${String(i).padStart(5, '0')}-${String(i).padStart(4, '0')}`,
        birth_date: new Date(1980 + (i % 40), (i % 12), (i % 28) + 1),
        created_at: new Date(),
        updated_at: new Date(),
      }));

      (FirestoreService.listPatients as jest.Mock).mockResolvedValue(mockPatients);

      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.patients).toHaveLength(100);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle inventory queries efficiently', async () => {
      // Mock large inventory dataset
      const mockInventory = Array.from({ length: 50 }, (_, i) => ({
        inventory_id: `inv-${i}`,
        clinic_id: testClinicId,
        product_id: `product-${i}`,
        quantity_in_stock: Math.floor(Math.random() * 100),
        minimum_stock_level: 10,
        expiration_dates: [
          {
            date: new Date(2025, (i % 12), 1),
            lot: `LOT${String(i).padStart(3, '0')}`,
            quantity: Math.floor(Math.random() * 50),
          },
        ],
        last_update: new Date(),
      }));

      (FirestoreService.listInventory as jest.Mock).mockResolvedValue(mockInventory);

      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/clinics/${testClinicId}/inventory`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.inventory).toHaveLength(50);
      expect(responseTime).toBeLessThan(800); // Should respond within 800ms
    });

    it('should handle dashboard data aggregation efficiently', async () => {
      // Mock complex dashboard data
      const mockDashboardData = {
        low_stock_alerts: Array.from({ length: 10 }, (_, i) => ({
          product_id: `product-${i}`,
          product_name: `Low Stock Product ${i}`,
          current_quantity: i + 1,
          minimum_quantity: 10,
          shortage: 10 - (i + 1),
        })),
        expiration_alerts: Array.from({ length: 15 }, (_, i) => ({
          product_id: `product-exp-${i}`,
          product_name: `Expiring Product ${i}`,
          expiration_date: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)), // i weeks from now
          quantity: Math.floor(Math.random() * 20),
          lot: `LOT${String(i).padStart(3, '0')}`,
        })),
        recent_activity: Array.from({ length: 20 }, (_, i) => ({
          type: i % 2 === 0 ? 'patient_created' : 'request_created',
          description: `Activity ${i}`,
          timestamp: new Date(Date.now() - (i * 60 * 60 * 1000)), // i hours ago
          user_id: `user-${i % 3}`,
        })),
        statistics: {
          total_patients: 150,
          total_requests_this_month: 45,
          total_inventory_value: 25000.50,
          low_stock_count: 10,
          expiring_soon_count: 15,
        },
      };

      (FirestoreService.getDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/clinics/${testClinicId}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.low_stock_alerts).toHaveLength(10);
      expect(response.body.expiration_alerts).toHaveLength(15);
      expect(response.body.recent_activity).toHaveLength(20);
      expect(responseTime).toBeLessThan(1200); // Should respond within 1.2 seconds
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle multiple simultaneous patient queries', async () => {
      const mockPatients = Array.from({ length: 20 }, (_, i) => ({
        patient_id: `concurrent-patient-${i}`,
        clinic_id: testClinicId,
        name: `Concurrent Patient ${i}`,
        email: `concurrent${i}@test.com`,
      }));

      (FirestoreService.listPatients as jest.Mock).mockResolvedValue(mockPatients);

      // Create 10 concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.patients).toHaveLength(20);
      });

      // Total time should be reasonable (not much more than a single request)
      expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle concurrent patient creation requests', async () => {
      let createdCount = 0;
      (FirestoreService.createPatient as jest.Mock).mockImplementation(async () => {
        createdCount++;
        return {
          patient_id: `created-patient-${createdCount}`,
          clinic_id: testClinicId,
          name: `Created Patient ${createdCount}`,
          created_at: new Date(),
        };
      });

      // Create 5 concurrent patient creation requests
      const patientData = Array.from({ length: 5 }, (_, i) => ({
        name: `Concurrent Patient ${i}`,
        email: `concurrent${i}@test.com`,
        phone: `(11) ${String(i).padStart(5, '0')}-${String(i).padStart(4, '0')}`,
        birth_date: '1990-01-01',
      }));

      const concurrentCreations = patientData.map(data =>
        request(app)
          .post(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(data)
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentCreations);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.patient.name).toBe(`Concurrent Patient ${index}`);
      });

      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(createdCount).toBe(5); // All patients should be created
    });
  });

  describe('Large Dataset Tests', () => {
    it('should handle pagination efficiently with large datasets', async () => {
      // Mock very large patient dataset
      const totalPatients = 1000;
      const pageSize = 50;

      (FirestoreService.listPatients as jest.Mock).mockImplementation(async (clinicId, filters) => {
        const offset = filters?.offset || 0;
        const limit = filters?.limit || pageSize;
        
        return Array.from({ length: Math.min(limit, totalPatients - offset) }, (_, i) => ({
          patient_id: `large-dataset-patient-${offset + i}`,
          clinic_id: testClinicId,
          name: `Patient ${offset + i}`,
          email: `patient${offset + i}@test.com`,
          created_at: new Date(),
        }));
      });

      // Test first page
      const firstPageStart = Date.now();
      const firstPageResponse = await request(app)
        .get(`/clinics/${testClinicId}/patients?limit=${pageSize}&offset=0`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const firstPageTime = Date.now() - firstPageStart;

      expect(firstPageResponse.body.patients).toHaveLength(pageSize);
      expect(firstPageTime).toBeLessThan(1000);

      // Test middle page
      const middlePageStart = Date.now();
      const middlePageResponse = await request(app)
        .get(`/clinics/${testClinicId}/patients?limit=${pageSize}&offset=500`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const middlePageTime = Date.now() - middlePageStart;

      expect(middlePageResponse.body.patients).toHaveLength(pageSize);
      expect(middlePageTime).toBeLessThan(1000);

      // Test last page
      const lastPageStart = Date.now();
      const lastPageResponse = await request(app)
        .get(`/clinics/${testClinicId}/patients?limit=${pageSize}&offset=950`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const lastPageTime = Date.now() - lastPageStart;

      expect(lastPageResponse.body.patients).toHaveLength(50); // 1000 - 950 = 50
      expect(lastPageTime).toBeLessThan(1000);
    });

    it('should handle complex filtering efficiently', async () => {
      const mockFilteredPatients = Array.from({ length: 25 }, (_, i) => ({
        patient_id: `filtered-patient-${i}`,
        clinic_id: testClinicId,
        name: `Filtered Patient ${i}`,
        email: `filtered${i}@test.com`,
        created_at: new Date(2024, 0, i + 1), // January 2024
      }));

      (FirestoreService.listPatients as jest.Mock).mockResolvedValue(mockFilteredPatients);

      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/clinics/${testClinicId}/patients`)
        .query({
          search: 'Filtered',
          created_after: '2024-01-01',
          created_before: '2024-01-31',
          limit: 50,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.patients).toHaveLength(25);
      expect(responseTime).toBeLessThan(1500); // Complex filtering should still be fast
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should handle large request payloads efficiently', async () => {
      // Create a large patient creation payload
      const largePatientData = {
        name: 'Patient with Large Data',
        email: 'large@test.com',
        phone: '(11) 99999-9999',
        birth_date: '1990-01-01',
        address: {
          street: 'A'.repeat(200), // Large street name
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234-567',
          complement: 'B'.repeat(500), // Large complement
        },
        medical_history: 'C'.repeat(2000), // Large medical history
        notes: 'D'.repeat(1000), // Large notes
      };

      (FirestoreService.createPatient as jest.Mock).mockResolvedValue({
        patient_id: 'large-data-patient',
        clinic_id: testClinicId,
        ...largePatientData,
        created_at: new Date(),
      });

      const startTime = Date.now();
      
      const response = await request(app)
        .post(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePatientData)
        .expect(201);

      const responseTime = Date.now() - startTime;

      expect(response.body.patient.name).toBe(largePatientData.name);
      expect(responseTime).toBeLessThan(2000); // Should handle large payloads efficiently
    });

    it('should handle multiple large responses without memory issues', async () => {
      // Mock large inventory items with detailed information
      const mockLargeInventory = Array.from({ length: 100 }, (_, i) => ({
        inventory_id: `large-inv-${i}`,
        clinic_id: testClinicId,
        product_id: `product-${i}`,
        product_name: `Product ${i} with very long name and description`,
        quantity_in_stock: Math.floor(Math.random() * 100),
        minimum_stock_level: 10,
        expiration_dates: Array.from({ length: 5 }, (_, j) => ({
          date: new Date(2025, (i + j) % 12, 1),
          lot: `LOT${String(i * 5 + j).padStart(4, '0')}`,
          quantity: Math.floor(Math.random() * 20),
          supplier: `Supplier ${j} with detailed information`,
          batch_info: `Batch information for lot ${i * 5 + j}`.repeat(10),
        })),
        last_update: new Date(),
        movement_history: Array.from({ length: 10 }, (_, k) => ({
          type: k % 2 === 0 ? 'in' : 'out',
          quantity: Math.floor(Math.random() * 10),
          reference_id: `ref-${i}-${k}`,
          timestamp: new Date(Date.now() - k * 24 * 60 * 60 * 1000),
          notes: `Movement notes for item ${i}, movement ${k}`,
        })),
      }));

      (FirestoreService.listInventory as jest.Mock).mockResolvedValue(mockLargeInventory);

      // Make multiple requests to test memory handling
      const multipleRequests = Array.from({ length: 5 }, () =>
        request(app)
          .get(`/clinics/${testClinicId}/inventory`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(multipleRequests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.inventory).toHaveLength(100);
        expect(response.body.inventory[0]).toHaveProperty('movement_history');
        expect(response.body.inventory[0].movement_history).toHaveLength(10);
      });

      expect(totalTime).toBeLessThan(5000); // Should handle multiple large responses
    });
  });

  describe('Error Handling Under Load', () => {
    it('should maintain error handling quality under concurrent load', async () => {
      // Mix of valid and invalid requests
      const requests = [
        // Valid requests
        request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`),
        
        // Invalid requests
        request(app)
          .get('/clinics/invalid-clinic-id/patients')
          .set('Authorization', `Bearer ${authToken}`),
        
        request(app)
          .get(`/clinics/${testClinicId}/patients/non-existent-id`)
          .set('Authorization', `Bearer ${authToken}`),
        
        request(app)
          .post(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({}), // Invalid payload
        
        request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', 'Bearer invalid-token'),
      ];

      (FirestoreService.listPatients as jest.Mock).mockResolvedValue([]);
      (FirestoreService.getPatientById as jest.Mock).mockResolvedValue(null);

      const responses = await Promise.all(requests.map(req => req.catch(err => err.response)));

      // Check that each response has appropriate status and error handling
      expect(responses[0].status).toBe(200); // Valid request
      expect(responses[1].status).toBe(403); // Forbidden clinic access
      expect(responses[2].status).toBe(404); // Patient not found
      expect(responses[3].status).toBe(400); // Invalid payload
      expect(responses[4].status).toBe(401); // Invalid token

      // All error responses should have proper error format
      responses.slice(1).forEach(response => {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('timestamp');
      });
    });
  });
});