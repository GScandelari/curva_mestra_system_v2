import request from 'supertest';
import express from 'express';
import { UserRole } from '../../config/auth';
import clinicRoutes from '../../routes/clinics';
import { authenticateToken } from '../../middleware/auth';

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((req: any, res: any, next: any) => next()),
  addRequestId: jest.fn((req: any, res: any, next: any) => {
    req.headers['x-request-id'] = 'test-request-id';
    next();
  }),
  logRequest: jest.fn((req: any, res: any, next: any) => next()),
}));

// Mock clinic service
jest.mock('../../services/clinicService', () => ({
  ClinicService: jest.fn().mockImplementation(() => ({
    listClinics: jest.fn(),
    searchClinics: jest.fn(),
    createClinic: jest.fn(),
    updateClinic: jest.fn(),
    getClinicById: jest.fn(),
    toggleClinicStatus: jest.fn(),
    getClinicAuditLogs: jest.fn(),
  })),
}));

describe('Clinic Routes Integration Tests', () => {
  let app: express.Application;
  let mockSystemAdminToken: string;
  let mockClinicAdminToken: string;
  let mockSystemAdminUser: any;
  let mockClinicAdminUser: any;
  let mockClinicService: any;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/clinics', clinicRoutes);
    
    mockSystemAdminToken = 'mock-system-admin-token';
    mockClinicAdminToken = 'mock-clinic-admin-token';
    
    mockSystemAdminUser = {
      uid: 'system-admin-id',
      email: 'admin@system.com',
      role: UserRole.SYSTEM_ADMIN,
      clinic_id: null,
      permissions: ['manage_clinics'],
    };

    mockClinicAdminUser = {
      uid: 'clinic-admin-id',
      email: 'admin@clinic.com',
      role: UserRole.CLINIC_ADMIN,
      clinic_id: 'test-clinic-id',
      permissions: ['manage_users'],
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked clinic service instance
    const { ClinicService } = require('../../services/clinicService');
    mockClinicService = new ClinicService();
    
    // Setup authentication mock to return the appropriate user
    (authenticateToken as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token === mockSystemAdminToken) {
        req.user = mockSystemAdminUser;
      } else if (token === mockClinicAdminToken) {
        req.user = mockClinicAdminUser;
      }
      next();
    });
  });

  describe('GET /clinics - Enhanced clinic listing', () => {
    it('should return all clinics for system admin', async () => {
      
      const mockClinics = [
        {
          clinic_id: 'clinic-1',
          name: 'Clinic One',
          cnpj: '12.345.678/0001-90',
          email: 'clinic1@example.com',
          phone: '(11) 99999-9999',
          address: 'Rua A, 123',
          city: 'São Paulo',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockClinicService.listClinics.mockResolvedValue(mockClinics);

      const response = await request(app)
        .get('/clinics')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('clinics');
      expect(response.body.clinics).toHaveLength(1);
      expect(response.body.clinics[0]).toHaveProperty('cnpj');
      expect(response.body.clinics[0]).toHaveProperty('email');
      expect(response.body.clinics[0]).toHaveProperty('status');
    });

    it('should support search functionality', async () => {
      
      const mockSearchResults = [
        {
          clinic_id: 'clinic-1',
          name: 'Test Clinic',
          cnpj: '12.345.678/0001-90',
          email: 'test@clinic.com',
          phone: '(11) 99999-9999',
          address: 'Rua Test, 123',
          city: 'São Paulo',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockClinicService.searchClinics.mockResolvedValue(mockSearchResults);

      const response = await request(app)
        .get('/clinics?search=Test')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .expect(200);

      expect(mockClinicService.searchClinics).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          status: 'all',
          sortBy: 'name',
          sortOrder: 'asc',
        }),
        UserRole.SYSTEM_ADMIN,
        null
      );
      expect(response.body.clinics).toHaveLength(1);
    });

    it('should support status filtering', async () => {
      
      mockClinicService.listClinics.mockResolvedValue([]);

      await request(app)
        .get('/clinics?status=active&sort_by=city&sort_order=desc')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .expect(200);

      expect(mockClinicService.listClinics).toHaveBeenCalledWith(
        UserRole.SYSTEM_ADMIN,
        null,
        expect.objectContaining({
          status: 'active',
          sortBy: 'city',
          sortOrder: 'desc',
        })
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/clinics')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /clinics - Enhanced clinic creation', () => {
    it('should create clinic with new fields', async () => {
      
      const clinicData = {
        name: 'New Clinic',
        cnpj: '12.345.678/0001-90',
        email: 'clinic@example.com',
        phone: '(11) 99999-9999',
        address: 'Rua Nova, 123',
        city: 'São Paulo',
        admin_email: 'admin@clinic.com',
        admin_profile: {
          first_name: 'João',
          last_name: 'Silva',
          phone: '(11) 88888-8888',
        },
        admin_password: 'password123',
      };

      const mockCreatedClinic = {
        clinic_id: 'new-clinic-id',
        ...clinicData,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClinicService.createClinic.mockResolvedValue(mockCreatedClinic);

      const response = await request(app)
        .post('/clinics')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send(clinicData)
        .expect(201);

      expect(response.body).toHaveProperty('clinic');
      expect(response.body.clinic).toHaveProperty('cnpj');
      expect(response.body.clinic).toHaveProperty('email');
      expect(response.body.clinic).toHaveProperty('status');
      expect(mockClinicService.createClinic).toHaveBeenCalledWith(
        clinicData,
        mockSystemAdminUser.uid,
        UserRole.SYSTEM_ADMIN
      );
    });

    it('should validate required new fields', async () => {
      const incompleteData = {
        name: 'Incomplete Clinic',
        // Missing cnpj, email, phone, city
        address: 'Rua Incompleta, 123',
        admin_email: 'admin@clinic.com',
        admin_profile: {
          first_name: 'João',
          last_name: 'Silva',
        },
        admin_password: 'password123',
      };

      const response = await request(app)
        .post('/clinics')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle CNPJ validation errors', async () => {
      mockClinicService.createClinic.mockRejectedValue(new Error('Invalid CNPJ format'));

      const clinicData = {
        name: 'Test Clinic',
        cnpj: 'invalid-cnpj',
        email: 'clinic@example.com',
        phone: '(11) 99999-9999',
        address: 'Rua Test, 123',
        city: 'São Paulo',
        admin_email: 'admin@clinic.com',
        admin_profile: {
          first_name: 'João',
          last_name: 'Silva',
        },
        admin_password: 'password123',
      };

      const response = await request(app)
        .post('/clinics')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send(clinicData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CNPJ');
    });

    it('should only allow system admin to create clinics', async () => {
      const clinicData = {
        name: 'Unauthorized Clinic',
        cnpj: '12.345.678/0001-90',
        email: 'clinic@example.com',
        phone: '(11) 99999-9999',
        address: 'Rua Test, 123',
        city: 'São Paulo',
        admin_email: 'admin@clinic.com',
        admin_profile: {
          first_name: 'João',
          last_name: 'Silva',
        },
        admin_password: 'password123',
      };

      mockClinicService.createClinic.mockRejectedValue(new Error('Insufficient permissions to create clinics'));

      const response = await request(app)
        .post('/clinics')
        .set('Authorization', `Bearer ${mockClinicAdminToken}`)
        .send(clinicData)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /clinics/:id - Enhanced clinic update', () => {
    it('should update clinic with new fields', async () => {
      const updateData = {
        name: 'Updated Clinic',
        email: 'updated@clinic.com',
        phone: '(11) 88888-8888',
        city: 'Rio de Janeiro',
        status: 'inactive' as const,
      };

      const mockUpdatedClinic = {
        clinic_id: 'test-clinic-id',
        cnpj: '12.345.678/0001-90',
        ...updateData,
        address: 'Rua Original, 123',
        admin_user_id: 'admin-id',
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
      };

      mockClinicService.updateClinic.mockResolvedValue(mockUpdatedClinic);

      const response = await request(app)
        .put('/clinics/test-clinic-id')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('clinic');
      expect(response.body.clinic.status).toBe('inactive');
      expect(response.body.clinic.email).toBe('updated@clinic.com');
      expect(mockClinicService.updateClinic).toHaveBeenCalledWith(
        'test-clinic-id',
        updateData,
        UserRole.SYSTEM_ADMIN,
        null,
        mockSystemAdminUser.uid
      );
    });

    it('should handle email duplication errors', async () => {
      mockClinicService.updateClinic.mockRejectedValue(new Error('A clinic with this email already exists'));

      const updateData = {
        email: 'duplicate@clinic.com',
      };

      const response = await request(app)
        .put('/clinics/test-clinic-id')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.error.code).toBe('CLINIC_EMAIL_EXISTS');
    });
  });

  describe('PUT /clinics/:id/status - Status toggle endpoint', () => {
    it('should toggle clinic status successfully', async () => {
      const mockUpdatedClinic = {
        clinic_id: 'test-clinic-id',
        name: 'Test Clinic',
        status: 'inactive' as const,
        updated_at: new Date(),
      };

      mockClinicService.toggleClinicStatus.mockResolvedValue(mockUpdatedClinic);

      const response = await request(app)
        .put('/clinics/test-clinic-id/status')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      expect(response.body.message).toContain('deactivated successfully');
      expect(response.body.clinic.status).toBe('inactive');
      expect(mockClinicService.toggleClinicStatus).toHaveBeenCalledWith(
        'test-clinic-id',
        'inactive',
        UserRole.SYSTEM_ADMIN,
        mockSystemAdminUser.uid
      );
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .put('/clinics/test-clinic-id/status')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should only allow system admin to toggle status', async () => {
      const response = await request(app)
        .put('/clinics/test-clinic-id/status')
        .set('Authorization', `Bearer ${mockClinicAdminToken}`)
        .send({ status: 'inactive' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /clinics/:id/audit-logs - Audit logs endpoint', () => {
    it('should return audit logs with pagination', async () => {
      const mockAuditLogs = [
        {
          log_id: 'log-1',
          action_type: 'clinic_created',
          resource_type: 'clinic',
          resource_id: 'test-clinic-id',
          user_id: 'admin-id',
          details: { clinic_name: 'Test Clinic' },
          timestamp: new Date(),
        },
        {
          log_id: 'log-2',
          action_type: 'clinic_status_changed',
          resource_type: 'clinic',
          resource_id: 'test-clinic-id',
          user_id: 'admin-id',
          details: { old_status: 'active', new_status: 'inactive' },
          timestamp: new Date(),
        },
      ];

      mockClinicService.getClinicAuditLogs.mockResolvedValue(mockAuditLogs);

      const response = await request(app)
        .get('/clinics/test-clinic-id/audit-logs?limit=10&offset=0')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('audit_logs');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.audit_logs).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
      expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith('test-clinic-id', 10, 0);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/clinics/test-clinic-id/audit-logs?limit=200')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should only allow system admin to access audit logs', async () => {
      const response = await request(app)
        .get('/clinics/test-clinic-id/audit-logs')
        .set('Authorization', `Bearer ${mockClinicAdminToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should use default pagination values', async () => {
      mockClinicService.getClinicAuditLogs.mockResolvedValue([]);

      await request(app)
        .get('/clinics/test-clinic-id/audit-logs')
        .set('Authorization', `Bearer ${mockSystemAdminToken}`)
        .expect(200);

      expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith('test-clinic-id', 50, 0);
    });
  });
});