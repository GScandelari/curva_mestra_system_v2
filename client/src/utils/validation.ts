import React from 'react';

/**
 * Client-side validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): FieldValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email é obrigatório' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Email inválido' };
  }
  
  if (email.length > 255) {
    return { isValid: false, error: 'Email muito longo' };
  }
  
  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password: string): FieldValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Senha é obrigatória' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Senha muito longa' };
  }
  
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
    return { 
      isValid: false, 
      error: 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial' 
    };
  }
  
  return { isValid: true };
};

/**
 * Brazilian phone validation
 */
export const validatePhone = (phone: string): FieldValidationResult => {
  if (!phone) {
    return { isValid: false, error: 'Telefone é obrigatório' };
  }
  
  // Remove all non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian phone patterns: 11 digits (with 9) or 10 digits (without 9)
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return { isValid: false, error: 'Telefone deve ter 10 ou 11 dígitos' };
  }
  
  // Check if starts with valid area code (11-99)
  const areaCode = cleanPhone.substring(0, 2);
  const areaCodeNum = parseInt(areaCode);
  if (areaCodeNum < 11 || areaCodeNum > 99) {
    return { isValid: false, error: 'Código de área inválido' };
  }
  
  return { isValid: true };
};

/**
 * Name validation
 */
export const validateName = (name: string, fieldName: string = 'Nome'): FieldValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} deve ter pelo menos 2 caracteres` };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: `${fieldName} muito longo` };
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} contém caracteres inválidos` };
  }
  
  return { isValid: true };
};

/**
 * Date validation
 */
export const validateDate = (date: string | Date, fieldName: string = 'Data'): FieldValidationResult => {
  if (!date) {
    return { isValid: false, error: `${fieldName} é obrigatória` };
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: `${fieldName} inválida` };
  }
  
  return { isValid: true };
};

/**
 * Birth date validation
 */
export const validateBirthDate = (birthDate: string | Date): FieldValidationResult => {
  const dateValidation = validateDate(birthDate, 'Data de nascimento');
  if (!dateValidation.isValid) {
    return dateValidation;
  }
  
  const dateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  
  if (dateObj > today) {
    return { isValid: false, error: 'Data de nascimento não pode ser no futuro' };
  }
  
  const age = today.getFullYear() - dateObj.getFullYear();
  const monthDiff = today.getMonth() - dateObj.getMonth();
  const dayDiff = today.getDate() - dateObj.getDate();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  
  if (actualAge < 18) {
    return { isValid: false, error: 'Paciente deve ter pelo menos 18 anos' };
  }
  
  if (actualAge > 150) {
    return { isValid: false, error: 'Idade parece irreal' };
  }
  
  return { isValid: true };
};

/**
 * Currency validation
 */
export const validateCurrency = (value: string | number, fieldName: string = 'Valor'): FieldValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} deve ser um número válido` };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: `${fieldName} não pode ser negativo` };
  }
  
  if (numValue > 999999.99) {
    return { isValid: false, error: `${fieldName} muito alto` };
  }
  
  // Check for more than 2 decimal places
  const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: `${fieldName} não pode ter mais de 2 casas decimais` };
  }
  
  return { isValid: true };
};

/**
 * Quantity validation
 */
export const validateQuantity = (quantity: string | number, fieldName: string = 'Quantidade'): FieldValidationResult => {
  if (quantity === '' || quantity === null || quantity === undefined) {
    return { isValid: false, error: `${fieldName} é obrigatória` };
  }
  
  const numValue = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} deve ser um número válido` };
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: `${fieldName} deve ser maior que zero` };
  }
  
  if (numValue > 10000) {
    return { isValid: false, error: `${fieldName} parece muito alta` };
  }
  
  // Check if it's a whole number for countable items
  if (!Number.isInteger(numValue)) {
    return { isValid: false, error: `${fieldName} deve ser um número inteiro` };
  }
  
  return { isValid: true };
};

/**
 * Rennova code validation
 */
export const validateRennovaCode = (code: string): FieldValidationResult => {
  if (!code) {
    return { isValid: false, error: 'Código Rennova é obrigatório' };
  }
  
  const codeRegex = /^REN-[A-Z0-9]{6,10}$/;
  if (!codeRegex.test(code)) {
    return { isValid: false, error: 'Código Rennova deve seguir o formato REN-XXXXXX' };
  }
  
  return { isValid: true };
};

/**
 * Invoice number validation
 */
export const validateInvoiceNumber = (invoiceNumber: string): FieldValidationResult => {
  if (!invoiceNumber || !invoiceNumber.trim()) {
    return { isValid: false, error: 'Número da nota fiscal é obrigatório' };
  }
  
  if (invoiceNumber.trim().length < 1 || invoiceNumber.length > 50) {
    return { isValid: false, error: 'Número da nota fiscal deve ter entre 1 e 50 caracteres' };
  }
  
  return { isValid: true };
};

/**
 * Lot validation
 */
export const validateLot = (lot: string): FieldValidationResult => {
  if (!lot || !lot.trim()) {
    return { isValid: false, error: 'Lote é obrigatório' };
  }
  
  if (lot.trim().length < 1 || lot.length > 50) {
    return { isValid: false, error: 'Lote deve ter entre 1 e 50 caracteres' };
  }
  
  return { isValid: true };
};

/**
 * Expiration date validation
 */
export const validateExpirationDate = (expirationDate: string | Date): FieldValidationResult => {
  const dateValidation = validateDate(expirationDate, 'Data de vencimento');
  if (!dateValidation.isValid) {
    return dateValidation;
  }
  
  const dateObj = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const today = new Date();
  
  if (dateObj <= today) {
    return { isValid: false, error: 'Data de vencimento deve ser no futuro' };
  }
  
  // Check if expiration date is too far in the future (more than 10 years)
  const tenYearsFromNow = new Date();
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
  
  if (dateObj > tenYearsFromNow) {
    return { isValid: false, error: 'Data de vencimento parece irreal' };
  }
  
  return { isValid: true };
};

/**
 * Address validation
 */
export const validateAddress = (address: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!address) {
    return { isValid: true, errors: [] }; // Address is optional
  }
  
  if (!address.street || address.street.trim().length < 5) {
    errors.push('Rua deve ter pelo menos 5 caracteres');
  }
  
  if (!address.number || address.number.trim().length < 1) {
    errors.push('Número é obrigatório');
  }
  
  if (!address.neighborhood || address.neighborhood.trim().length < 2) {
    errors.push('Bairro deve ter pelo menos 2 caracteres');
  }
  
  if (!address.city || address.city.trim().length < 2) {
    errors.push('Cidade deve ter pelo menos 2 caracteres');
  }
  
  if (!address.state || address.state.trim().length < 2) {
    errors.push('Estado deve ter pelo menos 2 caracteres');
  }
  
  if (!address.zip_code) {
    errors.push('CEP é obrigatório');
  } else {
    const cepRegex = /^\d{5}-?\d{3}$/;
    if (!cepRegex.test(address.zip_code)) {
      errors.push('CEP deve estar no formato 00000-000');
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Form validation helper
 */
export const validateForm = (data: any, validationRules: Record<string, (value: any) => FieldValidationResult>): ValidationResult => {
  const errors: string[] = [];
  
  for (const [field, validator] of Object.entries(validationRules)) {
    const result = validator(data[field]);
    if (!result.isValid && result.error) {
      errors.push(`${field}: ${result.error}`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Real-time validation hook for forms
 */
export const useFieldValidation = (value: any, validator: (value: any) => FieldValidationResult) => {
  const [error, setError] = React.useState<string | undefined>();
  const [touched, setTouched] = React.useState(false);
  
  React.useEffect(() => {
    if (touched) {
      const result = validator(value);
      setError(result.error);
    }
  }, [value, validator, touched]);
  
  const handleBlur = () => {
    setTouched(true);
    const result = validator(value);
    setError(result.error);
  };
  
  const clearError = () => {
    setError(undefined);
    setTouched(false);
  };
  
  return {
    error,
    hasError: !!error,
    handleBlur,
    clearError
  };
};

/**
 * Sanitization utilities
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .replace(/\s+/g, ' '); // Normalize whitespace
};

export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return html;
  
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Format validation helpers
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');
  
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  
  return cep;
};

/**
 * Validation constants
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PHONE: 'Telefone inválido',
  INVALID_DATE: 'Data inválida',
  INVALID_CURRENCY: 'Valor inválido',
  INVALID_QUANTITY: 'Quantidade inválida',
  PASSWORD_TOO_WEAK: 'Senha muito fraca',
  FUTURE_DATE_NOT_ALLOWED: 'Data futura não permitida',
  PAST_DATE_NOT_ALLOWED: 'Data passada não permitida',
  VALUE_TOO_HIGH: 'Valor muito alto',
  VALUE_TOO_LOW: 'Valor muito baixo'
};

export default {
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
  validateDate,
  validateBirthDate,
  validateCurrency,
  validateQuantity,
  validateRennovaCode,
  validateInvoiceNumber,
  validateLot,
  validateExpirationDate,
  validateAddress,
  validateForm,
  sanitizeInput,
  sanitizeHtml,
  formatPhone,
  formatCurrency,
  formatCEP,
  VALIDATION_MESSAGES
};