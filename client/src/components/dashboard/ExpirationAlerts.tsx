import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InventoryItem } from '../../types/dashboard';

interface ExpirationAlertsProps {
  inventory: InventoryItem[];
  loading?: boolean;
}

interface ExpirationAlert {
  product_name: string;
  lot: string;
  quantity: number;
  expiration_date: string;
  days_until_expiry: number;
  severity: 'error' | 'warning' | 'info';
}

const ExpirationAlerts: React.FC<ExpirationAlertsProps> = ({ 
  inventory = [], 
  loading = false 
}) => {
  const getExpirationAlerts = (): ExpirationAlert[] => {
    const alerts: ExpirationAlert[] = [];
    const today = new Date();

    inventory.forEach(item => {
      item.expiration_dates.forEach(expEntry => {
        const expirationDate = parseISO(expEntry.date);
        const daysUntilExpiry = differenceInDays(expirationDate, today);

        // Only show items expiring within 60 days
        if (daysUntilExpiry <= 60) {
          let severity: 'error' | 'warning' | 'info' = 'info';
          
          if (daysUntilExpiry < 0) {
            severity = 'error'; // Expired
          } else if (daysUntilExpiry <= 7) {
            severity = 'error'; // Expires within a week
          } else if (daysUntilExpiry <= 30) {
            severity = 'warning'; // Expires within a month
          }

          alerts.push({
            product_name: item.product_name,
            lot: expEntry.lot,
            quantity: expEntry.quantity,
            expiration_date: expEntry.date,
            days_until_expiry: daysUntilExpiry,
            severity,
          });
        }
      });
    });

    // Sort by days until expiry (most urgent first)
    return alerts.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  };

  const alerts = getExpirationAlerts();
  const expiredItems = alerts.filter(alert => alert.days_until_expiry < 0);
  const expiringThisWeek = alerts.filter(alert => 
    alert.days_until_expiry >= 0 && alert.days_until_expiry <= 7
  );
  const expiringThisMonth = alerts.filter(alert => 
    alert.days_until_expiry > 7 && alert.days_until_expiry <= 30
  );

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <ScheduleIcon color="info" />;
    }
  };

  const getAlertMessage = (alert: ExpirationAlert) => {
    if (alert.days_until_expiry < 0) {
      return `Vencido há ${Math.abs(alert.days_until_expiry)} dias`;
    } else if (alert.days_until_expiry === 0) {
      return 'Vence hoje';
    } else if (alert.days_until_expiry === 1) {
      return 'Vence amanhã';
    } else {
      return `Vence em ${alert.days_until_expiry} dias`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Alertas de Vencimento
          </Typography>
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ScheduleIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography variant="h6">
            Alertas de Vencimento
          </Typography>
        </Box>

        {alerts.length === 0 ? (
          <Alert severity="success">
            Nenhum produto próximo ao vencimento
          </Alert>
        ) : (
          <>
            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {expiredItems.length > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${expiredItems.length} vencidos`}
                  color="error"
                  size="small"
                />
              )}
              {expiringThisWeek.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${expiringThisWeek.length} esta semana`}
                  color="error"
                  variant="outlined"
                  size="small"
                />
              )}
              {expiringThisMonth.length > 0 && (
                <Chip
                  icon={<ScheduleIcon />}
                  label={`${expiringThisMonth.length} este mês`}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            {/* Alert List */}
            <List dense>
              {alerts.slice(0, 8).map((alert, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getAlertIcon(alert.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {alert.product_name}
                        </Typography>
                        <Chip
                          size="small"
                          label={`Lote: ${alert.lot}`}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`${alert.quantity} un.`}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">
                          {format(parseISO(alert.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={alert.severity === 'error' ? 'error.main' : 'warning.main'}
                          sx={{ fontWeight: 'medium' }}
                        >
                          {getAlertMessage(alert)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {alerts.length > 8 && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText>
                    <Typography variant="body2" color="textSecondary">
                      ... e mais {alerts.length - 8} alertas
                    </Typography>
                  </ListItemText>
                </ListItem>
              )}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpirationAlerts;