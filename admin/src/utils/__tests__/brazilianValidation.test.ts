import {
  validateCNPJ,
  formatCNPJ,
  validateBrazilianPhone,
  formatBrazilianPhone,
  extractCityFromAddress
} from '../brazilianValidation';

describe('Brazilian Validation Utilities', () => {
  describe('validateCNPJ', () => {
    it('should validate correct CNPJ', () => {
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
      expect(validateCNPJ('11222333000181')).toBe(true);
    });

    it('should reject invalid CNPJ', () => {
      expect(validateCNPJ('11.222.333/0001-82')).toBe(false); // Wrong check digit
      expect(validateCNPJ('11222333000182')).toBe(false); // Wrong check digit
    });

    it('should reject CNPJ with wrong length', () => {
      expect(validateCNPJ('11.222.333/0001-8')).toBe(false); // Too short
      expect(validateCNPJ('11.222.333/0001-812')).toBe(false); // Too long
    });

    it('should reject CNPJ with all same digits', () => {
      expect(validateCNPJ('11111111111111')).toBe(false);
      expect(validateCNPJ('00000000000000')).toBe(false);
    });

    it('should reject empty or null CNPJ', () => {
      expect(validateCNPJ('')).toBe(false);
      expect(validateCNPJ(null as any)).toBe(false);
      expect(validateCNPJ(undefined as any)).toBe(false);
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ correctly', () => {
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('should handle partial CNPJ input', () => {
      expect(formatCNPJ('11')).toBe('11');
      expect(formatCNPJ('112')).toBe('11.2');
      expect(formatCNPJ('11222')).toBe('11.222');
      expect(formatCNPJ('11222333')).toBe('11.222.333');
      expect(formatCNPJ('112223330001')).toBe('11.222.333/0001');
    });

    it('should handle empty input', () => {
      expect(formatCNPJ('')).toBe('');
      expect(formatCNPJ(null as any)).toBe('');
      expect(formatCNPJ(undefined as any)).toBe('');
    });

    it('should remove non-numeric characters before formatting', () => {
      expect(formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
      expect(formatCNPJ('11abc222def333ghi0001jkl81')).toBe('11.222.333/0001-81');
    });
  });

  describe('validateBrazilianPhone', () => {
    it('should validate correct mobile phone numbers', () => {
      expect(validateBrazilianPhone('(11) 99999-9999')).toBe(true);
      expect(validateBrazilianPhone('11999999999')).toBe(true);
      expect(validateBrazilianPhone('(21) 98888-8888')).toBe(true);
    });

    it('should validate correct landline phone numbers', () => {
      expect(validateBrazilianPhone('(11) 3333-4444')).toBe(true);
      expect(validateBrazilianPhone('1133334444')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validateBrazilianPhone('123456789')).toBe(false); // Too short
      expect(validateBrazilianPhone('123456789012')).toBe(false); // Too long
      expect(validateBrazilianPhone('(10) 99999-9999')).toBe(false); // Invalid area code
      expect(validateBrazilianPhone('(11) 89999-9999')).toBe(false); // Invalid mobile prefix
    });

    it('should reject empty or null phone', () => {
      expect(validateBrazilianPhone('')).toBe(false);
      expect(validateBrazilianPhone(null as any)).toBe(false);
      expect(validateBrazilianPhone(undefined as any)).toBe(false);
    });
  });

  describe('formatBrazilianPhone', () => {
    it('should format mobile phone numbers correctly', () => {
      expect(formatBrazilianPhone('11999999999')).toBe('(11) 99999-9999');
    });

    it('should format landline phone numbers correctly', () => {
      expect(formatBrazilianPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('should handle partial phone input', () => {
      expect(formatBrazilianPhone('1')).toBe('(1');
      expect(formatBrazilianPhone('11')).toBe('(11');
      expect(formatBrazilianPhone('119')).toBe('(11) 9');
      expect(formatBrazilianPhone('11999')).toBe('(11) 999');
      expect(formatBrazilianPhone('1199999')).toBe('(11) 9999');
      expect(formatBrazilianPhone('119999999')).toBe('(11) 9999-999');
    });

    it('should handle empty input', () => {
      expect(formatBrazilianPhone('')).toBe('');
      expect(formatBrazilianPhone(null as any)).toBe('');
      expect(formatBrazilianPhone(undefined as any)).toBe('');
    });

    it('should truncate numbers longer than expected', () => {
      expect(formatBrazilianPhone('119999999999999')).toBe('(11) 99999-9999');
    });
  });

  describe('extractCityFromAddress', () => {
    it('should extract city from Brazilian address patterns', () => {
      expect(extractCityFromAddress('Rua Test, 123, São Paulo - SP')).toBe('São Paulo');
      expect(extractCityFromAddress('Av. Paulista, 1000, São Paulo, SP')).toBe('São Paulo');
      expect(extractCityFromAddress('Rua das Flores, 456, Rio de Janeiro - RJ')).toBe('Rio de Janeiro');
    });

    it('should extract city from address with multiple commas', () => {
      expect(extractCityFromAddress('Rua A, 123, Bairro B, São Paulo - SP')).toBe('São Paulo');
      expect(extractCityFromAddress('Av. Test, 456, Centro, Rio de Janeiro, RJ')).toBe('Rio de Janeiro');
    });

    it('should handle addresses without clear patterns', () => {
      expect(extractCityFromAddress('Rua Test, 123, São Paulo')).toBe('São Paulo');
      expect(extractCityFromAddress('Endereço simples')).toBe('');
    });

    it('should handle empty or invalid input', () => {
      expect(extractCityFromAddress('')).toBe('');
      expect(extractCityFromAddress(null as any)).toBe('');
      expect(extractCityFromAddress(undefined as any)).toBe('');
    });

    it('should handle addresses with short city names', () => {
      expect(extractCityFromAddress('Rua Test, 123, SP')).toBe('');
      expect(extractCityFromAddress('Rua Test, 123, A, B')).toBe('');
    });
  });
});