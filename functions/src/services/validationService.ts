import { 
  User, 
  Clinic, 
  Product, 
  Invoice, 
  Patient, 
  Request, 
  InventoryItem,
  UserRole,
  Permission
} from '../models/types';

export class ValidationService {
  
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate user role
   */
  static isValidRole(role: string): role is UserRole {
    return ['system_admin', 'clinic_admin', 'clinic_user'].includes(role);
  }

  /**
   * Validate permission
   */
  static isValidPermission(permission: string): permission is Permission {
    const validPermissions = [
      'create_patient', 'read_patient', 'update_patient', 'delete_patient',
      'create_invoice', 'read_invoice', 'update_invoice', 'delete_invoice',
      'create_request', 'read_request', 'update_request', 'delete_request',
      'read_inventory', 'read_dashboard', 'manage_users'
    ];
    return validPermissions.includes(permission);
  }

  /**
   * Validate product status
   */
  static isValidProductStatus(status: string): boolean {
    return ['approved', 'pending'].includes(status);
  }

  /**
   * Validate invoice status
   */
  static isValidInvoiceStatus(status: string): boolean {
    return ['pending', 'approved', 'rejected'].includes(status);
  }

  /**
   * Validate request status
   */
  static isValidRequestStatus(status: string): boolean {
    return ['pending', 'consumed', 'cancelled'].includes(status);
  }

  /**
   * Validate unit type
   */
  static isValidUnitType(unitType: string): boolean {
    return ['ml', 'units', 'vials'].includes(unitType);
  }

  /**
   * Validate phone number (Brazilian format)
   */
  static isValidPhone(phone: string): boolean {
    // Brazilian phone format: +55 (11) 99999-9999 or variations
    const phoneRegex = /^(\+55\s?)?\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validate CNPJ (Brazilian company tax ID)
   */
  static isValidCNPJ(cnpj: string): boolean {
    // Remove non-numeric characters
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    // Check if it has 14 digits
    if (cleanCNPJ.length !== 14) {
      return false;
    }
    
    // Check for known invalid patterns (all same digits)
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return false;
    }
    
    // Calculate first check digit
    let sum = 0;
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weights1[i];
    }
    let remainder = sum % 11;
    let checkDigit1 = remainder < 2 ? 0 : 11 - remainder;
    
    // Calculate second check digit
    sum = 0;
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weights2[i];
    }
    remainder = sum % 11;
    let checkDigit2 = remainder < 2 ? 0 : 11 - remainder;
    
    // Verify check digits
    return parseInt(cleanCNPJ[12]) === checkDigit1 && parseInt(cleanCNPJ[13]) === checkDigit2;
  }

  /**
   * Format CNPJ for display
   */
  static formatCNPJ(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    if (cleanCNPJ.length === 14) {
      return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  }

  /**
   * Validate Rennova product code format
   */
  static isValidRennovaCode(code: string): boolean {
    // Assuming Rennova codes follow a specific pattern
    const codeRegex = /^REN-[A-Z0-9]{6,10}$/;
    return codeRegex.test(code);
  }

  /**
   * Validate User object
   */
  static validateUser(user: Partial<User>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.user_id) {
      errors.push('User ID is required');
    }

    if (!user.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(user.email)) {
      errors.push('Invalid email format');
    }

    if (!user.role) {
      errors.push('Role is required');
    } else if (!this.isValidRole(user.role)) {
      errors.push('Invalid role');
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      errors.push('Permissions array is required');
    } else {
      const invalidPermissions = user.permissions.filter(p => !this.isValidPermission(p));
      if (invalidPermissions.length > 0) {
        errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }
    }

    if (!user.profile) {
      errors.push('Profile is required');
    } else {
      if (!user.profile.first_name) {
        errors.push('First name is required');
      }
      if (!user.profile.last_name) {
        errors.push('Last name is required');
      }
      if (user.profile.phone && !this.isValidPhone(user.profile.phone)) {
        errors.push('Invalid phone format');
      }
    }

    // Role-specific validations
    if (user.role === 'system_admin' && user.clinic_id) {
      errors.push('System admin should not have clinic_id');
    }

    if ((user.role === 'clinic_admin' || user.role === 'clinic_user') && !user.clinic_id) {
      errors.push('Clinic users must have clinic_id');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Clinic object
   */
  static validateClinic(clinic: Partial<Clinic>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!clinic.clinic_id) {
      errors.push('Clinic ID is required');
    }

    if (!clinic.name || clinic.name.trim().length === 0) {
      errors.push('Clinic name is required');
    }

    if (!clinic.cnpj) {
      errors.push('CNPJ is required');
    } else if (!this.isValidCNPJ(clinic.cnpj)) {
      errors.push('Invalid CNPJ format');
    }

    if (!clinic.email) {
      errors.push('Clinic email is required');
    } else if (!this.isValidEmail(clinic.email)) {
      errors.push('Invalid email format');
    }

    if (!clinic.phone) {
      errors.push('Clinic phone is required');
    } else if (!this.isValidPhone(clinic.phone)) {
      errors.push('Invalid phone format');
    }

    if (!clinic.address || clinic.address.trim().length === 0) {
      errors.push('Clinic address is required');
    }

    if (!clinic.city || clinic.city.trim().length === 0) {
      errors.push('Clinic city is required');
    }

    if (!clinic.admin_user_id) {
      errors.push('Admin user ID is required');
    }

    if (clinic.status && !['active', 'inactive'].includes(clinic.status)) {
      errors.push('Invalid status. Must be "active" or "inactive"');
    }

    if (!clinic.settings) {
      errors.push('Settings are required');
    } else {
      if (!clinic.settings.timezone) {
        errors.push('Timezone is required in settings');
      }
      if (!clinic.settings.notification_preferences) {
        errors.push('Notification preferences are required in settings');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Product object
   */
  static validateProduct(product: Partial<Product>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!product.product_id) {
      errors.push('Product ID is required');
    }

    if (!product.name || product.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!product.description || product.description.trim().length === 0) {
      errors.push('Product description is required');
    }

    if (!product.rennova_code) {
      errors.push('Rennova code is required');
    } else if (!this.isValidRennovaCode(product.rennova_code)) {
      errors.push('Invalid Rennova code format');
    }

    if (!product.category || product.category.trim().length === 0) {
      errors.push('Product category is required');
    }

    if (!product.unit_type) {
      errors.push('Unit type is required');
    } else if (!this.isValidUnitType(product.unit_type)) {
      errors.push('Invalid unit type');
    }

    if (!product.status) {
      errors.push('Product status is required');
    } else if (!this.isValidProductStatus(product.status)) {
      errors.push('Invalid product status');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Invoice object
   */
  static validateInvoice(invoice: Partial<Invoice>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!invoice.invoice_id) {
      errors.push('Invoice ID is required');
    }

    if (!invoice.clinic_id) {
      errors.push('Clinic ID is required');
    }

    if (!invoice.invoice_number || invoice.invoice_number.trim().length === 0) {
      errors.push('Invoice number is required');
    }

    if (!invoice.supplier || invoice.supplier.trim().length === 0) {
      errors.push('Supplier is required');
    }

    if (!invoice.emission_date) {
      errors.push('Emission date is required');
    }

    if (!invoice.products || !Array.isArray(invoice.products)) {
      errors.push('Products array is required');
    } else if (invoice.products.length === 0) {
      errors.push('At least one product is required');
    } else {
      invoice.products.forEach((product, index) => {
        if (!product.product_id) {
          errors.push(`Product ${index + 1}: Product ID is required`);
        }
        if (!product.quantity || product.quantity <= 0) {
          errors.push(`Product ${index + 1}: Valid quantity is required`);
        }
        if (!product.unit_price || product.unit_price < 0) {
          errors.push(`Product ${index + 1}: Valid unit price is required`);
        }
        if (!product.expiration_date) {
          errors.push(`Product ${index + 1}: Expiration date is required`);
        }
        if (!product.lot || product.lot.trim().length === 0) {
          errors.push(`Product ${index + 1}: Lot is required`);
        }
      });
    }

    if (invoice.total_value !== undefined && invoice.total_value < 0) {
      errors.push('Total value cannot be negative');
    }

    if (!invoice.status) {
      errors.push('Invoice status is required');
    } else if (!this.isValidInvoiceStatus(invoice.status)) {
      errors.push('Invalid invoice status');
    }

    if (!invoice.created_by) {
      errors.push('Created by user ID is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Patient object
   */
  static validatePatient(patient: Partial<Patient>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!patient.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!patient.clinic_id) {
      errors.push('Clinic ID is required');
    }

    if (!patient.first_name || patient.first_name.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!patient.last_name || patient.last_name.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!patient.birth_date) {
      errors.push('Birth date is required');
    } else {
      const birthDate = new Date(patient.birth_date);
      const today = new Date();
      if (birthDate > today) {
        errors.push('Birth date cannot be in the future');
      }
    }

    if (!patient.phone || patient.phone.trim().length === 0) {
      errors.push('Phone is required');
    } else if (!this.isValidPhone(patient.phone)) {
      errors.push('Invalid phone format');
    }

    if (!patient.email || patient.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(patient.email)) {
      errors.push('Invalid email format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Request object
   */
  static validateRequest(request: Partial<Request>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.request_id) {
      errors.push('Request ID is required');
    }

    if (!request.clinic_id) {
      errors.push('Clinic ID is required');
    }

    if (!request.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!request.request_date) {
      errors.push('Request date is required');
    }

    if (!request.treatment_type || request.treatment_type.trim().length === 0) {
      errors.push('Treatment type is required');
    }

    if (!request.products_used || !Array.isArray(request.products_used)) {
      errors.push('Products used array is required');
    } else if (request.products_used.length === 0) {
      errors.push('At least one product must be used');
    } else {
      request.products_used.forEach((product, index) => {
        if (!product.product_id) {
          errors.push(`Product ${index + 1}: Product ID is required`);
        }
        if (!product.quantity || product.quantity <= 0) {
          errors.push(`Product ${index + 1}: Valid quantity is required`);
        }
        if (!product.lot || product.lot.trim().length === 0) {
          errors.push(`Product ${index + 1}: Lot is required`);
        }
        if (!product.expiration_date) {
          errors.push(`Product ${index + 1}: Expiration date is required`);
        }
      });
    }

    if (!request.status) {
      errors.push('Request status is required');
    } else if (!this.isValidRequestStatus(request.status)) {
      errors.push('Invalid request status');
    }

    if (!request.performed_by) {
      errors.push('Performed by user ID is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate InventoryItem object
   */
  static validateInventoryItem(item: Partial<InventoryItem>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!item.inventory_id) {
      errors.push('Inventory ID is required');
    }

    if (!item.clinic_id) {
      errors.push('Clinic ID is required');
    }

    if (!item.product_id) {
      errors.push('Product ID is required');
    }

    if (item.quantity_in_stock === undefined || item.quantity_in_stock < 0) {
      errors.push('Valid quantity in stock is required');
    }

    if (item.minimum_stock_level === undefined || item.minimum_stock_level < 0) {
      errors.push('Valid minimum stock level is required');
    }

    if (!item.expiration_dates || !Array.isArray(item.expiration_dates)) {
      errors.push('Expiration dates array is required');
    } else {
      item.expiration_dates.forEach((entry, index) => {
        if (!entry.date) {
          errors.push(`Expiration entry ${index + 1}: Date is required`);
        }
        if (!entry.lot || entry.lot.trim().length === 0) {
          errors.push(`Expiration entry ${index + 1}: Lot is required`);
        }
        if (entry.quantity === undefined || entry.quantity < 0) {
          errors.push(`Expiration entry ${index + 1}: Valid quantity is required`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate clinic isolation - ensure user can only access their clinic's data
   */
  static validateClinicAccess(userClinicId: string | null, resourceClinicId: string): boolean {
    // System admins (no clinic_id) can access all clinics
    if (!userClinicId) {
      return true;
    }
    
    // Other users can only access their own clinic
    return userClinicId === resourceClinicId;
  }

  /**
   * Validate user permissions for an action
   */
  static validatePermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
  }
}

export default ValidationService;