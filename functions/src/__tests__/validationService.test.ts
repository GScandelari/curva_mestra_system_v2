import { ValidationService } from '../services/validationService';

describe('ValidationService', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+tag@company.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(ValidationService.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(ValidationService.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidRole', () => {
    it('should validate correct user roles', () => {
      const validRoles = ['system_admin', 'clinic_admin', 'clinic_user'];

      validRoles.forEach(role => {
        expect(ValidationService.isValidRole(role)).toBe(true);
      });
    });

    it('should reject invalid user roles', () => {
      const invalidRoles = ['admin', 'user', 'manager', 'invalid_role', ''];

      invalidRoles.forEach(role => {
        expect(ValidationService.isValidRole(role)).toBe(false);
      });
    });
  });

  describe('isValidCNPJ', () => {
    it('should validate correct CNPJ formats', () => {
      // Using known valid CNPJs
      expect(ValidationService.isValidCNPJ('11.444.777/0001-61')).toBe(true);
      expect(ValidationService.isValidCNPJ('11444777000161')).toBe(true);
    });

    it('should reject invalid CNPJ formats', () => {
      const invalidCNPJs = [
        '11.111.111/1111-11', // All same digits
        '12345678901234', // Wrong length
        '123456789012', // Too short
        '12.345.678/0001-99', // Wrong check digits
        '', // Empty
        'abc.def.ghi/jklm-no' // Non-numeric
      ];

      invalidCNPJs.forEach(cnpj => {
        expect(ValidationService.isValidCNPJ(cnpj)).toBe(false);
      });
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ correctly', () => {
      expect(ValidationService.formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
      expect(ValidationService.formatCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    });

    it('should return original string if not 14 digits', () => {
      expect(ValidationService.formatCNPJ('123456789')).toBe('123456789');
      expect(ValidationService.formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
    });
  });

  describe('isValidPermission', () => {
    it('should validate correct permissions', () => {
      const validPermissions = [
        'create_patient',
        'read_patient',
        'update_patient',
        'delete_patient',
        'create_invoice',
        'read_inventory',
        'manage_users',
      ];

      validPermissions.forEach(permission => {
        expect(ValidationService.isValidPermission(permission)).toBe(true);
      });
    });

    it('should reject invalid permissions', () => {
      const invalidPermissions = [
        'invalid_permission',
        'create_user',
        'delete_clinic',
        '',
        'admin_access',
      ];

      invalidPermissions.forEach(permission => {
        expect(ValidationService.isValidPermission(permission)).toBe(false);
      });
    });
  });

  describe('isValidPhone', () => {
    it('should validate Brazilian phone numbers', () => {
      const validPhones = [
        '+55 (11) 99999-9999',
        '(11) 99999-9999',
        '11999999999',
        '+5511999999999',
        '(21) 98888-8888',
      ];

      validPhones.forEach(phone => {
        expect(ValidationService.isValidPhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123456789', // Too short
        'invalid-phone',
        '',
      ];

      invalidPhones.forEach(phone => {
        expect(ValidationService.isValidPhone(phone)).toBe(false);
      });
    });
  });

  describe('isValidRennovaCode', () => {
    it('should validate proper Rennova codes', () => {
      const validCodes = [
        'REN-ABC123',
        'REN-XYZ789',
        'REN-123456',
        'REN-ABCDEF1234',
      ];

      validCodes.forEach(code => {
        expect(ValidationService.isValidRennovaCode(code)).toBe(true);
      });
    });

    it('should reject invalid Rennova codes', () => {
      const invalidCodes = [
        'ABC123',
        'REN-abc123', // lowercase
        'REN-AB12', // too short
        'REN-ABCDEFGHIJK', // too long
        'REN-AB@123', // special characters
        '',
      ];

      invalidCodes.forEach(code => {
        expect(ValidationService.isValidRennovaCode(code)).toBe(false);
      });
    });
  });

  describe('isValidProductStatus', () => {
    it('should validate correct product statuses', () => {
      const validStatuses = ['approved', 'pending'];

      validStatuses.forEach(status => {
        expect(ValidationService.isValidProductStatus(status)).toBe(true);
      });
    });

    it('should reject invalid product statuses', () => {
      const invalidStatuses = ['rejected', 'draft', 'active', '', 'invalid'];

      invalidStatuses.forEach(status => {
        expect(ValidationService.isValidProductStatus(status)).toBe(false);
      });
    });
  });
});