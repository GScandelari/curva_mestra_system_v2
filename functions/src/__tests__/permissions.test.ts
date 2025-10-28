import { PermissionValidator } from '../middleware/permissions';
import { UserRole, Permission } from '../config/auth';

describe('PermissionValidator', () => {
  describe('hasPermission', () => {
    it('should return true when user has the required permission', () => {
      const userPermissions: Permission[] = ['read_inventory', 'create_patient', 'read_patient'];
      const requiredPermission: Permission = 'read_inventory';

      const result = PermissionValidator.hasPermission(userPermissions, requiredPermission);

      expect(result).toBe(true);
    });

    it('should return false when user lacks the required permission', () => {
      const userPermissions: Permission[] = ['read_inventory', 'create_patient'];
      const requiredPermission: Permission = 'delete_patient';

      const result = PermissionValidator.hasPermission(userPermissions, requiredPermission);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one required permission', () => {
      const userPermissions: Permission[] = ['read_inventory', 'create_patient'];
      const requiredPermissions: Permission[] = ['delete_patient', 'read_inventory', 'manage_users'];

      const result = PermissionValidator.hasAnyPermission(userPermissions, requiredPermissions);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the required permissions', () => {
      const userPermissions: Permission[] = ['read_inventory', 'create_patient'];
      const requiredPermissions: Permission[] = ['delete_patient', 'manage_users'];

      const result = PermissionValidator.hasAnyPermission(userPermissions, requiredPermissions);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const userPermissions: Permission[] = ['read_inventory', 'create_patient', 'read_patient', 'manage_users'];
      const requiredPermissions: Permission[] = ['read_inventory', 'create_patient'];

      const result = PermissionValidator.hasAllPermissions(userPermissions, requiredPermissions);

      expect(result).toBe(true);
    });

    it('should return false when user is missing some required permissions', () => {
      const userPermissions: Permission[] = ['read_inventory', 'create_patient'];
      const requiredPermissions: Permission[] = ['read_inventory', 'delete_patient', 'manage_users'];

      const result = PermissionValidator.hasAllPermissions(userPermissions, requiredPermissions);

      expect(result).toBe(false);
    });
  });

  describe('canPerformCRUD', () => {
    it('should return true when user can perform the CRUD operation', () => {
      const userPermissions: Permission[] = ['create_patient', 'read_patient', 'update_patient'];

      expect(PermissionValidator.canPerformCRUD(userPermissions, 'patient', 'create')).toBe(true);
      expect(PermissionValidator.canPerformCRUD(userPermissions, 'patient', 'read')).toBe(true);
      expect(PermissionValidator.canPerformCRUD(userPermissions, 'patient', 'update')).toBe(true);
    });

    it('should return false when user cannot perform the CRUD operation', () => {
      const userPermissions: Permission[] = ['read_patient', 'update_patient'];

      expect(PermissionValidator.canPerformCRUD(userPermissions, 'patient', 'create')).toBe(false);
      expect(PermissionValidator.canPerformCRUD(userPermissions, 'patient', 'delete')).toBe(false);
    });
  });

  describe('canAccessClinic', () => {
    it('should allow system_admin to access any clinic', () => {
      const result = PermissionValidator.canAccessClinic(UserRole.SYSTEM_ADMIN, undefined, 'any-clinic-id');
      expect(result).toBe(true);
    });

    it('should allow clinic users to access their own clinic', () => {
      const result = PermissionValidator.canAccessClinic(UserRole.CLINIC_ADMIN, 'test-clinic-id', 'test-clinic-id');
      expect(result).toBe(true);
    });

    it('should deny clinic users access to other clinics', () => {
      const result = PermissionValidator.canAccessClinic(UserRole.CLINIC_USER, 'clinic-1', 'clinic-2');
      expect(result).toBe(false);
    });
  });
});