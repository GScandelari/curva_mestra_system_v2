import AuditService from '../services/auditService';
import FirestoreService from '../services/firestoreService';
import { AuditLog, Clinic } from '../models/types';
import { Timestamp } from 'firebase-admin/firestore';
import { Request } from 'express';

// Mock dependencies
jest.mock('../services/firestoreService');

describe('AuditService', () => {
  const mockUserId = 'test-user-id';
  const mockClinicId = 'test-clinic-id';
  const mockClinicName = 'Test Clinic';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logClinicCreation', () => {
    const mockClinic: Clinic = {
      clinic_id: mockClinicId,
      name: mockClinicName,
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

    it('should log clinic creation successfully', async () => {
      (FirestoreService.createAuditLog as jest.Mock).mockResolvedValue(undefined);

      await AuditService.logClinicCreation(mockClinic, mockUserId);

      expect(FirestoreService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          log_id: expect.any(String),
          user_id: mockUserId,
          clinic_id: null, // System-level operation
          action_type: 'clinic_created',
          resource_type: 'clinic',
          resource_id: mockClinicId,
          timestamp: expect.any(Timestamp),
          details: expect.objectContaining({
            clinic_id: mockClinicId,
            clinic_name: mockClinicName,
            clinic_cnpj: mockClinic.cnpj,
            clinic_email: mockClinic.email,
            clinic_city: mockClinic.city,
            admin_user_id: mockClinic.admin_user_id
          }),
          severity: 'info',
          status: 'success'
        })
      );
    });

    it('should log clinic creation with request context', async () => {
      const mockReq = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      } as unknown as Request;

      (FirestoreService.createAuditLog as jest.Mock).mockResolvedValue(undefined);

      await AuditService.logClinicCreation(mockClinic, mockUserId, mockReq);

      expect(FirestoreService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (FirestoreService.createAuditLog as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuditService.logClinicCreation(mockClinic, mockUserId)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log clinic creation:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('logClinicUpdate', () => {
    const mockChanges = {
      name: { from: 'Old Name', to: 'New Name' },
      email: { from: 'old@clinic.com', to: 'new@clinic.com' }
    };

    it('should log clinic update successfully', async () => {
      (FirestoreService.createAuditLog as jest.Mock).mockResolvedValue(undefined);

      await AuditService.logClinicUpdate(mockClinicId, mockClinicName, mockChanges, mockUserId);

      expect(FirestoreService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          log_id: expect.any(String),
          user_id: mockUserId,
          clinic_id: null, // System-level operation
          action_type: 'clinic_updated',
          resource_type: 'clinic',
          resource_id: mockClinicId,
          timestamp: expect.any(Timestamp),
          details: expect.objectContaining({
            clinic_id: mockClinicId,
            clinic_name: mockClinicName,
            changes: mockChanges
          }),
          severity: 'info',
          status: 'success'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (FirestoreService.createAuditLog as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuditService.logClinicUpdate(mockClinicId, mockClinicName, mockChanges, mockUserId)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log clinic update:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('logClinicStatusChange', () => {
    it('should log clinic status change successfully', async () => {
      (FirestoreService.createAuditLog as jest.Mock).mockResolvedValue(undefined);

      await AuditService.logClinicStatusChange(
        mockClinicId,
        mockClinicName,
        'active',
        'inactive',
        mockUserId
      );

      expect(FirestoreService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          log_id: expect.any(String),
          user_id: mockUserId,
          clinic_id: null, // System-level operation
          action_type: 'clinic_status_changed',
          resource_type: 'clinic',
          resource_id: mockClinicId,
          timestamp: expect.any(Timestamp),
          details: expect.objectContaining({
            clinic_id: mockClinicId,
            clinic_name: mockClinicName,
            old_status: 'active',
            new_status: 'inactive'
          }),
          severity: 'info',
          status: 'success'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (FirestoreService.createAuditLog as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuditService.logClinicStatusChange(
        mockClinicId,
        mockClinicName,
        'active',
        'inactive',
        mockUserId
      )).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log clinic status change:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getClinicAuditLogs', () => {
    const mockAuditLogs: AuditLog[] = [
      {
        log_id: 'log-1',
        user_id: mockUserId,
        clinic_id: null,
        action_type: 'clinic_created',
        resource_type: 'clinic',
        resource_id: mockClinicId,
        timestamp: Timestamp.now(),
        details: {
          clinic_id: mockClinicId,
          clinic_name: mockClinicName
        },
        severity: 'info',
        status: 'success'
      },
      {
        log_id: 'log-2',
        user_id: mockUserId,
        clinic_id: null,
        action_type: 'clinic_status_changed',
        resource_type: 'clinic',
        resource_id: mockClinicId,
        timestamp: Timestamp.now(),
        details: {
          clinic_id: mockClinicId,
          clinic_name: mockClinicName,
          old_status: 'active',
          new_status: 'inactive'
        },
        severity: 'info',
        status: 'success'
      }
    ];

    it('should retrieve clinic audit logs with default pagination', async () => {
      (FirestoreService.listAuditLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const result = await AuditService.getClinicAuditLogs(mockClinicId);

      expect(FirestoreService.listAuditLogs).toHaveBeenCalledWith({
        resourceType: 'clinic',
        limit: 50,
        offset: 0
      });
      expect(result).toEqual(mockAuditLogs);
    });

    it('should retrieve clinic audit logs with custom pagination', async () => {
      (FirestoreService.listAuditLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const result = await AuditService.getClinicAuditLogs(mockClinicId, 25, 10);

      expect(FirestoreService.listAuditLogs).toHaveBeenCalledWith({
        resourceType: 'clinic',
        limit: 35, // limit + offset
        offset: 0
      });
      expect(result).toEqual([]); // Empty because slice(10, 35) on 2 items returns empty
    });

    it('should filter logs for specific clinic', async () => {
      const allLogs = [
        ...mockAuditLogs,
        {
          log_id: 'log-3',
          user_id: mockUserId,
          clinic_id: null,
          action_type: 'clinic_created',
          resource_type: 'clinic',
          resource_id: 'other-clinic-id',
          timestamp: Timestamp.now(),
          details: {
            clinic_id: 'other-clinic-id',
            clinic_name: 'Other Clinic'
          },
          severity: 'info',
          status: 'success'
        }
      ];

      (FirestoreService.listAuditLogs as jest.Mock).mockResolvedValue(allLogs);

      const result = await AuditService.getClinicAuditLogs(mockClinicId);

      expect(result).toHaveLength(2);
      expect(result.every(log => 
        log.resource_id === mockClinicId || 
        (log.details && log.details.clinic_id === mockClinicId)
      )).toBe(true);
    });

    it('should handle errors and throw ApiError', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (FirestoreService.listAuditLogs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuditService.getClinicAuditLogs(mockClinicId)).rejects.toThrow('Failed to retrieve audit logs');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get clinic audit logs:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});