import { AxiosError } from 'axios';

/**
 * Client-side error handling utilities
 */

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    request_id: string;
  };
}

export interface UserFriendlyError {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  actionable?: boolean;
  retryable?: boolean;
}

/**
 * Error type classifications
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BUSINESS_RULE = 'BUSINESS_RULE_VIOLATION',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  NETWORK = 'NETWORK_ERROR',
  SERVER = 'INTERNAL_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * User-friendly error messages in Portuguese
 */
const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // Authentication errors
  AUTHENTICATION_ERROR: {
    title: 'Erro de Autenticação',
    message: 'Suas credenciais são inválidas ou expiraram. Por favor, faça login novamente.',
    type: 'error',
    actionable: true,
    retryable: false
  },
  INVALID_CREDENTIALS: {
    title: 'Credenciais Inválidas',
    message: 'Email ou senha incorretos. Verifique suas informações e tente novamente.',
    type: 'error',
    actionable: true,
    retryable: true
  },
  TOKEN_EXPIRED: {
    title: 'Sessão Expirada',
    message: 'Sua sessão expirou. Por favor, faça login novamente.',
    type: 'warning',
    actionable: true,
    retryable: false
  },

  // Authorization errors
  AUTHORIZATION_ERROR: {
    title: 'Acesso Negado',
    message: 'Você não tem permissão para realizar esta ação.',
    type: 'error',
    actionable: false,
    retryable: false
  },
  FORBIDDEN: {
    title: 'Operação Não Permitida',
    message: 'Você não tem as permissões necessárias para acessar este recurso.',
    type: 'error',
    actionable: false,
    retryable: false
  },

  // Validation errors
  VALIDATION_ERROR: {
    title: 'Dados Inválidos',
    message: 'Alguns campos contêm informações inválidas. Verifique os dados e tente novamente.',
    type: 'error',
    actionable: true,
    retryable: true
  },
  BUSINESS_RULE_VIOLATION: {
    title: 'Regra de Negócio Violada',
    message: 'A operação não pode ser realizada devido a uma regra de negócio.',
    type: 'error',
    actionable: true,
    retryable: false
  },

  // Resource errors
  NOT_FOUND: {
    title: 'Recurso Não Encontrado',
    message: 'O item solicitado não foi encontrado ou pode ter sido removido.',
    type: 'error',
    actionable: false,
    retryable: false
  },
  CONFLICT: {
    title: 'Conflito de Dados',
    message: 'Já existe um registro com essas informações. Verifique os dados e tente novamente.',
    type: 'error',
    actionable: true,
    retryable: true
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    title: 'Muitas Tentativas',
    message: 'Você fez muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    type: 'warning',
    actionable: false,
    retryable: true
  },

  // Network errors
  NETWORK_ERROR: {
    title: 'Erro de Conexão',
    message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
    type: 'error',
    actionable: true,
    retryable: true
  },
  TIMEOUT: {
    title: 'Tempo Esgotado',
    message: 'A operação demorou mais que o esperado. Tente novamente.',
    type: 'warning',
    actionable: true,
    retryable: true
  },

  // Server errors
  INTERNAL_ERROR: {
    title: 'Erro Interno',
    message: 'Ocorreu um erro interno no servidor. Nossa equipe foi notificada.',
    type: 'error',
    actionable: false,
    retryable: true
  },
  SERVICE_UNAVAILABLE: {
    title: 'Serviço Indisponível',
    message: 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.',
    type: 'error',
    actionable: false,
    retryable: true
  },

  // Default
  UNKNOWN_ERROR: {
    title: 'Erro Desconhecido',
    message: 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.',
    type: 'error',
    actionable: true,
    retryable: true
  }
};

/**
 * Specific error messages for common scenarios
 */
const SPECIFIC_ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  EMAIL_EXISTS: {
    title: 'Email Já Cadastrado',
    message: 'Este email já está sendo usado por outro usuário.',
    type: 'error',
    actionable: true,
    retryable: false
  },
  DUPLICATE_PHONE: {
    title: 'Telefone Já Cadastrado',
    message: 'Este número de telefone já está sendo usado por outro paciente.',
    type: 'error',
    actionable: true,
    retryable: false
  },
  DUPLICATE_EMAIL: {
    title: 'Email Já Cadastrado',
    message: 'Este email já está sendo usado por outro paciente.',
    type: 'error',
    actionable: true,
    retryable: false
  },
  INSUFFICIENT_STOCK: {
    title: 'Estoque Insuficiente',
    message: 'Não há estoque suficiente para realizar esta operação.',
    type: 'warning',
    actionable: true,
    retryable: false
  },
  PRODUCT_NOT_FOUND: {
    title: 'Produto Não Encontrado',
    message: 'O produto selecionado não foi encontrado no catálogo.',
    type: 'error',
    actionable: true,
    retryable: false
  },
  PATIENT_NOT_FOUND: {
    title: 'Paciente Não Encontrado',
    message: 'O paciente selecionado não foi encontrado.',
    type: 'error',
    actionable: true,
    retryable: false
  },
  INVALID_STATUS: {
    title: 'Status Inválido',
    message: 'Não é possível realizar esta operação com o status atual do item.',
    type: 'error',
    actionable: false,
    retryable: false
  }
};

/**
 * Extract error information from API response
 */
export const extractErrorInfo = (error: any): ApiErrorResponse | null => {
  if (error.response?.data?.error) {
    return error.response.data as ApiErrorResponse;
  }
  
  if (error.data?.error) {
    return error.data as ApiErrorResponse;
  }
  
  return null;
};

/**
 * Classify error type from error object
 */
export const classifyError = (error: any): ErrorType => {
  // Network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    return ErrorType.NETWORK;
  }

  // HTTP status code classification
  const status = error.response?.status;
  
  if (status === 400) return ErrorType.VALIDATION;
  if (status === 401) return ErrorType.AUTHENTICATION;
  if (status === 403) return ErrorType.AUTHORIZATION;
  if (status === 404) return ErrorType.NOT_FOUND;
  if (status === 409) return ErrorType.CONFLICT;
  if (status === 422) return ErrorType.BUSINESS_RULE;
  if (status === 429) return ErrorType.RATE_LIMIT;
  if (status >= 500) return ErrorType.SERVER;

  // API error code classification
  const apiError = extractErrorInfo(error);
  if (apiError?.error.code) {
    const code = apiError.error.code;
    
    if (code.includes('VALIDATION')) return ErrorType.VALIDATION;
    if (code.includes('AUTH')) return ErrorType.AUTHENTICATION;
    if (code.includes('FORBIDDEN')) return ErrorType.AUTHORIZATION;
    if (code.includes('NOT_FOUND')) return ErrorType.NOT_FOUND;
    if (code.includes('CONFLICT')) return ErrorType.CONFLICT;
    if (code.includes('BUSINESS_RULE')) return ErrorType.BUSINESS_RULE;
    if (code.includes('RATE_LIMIT')) return ErrorType.RATE_LIMIT;
    if (code.includes('INTERNAL')) return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
};

/**
 * Convert error to user-friendly message
 */
export const getErrorMessage = (error: any): UserFriendlyError => {
  const apiError = extractErrorInfo(error);
  const errorType = classifyError(error);
  
  // Check for specific error codes first
  if (apiError?.error.code && SPECIFIC_ERROR_MESSAGES[apiError.error.code]) {
    return SPECIFIC_ERROR_MESSAGES[apiError.error.code];
  }
  
  // Check for general error types
  if (ERROR_MESSAGES[errorType]) {
    return ERROR_MESSAGES[errorType];
  }
  
  // Fallback to default error message
  return ERROR_MESSAGES[ErrorType.UNKNOWN];
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (error: any): string[] => {
  const apiError = extractErrorInfo(error);
  
  if (apiError?.error.details && Array.isArray(apiError.error.details)) {
    return apiError.error.details.map((detail: any) => {
      if (typeof detail === 'string') {
        return detail;
      }
      
      if (detail.field && detail.message) {
        return `${detail.field}: ${detail.message}`;
      }
      
      return detail.message || 'Erro de validação';
    });
  }
  
  return [apiError?.error.message || 'Erro de validação'];
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  const errorType = classifyError(error);
  const userFriendlyError = getErrorMessage(error);
  
  // Network errors are usually retryable
  if (errorType === ErrorType.NETWORK) {
    return true;
  }
  
  // Rate limit errors are retryable after waiting
  if (errorType === ErrorType.RATE_LIMIT) {
    return true;
  }
  
  // Server errors might be retryable
  if (errorType === ErrorType.SERVER) {
    return true;
  }
  
  return userFriendlyError.retryable || false;
};

/**
 * Get retry delay for retryable errors
 */
export const getRetryDelay = (error: any, attempt: number): number => {
  const errorType = classifyError(error);
  
  // Rate limit errors: exponential backoff starting at 1 minute
  if (errorType === ErrorType.RATE_LIMIT) {
    return Math.min(60000 * Math.pow(2, attempt - 1), 300000); // Max 5 minutes
  }
  
  // Network errors: shorter exponential backoff
  if (errorType === ErrorType.NETWORK) {
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
  }
  
  // Server errors: moderate backoff
  if (errorType === ErrorType.SERVER) {
    return Math.min(5000 * Math.pow(2, attempt - 1), 60000); // Max 1 minute
  }
  
  return 1000; // Default 1 second
};

/**
 * Error logging utility
 */
export const logError = (error: any, context?: any): void => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    type: classifyError(error),
    apiError: extractErrorInfo(error),
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Client Error:', errorInfo);
  }
  
  // In production, you might want to send to an error tracking service
  // Example: Sentry, LogRocket, Bugsnag, etc.
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTrackingService(errorInfo);
  }
};

/**
 * Error boundary helper for React components
 */
export const createErrorBoundaryInfo = (error: Error, errorInfo: any) => {
  return {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    errorInfo,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };
};

/**
 * Network status checker
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Retry mechanism for failed requests
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxAttempts: number = 3,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // Wait before retrying
      const delay = getRetryDelay(error, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Error context for debugging
 */
export const createErrorContext = (additionalContext?: any) => {
  return {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    language: navigator.language,
    platform: navigator.platform,
    ...additionalContext
  };
};

/**
 * Common error handling patterns
 */
export const handleApiError = (error: any, context?: any) => {
  logError(error, context);
  return getErrorMessage(error);
};

export const handleFormError = (error: any, setFieldError?: (field: string, message: string) => void) => {
  const apiError = extractErrorInfo(error);
  
  if (apiError?.error.details && Array.isArray(apiError.error.details) && setFieldError) {
    // Set field-specific errors
    apiError.error.details.forEach((detail: any) => {
      if (detail.field && detail.message) {
        setFieldError(detail.field, detail.message);
      }
    });
    return null;
  }
  
  // Return general error message
  return getErrorMessage(error);
};

export default {
  ErrorType,
  extractErrorInfo,
  classifyError,
  getErrorMessage,
  formatValidationErrors,
  isRetryableError,
  getRetryDelay,
  logError,
  createErrorBoundaryInfo,
  isOnline,
  retryRequest,
  createErrorContext,
  handleApiError,
  handleFormError
};