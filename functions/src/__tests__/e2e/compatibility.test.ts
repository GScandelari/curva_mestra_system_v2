import request from 'supertest';
import { app } from '../../index';
import { authConfig } from '../../config/auth';

// Mock auth config
jest.mock('../../config/auth', () => ({
  authConfig: {
    verifyIdToken: jest.fn(),
  },
}));

describe('API Compatibility Tests', () => {
  let authToken: string;
  const testClinicId = 'compatibility-test-clinic';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    authToken = 'compatibility-test-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockUser = {
      uid: 'compatibility-test-user',
      email: 'compatibility@test.com',
      role: 'clinic_admin',
      clinic_id: testClinicId,
      permissions: ['read_patient', 'create_patient', 'read_inventory'],
    };

    (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('HTTP Header Compatibility', () => {
    it('should handle various User-Agent strings correctly', async () => {
      const userAgents = [
        // Chrome
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Firefox
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        // Safari
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        // Edge
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        // Mobile Chrome
        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        // Mobile Safari
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      ];

      for (const userAgent of userAgents) {
        const response = await request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('User-Agent', userAgent)
          .expect(200);

        expect(response.body).toHaveProperty('patients');
        expect(Array.isArray(response.body.patients)).toBe(true);
      }
    });

    it('should handle different Accept headers correctly', async () => {
      const acceptHeaders = [
        'application/json',
        'application/json, text/plain, */*',
        'application/json; charset=utf-8',
        '*/*',
        'application/json, application/xml, text/plain, text/html, *.*',
      ];

      for (const acceptHeader of acceptHeaders) {
        const response = await request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('Accept', acceptHeader)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toHaveProperty('patients');
      }
    });

    it('should handle various Content-Type headers for POST requests', async () => {
      const patientData = {
        name: 'Test Patient',
        email: 'test@example.com',
        phone: '(11) 99999-9999',
        birth_date: '1990-01-01',
      };

      const contentTypes = [
        'application/json',
        'application/json; charset=utf-8',
        'application/json; charset=UTF-8',
      ];

      for (const contentType of contentTypes) {
        const response = await request(app)
          .post(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', contentType)
          .send(patientData)
          .expect(201);

        expect(response.body).toHaveProperty('patient');
        expect(response.body.patient.name).toBe(patientData.name);
      }
    });
  });

  describe('Character Encoding Compatibility', () => {
    it('should handle UTF-8 characters correctly', async () => {
      const patientDataWithUTF8 = {
        name: 'José da Silva Ção',
        email: 'josé@clínica.com.br',
        phone: '(11) 99999-9999',
        birth_date: '1990-01-01',
        address: {
          street: 'Rua São João, 123 - Apto 45º',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234-567',
          complement: 'Próximo à farmácia',
        },
        notes: 'Paciente com histórico de alergia à penicilina. Observações: não pode tomar medicação com açúcar.',
      };

      const response = await request(app)
        .post(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(patientDataWithUTF8)
        .expect(201);

      expect(response.body.patient.name).toBe('José da Silva Ção');
      expect(response.body.patient.email).toBe('josé@clínica.com.br');
      expect(response.body.patient.address.street).toBe('Rua São João, 123 - Apto 45º');
      expect(response.body.patient.notes).toContain('açúcar');
    });

    it('should handle special characters in search queries', async () => {
      const searchQueries = [
        'José',
        'São Paulo',
        'Clínica & Estética',
        'Dr. João',
        'Rua 25 de Março',
        'Açúcar',
        'Coração',
        'Ação',
      ];

      for (const query of searchQueries) {
        const response = await request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .query({ search: query })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('patients');
        expect(Array.isArray(response.body.patients)).toBe(true);
      }
    });
  });

  describe('Date Format Compatibility', () => {
    it('should handle various date formats correctly', async () => {
      const dateFormats = [
        '1990-01-15',           // ISO format
        '1990-01-15T00:00:00Z', // ISO with time
        '1990-01-15T00:00:00.000Z', // ISO with milliseconds
        '15/01/1990',           // Brazilian format
        '01/15/1990',           // US format
      ];

      for (const dateFormat of dateFormats) {
        const patientData = {
          name: `Patient ${dateFormat}`,
          email: `patient-${Date.now()}@example.com`,
          phone: '(11) 99999-9999',
          birth_date: dateFormat,
        };

        const response = await request(app)
          .post(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);

        // Should either accept the date or return a validation error
        expect([200, 201, 400]).toContain(response.status);
        
        if (response.status === 201) {
          expect(response.body.patient.birth_date).toBeDefined();
        } else if (response.status === 400) {
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      }
    });

    it('should handle timezone-aware date queries', async () => {
      const timezones = [
        '2024-01-15T00:00:00Z',           // UTC
        '2024-01-15T00:00:00-03:00',      // Brazil timezone
        '2024-01-15T00:00:00+00:00',      // UTC with explicit offset
        '2024-01-15T03:00:00+00:00',      // UTC morning
      ];

      for (const timezone of timezones) {
        const response = await request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .query({ 
            created_after: timezone,
            created_before: '2024-12-31T23:59:59Z'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('patients');
        expect(Array.isArray(response.body.patients)).toBe(true);
      }
    });
  });

  describe('Number Format Compatibility', () => {
    it('should handle various number formats in requests', async () => {
      const inventoryData = [
        { quantity: 10 },        // Integer
        { quantity: 10.5 },      // Decimal
        { quantity: '15' },      // String number
        { quantity: '20.75' },   // String decimal
      ];

      for (const data of inventoryData) {
        const response = await request(app)
          .post(`/clinics/${testClinicId}/inventory/restock`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            product_id: 'test-product',
            lot: 'TEST001',
            expiration_date: '2025-12-31',
            ...data,
          });

        // Should either accept the number or return a validation error
        expect([200, 201, 400]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('success', true);
        } else if (response.status === 400) {
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      }
    });

    it('should handle currency values correctly', async () => {
      const currencyValues = [
        500.00,      // Standard decimal
        500,         // Integer
        '500.00',    // String decimal
        '500',       // String integer
        1234.56,     // Multiple decimal places
        0.99,        // Less than 1
      ];

      for (const amount of currencyValues) {
        const invoiceData = {
          patient_id: 'test-patient',
          invoice_date: '2024-01-15',
          items: [
            {
              description: 'Test Service',
              quantity: 1,
              unit_price: amount,
              total_price: amount,
            },
          ],
          total_amount: amount,
        };

        const response = await request(app)
          .post(`/clinics/${testClinicId}/invoices`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invoiceData);

        // Should either accept the amount or return a validation error
        expect([200, 201, 400]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body.invoice.total_amount).toBeDefined();
        } else if (response.status === 400) {
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      }
    });
  });

  describe('API Version Compatibility', () => {
    it('should handle requests without API version header', async () => {
      const response = await request(app)
        .get(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patients');
    });

    it('should handle requests with API version header', async () => {
      const apiVersions = ['v1', '1.0', '2024-01-01'];

      for (const version of apiVersions) {
        const response = await request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('API-Version', version)
          .expect(200);

        expect(response.body).toHaveProperty('patients');
      }
    });
  });

  describe('Error Response Compatibility', () => {
    it('should return consistent error format across different scenarios', async () => {
      const errorScenarios = [
        {
          request: () => request(app)
            .get('/clinics/invalid-clinic-id/patients')
            .set('Authorization', `Bearer ${authToken}`),
          expectedStatus: 403,
          expectedCode: 'FORBIDDEN',
        },
        {
          request: () => request(app)
            .get(`/clinics/${testClinicId}/patients/non-existent`)
            .set('Authorization', `Bearer ${authToken}`),
          expectedStatus: 404,
          expectedCode: 'NOT_FOUND',
        },
        {
          request: () => request(app)
            .post(`/clinics/${testClinicId}/patients`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({}),
          expectedStatus: 400,
          expectedCode: 'VALIDATION_ERROR',
        },
        {
          request: () => request(app)
            .get(`/clinics/${testClinicId}/patients`)
            .set('Authorization', 'Bearer invalid-token'),
          expectedStatus: 401,
          expectedCode: 'UNAUTHORIZED',
        },
      ];

      for (const scenario of errorScenarios) {
        const response = await scenario.request();
        
        expect(response.status).toBe(scenario.expectedStatus);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code', scenario.expectedCode);
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('timestamp');
        expect(response.body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedJsons = [
        '{"name": "Test", "email":}',           // Missing value
        '{"name": "Test" "email": "test"}',     // Missing comma
        '{name: "Test", "email": "test"}',      // Unquoted key
        '{"name": "Test", "email": "test"',     // Missing closing brace
      ];

      for (const malformedJson of malformedJsons) {
        const response = await request(app)
          .post(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/json')
          .send(malformedJson);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('BAD_REQUEST');
      }
    });
  });

  describe('CORS Compatibility', () => {
    it('should handle preflight OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options(`/clinics/${testClinicId}/patients`)
        .set('Origin', 'https://app.curvamestra.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization, Content-Type')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should include CORS headers in actual requests', async () => {
      const response = await request(app)
        .get(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'https://app.curvamestra.com')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Content Negotiation', () => {
    it('should handle different Accept-Encoding headers', async () => {
      const encodings = [
        'gzip',
        'deflate',
        'br',
        'gzip, deflate',
        'gzip, deflate, br',
        '*',
      ];

      for (const encoding of encodings) {
        const response = await request(app)
          .get(`/clinics/${testClinicId}/patients`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('Accept-Encoding', encoding)
          .expect(200);

        expect(response.body).toHaveProperty('patients');
      }
    });

    it('should handle requests without Accept-Encoding header', async () => {
      const response = await request(app)
        .get(`/clinics/${testClinicId}/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patients');
    });
  });
});