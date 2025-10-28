import { Timestamp } from 'firebase-admin/firestore';

// User roles and permissions
export type UserRole = 'system_admin' | 'clinic_admin' | 'clinic_user';

export type Permission = 
  | 'create_patient' | 'read_patient' | 'update_patient' | 'delete_patient'
  | 'create_invoice' | 'read_invoice' | 'update_invoice' | 'delete_invoice'
  | 'create_request' | 'read_request' | 'update_request' | 'delete_request'
  | 'read_inventory' | 'read_dashboard' | 'manage_users';

// Core interfaces
export interface User {
  user_id: string;
  email: string;
  role: UserRole;
  clinic_id: string | null;
  permissions: Permission[];
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  created_at: Timestamp;
  last_login?: Timestamp;
}

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
  created_at: Timestamp;
  updated_at: Timestamp;
  settings: {
    timezone: string;
    notification_preferences: NotificationSettings;
  };
}

export interface NotificationSettings {
  low_stock_alerts: boolean;
  expiration_alerts: boolean;
  email_notifications: boolean;
  alert_threshold_days: number;
}

export interface Product {
  product_id: string;
  name: string;
  description: string;
  rennova_code: string;
  category: string;
  unit_type: 'ml' | 'units' | 'vials';
  status: 'approved' | 'pending';
  requested_by_clinic_id?: string;
  approval_history: ApprovalEntry[];
  created_at: Timestamp;
}

export interface ApprovalEntry {
  approved_by: string;
  approved_at: Timestamp;
  notes?: string;
}

// Clinic subcollection interfaces
export interface Invoice {
  invoice_id: string;
  clinic_id: string;
  invoice_number: string;
  supplier: string;
  emission_date: Date;
  products: InvoiceProduct[];
  total_value: number;
  status: 'pending' | 'approved' | 'rejected';
  attachments: string[];
  created_by: string;
  created_at: Timestamp;
}

export interface InvoiceProduct {
  product_id: string;
  quantity: number;
  unit_price: number;
  expiration_date: Date;
  lot: string;
  batch_number?: string;
}

export interface Patient {
  patient_id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  birth_date: Date;
  phone: string;
  email: string;
  address?: Address;
  medical_history: MedicalEntry[];
  treatment_history: string[]; // request_ids
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface MedicalEntry {
  date: Date;
  notes: string;
  created_by: string;
}

export interface Request {
  request_id: string;
  clinic_id: string;
  patient_id: string;
  request_date: Date;
  treatment_type: string;
  products_used: ProductUsage[];
  status: 'pending' | 'consumed' | 'cancelled';
  notes: string;
  performed_by: string;
  created_at: Timestamp;
}

export interface ProductUsage {
  product_id: string;
  quantity: number;
  lot: string;
  expiration_date: Date;
}

export interface InventoryItem {
  inventory_id: string;
  clinic_id: string;
  product_id: string;
  quantity_in_stock: number;
  minimum_stock_level: number;
  expiration_dates: ExpirationEntry[];
  last_update: Timestamp;
  last_movement: {
    type: 'in' | 'out';
    quantity: number;
    reference_id: string; // invoice_id or request_id
    timestamp: Timestamp;
  };
}

export interface ExpirationEntry {
  date: Date;
  lot: string;
  quantity: number;
}

// Clinic-specific interfaces
export interface ClinicFilters {
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'created_at' | 'city';
  sortOrder?: 'asc' | 'desc';
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
    notification_preferences?: Partial<NotificationSettings>;
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
    notification_preferences?: Partial<NotificationSettings>;
  };
}

// Audit logging
export interface AuditLog {
  log_id: string;
  user_id: string;
  clinic_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string;
  details: any;
  timestamp: Timestamp;
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