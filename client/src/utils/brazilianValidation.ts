/**
 * Brazilian validation utilities for CNPJ and phone numbers (Frontend)
 */

/**
 * Validates Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica)
 * CNPJ format: XX.XXX.XXX/XXXX-XX
 * @param cnpj - CNPJ string to validate
 * @returns boolean indicating if CNPJ is valid
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  
  // Remove all non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // CNPJ must have exactly 14 digits
  if (cleanCNPJ.length !== 14) return false;
  
  // Check for invalid patterns (all same digits)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Calculate first check digit
  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i];
  }
  
  let remainder = sum % 11;
  const firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleanCNPJ[12]) !== firstCheckDigit) return false;
  
  // Calculate second check digit
  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i];
  }
  
  remainder = sum % 11;
  const secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cleanCNPJ[13]) === secondCheckDigit;
}

/**
 * Formats CNPJ string with standard Brazilian formatting
 * @param cnpj - CNPJ string to format
 * @returns formatted CNPJ string (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  
  // Remove all non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Apply formatting if we have enough digits
  if (cleanCNPJ.length <= 2) return cleanCNPJ;
  if (cleanCNPJ.length <= 5) return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2)}`;
  if (cleanCNPJ.length <= 8) return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(5)}`;
  if (cleanCNPJ.length <= 12) return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(5, 8)}/${cleanCNPJ.slice(8)}`;
  
  return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(5, 8)}/${cleanCNPJ.slice(8, 12)}-${cleanCNPJ.slice(12, 14)}`;
}

/**
 * Validates Brazilian phone number
 * Accepts formats: (XX) XXXXX-XXXX, (XX) XXXX-XXXX, or numeric only
 * @param phone - Phone number string to validate
 * @returns boolean indicating if phone number is valid
 */
export function validateBrazilianPhone(phone: string): boolean {
  if (!phone) return false;
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian phone numbers can be:
  // - 10 digits: (XX) XXXX-XXXX (landline)
  // - 11 digits: (XX) XXXXX-XXXX (mobile with 9 prefix)
  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) return false;
  
  // First two digits are area code (11-99)
  const areaCode = parseInt(cleanPhone.slice(0, 2));
  if (areaCode < 11 || areaCode > 99) return false;
  
  // For 11-digit numbers, the third digit should be 9 (mobile)
  if (cleanPhone.length === 11 && cleanPhone[2] !== '9') return false;
  
  return true;
}

/**
 * Formats Brazilian phone number with standard formatting
 * @param phone - Phone number string to format
 * @returns formatted phone number string
 */
export function formatBrazilianPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (cleanPhone.length <= 2) return `(${cleanPhone}`;
  if (cleanPhone.length <= 6) return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2)}`;
  if (cleanPhone.length === 7) return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2)}`;
  if (cleanPhone.length === 8) return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  if (cleanPhone.length === 9) return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  if (cleanPhone.length === 10) {
    // Landline format: (XX) XXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  }
  if (cleanPhone.length === 11) {
    // Mobile format: (XX) XXXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
  }
  
  // For numbers longer than expected, truncate
  if (cleanPhone.length > 11) {
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7, 11)}`;
  }
  
  return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2)}`;
}

/**
 * Extracts city from a Brazilian address string
 * @param address - Full address string
 * @returns extracted city name or empty string
 */
export function extractCityFromAddress(address: string): string {
  if (!address) return '';
  
  // Common patterns for Brazilian addresses
  // Try to find city after common separators
  const patterns = [
    /,\s*([^,\-]+)\s*-\s*[A-Z]{2}$/i, // City - State
    /,\s*([^,]+)\s*,\s*[A-Z]{2}$/i,   // City, State
    /,\s*([^,\-]+)$/i,                 // Last part after comma
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // If no pattern matches, try to get the last meaningful part
  const parts = address.split(',').map(part => part.trim());
  if (parts.length > 1) {
    // Get the second to last part (assuming last might be state)
    const cityCandidate = parts[parts.length - 2];
    if (cityCandidate && cityCandidate.length > 2) {
      return cityCandidate;
    }
  }
  
  return '';
}