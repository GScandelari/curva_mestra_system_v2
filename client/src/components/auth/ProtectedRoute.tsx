import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallbackPath = '/dashboard',
}) => {
  const { user, profile, loading, hasPermission, isRole } = useAuth();
  const location = useLocation();

  // Show loading while authentication state is being determined
  if (loading) {
    return null; // The main App component handles loading state
  }

  // Redirect to login if not authenticated
  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && !isRole(requiredRole)) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <Lock sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Acesso Negado
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Você não tem permissão para acessar esta página.
            {requiredRole && ` É necessário ter o papel: ${requiredRole}`}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <Lock sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Acesso Negado
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Você não tem permissão para acessar esta página.
            {requiredPermission && ` É necessário ter a permissão: ${requiredPermission}`}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;