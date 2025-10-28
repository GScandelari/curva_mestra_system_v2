import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Computer as ComputerIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { AuditLog } from '../../services/logsService';

interface LogDetailProps {
  log: AuditLog;
  onBack?: () => void;
}

const LogDetail: React.FC<LogDetailProps> = ({ log, onBack }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActionTypeColor = (actionType: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (actionType.toLowerCase()) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'error';
      case 'read':
        return 'default';
      case 'login':
        return 'primary';
      case 'logout':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const renderDetails = (details: any) => {
    if (!details || typeof details !== 'object') {
      return (
        <Typography variant="body2" color="textSecondary">
          Nenhum detalhe disponível
        </Typography>
      );
    }

    const renderValue = (value: any): string => {
      if (value === null || value === undefined) {
        return 'N/A';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    };

    return (
      <TableContainer>
        <Table size="small">
          <TableBody>
            {Object.entries(details).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', width: '30%' }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: typeof value === 'object' ? 'monospace' : 'inherit',
                      fontSize: typeof value === 'object' ? '0.75rem' : 'inherit',
                    }}
                  >
                    {renderValue(value)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
        )}
        <Box flexGrow={1}>
          <Typography variant="h5" component="h2">
            Detalhes do Log
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ID: {log.log_id}
          </Typography>
        </Box>
        <Chip
          label={log.action_type}
          color={getActionTypeColor(log.action_type)}
          size="medium"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Informações Básicas
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Data e Hora
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(log.timestamp)}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Tipo de Ação
                </Typography>
                <Chip
                  label={log.action_type}
                  color={getActionTypeColor(log.action_type)}
                  size="small"
                />
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Tipo de Recurso
                </Typography>
                <Typography variant="body1">
                  {log.resource_type}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  ID do Recurso
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {log.resource_id}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User and Clinic Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Usuário e Clínica
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  ID do Usuário
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {log.user_id}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  ID da Clínica
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {log.clinic_id || 'Sistema Global'}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Endereço IP
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {log.ip_address || 'N/A'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  User Agent
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    wordBreak: 'break-word',
                    fontSize: '0.75rem',
                    color: 'text.secondary'
                  }}
                >
                  {log.user_agent || 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Technical Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ComputerIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Informações Técnicas
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  ID do Log
                </Typography>
                <Typography variant="body1" fontFamily="monospace" fontSize="0.875rem">
                  {log.log_id}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Timestamp (UTC)
                </Typography>
                <Typography variant="body1" fontFamily="monospace" fontSize="0.875rem">
                  {new Date(log.timestamp).toISOString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  Timestamp (Unix)
                </Typography>
                <Typography variant="body1" fontFamily="monospace" fontSize="0.875rem">
                  {Math.floor(new Date(log.timestamp).getTime() / 1000)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <InfoIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Detalhes da Operação
                </Typography>
              </Box>
              
              {renderDetails(log.details)}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LogDetail;