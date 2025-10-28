import { ClinicService } from '../services/clinicService';
import FirestoreService from '../services/firestoreService';
import ValidationService from '../services/validationService';
import AuditService from '../services/auditService';
import { UserRole } from '../config/auth';
import { Clinic } from '../models/types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('../services/firestoreService');
jest.mock('../services/validationService');
jest.mock('../services/auditService');

describe('ClinicService', () => {
  let clinicService: ClinicService;
  const mockUserId = 'test-user-id';
  const mockClinicId = 'test-clinic-id';

  beforeEach(() => {
    jest.clearAllMocks();
    clinicService = new ClinicService();
  });

  describe('toggleClinicStatus', () => {
    const mockClinic: Clinic = {
      clinic_id: mockClinicId,
      name: 'Test Clinic',
      cnpj: '12.345.678/0001-90',
      email: 'test@clinic.com',
      phone: '(11) 99999-9999',
      address: 'Test Address',
      city: 'São Paulo',
      admin_user_id: 'admin-user-id',
      status: 'active',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      settings: {
        timezone: 'America/Sao_Paulo',
        notification_preferences: {
          low_stock_alerts: true,
          expiration_alerts: true,
          email_notifications: true,
          alert_threshold_days: 30
        }
      }
    };

    it('should toggle clinic status from active to inactive', async () => {
      const updatedClinic = { ...mockClinic, status: 'inactive' as const };
      
      (FirestoreService.getClinicById as jest.Mock)
        .mockResolvedValueOnce(mockClinic)
        .mockResolvedValueOnce(updatedClinic);
      (FirestoreService.updateClinic as jest.Mock).mockResolvedValue(undefined);
      (AuditService.logClinicStatusChange as jest.Mock).mockResolvedValue(undefined);

      const result = await clinicService.toggleClinicStatus(
        mockClinicId,
        'inactive',
        UserRole.SYSTEM_ADMIN,
        mockUserId
      );

      expect(result.status).toBe('inactive');
      expect(FirestoreService.updateClinic).toHaveBeenCalledWith(
        mockClinicId,
        expect.objectContaining({
          status: 'inactive',
          updated_at: expect.any(Timestamp)
        })
      );
      expect(AuditService.logClinicStatusChange).toHaveBeenCalledWith(
        mockClinicId,
        mockClinic.name,
        'active',
        'inactive',
        mockUserId
      );
    });

    it('should toggle clinic status from inactive to active', async () => {
      const inactiveClinic = { ...mockClinic, status: 'inactive' as const };
      const updatedClinic = { ...mockClinic, status: 'active' as const };
      
      (FirestoreService.getClinicById as jest.Mock)
        .mockResolvedValueOnce(inactiveClinic)
        .mockResolvedValueOnce(updatedClinic);
      (FirestoreService.updateClinic as jest.Mock).mockResolvedValue(undefined);
      (AuditService.logClinicStatusChange as jest.Mock).mockResolvedValue(undefined);

      const result = await clinicService.toggleClinicStatus(
        mockClinicId,
        'active',
        UserRole.SYSTEM_ADMIN,
        mockUserId
      );

      expect(result.status).toBe('active');
      expect(FirestoreService.updateClinic).toHaveBeenCalledWith(
        mockClinicId,
        expect.objectContaining({
          status: 'active',
          updated_at: expect.any(Timestamp)
        })
      );
      expect(AuditService.logClinicStatusChange).toHaveBeenCalledWith(
        mockClinicId,
        inactiveClinic.name,
        'inactive',
        'active',
        mockUserId
      );
    });

    it('should throw error for insufficient permissions', async () => {
      await expect(
        clinicService.toggleClinicStatus(
          mockClinicId,
          'inactive',
          UserRole.CLINIC_ADMIN,
          mockUserId
        )
      ).rejects.toThrow('Insufficient permissions to toggle clinic status');
    });

    it('should throw error for invalid status value', async () => {
      await expect(
        clinicService.toggleClinicStatus(
          mockClinicId,
          'invalid' as any,
          UserRole.SYSTEM_ADMIN,
          mockUserId
        )
      ).rejects.toThrow('Invalid status value. Must be "active" or "inactive"');
    });

    it('should throw error when clinic not found', async () => {
      (FirestoreService.getClinicById as jest.Mock).mockResolvedValue(null);

      await expect(
        clinicService.toggleClinicStatus(
          mockClinicId,
          'inactive',
          UserRole.SYSTEM_ADMIN,
          mockUserId
        )
      ).rejects.toThrow('Clinic not found');
    });

    it('should throw error when status is already the same', async () => {
      (FirestoreService.getClinicById as jest.Mock).mockResolvedValue(mockClinic);

      await expect(
        clinicService.toggleClinicStatus(
          mockClinicId,
          'active',
          UserRole.SYSTEM_ADMIN,
          mockUserId
        )
      ).rejects.toThrow('Clinic is already active');
    });
  });

  describe('searchClinics', () => {
    const mockClinics: Clinic[] = [
      {
        clinic_id: 'clinic-1',
        name: 'Clinic Alpha',
        cnpj: '12.345.678/0001-90',
        email: 'alpha@clinic.com',
        phone: '(11) 99999-9999',
        address: 'Address 1',
        city: 'São Paulo',
        admin_user_id: 'admin-1',
        status: 'active',
        created_at: Timestamp.fromDate(new Date('2023-01-01')),
        updated_at: Timestamp.fromDate(new Date('2023-01-01')),
        settings: {
          timezone: 'America/Sao_Paulo',
          notification_preferences: {
            low_stock_alerts: true,
            expiration_alerts: true,
            email_notifications: true,
            alert_threshold_days: 30
          }
        }
      },
      {
        clinic_id: 'clinic-2',
        name: 'Clinic Beta',
        cnpj: '98.765.432/0001-10',
        email: 'beta@clinic.com',
        phone: '(11) 88888-8888',
        address: 'Address 2',
        city: 'Rio de Janeiro',
        admin_user_id: 'admin-2',
        status: 'inactive',
        created_at: Timestamp.fromDate(new Date('2023-02-01')),
        updated_at: Timestamp.fromDate(new Date('2023-02-01')),
        settings: {
          timezone: 'America/Sao_Paulo',
          notification_preferences: {
            low_stock_alerts: true,
            expiration_alerts: true,
            email_notifications: true,
            alert_threshold_days: 30
          }
        }
      }
    ];

    it('should search clinics by name', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        'Alpha',
        {},
        UserRole.SYSTEM_ADMIN
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Clinic Alpha');
    });

    it('should search clinics by CNPJ', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        '12.345.678',
        {},
        UserRole.SYSTEM_ADMIN
      );

      expect(result).toHaveLength(1);
      expect(result[0].cnpj).toBe('12.345.678/0001-90');
    });

    it('should search clinics by email', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        'beta@clinic.com',
        {},
        UserRole.SYSTEM_ADMIN
      );

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('beta@clinic.com');
    });

    it('should filter clinics by status', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        '',
        { status: 'active' },
        UserRole.SYSTEM_ADMIN
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });

    it('should sort clinics by name ascending', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        '',
        { sortBy: 'name', sortOrder: 'asc' },
        UserRole.SYSTEM_ADMIN
      );

      expect(result[0].name).toBe('Clinic Alpha');
      expect(result[1].name).toBe('Clinic Beta');
    });

    it('should sort clinics by city descending', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        '',
        { sortBy: 'city', sortOrder: 'desc' },
        UserRole.SYSTEM_ADMIN
      );

      expect(result[0].city).toBe('São Paulo');
      expect(result[1].city).toBe('Rio de Janeiro');
    });

    it('should sort clinics by created_at descending by default', async () => {
      (FirestoreService.listClinics as jest.Mock).mockResolvedValue(mockClinics);

      const result = await clinicService.searchClinics(
        '',
        {},
        UserRole.SYSTEM_ADMIN
      );

      expect(result[0].created_at.toMillis()).toBeGreaterThan(result[1].created_at.toMillis());
    });

    it('should throw error for insufficient permissions', async () => {
      await expect(
        clinicService.searchClinics(
          'test',
          {},
          UserRole.CLINIC_ADMIN
        )
      ).rejects.toThrow('Insufficient permissions to search clinics');
    });
  });

  describe('createClinic with enhanced validation', () => {
    const validCreateRequest = {
      name: 'Test Clinic',
      cnpj: '12.345.678/0001-90',
      email: 'test@clinic.com',
      phone: '(11) 99999-9999',
      address: 'Test Address',
      city: 'São Paulo',
      admin_email: 'admin@clinic.com',
      admin_profile: {
        first_name: 'Admin',
        last_name: 'User',
        phone: '(11) 88888-8888'
      },
      admin_password: 'password123'
    };

    beforeEach(() => {
      (ValidationService.isValidCNPJ as jest.Mock).mockReturnValue(true);
      (ValidationService.isValidEmail as jest.Mock).mockReturnValue(true);
      (ValidationService.isValidPhone as jest.Mock).mockReturnValue(true);
      (FirestoreService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (FirestoreService.runTransaction as jest.Mock).mockImplementation(async (fn) => {
        const mockTransaction = {
          set: jest.fn(),
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        };
        await fn(mockTransaction);
      });
      
      // Mock the clinicsCollection property
      Object.defineProperty(FirestoreService, 'clinicsCollection', {
        value: {
          doc: jest.fn(() => ({
            set: jest.fn()
          }))
        },
        configurable: true
      });
      
      // Mock the usersCollection property
      Object.defineProperty(FirestoreService, 'usersCollection', {
        value: {
          doc: jest.fn(() => ({
            set: jest.fn()
          }))
        },
        configurable: true
      });
    });

    it('should create clinic with valid data', async () => {
      // Mock the private methods
      jest.spyOn(clinicService as any, 'findClinicByCNPJ').mockResolvedValue(null);
      jest.spyOn(clinicService as any, 'findClinicByEmail').mockResolvedValue(null);
      
      const mockUserService = {
        createFirebaseAuthUser: jest.fn().mockResolvedValue(undefined)
      };
      (clinicService as any).userService = mockUserService;

      const result = await clinicService.createClinic(
        validCreateRequest,
        mockUserId,
        UserRole.SYSTEM_ADMIN
      );

      expect(result.name).toBe(validCreateRequest.name);
      expect(result.cnpj).toBe(validCreateRequest.cnpj);
      expect(result.email).toBe(validCreateRequest.email);
      expect(result.status).toBe('active');
    });

    it('should throw error for invalid CNPJ', async () => {
      (ValidationService.isValidCNPJ as jest.Mock).mockReturnValue(false);

      await expect(
        clinicService.createClinic(
          validCreateRequest,
          mockUserId,
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('Invalid CNPJ format');
    });

    it('should throw error for duplicate CNPJ', async () => {
      const existingClinic = { clinic_id: 'existing-id', cnpj: validCreateRequest.cnpj };
      jest.spyOn(clinicService as any, 'findClinicByCNPJ').mockResolvedValue(existingClinic);

      await expect(
        clinicService.createClinic(
          validCreateRequest,
          mockUserId,
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('A clinic with this CNPJ already exists');
    });

    it('should throw error for duplicate clinic email', async () => {
      jest.spyOn(clinicService as any, 'findClinicByCNPJ').mockResolvedValue(null);
      const existingClinic = { clinic_id: 'existing-id', email: validCreateRequest.email };
      jest.spyOn(clinicService as any, 'findClinicByEmail').mockResolvedValue(existingClinic);

      await expect(
        clinicService.createClinic(
          validCreateRequest,
          mockUserId,
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('A clinic with this email already exists');
    });

    it('should throw error for duplicate admin email', async () => {
      jest.spyOn(clinicService as any, 'findClinicByCNPJ').mockResolvedValue(null);
      jest.spyOn(clinicService as any, 'findClinicByEmail').mockResolvedValue(null);
      
      const existingUser = { user_id: 'existing-user', email: validCreateRequest.admin_email };
      (FirestoreService.getUserByEmail as jest.Mock).mockResolvedValue(existingUser);

      await expect(
        clinicService.createClinic(
          validCreateRequest,
          mockUserId,
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('A user with this admin email already exists');
    });
  });

  describe('updateClinic with enhanced validation', () => {
    const mockClinic: Clinic = {
      clinic_id: mockClinicId,
      name: 'Test Clinic',
      cnpj: '12.345.678/0001-90',
      email: 'test@clinic.com',
      phone: '(11) 99999-9999',
      address: 'Test Address',
      city: 'São Paulo',
      admin_user_id: 'admin-user-id',
      status: 'active',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      settings: {
        timezone: 'America/Sao_Paulo',
        notification_preferences: {
          low_stock_alerts: true,
          expiration_alerts: true,
          email_notifications: true,
          alert_threshold_days: 30
        }
      }
    };

    beforeEach(() => {
      (FirestoreService.getClinicById as jest.Mock).mockResolvedValue(mockClinic);
      (ValidationService.isValidEmail as jest.Mock).mockReturnValue(true);
      (ValidationService.isValidPhone as jest.Mock).mockReturnValue(true);
      (FirestoreService.updateClinic as jest.Mock).mockResolvedValue(undefined);
    });

    it('should update clinic with valid data', async () => {
      const updates = {
        name: 'Updated Clinic Name',
        email: 'updated@clinic.com',
        phone: '(11) 77777-7777'
      };

      jest.spyOn(clinicService as any, 'findClinicByEmail').mockResolvedValue(null);
      
      const updatedClinic = { ...mockClinic, ...updates };
      (FirestoreService.getClinicById as jest.Mock)
        .mockResolvedValueOnce(mockClinic)
        .mockResolvedValueOnce(updatedClinic);

      const result = await clinicService.updateClinic(
        mockClinicId,
        updates,
        UserRole.SYSTEM_ADMIN
      );

      expect(result.name).toBe(updates.name);
      expect(result.email).toBe(updates.email);
      expect(result.phone).toBe(updates.phone);
    });

    it('should throw error for invalid email format', async () => {
      (ValidationService.isValidEmail as jest.Mock).mockReturnValue(false);

      await expect(
        clinicService.updateClinic(
          mockClinicId,
          { email: 'invalid-email' },
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error for duplicate email', async () => {
      const existingClinic = { clinic_id: 'other-clinic', email: 'new@clinic.com' };
      jest.spyOn(clinicService as any, 'findClinicByEmail').mockResolvedValue(existingClinic);

      await expect(
        clinicService.updateClinic(
          mockClinicId,
          { email: 'new@clinic.com' },
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('A clinic with this email already exists');
    });

    it('should throw error for invalid phone format', async () => {
      (ValidationService.isValidPhone as jest.Mock).mockReturnValue(false);

      await expect(
        clinicService.updateClinic(
          mockClinicId,
          { phone: 'invalid-phone' },
          UserRole.SYSTEM_ADMIN
        )
      ).rejects.toThrow('Invalid phone format');
    });
  });

  describe('getClinicAuditLogs', () => {
    it('should return audit logs for clinic', async () => {
      const mockAuditLogs = [
        {
          log_id: 'log-1',
          user_id: 'user-1',
          clinic_id: mockClinicId,
          action_type: 'clinic_updated',
          resource_type: 'clinic',
          resource_id: mockClinicId,
          details: { changes: { name: 'New Name' } },
          timestamp: Timestamp.now()
        }
      ];

      (AuditService.getClinicAuditLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const result = await clinicService.getClinicAuditLogs(mockClinicId, 10, 0);

      expect(result).toEqual(mockAuditLogs);
      expect(AuditService.getClinicAuditLogs).toHaveBeenCalledWith(mockClinicId, 10, 0);
    });

    it('should use default pagination values', async () => {
      (AuditService.getClinicAuditLogs as jest.Mock).mockResolvedValue([]);

      await clinicService.getClinicAuditLogs(mockClinicId);

      expect(AuditService.getClinicAuditLogs).toHaveBeenCalledWith(mockClinicId, 50, 0);
    });
  });
});