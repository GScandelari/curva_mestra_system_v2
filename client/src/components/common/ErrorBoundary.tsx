import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { createErrorBoundaryInfo, logError } from '../../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo });

    // Log error
    const boundaryInfo = createErrorBoundaryInfo(error, errorInfo);
    logError(error, boundaryInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    
    // Create bug report data
    const bugReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // In a real application, this would send the report to a bug tracking system
    console.log('Bug report:', bugReport);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2)).then(() => {
      alert('Informações do erro copiadas para a área de transferência. Por favor, envie para o suporte.');
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2
              }}
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Ops! Algo deu errado
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada automaticamente.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <AlertTitle>Detalhes do Erro</AlertTitle>
              <Typography variant="body2">
                ID do Erro: <code>{this.state.errorId}</code>
              </Typography>
              {this.state.error?.message && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Mensagem: {this.state.error.message}
                </Typography>
              )}
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                color="primary"
              >
                Tentar Novamente
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Ir para Início
              </Button>
              
              <Button
                variant="text"
                startIcon={<BugReportIcon />}
                onClick={this.handleReportBug}
                size="small"
              >
                Reportar Bug
              </Button>
            </Stack>

            {this.props.showDetails && process.env.NODE_ENV === 'development' && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h6" gutterBottom>
                    Detalhes Técnicos (Desenvolvimento)
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>Stack Trace</AlertTitle>
                    <Typography
                      component="pre"
                      variant="body2"
                      sx={{
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: 200,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {this.state.error?.stack}
                    </Typography>
                  </Alert>

                  {this.state.errorInfo?.componentStack && (
                    <Alert severity="warning">
                      <AlertTitle>Component Stack</AlertTitle>
                      <Typography
                        component="pre"
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: 200,
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

// Hook for error boundary context
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    // This will trigger the nearest error boundary
    throw error;
  }, []);

  return { handleError };
};

// Async error handler hook
export const useAsyncError = () => {
  const [, setError] = React.useState();
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};

export default ErrorBoundary;