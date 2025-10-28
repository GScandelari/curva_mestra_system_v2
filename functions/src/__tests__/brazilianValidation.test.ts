import {
  validateCNPJ,
  formatCNPJ,
  validateBrazilianPhone,
  formatBrazilianPhone
} from '../utils/brazilianValidation';

describe('Brazilian Validation Utilities', () => {
  describe('validateCNPJ', () => {
    it('should validate correct CNPJ numbers', () => {
      // Valid CNPJs with check digits
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
      expect(validateCNPJ('11222333000181')).toBe(true);
      expect(validateCNPJ('11.444.777/0001-61')).toBe(true); // Another valid CNPJ
    });

    it('should reject invalid CNPJ numbers', () => {
      expect(validateCNPJ('11.222.333/0001-80')).toBe(false); // Wrong check digit
      expect(validateCNPJ('11111111111111')).toBe(false); // All same digits
      expect(validateCNPJ('123456789')).toBe(false); // Too short
      expect(validateCNPJ('123456789012345')).toBe(false); // Too long
      expect(validateCNPJ('')).toBe(false); // Empty string
      expect(validateCNPJ('abc.def.ghi/jklm-no')).toBe(false); // Non-numeric
    });

    it('should handle CNPJ with various formatting', () => {
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
      expect(validateCNPJ('11222333000181')).toBe(true);
      expect(validateCNPJ('11 222 333 0001 81')).toBe(true);
      expect(validateCNPJ('11-222-333-0001-81')).toBe(true);
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ correctly', () => {
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
      expect(formatCNPJ('34238864000184')).toBe('34.238.864/0001-84');
    });

    it('should handle partial CNPJ formatting', () => {
      expect(formatCNPJ('11')).toBe('11');
      expect(formatCNPJ('112')).toBe('11.2');
      expect(formatCNPJ('11222')).toBe('11.222');
      expect(formatCNPJ('1122233')).toBe('11.222.33');
      expect(formatCNPJ('112223330')).toBe('11.222.333/0');
      expect(formatCNPJ('1122233300018')).toBe('11.222.333/0001-8');
    });

    it('should handle empty or invalid input', () => {
      expect(formatCNPJ('')).toBe('');
      expect(formatCNPJ('abc')).toBe('');
    });

    it('should remove existing formatting before applying new formatting', () => {
      expect(formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
      expect(formatCNPJ('11 222 333 0001 81')).toBe('11.222.333/0001-81');
    });
  });

  describe('validateBrazilianPhone', () => {
    it('should validate correct landline phone numbers (10 digits)', () => {
      expect(validateBrazilianPhone('(11) 3333-4444')).toBe(true);
      expect(validateBrazilianPhone('1133334444')).toBe(true);
      expect(validateBrazilianPhone('(21) 2222-3333')).toBe(true);
    });

    it('should validate correct mobile phone numbers (11 digits)', () => {
      expect(validateBrazilianPhone('(11) 99999-8888')).toBe(true);
      expect(validateBrazilianPhone('11999998888')).toBe(true);
      expect(validateBrazilianPhone('(21) 98888-7777')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validateBrazilianPhone('123456789')).toBe(false); // Too short
      expect(validateBrazilianPhone('123456789012')).toBe(false); // Too long
      expect(validateBrazilianPhone('(10) 3333-4444')).toBe(false); // Invalid area code
      expect(validateBrazilianPhone('(11) 8333-4444')).toBe(true); // Valid landline number
      expect(validateBrazilianPhone('')).toBe(false); // Empty string
      expect(validateBrazilianPhone('abc-def-ghij')).toBe(false); // Non-numeric
    });

    it('should handle phone numbers with various formatting', () => {
      expect(validateBrazilianPhone('(11) 3333-4444')).toBe(true);
      expect(validateBrazilianPhone('11 3333-4444')).toBe(true);
      expect(validateBrazilianPhone('11 3333 4444')).toBe(true);
      expect(validateBrazilianPhone('1133334444')).toBe(true);
    });
  });

  describe('formatBrazilianPhone', () => {
    it('should format landline phone numbers correctly', () => {
      expect(formatBrazilianPhone('1133334444')).toBe('(11) 3333-4444');
      expect(formatBrazilianPhone('2122223333')).toBe('(21) 2222-3333');
    });

    it('should format mobile phone numbers correctly', () => {
      expect(formatBrazilianPhone('11999998888')).toBe('(11) 99999-8888');
      expect(formatBrazilianPhone('21988887777')).toBe('(21) 98888-7777');
    });

    it('should handle partial phone number formatting', () => {
      expect(formatBrazilianPhone('1')).toBe('(1');
      expect(formatBrazilianPhone('11')).toBe('(11');
      expect(formatBrazilianPhone('113')).toBe('(11) 3');
      expect(formatBrazilianPhone('113333')).toBe('(11) 3333');
      expect(formatBrazilianPhone('11333344')).toBe('(11) 3333-44');
    });

    it('should handle empty or invalid input', () => {
      expect(formatBrazilianPhone('')).toBe('');
    });

    it('should remove existing formatting before applying new formatting', () => {
      expect(formatBrazilianPhone('(11) 3333-4444')).toBe('(11) 3333-4444');
      expect(formatBrazilianPhone('11 3333-4444')).toBe('(11) 3333-4444');
      expect(formatBrazilianPhone('11 3333 4444')).toBe('(11) 3333-4444');
    });

    it('should handle numbers longer than expected', () => {
      expect(formatBrazilianPhone('119999988881')).toBe('(11) 99999-8888');
    });
  });
});