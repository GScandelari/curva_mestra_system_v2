import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
  InputAdornment,
  TablePagination,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  PowerSettingsNew as PowerIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import clinicService, { Clinic, ClinicStats, ClinicFilters } from '../../services/clinicService';

interface ClinicListProps {
  onClinicSelect?: (clinic: Clinic) => void;
  onCreateClinic?: () => void;
  onEditClinic?: (clinic: Clinic) => void;
  onStatusToggle?: (clinic: Clinic) => void;
}

const ClinicList: React.FC<ClinicListProps> = ({
  onClinicSelect,
  onCreateClinic,
  onEditClinic,
  onStatusToggle,
}) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicStats, setClinicStats] = useState<Record<string, ClinicStats>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState<Clinic | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Status toggle state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [clinicToToggle, setClinicToToggle] = useState<Clinic | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'city'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalClinics, setTotalClinics] = useState(0);
  
  // Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const loadClinics = async (search?: string, filters?: ClinicFilters, resetPage = false) => {
    try {
      setLoading(true);
      setError(null);
      
      if (resetPage) {
        setPage(0);
      }
      
      const clinicsData = await clinicService.getClinics(search, filters);
      setClinics(clinicsData);
      setTotalClinics(clinicsData.length);

      // Load stats for each clinic in background
      setLoadingStats(true);
      const statsPromises = clinicsData.map(async (clinic) => {
        try {
          const stats = await clinicService.getClinicStats(clinic.clinic_id);
          return { clinicId: clinic.clinic_id, stats };
        } catch (error) {
          console.warn(`Failed to load stats for clinic ${clinic.clinic_id}:`, error);
          return { clinicId: clinic.clinic_id, stats: null };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, ClinicStats> = {};
      statsResults.forEach(({ clinicId, stats }) => {
        if (stats) {
          statsMap[clinicId] = stats;
        }
      });
      setClinicStats(statsMap);
      setLoadingStats(false);
    } catch (error: any) {
      console.error('Error loading clinics:', error);
      setError(error.message || 'Failed to load clinics');
      setLoadingStats(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((search: string, filters: ClinicFilters) => {
      loadClinics(search, filters);
    }, 300),
    []
  );

  useEffect(() => {
    loadClinics();
  }, []);

  // Effect to handle search and filter changes
  useEffect(() => {
    const filters: ClinicFilters = {
      status: statusFilter,
      sortBy,
      sortOrder,
    };

    if (searchTerm.trim()) {
      debouncedSearch(searchTerm.trim(), filters);
    } else {
      loadClinics('', filters, true); // Reset page when filters change
    }

    // Cleanup debounced function on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, statusFilter, sortBy, sortOrder, debouncedSearch]);

  const handleDeleteClick = (clinic: Clinic) => {
    setClinicToDelete(clinic);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clinicToDelete) return;

    try {
      setDeleting(true);
      await clinicService.deleteClinic(clinicToDelete.clinic_id);
      setClinics(clinics.filter(c => c.clinic_id !== clinicToDelete.clinic_id));
      setDeleteDialogOpen(false);
      setClinicToDelete(null);
    } catch (error: any) {
      console.error('Error deleting clinic:', error);
      setError(error.message || 'Failed to delete clinic');
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const handleSort = (column: 'name' | 'created_at' | 'city') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusToggleClick = (clinic: Clinic) => {
    setClinicToToggle(clinic);
    setStatusDialogOpen(true);
  };

  const handleStatusToggleConfirm = async () => {
    if (!clinicToToggle) return;

    try {
      setTogglingStatus(true);
      const newStatus = clinicToToggle.status === 'active' ? 'inactive' : 'active';
      const updatedClinic = await clinicService.toggleClinicStatus(clinicToToggle.clinic_id, newStatus);
      
      // Update the clinic in the list
      setClinics(clinics.map(c => 
        c.clinic_id === clinicToToggle.clinic_id ? updatedClinic : c
      ));
      
      setStatusDialogOpen(false);
      setClinicToToggle(null);
      
      // Call the parent callback if provided
      if (onStatusToggle) {
        onStatusToggle(updatedClinic);
      }
    } catch (error: any) {
      console.error('Error toggling clinic status:', error);
      setError(error.message || 'Failed to toggle clinic status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

  // Get paginated clinics
  const paginatedClinics = clinics.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderSkeletonRows = () => {
    const columnCount = isMobile ? 4 : 10; // Adjust based on responsive columns
    return Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={index}>
        {Array.from({ length: columnCount }).map((_, cellIndex) => (
          <TableCell key={cellIndex}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Gerenciamento de Clínicas
        </Typography>
        {onCreateClinic && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateClinic}
          >
            Nova Clínica
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box 
          display="flex" 
          gap={2} 
          alignItems="center" 
          flexDirection={isMobile ? 'column' : 'row'}
          sx={{ '& > *': { width: isMobile ? '100%' : 'auto' } }}
        >
          <TextField
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: isMobile ? '100%' : 300, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Status"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Ativas</MenuItem>
              <MenuItem value="inactive">Inativas</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: isMobile ? 800 : 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Nome
                </TableSortLabel>
              </TableCell>
              {!isMobile && <TableCell>CNPJ</TableCell>}
              {!isMobile && <TableCell>Email</TableCell>}
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'city'}
                  direction={sortBy === 'city' ? sortOrder : 'asc'}
                  onClick={() => handleSort('city')}
                >
                  Cidade
                </TableSortLabel>
              </TableCell>
              {!isMobile && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'created_at'}
                    direction={sortBy === 'created_at' ? sortOrder : 'asc'}
                    onClick={() => handleSort('created_at')}
                  >
                    Criada em
                  </TableSortLabel>
                </TableCell>
              )}
              {!isMobile && <TableCell>Usuários</TableCell>}
              {!isMobile && <TableCell>Pacientes</TableCell>}
              {!isMobile && <TableCell>Produtos</TableCell>}
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : paginatedClinics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : 10} align="center">
                  <Typography variant="body2" color="textSecondary">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Nenhuma clínica encontrada com os filtros aplicados' 
                      : 'Nenhuma clínica encontrada'
                    }
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedClinics.map((clinic) => {
                const stats = clinicStats[clinic.clinic_id];
                return (
                  <TableRow key={clinic.clinic_id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {clinic.name}
                        </Typography>
                        {isMobile && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {clinic.cnpj || 'N/A'} • {clinic.email || 'N/A'}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {clinic.cnpj || 'N/A'}
                        </Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {clinic.email || 'N/A'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {clinic.city || 'N/A'}
                      </Typography>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        {formatDate(clinic.created_at)}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        {loadingStats && !stats ? (
                          <Skeleton variant="rectangular" width={60} height={24} />
                        ) : (
                          <Chip
                            icon={<PeopleIcon />}
                            label={stats?.total_users || 0}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        {loadingStats && !stats ? (
                          <Skeleton variant="rectangular" width={40} height={24} />
                        ) : (
                          <Chip
                            label={stats?.total_patients || 0}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        {loadingStats && !stats ? (
                          <Skeleton variant="rectangular" width={40} height={24} />
                        ) : (
                          <Chip
                            label={stats?.total_products || 0}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip
                        label={clinic.status === 'active' ? 'Ativa' : 'Inativa'}
                        size="small"
                        color={clinic.status === 'active' ? 'success' : 'error'}
                        variant={clinic.status === 'active' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1} justifyContent="flex-end">
                        {onClinicSelect && (
                          <Tooltip title="Visualizar">
                            <IconButton
                              size="small"
                              onClick={() => onClinicSelect(clinic)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onEditClinic && (
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => onEditClinic(clinic)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={clinic.status === 'active' ? 'Desativar' : 'Ativar'}>
                          <IconButton
                            size="small"
                            color={clinic.status === 'active' ? 'warning' : 'success'}
                            onClick={() => handleStatusToggleClick(clinic)}
                          >
                            <PowerIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(clinic)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!loading && clinics.length > 0 && (
        <TablePagination
          component="div"
          count={totalClinics}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a clínica "{clinicToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita e todos os dados da clínica serão permanentemente removidos.
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

      {/* Status Toggle Confirmation Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => !togglingStatus && setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {clinicToToggle?.status === 'active' ? 'Desativar Clínica' : 'Ativar Clínica'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja {clinicToToggle?.status === 'active' ? 'desativar' : 'ativar'} a clínica "{clinicToToggle?.name}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Status atual: <strong>{clinicToToggle?.status === 'active' ? 'Ativa' : 'Inativa'}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Novo status: <strong>{clinicToToggle?.status === 'active' ? 'Inativa' : 'Ativa'}</strong>
          </Typography>
          {clinicToToggle?.status === 'active' && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
              ⚠️ Ao desativar a clínica, os usuários não conseguirão mais fazer login no sistema.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setStatusDialogOpen(false)}
            disabled={togglingStatus}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStatusToggleConfirm}
            color={clinicToToggle?.status === 'active' ? 'warning' : 'success'}
            variant="contained"
            disabled={togglingStatus}
            startIcon={togglingStatus ? <CircularProgress size={16} /> : <PowerIcon />}
          >
            {togglingStatus 
              ? (clinicToToggle?.status === 'active' ? 'Desativando...' : 'Ativando...')
              : (clinicToToggle?.status === 'active' ? 'Desativar' : 'Ativar')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClinicList;