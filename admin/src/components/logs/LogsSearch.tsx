import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import logsService, { AuditLog, LogsSearchFilters } from '../../services/logsService';

interface LogsSearchProps {
  onLogSelect?: (log: AuditLog) => void;
}

const LogsSearch: React.FC<LogsSearchProps> = ({ onLogSelect }) => {
  const [searchResults, setSearchResults] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);

  const [filters, setFilters] = useState<LogsSearchFilters>({
    q: '',
    limit: 50,
    offset: 0,
  });

  const handleFilterChange = (field: keyof LogsSearchFilters) => (value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = async () => {
    if (!filters.q && !filters.clinic_id && !filters.user_id && !filters.action_types && !filters.resource_types && !filters.start_date && !filters.end_date && !filters.ip_address) {
      setError('Por favor, forneça pelo menos um critério de busca');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await logsService.searchLogs(filters);
      setSearchResults(response.logs);
      setSearchMetadata(response.search_metadata);
    } catch (error: any) {
      console.error('Error searching logs:', error);
      setError(error.message || 'Failed to search logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({
      q: '',
      limit: 50,
      offset: 0,
    });
    setSearchResults([]);
    setSearchMetadata(null);
    setError(null);
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Busca Avançada de Logs
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            {/* General Search */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Busca Geral"
                placeholder="Digite palavras-chave para buscar em ações, recursos e detalhes..."
                value={filters.q || ''}
                onChange={(e) => handleFilterChange('q')(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Specific Filters */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID da Clínica"
                value={filters.clinic_id || ''}
                onChange={(e) => handleFilterChange('clinic_id')(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID do Usuário"
                value={filters.user_id || ''}
                onChange={(e) => handleFilterChange('user_id')(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tipos de Ação (separados por vírgula)"
                placeholder="create, update, delete"
                value={filters.action_types || ''}
                onChange={(e) => handleFilterChange('action_types')(e.target.value)}
                helperText="Ex: create, update, delete"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tipos de Recurso (separados por vírgula)"
                placeholder="user, clinic, product"
                value={filters.resource_types || ''}
                onChange={(e) => handleFilterChange('resource_types')(e.target.value)}
                helperText="Ex: user, clinic, product"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data Inicial"
                value={filters.start_date ? new Date(filters.start_date) : null}
                onChange={(date) => handleFilterChange('start_date')(date?.toISOString().split('T')[0])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data Final"
                value={filters.end_date ? new Date(filters.end_date) : null}
                onChange={(date) => handleFilterChange('end_date')(date?.toISOString().split('T')[0])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Endereço IP"
                value={filters.ip_address || ''}
                onChange={(e) => handleFilterChange('ip_address')(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Limite de Resultados</InputLabel>
                <Select
                  value={filters.limit || 50}
                  label="Limite de Resultados"
                  onChange={(e) => handleFilterChange('limit')(e.target.value)}
                >
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={200}>200</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                >
                  Limpar
                </Button>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Search Results */}
        {searchMetadata && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Encontrados {searchMetadata.total_results} resultados
              {searchMetadata.query && ` para "${searchMetadata.query}"`}
              {searchMetadata.filters_applied > 0 && ` com ${searchMetadata.filters_applied} filtros aplicados`}
            </Typography>
          </Paper>
        )}

        {searchResults.length > 0 && (
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
                {searchResults.map((log) => (
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
                      <Typography variant="body2">
                        {log.resource_type}
                      </Typography>
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {searchResults.length === 0 && searchMetadata && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              Nenhum log encontrado com os critérios especificados.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Tente ajustar os filtros ou usar termos de busca diferentes.
            </Typography>
          </Paper>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default LogsSearch;