import apiService from './apiService';

export interface Clinic {
  clinic_id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  admin_user_id: string;
  status: 'active' | 'inactive';
  created_at: any;
  updated_at: any;
  settings: {
    timezone: string;
    notification_preferences: {
      low_stock_alerts: boolean;
      expiration_alerts: boolean;
      email_notifications: boolean;
      alert_threshold_days: number;
    };
  };
}

export interface CreateClinicRequest {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  admin_email: string;
  admin_profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  admin_password: string;
  settings?: {
    timezone?: string;
    notification_preferences?: {
      low_stock_alerts?: boolean;
      expiration_alerts?: boolean;
      email_notifications?: boolean;
      alert_threshold_days?: number;
    };
  };
}

export interface UpdateClinicRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  status?: 'active' | 'inactive';
  settings?: {
    timezone?: string;
    notification_preferences?: {
      low_stock_alerts?: boolean;
      expiration_alerts?: boolean;
      email_notifications?: boolean;
      alert_threshold_days?: number;
    };
  };
}

export interface ClinicStats {
  total_users: number;
  total_patients: number;
  total_products: number;
  recent_activity_count: number;
}

export interface User {
  user_id: string;
  email: string;
  role: 'clinic_admin' | 'clinic_user';
  clinic_id: string;
  permissions: string[];
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  created_at: any;
  last_login?: any;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: 'clinic_admin' | 'clinic_user';
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  permissions?: string[];
}

export interface UpdateUserRequest {
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  permissions?: string[];
}

export interface ClinicFilters {
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'created_at' | 'city';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLog {
  log_id: string;
  user_id: string;
  clinic_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string;
  details: any;
  timestamp: any;
  ip_address?: string;
  user_agent?: string;
  severity?: 'info' | 'warning' | 'error';
  status?: 'success' | 'error';
}

export interface ClinicAuditLog extends AuditLog {
  action_type: 'clinic_created' | 'clinic_updated' | 'clinic_status_changed';
  resource_type: 'clinic';
  details: {
    clinic_id: string;
    clinic_name: string;
    changes?: any;
    old_status?: string;
    new_status?: string;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    request_id: string;
    field_errors?: Record<string, string>;
  };
}

export interface ApiError extends Error {
  response?: {
    data?: ErrorResponse;
    status?: number;
  };
  code?: string;
  field_errors?: Record<string, string>;
}

class ClinicService {
  /**
   * Get all clinics with search and filter support (system admin only)
   */
  async getClinics(search?: string, filters?: ClinicFilters): Promise<Clinic[]> {
    try {
      const params = new URLSearchParams();
      
      if (search) {
        params.append('search', search);
      }
      
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      if (filters?.sortBy) {
        params.append('sortBy', filters.sortBy);
      }
      
      if (filters?.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/clinics?${queryString}` : '/clinics';
      
      const response = await apiService.get(url);
      return response.data.clinics;
    } catch (error: any) {
      console.error('Error fetching clinics:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinics');
    }
  }

  /**
   * Get clinic by ID
   */
  async getClinic(clinicId: string): Promise<Clinic> {
    try {
      const response = await apiService.get(`/clinics/${clinicId}`);
      return response.data.clinic;
    } catch (error: any) {
      console.error('Error fetching clinic:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic');
    }
  }

  /**
   * Create a new clinic
   */
  async createClinic(clinicData: CreateClinicRequest): Promise<Clinic> {
    try {
      const response = await apiService.post('/clinics', clinicData);
      return response.data.clinic;
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create clinic');
    }
  }

  /**
   * Update clinic information
   */
  async updateClinic(clinicId: string, updates: UpdateClinicRequest): Promise<Clinic> {
    try {
      const response = await apiService.put(`/clinics/${clinicId}`, updates);
      return response.data.clinic;
    } catch (error: any) {
      console.error('Error updating clinic:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to update clinic');
    }
  }

  /**
   * Toggle clinic status (activate/deactivate)
   */
  async toggleClinicStatus(clinicId: string, newStatus: 'active' | 'inactive'): Promise<Clinic> {
    try {
      const response = await apiService.put(`/clinics/${clinicId}/status`, { status: newStatus });
      return response.data.clinic;
    } catch (error: any) {
      console.error('Error toggling clinic status:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to toggle clinic status');
    }
  }

  /**
   * Get clinic audit logs
   */
  async getClinicAuditLogs(clinicId: string, limit?: number, offset?: number): Promise<ClinicAuditLog[]> {
    try {
      const params = new URLSearchParams();
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      if (offset) {
        params.append('offset', offset.toString());
      }
      
      const queryString = params.toString();
      const url = queryString ? `/clinics/${clinicId}/audit-logs?${queryString}` : `/clinics/${clinicId}/audit-logs`;
      
      const response = await apiService.get(url);
      return response.data.auditLogs;
    } catch (error: any) {
      console.error('Error fetching clinic audit logs:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic audit logs');
    }
  }

  /**
   * Delete clinic
   */
  async deleteClinic(clinicId: string): Promise<void> {
    try {
      await apiService.delete(`/clinics/${clinicId}`);
    } catch (error: any) {
      console.error('Error deleting clinic:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to delete clinic');
    }
  }

  /**
   * Get clinic statistics
   */
  async getClinicStats(clinicId: string): Promise<ClinicStats> {
    try {
      const response = await apiService.get(`/clinics/${clinicId}/stats`);
      return response.data.stats;
    } catch (error: any) {
      console.error('Error fetching clinic stats:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic statistics');
    }
  }

  /**
   * Get users in a clinic
   */
  async getClinicUsers(clinicId: string): Promise<User[]> {
    try {
      const response = await apiService.get(`/clinics/${clinicId}/users`);
      return response.data.users;
    } catch (error: any) {
      console.error('Error fetching clinic users:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic users');
    }
  }

  /**
   * Create user in clinic
   */
  async createUser(clinicId: string, userData: CreateUserRequest): Promise<User> {
    try {
      const response = await apiService.post(`/clinics/${clinicId}/users`, userData);
      return response.data.user;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create user');
    }
  }

  /**
   * Update user in clinic
   */
  async updateUser(clinicId: string, userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      const response = await apiService.put(`/clinics/${clinicId}/users/${userId}`, updates);
      return response.data.user;
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to update user');
    }
  }

  /**
   * Delete user from clinic
   */
  async deleteUser(clinicId: string, userId: string): Promise<void> {
    try {
      await apiService.delete(`/clinics/${clinicId}/users/${userId}`);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to delete user');
    }
  }
}

const clinicService = new ClinicService();
export default clinicService;