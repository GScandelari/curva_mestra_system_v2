export interface UserProfile {
  user_id: string;
  email: string;
  role: 'system_admin' | 'clinic_admin' | 'clinic_user';
  clinic_id: string | null;
  permissions: Permission[];
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  created_at: string;
  last_login: string;
}

export type Permission = 
  | 'create_patient' | 'read_patient' | 'update_patient' | 'delete_patient'
  | 'create_invoice' | 'read_invoice' | 'update_invoice' | 'delete_invoice'
  | 'create_request' | 'read_request' | 'update_request' | 'delete_request'
  | 'read_inventory' | 'read_dashboard' | 'manage_users';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}