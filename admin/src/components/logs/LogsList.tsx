import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  TablePagination,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Assessment as StatsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import logsService, { AuditLog, LogsFilters, LogsStats } from '../../services/logsService';

interface LogsListProps {
  onLogSelect?: (log: AuditLog) => void;
}

const LogsList: React.FC<LogsListProps> = ({ onLogSelect }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<LogsFilters>({
    limit: 25,
    offset: 0,
  });

  const [tempFilters, setTempFilters] = useState<LogsFilters>({});

  const loadLogs = async (newFilters?: LogsFilters) => {
    try {
      setLoading(true);
      setError(null);

      const currentFilters = newFilters || filters;
      const response = await logsService.getLogs(currentFilters);
      
      setLogs(response.logs);
      setTotalCount(response.pagination.total);
    } catch (error: any) {
      console.error('Error loading logs:', error);
      setError(error.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await logsService.getLogsStats({
        clinic_id: filters.clinic_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
      });
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showStats) {
      loadStats();
    }
  }, [showStats, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
    const newFilters = {
      ...filters,
      offset: newPage * rowsPerPage,
    };
    setFilters(newFilters);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    const newFilters = {
      ...filters,
      limit: newRowsPerPage,
      offset: 0,
    };
    setFilters(newFilters);
  };

  const handleFilterChange = (field: keyof LogsFilters) => (value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setPage(0);
    setFilters({
      ...tempFilters,
      limit: rowsPerPage,
      offset: 0,
    });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTempFilters({});
    setPage(0);
    setFilters({
      limit: rowsPerPage,
      offset: 0,
    });
    setShowFilters(false);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await logsService.exportLogs({
        clinic_id: filters.clinic_id,
        user_id: filters.user_id,
        action_type: filters.action_type,
        resource_type: filters.resource_type,
        start_date: filters.start_date,
        end_date: filters.end_date,
      });
      
      logsService.downloadLogsFile(blob);
    } catch (error: any) {
      console.error('Error exporting logs:', error);
      setError(error.message || 'Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

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

  const getResourceTypeIcon = (resourceType: string) => {
    // You can add icons based on resource type
    return null;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            Logs do Sistema
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadLogs()}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(true)}
            >
              Filtros
            </Button>
            <Button
              variant="outlined"
              startIcon={<StatsIcon />}
              onClick={() => setShowStats(!showStats)}
            >
              Estatísticas
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {showStats && stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    {stats.total_logs}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total de Logs
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="secondary">
                    {Object.keys(stats.action_types).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Tipos de Ação
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {Object.keys(stats.users).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Usuários Ativos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">
                    {Object.keys(stats.clinics).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Clínicas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Clínica</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Recurso</TableCell>
                <TableCell>IP</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhum log encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.log_id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(log.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.user_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.clinic_id || 'Sistema'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action_type}
                        color={getActionTypeColor(log.action_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getResourceTypeIcon(log.resource_type)}
                        <Typography variant="body2">
                          {log.resource_type}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {log.ip_address || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {onLogSelect && (
                        <Tooltip title="Visualizar Detalhes">
                          <IconButton
                            size="small"
                            onClick={() => onLogSelect(log)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            labelRowsPerPage="Logs por página:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </TableContainer>

        {/* Filters Dialog */}
        <Dialog
          open={showFilters}
          onClose={() => setShowFilters(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Filtrar Logs</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID da Clínica"
                  value={tempFilters.clinic_id || ''}
                  onChange={(e) => handleFilterChange('clinic_id')(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID do Usuário"
                  value={tempFilters.user_id || ''}
                  onChange={(e) => handleFilterChange('user_id')(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Ação</InputLabel>
                  <Select
                    value={tempFilters.action_type || ''}
                    label="Tipo de Ação"
                    onChange={(e) => handleFilterChange('action_type')(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="create">Create</MenuItem>
                    <MenuItem value="read">Read</MenuItem>
                    <MenuItem value="update">Update</MenuItem>
                    <MenuItem value="delete">Delete</MenuItem>
                    <MenuItem value="login">Login</MenuItem>
                    <MenuItem value="logout">Logout</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Recurso</InputLabel>
                  <Select
                    value={tempFilters.resource_type || ''}
                    label="Tipo de Recurso"
                    onChange={(e) => handleFilterChange('resource_type')(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="user">Usuário</MenuItem>
                    <MenuItem value="clinic">Clínica</MenuItem>
                    <MenuItem value="product">Produto</MenuItem>
                    <MenuItem value="patient">Paciente</MenuItem>
                    <MenuItem value="invoice">Nota Fiscal</MenuItem>
                    <MenuItem value="request">Solicitação</MenuItem>
                    <MenuItem value="inventory">Estoque</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Data Inicial"
                  value={tempFilters.start_date ? new Date(tempFilters.start_date) : null}
                  onChange={(date) => handleFilterChange('start_date')(date?.toISOString().split('T')[0])}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Data Final"
                  value={tempFilters.end_date ? new Date(tempFilters.end_date) : null}
                  onChange={(date) => handleFilterChange('end_date')(date?.toISOString().split('T')[0])}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={clearFilters}>
              Limpar
            </Button>
            <Button onClick={() => setShowFilters(false)}>
              Cancelar
            </Button>
            <Button onClick={applyFilters} variant="contained">
              Aplicar Filtros
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default LogsList;