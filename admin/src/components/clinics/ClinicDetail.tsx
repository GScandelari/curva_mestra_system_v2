import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  People as PeopleIcon,
  LocalHospital as PatientIcon,
  Inventory as ProductIcon,
  Timeline as ActivityIcon,
  ArrowBack as BackIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import clinicService, { Clinic, ClinicStats, User, ClinicAuditLog } from '../../services/clinicService';

interface ClinicDetailProps {
  clinic: Clinic;
  onBack?: () => void;
  onEdit?: (clinic: Clinic) => void;
  onStatusToggle?: (clinic: Clinic) => void;
  onCreateUser?: (clinicId: string) => void;
  onEditUser?: (clinic: Clinic, user: User) => void;
}

const ClinicDetail: React.FC<ClinicDetailProps> = ({
  clinic,
  onBack,
  onEdit,
  onStatusToggle,
  onCreateUser,
  onEditUser,
}) => {
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<ClinicAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [expandedAuditLog, setExpandedAuditLog] = useState<string | null>(null);

  const loadClinicData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, usersData] = await Promise.all([
        clinicService.getClinicStats(clinic.clinic_id),
        clinicService.getClinicUsers(clinic.clinic_id),
      ]);

      setStats(statsData);
      setUsers(usersData);
    } catch (error: any) {
      console.error('Error loading clinic data:', error);
      setError(error.message || 'Failed to load clinic data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (page: number = 1, filter: string = 'all') => {
    try {
      setAuditLoading(true);
      const limit = 10;
      const offset = (page - 1) * limit;
      
      const logs = await clinicService.getClinicAuditLogs(clinic.clinic_id, limit, offset);
      
      // Filter logs by type if not 'all'
      const filteredLogs = filter === 'all' 
        ? logs 
        : logs.filter(log => log.action_type === filter);
      
      setAuditLogs(filteredLogs);
      setAuditTotalPages(Math.ceil(filteredLogs.length / limit));
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      setError(error.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
    loadAuditLogs(1, auditFilter);
  }, [clinic.clinic_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAuditLogs(auditPage, auditFilter);
  }, [auditPage, auditFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      await clinicService.deleteUser(clinic.clinic_id, userToDelete.user_id);
      setUsers(users.filter(u => u.user_id !== userToDelete.user_id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'clinic_admin':
        return 'Administrador';
      case 'clinic_user':
        return 'Usuário';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string): "default" | "primary" | "secondary" => {
    switch (role) {
      case 'clinic_admin':
        return 'primary';
      case 'clinic_user':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getAuditActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'clinic_created':
        return 'Clínica Criada';
      case 'clinic_updated':
        return 'Clínica Atualizada';
      case 'clinic_status_changed':
        return 'Status Alterado';
      default:
        return actionType;
    }
  };

  const getAuditActionColor = (actionType: string): "default" | "primary" | "secondary" | "success" | "warning" | "error" => {
    switch (actionType) {
      case 'clinic_created':
        return 'success';
      case 'clinic_updated':
        return 'primary';
      case 'clinic_status_changed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  const handleAuditFilterChange = (event: any) => {
    setAuditFilter(event.target.value);
    setAuditPage(1);
  };

  const handleAuditPageChange = (event: any, page: number) => {
    setAuditPage(page);
  };

  const toggleAuditLogExpansion = (logId: string) => {
    setExpandedAuditLog(expandedAuditLog === logId ? null : logId);
  };

  const handleStatusToggle = async () => {
    if (!onStatusToggle) return;
    
    try {
      setStatusToggling(true);
      onStatusToggle(clinic);
      
      // Reload audit logs after a short delay to ensure the audit log is created
      setTimeout(async () => {
        try {
          await loadAuditLogs(auditPage, auditFilter);
        } catch (error) {
          console.warn('Failed to reload audit logs:', error);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error toggling status:', error);
      setError(error.message || 'Failed to toggle clinic status');
    } finally {
      setStatusToggling(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadClinicData(),
      loadAuditLogs(auditPage, auditFilter)
    ]);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        {onBack && (
          <Tooltip title="Voltar à lista">
            <IconButton 
              onClick={onBack} 
              sx={{ mr: 2 }}
              disabled={loading || statusToggling}
            >
              <BackIcon />
            </IconButton>
          </Tooltip>
        )}
        <Box flexGrow={1}>
          <Typography variant="h5" component="h2">
            {clinic.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {clinic.address}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Atualizar dados">
            <IconButton
              onClick={handleRefresh}
              disabled={loading || statusToggling}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {onStatusToggle && (
            <Button
              variant="outlined"
              color={clinic.status === 'active' ? 'error' : 'success'}
              onClick={handleStatusToggle}
              disabled={statusToggling || loading}
              startIcon={statusToggling ? <CircularProgress size={16} /> : null}
            >
              {statusToggling 
                ? 'Processando...' 
                : clinic.status === 'active' ? 'Desativar' : 'Ativar'
              }
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => onEdit(clinic)}
              disabled={loading || statusToggling}
            >
              Editar Clínica
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PeopleIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {stats.total_users}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Usuários
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PatientIcon color="secondary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="secondary">
                      {stats.total_patients}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pacientes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ProductIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {stats.total_products}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Produtos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ActivityIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {stats.recent_activity_count}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Atividades (7 dias)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Clinic Information */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Informações Básicas
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Nome da Clínica
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.name}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  CNPJ
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.cnpj || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={clinic.status === 'active' ? 'Ativa' : 'Inativa'}
                    color={clinic.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Criada em
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(clinic.created_at)}
                </Typography>
              </Grid>
              {clinic.updated_at && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Última atualização
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(clinic.updated_at)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Contact Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Informações de Contato
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.email || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Telefone
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.phone || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Endereço
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.address}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Cidade
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.city || 'Não informado'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* System Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configurações do Sistema
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Fuso Horário
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {clinic.settings.timezone}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Configurações de Notificação
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                label="Alertas de Estoque"
                color={clinic.settings.notification_preferences.low_stock_alerts ? 'success' : 'default'}
                size="small"
              />
              <Chip
                label="Alertas de Vencimento"
                color={clinic.settings.notification_preferences.expiration_alerts ? 'success' : 'default'}
                size="small"
              />
              <Chip
                label="Notificações por Email"
                color={clinic.settings.notification_preferences.email_notifications ? 'success' : 'default'}
                size="small"
              />
              <Chip
                label={`${clinic.settings.notification_preferences.alert_threshold_days} dias de alerta`}
                variant="outlined"
                size="small"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Audit History */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center">
            <HistoryIcon sx={{ mr: 1 }} />
            Histórico de Auditoria
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por Ação</InputLabel>
            <Select
              value={auditFilter}
              label="Filtrar por Ação"
              onChange={handleAuditFilterChange}
              startAdornment={<FilterIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="all">Todas as Ações</MenuItem>
              <MenuItem value="clinic_created">Clínica Criada</MenuItem>
              <MenuItem value="clinic_updated">Clínica Atualizada</MenuItem>
              <MenuItem value="clinic_status_changed">Status Alterado</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {auditLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : auditLogs.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="textSecondary">
              Nenhum registro de auditoria encontrado
            </Typography>
          </Box>
        ) : (
          <>
            {auditLogs.map((log) => (
              <Accordion
                key={log.log_id}
                expanded={expandedAuditLog === log.log_id}
                onChange={() => toggleAuditLogExpansion(log.log_id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" width="100%">
                    <Chip
                      label={getAuditActionLabel(log.action_type)}
                      color={getAuditActionColor(log.action_type)}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {formatDateTime(log.timestamp)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      ID: {log.user_id}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">
                        Usuário
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {log.user_id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">
                        Data/Hora
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formatDateTime(log.timestamp)}
                      </Typography>
                    </Grid>
                    {log.ip_address && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">
                          Endereço IP
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {log.ip_address}
                        </Typography>
                      </Grid>
                    )}
                    {log.severity && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">
                          Severidade
                        </Typography>
                        <Chip
                          label={log.severity.toUpperCase()}
                          color={log.severity === 'error' ? 'error' : log.severity === 'warning' ? 'warning' : 'info'}
                          size="small"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        Detalhes
                      </Typography>
                      <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {log.details.changes && (
                          <Box mb={1}>
                            <Typography variant="body2" fontWeight="bold">
                              Alterações:
                            </Typography>
                            <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(log.details.changes, null, 2)}
                            </pre>
                          </Box>
                        )}
                        {log.details.old_status && log.details.new_status && (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              Mudança de Status:
                            </Typography>
                            <Typography variant="body2">
                              {log.details.old_status} → {log.details.new_status}
                            </Typography>
                          </Box>
                        )}
                        {log.details.clinic_name && (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              Clínica:
                            </Typography>
                            <Typography variant="body2">
                              {log.details.clinic_name}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}

            {auditTotalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={auditTotalPages}
                  page={auditPage}
                  onChange={handleAuditPageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Users Management */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Usuários da Clínica
          </Typography>
          {onCreateUser && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => onCreateUser(clinic.clinic_id)}
            >
              Novo Usuário
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Função</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell>Último Login</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhum usuário encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {user.profile.first_name} {user.profile.last_name}
                      </Typography>
                      {user.profile.phone && (
                        <Typography variant="body2" color="textSecondary">
                          {user.profile.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1} justifyContent="flex-end">
                        {onEditUser && (
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => onEditUser(clinic, user)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {user.role !== 'clinic_admin' && (
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o usuário "{userToDelete?.profile.first_name} {userToDelete?.profile.last_name}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClinicDetail;