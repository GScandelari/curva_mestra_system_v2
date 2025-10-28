import { Permission } from '../types/auth';

export const PERMISSIONS = {
  // Patient permissions
  CREATE_PATIENT: 'create_patient' as Permission,
  READ_PATIENT: 'read_patient' as Permission,
  UPDATE_PATIENT: 'update_patient' as Permission,
  DELETE_PATIENT: 'delete_patient' as Permission,

  // Invoice permissions
  CREATE_INVOICE: 'create_invoice' as Permission,
  READ_INVOICE: 'read_invoice' as Permission,
  UPDATE_INVOICE: 'update_invoice' as Permission,
  DELETE_INVOICE: 'delete_invoice' as Permission,

  // Request permissions
  CREATE_REQUEST: 'create_request' as Permission,
  READ_REQUEST: 'read_request' as Permission,
  UPDATE_REQUEST: 'update_request' as Permission,
  DELETE_REQUEST: 'delete_request' as Permission,

  // System permissions
  READ_INVENTORY: 'read_inventory' as Permission,
  READ_DASHBOARD: 'read_dashboard' as Permission,
  MANAGE_USERS: 'manage_users' as Permission,
};

export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  CLINIC_ADMIN: 'clinic_admin',
  CLINIC_USER: 'clinic_user',
} as const;

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case ROLES.SYSTEM_ADMIN:
      return 'Administrador do Sistema';
    case ROLES.CLINIC_ADMIN:
      return 'Administrador da Clínica';
    case ROLES.CLINIC_USER:
      return 'Usuário da Clínica';
    default:
      return role;
  }
};

export const getPermissionDisplayName = (permission: Permission): string => {
  switch (permission) {
    case PERMISSIONS.CREATE_PATIENT:
      return 'Criar Pacientes';
    case PERMISSIONS.READ_PATIENT:
      return 'Visualizar Pacientes';
    case PERMISSIONS.UPDATE_PATIENT:
      return 'Editar Pacientes';
    case PERMISSIONS.DELETE_PATIENT:
      return 'Excluir Pacientes';
    case PERMISSIONS.CREATE_INVOICE:
      return 'Criar Notas Fiscais';
    case PERMISSIONS.READ_INVOICE:
      return 'Visualizar Notas Fiscais';
    case PERMISSIONS.UPDATE_INVOICE:
      return 'Editar Notas Fiscais';
    case PERMISSIONS.DELETE_INVOICE:
      return 'Excluir Notas Fiscais';
    case PERMISSIONS.CREATE_REQUEST:
      return 'Criar Solicitações';
    case PERMISSIONS.READ_REQUEST:
      return 'Visualizar Solicitações';
    case PERMISSIONS.UPDATE_REQUEST:
      return 'Editar Solicitações';
    case PERMISSIONS.DELETE_REQUEST:
      return 'Excluir Solicitações';
    case PERMISSIONS.READ_INVENTORY:
      return 'Visualizar Estoque';
    case PERMISSIONS.READ_DASHBOARD:
      return 'Visualizar Dashboard';
    case PERMISSIONS.MANAGE_USERS:
      return 'Gerenciar Usuários';
    default:
      return permission;
  }
};