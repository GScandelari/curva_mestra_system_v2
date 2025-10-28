import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import InventoryOverview from '../components/dashboard/InventoryOverview';
import ExpirationAlerts from '../components/dashboard/ExpirationAlerts';
import ActivitySummary from '../components/dashboard/ActivitySummary';
import ErrorBoundary from '../components/common/ErrorBoundary';

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { data, loading, error, refresh } = useDashboard();

  return (
    <ErrorBoundary>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard da Clínica
          </Typography>
          <Tooltip title="Atualizar dados">
            <IconButton onClick={refresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Welcome Section */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>Bem-vindo, {profile?.profile.first_name || 'Usuário'}!</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Papel: {profile?.role === 'system_admin' && 'Administrador do Sistema'}
                {profile?.role === 'clinic_admin' && 'Administrador da Clínica'}
                {profile?.role === 'clinic_user' && 'Usuário da Clínica'}
              </Typography>
            </Alert>
          </Grid>

          {/* Inventory Overview */}
          <Grid item xs={12} lg={6}>
            <InventoryOverview 
              inventory={data.inventory} 
              loading={loading}
            />
          </Grid>

          {/* Activity Summary */}
          <Grid item xs={12} lg={6}>
            <ActivitySummary 
              stats={data.stats} 
              loading={loading}
            />
          </Grid>

          {/* Expiration Alerts */}
          <Grid item xs={12}>
            <ExpirationAlerts 
              inventory={data.inventory} 
              loading={loading}
            />
          </Grid>

          {/* Real-time Metrics Display */}
          {data.realTimeMetrics && (
            <Grid item xs={12}>
              <Alert severity="success" variant="outlined">
                <Typography variant="body2">
                  <strong>Métricas em tempo real:</strong> {data.realTimeMetrics.total_products} produtos, {' '}
                  {data.realTimeMetrics.low_stock_alerts} alertas de estoque baixo, {' '}
                  {data.realTimeMetrics.expiring_soon} produtos vencendo em breve
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Última atualização: {new Date(data.realTimeMetrics.last_update).toLocaleString('pt-BR')}
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    </ErrorBoundary>
  );
};

export default DashboardPage;