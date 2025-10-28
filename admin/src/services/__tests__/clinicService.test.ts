// Mock the apiService module
jest.mock('../apiService', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock Firebase config
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null
  }
}));

import clinicService, { 
  Clinic, 
  CreateClinicRequest, 
  UpdateClinicRequest, 
  ClinicFilters,
  ClinicAuditLog,
  ClinicStats 
} from '../clinicService';
import apiService from '../apiService';

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ClinicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClinic: Clinic = {
    clinic_id: 'clinic-1',
    name: 'Test Clinic',
    cnpj: '12.345.678/0001-90',
    email: 'test@clinic.com',
    phone: '(11) 99999-9999',
    address: 'Test Address, 123',
    city: 'São Paulo',
    admin_user_id: 'admin-1',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    settings: {
      timezone: 'America/Sao_Paulo',
      notification_preferences: {
        low_stock_alerts: true,
        expiration_alerts: true,
        email_notifications: true,
        alert_threshold_days: 7
      }
    }
  };

  describe('getClinics', () => {
    it('should fetch clinics without parameters', async () => {
      const mockResponse = { data: { clinics: [mockClinic] } };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await clinicService.getClinics();

      expect(mockApiService.get).toHaveBeenCalledWith('/clinics');
      expect(result).toEqual([mockClinic]);
    });

    it('should fetch clinics with search parameter', async () => {
      const mockResponse = { data: { clinics: [mockClinic] } };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await clinicService.getClinics('Test Clinic');

      expect(mockApiService.get).toHaveBeenCalledWith('/clinics?search=Test+Clinic');
      expect(result).toEqual([mockClinic]);
    });

    it('should fetch clinics with filters', async () => {
      const mockResponse = { data: { clinics: [mockClinic] } };
      mockApiService.get.mockResolvedValue(mockResponse);

      const filters: ClinicFilters = {
        status: 'active',
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const result = await clinicService.getClinics(undefined, filters);

      expect(mockApiService.get).toHaveBeenCalledWith('/clinics?status=active&sortBy=name&sortOrder=asc');
      expect(result).toEqual([mockClinic]);
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Failed to fetch clinics'
            }
          }
        }
      };
      mockApiService.get.mockRejectedValue(errorResponse);

      await expect(clinicService.getClinics()).rejects.toThrow('Failed to fetch clinics');
    });
  });

  describe('toggleClinicStatus', () => {
    it('should toggle clinic status to inactive', async () => {
      const updatedClinic = { ...mockClinic, status: 'inactive' as const };
      const mockResponse = { data: { clinic: updatedClinic } };
      mockApiService.put.mockResolvedValue(mockResponse);

      const result = await clinicService.toggleClinicStatus('clinic-1', 'inactive');

      expect(mockApiService.put).toHaveBeenCalledWith('/clinics/clinic-1/status', { status: 'inactive' });
      expect(result).toEqual(updatedClinic);
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Failed to toggle status'
            }
          }
        }
      };
      mockApiService.put.mockRejectedValue(errorResponse);

      await expect(clinicService.toggleClinicStatus('clinic-1', 'inactive')).rejects.toThrow('Failed to toggle status');
    });
  });

  describe('getClinicAuditLogs', () => {
    const mockAuditLog: ClinicAuditLog = {
      log_id: 'log-1',
      user_id: 'user-1',
      clinic_id: 'clinic-1',
      action_type: 'clinic_updated',
      resource_type: 'clinic',
      resource_id: 'clinic-1',
      details: {
        clinic_id: 'clinic-1',
        clinic_name: 'Test Clinic',
        changes: { name: 'Updated Name' }
      },
      timestamp: new Date()
    };

    it('should fetch audit logs without parameters', async () => {
      const mockResponse = { data: { auditLogs: [mockAuditLog] } };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await clinicService.getClinicAuditLogs('clinic-1');

      expect(mockApiService.get).toHaveBeenCalledWith('/clinics/clinic-1/audit-logs');
      expect(result).toEqual([mockAuditLog]);
    });

    it('should fetch audit logs with pagination', async () => {
      const mockResponse = { data: { auditLogs: [mockAuditLog] } };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await clinicService.getClinicAuditLogs('clinic-1', 10, 20);

      expect(mockApiService.get).toHaveBeenCalledWith('/clinics/clinic-1/audit-logs?limit=10&offset=20');
      expect(result).toEqual([mockAuditLog]);
    });
  });

  describe('createClinic', () => {
    it('should create a new clinic', async () => {
      const createRequest: CreateClinicRequest = {
        name: 'New Clinic',
        cnpj: '98.765.432/0001-10',
        email: 'new@clinic.com',
        phone: '(11) 88888-8888',
        address: 'New Address, 456',
        city: 'Rio de Janeiro',
        admin_email: 'admin@clinic.com',
        admin_profile: {
          first_name: 'Admin',
          last_name: 'User'
        },
        admin_password: 'password123'
      };

      const mockResponse = { data: { clinic: mockClinic } };
      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await clinicService.createClinic(createRequest);

      expect(mockApiService.post).toHaveBeenCalledWith('/clinics', createRequest);
      expect(result).toEqual(mockClinic);
    });
  });

  describe('updateClinic', () => {
    it('should update clinic information', async () => {
      const updateRequest: UpdateClinicRequest = {
        name: 'Updated Clinic Name',
        email: 'updated@clinic.com',
        status: 'inactive'
      };

      const updatedClinic = { ...mockClinic, ...updateRequest };
      const mockResponse = { data: { clinic: updatedClinic } };
      mockApiService.put.mockResolvedValue(mockResponse);

      const result = await clinicService.updateClinic('clinic-1', updateRequest);

      expect(mockApiService.put).toHaveBeenCalledWith('/clinics/clinic-1', updateRequest);
      expect(result).toEqual(updatedClinic);
    });
  });
});