import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box,
  Typography,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  getErrorMessage, 
  formatValidationErrors, 
  isRetryableError,
  UserFriendlyError,
  logError
} from '../utils/errorHandler';

interface ErrorNotification {
  id: string;
  error: any;
  userFriendlyError: UserFriendlyError;
  validationErrors?: string[];
  timestamp: Date;
  retryAction?: () => void;
  dismissed?: boolean;
}

interface ErrorContextType {
  notifications: ErrorNotification[];
  showError: (error: any, retryAction?: () => void) => void;
  dismissError: (id: string) => void;
  clearAllErrors: () => void;
  retryLastAction: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  autoHideDuration?: number;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  maxNotifications = 5,
  autoHideDuration = 6000
}) => {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const showError = useCallback((error: any, retryAction?: () => void) => {
    // Log the error
    logError(error, { source: 'ErrorProvider' });

    // Create notification
    const notification: ErrorNotification = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error,
      userFriendlyError: getErrorMessage(error),
      validationErrors: error.response?.status === 400 ? formatValidationErrors(error) : undefined,
      timestamp: new Date(),
      retryAction: isRetryableError(error) ? retryAction : undefined
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Keep only the most recent notifications
      return newNotifications.slice(0, maxNotifications);
    });

    // Auto-hide after duration (except for critical errors)
    if (notification.userFriendlyError.type !== 'error' || autoHideDuration > 0) {
      setTimeout(() => {
        dismissError(notification.id);
      }, autoHideDuration);
    }
  }, [maxNotifications, autoHideDuration]);

  const dismissError = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    );

    // Remove from expanded set
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    // Actually remove after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 300);
  }, []);

  const clearAllErrors = useCallback(() => {
    setNotifications([]);
    setExpandedNotifications(new Set());
  }, []);

  const retryLastAction = useCallback(() => {
    const lastRetryableNotification = notifications.find(n => n.retryAction && !n.dismissed);
    if (lastRetryableNotification?.retryAction) {
      lastRetryableNotification.retryAction();
      dismissError(lastRetryableNotification.id);
    }
  }, [notifications, dismissError]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const contextValue: ErrorContextType = {
    notifications,
    showError,
    dismissError,
    clearAllErrors,
    retryLastAction
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
      
      {/* Error Notifications */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          maxWidth: 400,
          width: '100%'
        }}
      >
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={!notification.dismissed}
            sx={{ position: 'relative', mb: 1 }}
          >
            <Alert
              severity={notification.userFriendlyError.type === 'error' ? 'error' : 
                       notification.userFriendlyError.type === 'warning' ? 'warning' : 'info'}
              sx={{ width: '100%' }}
              action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {notification.retryAction && (
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        notification.retryAction!();
                        dismissError(notification.id);
                      }}
                      sx={{ color: 'inherit' }}
                    >
                      Tentar Novamente
                    </Button>
                  )}
                  
                  {notification.validationErrors && notification.validationErrors.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => toggleExpanded(notification.id)}
                      sx={{ color: 'inherit' }}
                    >
                      {expandedNotifications.has(notification.id) ? 
                        <ExpandLessIcon /> : <ExpandMoreIcon />
                      }
                    </IconButton>
                  )}
                  
                  <IconButton
                    size="small"
                    onClick={() => dismissError(notification.id)}
                    sx={{ color: 'inherit' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              }
            >
              <AlertTitle>{notification.userFriendlyError.title}</AlertTitle>
              <Typography variant="body2">
                {notification.userFriendlyError.message}
              </Typography>
              
              {/* Validation Errors */}
              {notification.validationErrors && notification.validationErrors.length > 0 && (
                <Collapse in={expandedNotifications.has(notification.id)}>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Detalhes dos erros:
                    </Typography>
                    {notification.validationErrors.map((validationError, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        sx={{ fontSize: '0.75rem', opacity: 0.9 }}
                      >
                        • {validationError}
                      </Typography>
                    ))}
                  </Box>
                </Collapse>
              )}
              
              {/* Timestamp */}
              <Typography
                variant="caption"
                sx={{ 
                  display: 'block', 
                  mt: 1, 
                  opacity: 0.7,
                  fontSize: '0.7rem'
                }}
              >
                {notification.timestamp.toLocaleTimeString('pt-BR')}
              </Typography>
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </ErrorContext.Provider>
  );
};

// Hook to use error context
export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Hook for handling API errors in components
export const useApiError = () => {
  const { showError } = useError();
  
  const handleError = useCallback((error: any, retryAction?: () => void) => {
    showError(error, retryAction);
  }, [showError]);
  
  return { handleError };
};

// Hook for handling form errors
export const useFormError = () => {
  const { showError } = useError();
  
  const handleFormError = useCallback((
    error: any, 
    setFieldError?: (field: string, message: string) => void,
    retryAction?: () => void
  ) => {
    // If we have field-specific errors and a setFieldError function, use it
    if (error.response?.status === 400 && setFieldError) {
      const validationErrors = formatValidationErrors(error);
      let hasFieldErrors = false;
      
      validationErrors.forEach(errorMsg => {
        const colonIndex = errorMsg.indexOf(':');
        if (colonIndex > 0) {
          const field = errorMsg.substring(0, colonIndex).trim();
          const message = errorMsg.substring(colonIndex + 1).trim();
          setFieldError(field, message);
          hasFieldErrors = true;
        }
      });
      
      // If we successfully set field errors, don't show global notification
      if (hasFieldErrors) {
        return;
      }
    }
    
    // Show global error notification
    showError(error, retryAction);
  }, [showError]);
  
  return { handleFormError };
};

// Hook for async operations with error handling
export const useAsyncOperation = () => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  
  const execute = useCallback(async (
    operation: () => Promise<any>,
    options?: {
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
      retryAction?: () => void;
      showErrorNotification?: boolean;
    }
  ): Promise<any> => {
    try {
      setLoading(true);
      const result = await operation();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      if (options?.onError) {
        options.onError(error);
      }
      
      if (options?.showErrorNotification !== false) {
        showError(error, options?.retryAction);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [showError]);
  
  return { execute, loading };
};

export default ErrorProvider;