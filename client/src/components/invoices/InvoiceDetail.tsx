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
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Invoice } from '../../types/invoice';

interface InvoiceDetailProps {
  open: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
  invoice: Invoice | null;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  open,
  onClose,
  onEdit,
  invoice,
}) => {
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovada';
      case 'rejected':
        return 'Rejeitada';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const totalProducts = invoice.products.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon color="primary" />
            <Typography variant="h6">
              Nota Fiscal {invoice.invoice_number}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onEdit && invoice.status !== 'approved' && (
              <IconButton onClick={() => onEdit(invoice)}>
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
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Número da NF
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {invoice.invoice_number}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Fornecedor
                  </Typography>
                  <Typography variant="body1">
                    {invoice.supplier}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Data de Emissão
                  </Typography>
                  <Typography variant="body1">
                    {format(parseISO(invoice.emission_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={getStatusLabel(invoice.status)}
                      color={getStatusColor(invoice.status) as any}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Summary */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {invoice.products.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Tipos de Produtos
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {totalProducts}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Quantidade Total
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(invoice.total_value)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Valor Total
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Products Table */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Produtos
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell align="center">Quantidade</TableCell>
                    <TableCell align="right">Preço Unitário</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Data de Vencimento</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Lote Fabricante</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.products.map((product, index) => (
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
                      <TableCell align="right">
                        <Typography variant="body2">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.unit_price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.quantity * product.unit_price)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(parseISO(product.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.lot}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.batch_number || '-'}
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
                  {format(parseISO(invoice.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </Typography>
              </Grid>
              {invoice.updated_at && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    Última atualização
                  </Typography>
                  <Typography variant="body2">
                    {format(parseISO(invoice.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
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
        {onEdit && invoice.status !== 'approved' && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit(invoice)}
          >
            Editar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetail;