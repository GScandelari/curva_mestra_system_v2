import request from 'supertest';
import express from 'express';
import { clinicRoutes } from '../../routes/clinics';
import { ClinicService } from '../../services/clinicService';
import { AuditService } from '../../services/auditService';
import { UserRole } from '../../models/types';

// Mock the services
jest.mock('../../services/clinicService');
jest.mock('../../services/auditService');

const mockClinicService = ClinicService as jest.Mocked<typeof ClinicService>;
const mockAuditService = AuditService as jest.Mocked<typeof AuditService>;

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    uid: 'test-admin-user',
    role: 'system_admin' as UserRole,
    clinic_id: null,
    permissions: ['manage_clinics'],
  };
  next();
});

app.use('/clinics', clinicRoutes);

const mockClinic = {
  clinic_id: 'clinic-1',
  name: 'Test Clinic',
  cnpj: '12.345.678/0001-90',
  email: 'test@clinic.com',
  phone: '(11) 99999-9999',
  address: 'Rua Test, 123, São Paulo, SP',
  city: 'São Paulo',
  admin_user_id: 'admin-1',
  status: 'active' as const,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02'),
  settings: {
    timezone: 'America/Sao_Paulo',
    notification_preferences: {
      low_stock_alerts: true,
      expiration_alerts: true,
      email_notifications: true,
      alert_threshold_days: 30,
    },
  },
};

const mockStats = {
  total_users: 5,
  total_patients: 100,
  total_products: 50,
  recent_activity_count: 10,
};

const mockAuditLog = {
  log_id: 'log-1',
  user_id: 'test-admin-user',
  clinic_id: 'clinic-1',
  action_type: 'clinic_created',
  resource_type: 'clinic',
  resource_id: 'clinic-1',
  details: {
    clinic_id: 'clinic-1',
    clinic_name: 'Test Clinic',
  },
  timestamp: new Date('2024-01-01'),
  severity: 'info',
  status: 'success',
};

describe('Clinic Management API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful responses
    mockClinicService.getClinics.mockResolvedValue([mockClinic]);
    mockClinicService.getClinic.mockResolvedValue(mockClinic);
    mockClinicService.createClinic.mockResolvedValue(mockClinic);
    mockClinicService.updateClinic.mockResolvedValue(mockClinic);
    mockClinicService.toggleClinicStatus.mockResolvedValue({ ...mockClinic, status: 'inactive' });
    mockClinicService.searchClinics.mockResolvedValue([mockClinic]);
    mockClinicService.getClinicStats.mockResolvedValue(mockStats);
    mockClinicService.getClinicAuditLogs.mockResolvedValue([mockAuditLog]);
    
    mockAuditService.logClinicCreation.mockResolvedValue();
    mockAuditService.logClinicUpdate.mockResolvedValue();
    mockAuditService.logClinicStatusChange.mockResolvedValue();
  });

  describe('Complete Clinic Creation Workflow', () => {
    it('should handle complete clinic creation with validation and audit logging', async () => {
      const newClinicData = {
        name: 'New Test Clinic',
        cnpj: '98.765.432/0001-10',
        email: 'newclinic@test.com',
        phone: '(11) 88888-8888',
        address: 'Rua Nova, 456, São Paulo, SP',
        city: 'São Paulo',
        admin_email: 'admin@newclinic.com',
        admin_profile: {
          first_name: 'Admin',
          last_name: 'User',
        },
        admin_password: 'password123',
        settings: {
          timezone: 'America/Sao_Paulo',
          notification_preferences: {
            low_stock_alerts: true,
            expiration_alerts: true,
            email_notifications: true,
            alert_threshold_days: 30,
          },
        },
      };

      const response = await request(app)
        .post('/clinics')
        .send(newClinicData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('clinic');
      expect(response.body.clinic).toMatchObject({
        clinic_id: expect.any(String),
        name: 'Test Clinic',
        status: 'active',
      });

      // Verify service calls
      expect(mockClinicService.createClinic).toHaveBeenCalledWith(
        newClinicData,
        'system_admin',
        'test-admin-user'
      );

      // Verify audit logging
      expect(mockAuditService.logClinicCreation).toHaveBeenCalledWith(
        mockClinic,
        'test-admin-user'
      );
    });

    it('should handle validation errors during creation', async () => {
      mockClinicService.createClinic.mockRejectedValue(new Error('Invalid CNPJ format'));

      const invalidData = {
        name: 'Test Clinic',
        cnpj: 'invalid-cnpj',
        email: 'invalid-email',
        phone: 'invalid-phone',
        address: 'Test Address',
        city: 'São Paulo',
        admin_email: 'admin@test.com',
        admin_profile: {
          first_name: 'Admin',
          last_name: 'User',
        },
        admin_password: 'password123',
      };

      const response = await request(app)
        .post('/clinics')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Invalid CNPJ format');
    });

    it('should handle duplicate CNPJ/email errors', async () => {
      mockClinicService.createClinic.mockRejectedValue(new Error('A clinic with this CNPJ already exists'));

      const duplicateData = {
        name: 'Duplicate Clinic',
        cnpj: '12.345.678/0001-90', // Same as existing clinic
        email: 'duplicate@test.com',
        phone: '(11) 99999-9999',
        address: 'Test Address',
        city: 'São Paulo',
        admin_email: 'admin@duplicate.com',
        admin_profile: {
          first_name: 'Admin',
          last_name: 'User',
        },
        admin_password: 'password123',
      };

      const response = await request(app)
        .post('/clinics')
        .send(duplicateData)
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('Complete Clinic Update Workflow', () => {
    it('should handle complete clinic update with validation and audit logging', async () => {
      const updateData = {
        name: 'Updated Test Clinic',
        email: 'updated@clinic.com',
        phone: '(11) 77777-7777',
        address: 'Rua Atualizada, 789, São Paulo, SP',
        city: 'São Paulo',
        status: 'active',
        settings: {
          timezone: 'America/Sao_Paulo',
          notification_preferences: {
            low_stock_alerts: false,
            expiration_alerts: true,
            email_notifications: true,
            alert_threshold_days: 15,
          },
        },
      };

      const response = await request(app)
        .put('/clinics/clinic-1')
        .send(updateData)
        .expect(200);

      // Verify response
      expect(response.body).toHaveProperty('clinic');
      expect(response.body.clinic.name).toBe('Test Clinic');

      // Verify service calls
      expect(mockClinicService.updateClinic).toHaveBeenCalledWith(
        'clinic-1',
        updateData,
        'system_admin',
        'test-admin-user'
      );

      // Verify audit logging
      expect(mockAuditService.logClinicUpdate).toHaveBeenCalledWith(
        'clinic-1',
        updateData,
        'test-admin-user'
      );
    });

    it('should handle update validation errors', async () => {
      mockClinicService.updateClinic.mockRejectedValue(new Error('Invalid email format'));

      const invalidUpdateData = {
        email: 'invalid-email-format',
      };

      const response = await request(app)
        .put('/clinics/clinic-1')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid email format');
    });

    it('should handle clinic not found during update', async () => {
      mockClinicService.updateClinic.mockRejectedValue(new Error('Clinic not found'));

      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put('/clinics/nonexistent-clinic')
        .send(updateData)
        .expect(404);

      expect(response.body.error.message).toContain('Clinic not found');
    });
  });

  describe('Complete Status Management Workflow', () => {
    it('should handle complete status toggle with audit logging', async () => {
      const response = await request(app)
        .put('/clinics/clinic-1/status')
        .send({ status: 'inactive' })
        .expect(200);

      // Verify response
      expect(response.body).toHaveProperty('clinic');
      expect(response.body.clinic.status).toBe('inactive');

      // Verify service calls
      expect(mockClinicService.toggleClinicStatus).toHaveBeenCalledWith(
        'clinic-1',
        'inactive',
        'system_admin',
        'test-admin-user'
      );

      // Verify audit logging
      expect(mockAuditService.logClinicStatusChange).toHaveBeenCalledWith(
        'clinic-1',
        'active',
        'inactive',
        'test-admin-user'
      );
    });

    it('should handle invalid status values', async () => {
      const response = await request(app)
        .put('/clinics/clinic-1/status')
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error.message).toContain('Invalid status value');
    });

    it('should handle status toggle for nonexistent clinic', async () => {
      mockClinicService.toggleClinicStatus.mockRejectedValue(new Error('Clinic not found'));

      const response = await request(app)
        .put('/clinics/nonexistent-clinic/status')
        .send({ status: 'inactive' })
        .expect(404);

      expect(response.body.error.message).toContain('Clinic not found');
    });
  });

  describe('Search and Filtering Workflow', () => {
    it('should handle complete search workflow with filters', async () => {
      const response = await request(app)
        .get('/clinics')
        .query({
          search: 'Test',
          status: 'active',
          sortBy: 'name',
          sortOrder: 'asc',
        })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('clinics');
      expect(Array.isArray(response.body.clinics)).toBe(true);
      expect(response.body.clinics[0]).toMatchObject({
        clinic_id: 'clinic-1',
        name: 'Test Clinic',
        status: 'active',
      });

      // Verify service calls
      expect(mockClinicService.searchClinics).toHaveBeenCalledWith(
        'Test',
        {
          status: 'active',
          sortBy: 'name',
          sortOrder: 'asc',
        },
        'system_admin',
        null
      );
    });

    it('should handle search without filters', async () => {
      const response = await request(app)
        .get('/clinics')
        .expect(200);

      expect(response.body).toHaveProperty('clinics');
      expect(mockClinicService.getClinics).toHaveBeenCalledWith('system_admin', null);
    });

    it('should handle empty search results', async () => {
      mockClinicService.searchClinics.mockResolvedValue([]);

      const response = await request(app)
        .get('/clinics')
        .query({ search: 'nonexistent' })
        .expect(200);

      expect(response.body.clinics).toEqual([]);
    });
  });

  describe('Audit Trail Workflow', () => {
    it('should handle complete audit log retrieval', async () => {
      const response = await request(app)
        .get('/clinics/clinic-1/audit-logs')
        .query({
          limit: 10,
          offset: 0,
        })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('auditLogs');
      expect(Array.isArray(response.body.auditLogs)).toBe(true);
      expect(response.body.auditLogs[0]).toMatchObject({
        log_id: 'log-1',
        action_type: 'clinic_created',
        resource_type: 'clinic',
      });

      // Verify service calls
      expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith(
        'clinic-1',
        10,
        0
      );
    });

    it('should handle audit logs with pagination', async () => {
      const response = await request(app)
        .get('/clinics/clinic-1/audit-logs')
        .query({
          limit: 5,
          offset: 10,
        })
        .expect(200);

      expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith(
        'clinic-1',
        5,
        10
      );
    });

    it('should handle audit logs for nonexistent clinic', async () => {
      mockClinicService.getClinicAuditLogs.mockRejectedValue(new Error('Clinic not found'));

      const response = await request(app)
        .get('/clinics/nonexistent-clinic/audit-logs')
        .expect(404);

      expect(response.body.error.message).toContain('Clinic not found');
    });
  });

  describe('Statistics and Analytics Workflow', () => {
    it('should handle clinic statistics retrieval', async () => {
      const response = await request(app)
        .get('/clinics/clinic-1/stats')
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toMatchObject({
        total_users: 5,
        total_patients: 100,
        total_products: 50,
        recent_activity_count: 10,
      });

      // Verify service calls
      expect(mockClinicService.getClinicStats).toHaveBeenCalledWith('clinic-1');
    });

    it('should handle statistics for nonexistent clinic', async () => {
      mockClinicService.getClinicStats.mockRejectedValue(new Error('Clinic not found'));

      const response = await request(app)
        .get('/clinics/nonexistent-clinic/stats')
        .expect(404);

      expect(response.body.error.message).toContain('Clinic not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailable errors', async () => {
      mockClinicService.getClinics.mockRejectedValue(new Error('Service temporarily unavailable'));

      const response = await request(app)
        .get('/clinics')
        .expect(503);

      expect(response.body.error.message).toContain('Service temporarily unavailable');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/clinics')
        .send('invalid-json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle concurrent status toggle operations', async () => {
      // Simulate concurrent requests
      const promises = [
        request(app).put('/clinics/clinic-1/status').send({ status: 'inactive' }),
        request(app).put('/clinics/clinic-1/status').send({ status: 'active' }),
      ];

      const responses = await Promise.all(promises);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should handle large payload requests', async () => {
      const largeData = {
        name: 'A'.repeat(1000), // Very long name
        cnpj: '12.345.678/0001-90',
        email: 'test@clinic.com',
        phone: '(11) 99999-9999',
        address: 'B'.repeat(2000), // Very long address
        city: 'São Paulo',
        admin_email: 'admin@test.com',
        admin_profile: {
          first_name: 'Admin',
          last_name: 'User',
        },
        admin_password: 'password123',
      };

      const response = await request(app)
        .post('/clinics')
        .send(largeData)
        .expect(400);

      expect(response.body.error.message).toContain('exceeds maximum length');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/clinics')
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (less than 2 seconds)
      expect(totalTime).toBeLessThan(2000);
    });

    it('should handle search operations efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/clinics')
        .query({ search: 'Test Clinic' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond quickly (less than 500ms)
      expect(responseTime).toBeLessThan(500);
      expect(response.body).toHaveProperty('clinics');
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a clinic
      await request(app)
        .post('/clinics')
        .send({
          name: 'Consistency Test Clinic',
          cnpj: '11.222.333/0001-44',
          email: 'consistency@test.com',
          phone: '(11) 99999-9999',
          address: 'Test Address',
          city: 'São Paulo',
          admin_email: 'admin@consistency.com',
          admin_profile: {
            first_name: 'Admin',
            last_name: 'User',
          },
          admin_password: 'password123',
        })
        .expect(201);

      // Update the clinic
      await request(app)
        .put('/clinics/clinic-1')
        .send({
          name: 'Updated Consistency Test Clinic',
        })
        .expect(200);

      // Toggle status
      await request(app)
        .put('/clinics/clinic-1/status')
        .send({ status: 'inactive' })
        .expect(200);

      // Verify all operations were logged
      expect(mockAuditService.logClinicCreation).toHaveBeenCalled();
      expect(mockAuditService.logClinicUpdate).toHaveBeenCalled();
      expect(mockAuditService.logClinicStatusChange).toHaveBeenCalled();
    });

    it('should handle transaction rollback on errors', async () => {
      // Mock a service that fails after partial completion
      mockClinicService.createClinic.mockImplementation(async () => {
        // Simulate partial success followed by failure
        await mockAuditService.logClinicCreation(mockClinic, 'test-admin-user');
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .post('/clinics')
        .send({
          name: 'Rollback Test Clinic',
          cnpj: '55.666.777/0001-88',
          email: 'rollback@test.com',
          phone: '(11) 99999-9999',
          address: 'Test Address',
          city: 'São Paulo',
          admin_email: 'admin@rollback.com',
          admin_profile: {
            first_name: 'Admin',
            last_name: 'User',
          },
          admin_password: 'password123',
        })
        .expect(500);

      expect(response.body.error.message).toContain('Database connection failed');
    });
  });
});