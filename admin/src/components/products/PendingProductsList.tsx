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
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Checkbox,
  Toolbar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Visibility,
  Business,
  Inventory,
  SelectAll,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Product {
  product_id: string;
  name: string;
  description: string;
  rennova_code: string;
  category: string;
  unit_type: 'ml' | 'units' | 'vials';
  status: 'approved' | 'pending';
  requested_by_clinic_id?: string;
  approval_history: any[];
  created_at: any;
}

interface PendingProductsListProps {
  onProductApproved?: () => void;
}

const PendingProductsList: React.FC<PendingProductsListProps> = ({
  onProductApproved
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    product?: Product;
    notes: string;
    loading: boolean;
  }>({
    open: false,
    notes: '',
    loading: false,
  });
  const [batchApprovalDialog, setBatchApprovalDialog] = useState<{
    open: boolean;
    notes: string;
    loading: boolean;
  }>({
    open: false,
    notes: '',
    loading: false,
  });

  useEffect(() => {
    loadPendingProducts();
  }, []);

  const loadPendingProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch('/api/v1/products/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos pendentes');
      }

      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error loading pending products:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      const allProductIds = products.map(p => p.product_id);
      setSelectedProducts(new Set(allProductIds));
    }
  };

  const handleApproveProduct = async (productId: string, notes?: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/v1/products/${productId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Erro ao aprovar produto');
      }

      return true;
    } catch (error) {
      console.error('Error approving product:', error);
      throw error;
    }
  };

  const handleSingleApproval = async () => {
    if (!approvalDialog.product) return;

    try {
      setApprovalDialog(prev => ({ ...prev, loading: true }));
      
      await handleApproveProduct(approvalDialog.product.product_id, approvalDialog.notes);
      
      setApprovalDialog({ open: false, notes: '', loading: false });
      await loadPendingProducts();
      onProductApproved?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao aprovar produto');
    } finally {
      setApprovalDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleBatchApproval = async () => {
    if (selectedProducts.size === 0) return;

    try {
      setBatchApprovalDialog(prev => ({ ...prev, loading: true }));
      
      const productIds = Array.from(selectedProducts);
      const approvalPromises = productIds.map(productId =>
        handleApproveProduct(productId, batchApprovalDialog.notes)
      );

      await Promise.all(approvalPromises);
      
      setBatchApprovalDialog({ open: false, notes: '', loading: false });
      setSelectedProducts(new Set());
      await loadPendingProducts();
      onProductApproved?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao aprovar produtos');
    } finally {
      setBatchApprovalDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getUnitTypeLabel = (unitType: string) => {
    const labels = {
      ml: 'ml',
      units: 'Unidades',
      vials: 'Frascos'
    };
    return labels[unitType as keyof typeof labels] || unitType;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Produtos Pendentes de Aprovação
        </Typography>
        <Box>
          {selectedProducts.size > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircle />}
              onClick={() => setBatchApprovalDialog({ open: true, notes: '', loading: false })}
              sx={{ mr: 1 }}
            >
              Aprovar Selecionados ({selectedProducts.size})
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={loadPendingProducts}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {products.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Inventory sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Nenhum produto pendente de aprovação
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Todos os produtos foram aprovados ou não há solicitações pendentes.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <Toolbar sx={{ pl: 2, pr: 1 }}>
            <Checkbox
              indeterminate={selectedProducts.size > 0 && selectedProducts.size < products.length}
              checked={products.length > 0 && selectedProducts.size === products.length}
              onChange={handleSelectAll}
            />
            <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
              {selectedProducts.size > 0 ? `${selectedProducts.size} selecionados` : `${products.length} produtos`}
            </Typography>
          </Toolbar>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Tooltip title="Selecionar todos">
                      <IconButton size="small" onClick={handleSelectAll}>
                        <SelectAll />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell>Código Rennova</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell>Clínica Solicitante</TableCell>
                  <TableCell>Data da Solicitação</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.product_id}
                    selected={selectedProducts.has(product.product_id)}
                    hover
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProducts.has(product.product_id)}
                        onChange={() => handleSelectProduct(product.product_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {product.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.rennova_code}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{getUnitTypeLabel(product.unit_type)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Business sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {product.requested_by_clinic_id || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(product.created_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Visualizar detalhes">
                        <IconButton
                          size="small"
                          onClick={() => setApprovalDialog({
                            open: true,
                            product,
                            notes: '',
                            loading: false,
                          })}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Aprovar produto">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setApprovalDialog({
                            open: true,
                            product,
                            notes: '',
                            loading: false,
                          })}
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Single Product Approval Dialog */}
      <Dialog
        open={approvalDialog.open}
        onClose={() => !approvalDialog.loading && setApprovalDialog({ open: false, notes: '', loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Aprovar Produto: {approvalDialog.product?.name}
        </DialogTitle>
        <DialogContent>
          {approvalDialog.product && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Detalhes do Produto
              </Typography>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Nome:</strong> {approvalDialog.product.name}</Typography>
                <Typography variant="body2"><strong>Descrição:</strong> {approvalDialog.product.description}</Typography>
                <Typography variant="body2"><strong>Código Rennova:</strong> {approvalDialog.product.rennova_code}</Typography>
                <Typography variant="body2"><strong>Categoria:</strong> {approvalDialog.product.category}</Typography>
                <Typography variant="body2"><strong>Unidade:</strong> {getUnitTypeLabel(approvalDialog.product.unit_type)}</Typography>
                <Typography variant="body2"><strong>Solicitado em:</strong> {formatDate(approvalDialog.product.created_at)}</Typography>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observações da Aprovação (opcional)"
                value={approvalDialog.notes}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Adicione observações sobre a aprovação deste produto..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApprovalDialog({ open: false, notes: '', loading: false })}
            disabled={approvalDialog.loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSingleApproval}
            variant="contained"
            color="primary"
            disabled={approvalDialog.loading}
            startIcon={approvalDialog.loading ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {approvalDialog.loading ? 'Aprovando...' : 'Aprovar Produto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Approval Dialog */}
      <Dialog
        open={batchApprovalDialog.open}
        onClose={() => !batchApprovalDialog.loading && setBatchApprovalDialog({ open: false, notes: '', loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Aprovar {selectedProducts.size} Produtos
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Você está prestes a aprovar {selectedProducts.size} produtos de uma vez.
              Esta ação não pode ser desfeita.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observações da Aprovação (opcional)"
              value={batchApprovalDialog.notes}
              onChange={(e) => setBatchApprovalDialog(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Adicione observações sobre a aprovação em lote..."
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBatchApprovalDialog({ open: false, notes: '', loading: false })}
            disabled={batchApprovalDialog.loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleBatchApproval}
            variant="contained"
            color="primary"
            disabled={batchApprovalDialog.loading}
            startIcon={batchApprovalDialog.loading ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {batchApprovalDialog.loading ? 'Aprovando...' : 'Aprovar Todos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingProductsList;