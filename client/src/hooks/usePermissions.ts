import { useAuth } from '../contexts/AuthContext';
import { Permission } from '../types/auth';

export const usePermissions = () => {
  const { profile, hasPermission, isRole } = useAuth();

  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(permission);
  };

  const checkRole = (role: string): boolean => {
    return isRole(role);
  };

  const checkMultiplePermissions = (permissions: Permission[], requireAll = false): boolean => {
    if (requireAll) {
      return permissions.every(permission => hasPermission(permission));
    }
    return permissions.some(permission => hasPermission(permission));
  };

  const isSystemAdmin = (): boolean => {
    return isRole('system_admin');
  };

  const isClinicAdmin = (): boolean => {
    return isRole('clinic_admin');
  };

  const isClinicUser = (): boolean => {
    return isRole('clinic_user');
  };

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users');
  };

  const canAccessDashboard = (): boolean => {
    return hasPermission('read_dashboard');
  };

  const canViewInventory = (): boolean => {
    return hasPermission('read_inventory');
  };

  const canManagePatients = (): boolean => {
    return checkMultiplePermissions(['create_patient', 'read_patient', 'update_patient']);
  };

  const canManageInvoices = (): boolean => {
    return checkMultiplePermissions(['create_invoice', 'read_invoice', 'update_invoice']);
  };

  const canManageRequests = (): boolean => {
    return checkMultiplePermissions(['create_request', 'read_request', 'update_request']);
  };

  return {
    profile,
    checkPermission,
    checkRole,
    checkMultiplePermissions,
    isSystemAdmin,
    isClinicAdmin,
    isClinicUser,
    canManageUsers,
    canAccessDashboard,
    canViewInventory,
    canManagePatients,
    canManageInvoices,
    canManageRequests,
  };
};