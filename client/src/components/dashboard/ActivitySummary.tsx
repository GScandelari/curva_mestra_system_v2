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
  Grid,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardStats } from '../../types/dashboard';

interface ActivitySummaryProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ 
  stats, 
  loading = false 
}) => {
  const getActivityIcon = (type: string, action: string) => {
    const iconProps = { fontSize: 'small' as const };
    
    switch (action) {
      case 'created':
        return <AddIcon {...iconProps} color="success" />;
      case 'updated':
        return <EditIcon {...iconProps} color="primary" />;
      case 'viewed':
        return <VisibilityIcon {...iconProps} color="action" />;
      default:
        return <TrendingUpIcon {...iconProps} />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'success';
      case 'updated':
        return 'primary';
      case 'viewed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'created':
        return 'criou';
      case 'updated':
        return 'atualizou';
      case 'viewed':
        return 'visualizou';
      default:
        return action;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo de Atividades
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
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Resumo de Atividades
          </Typography>
        </Box>

        {/* Statistics Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <PeopleIcon />
              </Avatar>
              <Typography variant="h6">
                {stats?.total_patients || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Pacientes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                <ReceiptIcon />
              </Avatar>
              <Typography variant="h6">
                {stats?.total_invoices || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Notas Fiscais
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                <AssignmentIcon />
              </Avatar>
              <Typography variant="h6">
                {stats?.total_requests || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Solicitações
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Recent Activities */}
        <Typography variant="subtitle1" gutterBottom>
          Atividades Recentes
        </Typography>

        {!stats?.recent_activities || stats.recent_activities.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
            Nenhuma atividade recente
          </Typography>
        ) : (
          <List dense>
            {stats.recent_activities.slice(0, 6).map((activity) => (
              <ListItem key={activity.id} sx={{ px: 0 }}>
                <ListItemIcon>
                  {getActivityIcon(activity.type, activity.action)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        <strong>{activity.user_name}</strong> {getActionText(activity.action)} {activity.description}
                      </Typography>
                      <Chip
                        size="small"
                        label={activity.type === 'invoice' ? 'NF' : 
                              activity.type === 'request' ? 'SOL' : 'PAC'}
                        color={getActivityColor(activity.action) as any}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {format(parseISO(activity.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivitySummary;