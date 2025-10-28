import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Request } from '../../types/request';

interface RequestDetailProps {
  open: boolean;
  onClose: () => void;
  onEdit?: (request: Request) => void;
  onStatusChange?: (request: Request, status: 'consumed' | 'cancelled') => void;
  request: Request | null;
}

const RequestDetail: React.FC<RequestDetailProps> = ({
  open,
  onClose,
  onEdit,
  onStatusChange,
  request,
}) => {
  if (!request) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'consumed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'consumed':
        return 'Consumido';
      case 'cancelled':
        return 'Cancelado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const totalProducts = request.products_used.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h6">
              Solicitação de Tratamento
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {request.status === 'pending' && onStatusChange && (
              <>
                <IconButton 
                  onClick={() => onStatusChange(request, 'consumed')}
                  color="success"
                  title="Marcar como Consumido"
                >
                  <CheckCircleIcon />
                </IconButton>
                <IconButton 
                  onClick={() => onStatusChange(request, 'cancelled')}
                  color="error"
                  title="Cancelar"
                >
                  <CancelIcon />
                </IconButton>
              </>
            )}
            {onEdit && request.status === 'pending' && (
              <IconButton onClick={() => onEdit(request)}>
                <EditIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Header Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">
                      ID da Solicitação
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {request.request_id.slice(-8)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">
                      Paciente
                    </Typography>
                    <Typography variant="body1">
                      {request.patient_name || 'Paciente não encontrado'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">
                      Data da Solicitação
                    </Typography>
                    <Typography variant="body1">
                      {format(parseISO(request.request_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={getStatusLabel(request.status)}
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Treatment Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  Informações do Tratamento
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Tipo de Tratamento
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {request.treatment_type}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Realizado por
                  </Typography>
                  <Typography variant="body1">
                    {request.performed_by_name || 'Não informado'}
                  </Typography>
                </Box>

                {request.notes && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Observações
                    </Typography>
                    <Typography variant="body2">
                      {request.notes}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumo
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {request.products_used.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Tipos de Produtos
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {totalProducts}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Quantidade Total
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Products Table */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Produtos Utilizados
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell align="center">Quantidade</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Data de Vencimento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {request.products_used.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {product.product_name || 'Produto não encontrado'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {product.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.lot}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(parseISO(product.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Metadata */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Criado em
                </Typography>
                <Typography variant="body2">
                  {format(parseISO(request.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </Typography>
              </Grid>
              {request.updated_at && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    Última atualização
                  </Typography>
                  <Typography variant="body2">
                    {format(parseISO(request.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        {onEdit && request.status === 'pending' && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit(request)}
          >
            Editar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RequestDetail;