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

export interface UpdateClinicRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
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

class ClinicService {
  /**
   * Get current clinic information
   */
  async getCurrentClinic(): Promise<Clinic> {
    try {
      const response = await apiService.get('/clinic/profile');
      return response.data.clinic;
    } catch (error: any) {
      console.error('Error fetching clinic profile:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic profile');
    }
  }

  /**
   * Update current clinic information
   */
  async updateCurrentClinic(updates: UpdateClinicRequest): Promise<Clinic> {
    try {
      const response = await apiService.put('/clinic/profile', updates);
      return response.data.clinic;
    } catch (error: any) {
      console.error('Error updating clinic:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to update clinic');
    }
  }

  /**
   * Get current clinic statistics
   */
  async getCurrentClinicStats(): Promise<ClinicStats> {
    try {
      const response = await apiService.get('/clinic/stats');
      return response.data.stats;
    } catch (error: any) {
      console.error('Error fetching clinic stats:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic statistics');
    }
  }

  /**
   * Get current clinic audit logs
   */
  async getCurrentClinicAuditLogs(limit?: number, offset?: number): Promise<ClinicAuditLog[]> {
    try {
      const params = new URLSearchParams();
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      if (offset) {
        params.append('offset', offset.toString());
      }
      
      const queryString = params.toString();
      const url = queryString ? `/clinic/audit-logs?${queryString}` : '/clinic/audit-logs';
      
      const response = await apiService.get(url);
      return response.data.auditLogs;
    } catch (error: any) {
      console.error('Error fetching clinic audit logs:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic audit logs');
    }
  }

  /**
   * Get users in current clinic
   */
  async getCurrentClinicUsers(): Promise<User[]> {
    try {
      const response = await apiService.get('/clinic/users');
      return response.data.users;
    } catch (error: any) {
      console.error('Error fetching clinic users:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch clinic users');
    }
  }

  /**
   * Create user in current clinic
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await apiService.post('/clinic/users', userData);
      return response.data.user;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create user');
    }
  }

  /**
   * Update user in current clinic
   */
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      const response = await apiService.put(`/clinic/users/${userId}`, updates);
      return response.data.user;
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to update user');
    }
  }

  /**
   * Delete user from current clinic
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await apiService.delete(`/clinic/users/${userId}`);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to delete user');
    }
  }
}

const clinicService = new ClinicService();
export default clinicService;