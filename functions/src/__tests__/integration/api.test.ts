import request from 'supertest';
import * as admin from 'firebase-admin';
import { app } from '../../index';
import { authConfig } from '../../config/auth';

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

describe('API Integration Tests', () => {
  let mockToken: string;
  let mockUser: any;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    
    mockToken = 'mock-jwt-token';
    mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
      role: 'clinic_admin',
      clinic_id: 'test-clinic-id',
      permissions: ['read_inventory', 'create_patient', 'read_patient'],
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful token verification
    (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('Authentication Endpoints', () => {
    describe('POST /auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123',
        };

        const response = await request(app)
          .post('/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(loginData.email);
      });

      it('should reject invalid credentials', async () => {
        const loginData = {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        };

        const response = await request(app)
          .post('/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Patient Endpoints', () => {
    describe('GET /clinics/:clinic_id/patients', () => {
      it('should return patients for authenticated user', async () => {
        const response = await request(app)
          .get('/clinics/test-clinic-id/patients')
          .set('Authorization', `Bearer ${mockToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('patients');
        expect(Array.isArray(response.body.patients)).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/clinics/test-clinic-id/patients')
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('should enforce clinic access control', async () => {
        const response = await request(app)
          .get('/clinics/different-clinic-id/patients')
          .set('Authorization', `Bearer ${mockToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('FORBIDDEN');
      });
    });

    describe('POST /clinics/:clinic_id/patients', () => {
      it('should create patient with valid data', async () => {
        const patientData = {
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '(11) 99999-9999',
          birth_date: '1990-01-01',
          address: {
            street: 'Rua das Flores, 123',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234-567',
          },
        };

        const response = await request(app)
          .post('/clinics/test-clinic-id/patients')
          .set('Authorization', `Bearer ${mockToken}`)
          .send(patientData)
          .expect(201);

        expect(response.body).toHaveProperty('patient');
        expect(response.body.patient.name).toBe(patientData.name);
        expect(response.body.patient.email).toBe(patientData.email);
      });

      it('should validate patient data', async () => {
        const invalidPatientData = {
          name: '', // Invalid: empty name
          email: 'invalid-email', // Invalid: bad email format
          phone: '123', // Invalid: bad phone format
        };

        const response = await request(app)
          .post('/clinics/test-clinic-id/patients')
          .set('Authorization', `Bearer ${mockToken}`)
          .send(invalidPatientData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toContain('name');
        expect(response.body.error.details).toContain('email');
        expect(response.body.error.details).toContain('phone');
      });

      it('should require create_patient permission', async () => {
        // Mock user without create_patient permission
        const limitedUser = {
          ...mockUser,
          permissions: ['read_patient'],
        };
        (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(limitedUser);

        const patientData = {
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '(11) 99999-9999',
        };

        const response = await request(app)
          .post('/clinics/test-clinic-id/patients')
          .set('Authorization', `Bearer ${mockToken}`)
          .send(patientData)
          .expect(403);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('FORBIDDEN');
      });
    });
  });

  describe('Inventory Endpoints', () => {
    describe('GET /clinics/:clinic_id/inventory', () => {
      it('should return inventory items for authenticated user', async () => {
        const response = await request(app)
          .get('/clinics/test-clinic-id/inventory')
          .set('Authorization', `Bearer ${mockToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('inventory');
        expect(Array.isArray(response.body.inventory)).toBe(true);
      });

      it('should support filtering by product', async () => {
        const response = await request(app)
          .get('/clinics/test-clinic-id/inventory?product_id=test-product-id')
          .set('Authorization', `Bearer ${mockToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('inventory');
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/clinics/test-clinic-id/inventory?limit=10&offset=0')
          .set('Authorization', `Bearer ${mockToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('inventory');
        expect(response.body).toHaveProperty('pagination');
      });
    });
  });

  describe('Request Endpoints', () => {
    describe('POST /clinics/:clinic_id/requests', () => {
      it('should create request with valid data', async () => {
        const requestData = {
          patient_id: 'test-patient-id',
          request_date: '2024-01-15',
          treatment_type: 'Botox Application',
          products_used: [
            {
              product_id: 'test-product-id',
              quantity: 2,
              lot: 'LOT001',
              expiration_date: '2025-01-01',
            },
          ],
        };

        const response = await request(app)
          .post('/clinics/test-clinic-id/requests')
          .set('Authorization', `Bearer ${mockToken}`)
          .send(requestData)
          .expect(201);

        expect(response.body).toHaveProperty('request');
        expect(response.body.request.patient_id).toBe(requestData.patient_id);
        expect(response.body.request.treatment_type).toBe(requestData.treatment_type);
      });

      it('should validate product availability', async () => {
        const requestData = {
          patient_id: 'test-patient-id',
          request_date: '2024-01-15',
          treatment_type: 'Botox Application',
          products_used: [
            {
              product_id: 'unavailable-product-id',
              quantity: 100, // More than available
              lot: 'LOT001',
              expiration_date: '2025-01-01',
            },
          ],
        };

        const response = await request(app)
          .post('/clinics/test-clinic-id/requests')
          .set('Authorization', `Bearer ${mockToken}`)
          .send(requestData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock a server error
      (authConfig.verifyIdToken as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/clinics/test-clinic-id/patients')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should return proper error format', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });
});