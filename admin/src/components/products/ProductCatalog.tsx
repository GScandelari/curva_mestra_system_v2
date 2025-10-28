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
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  Inventory,
  CheckCircle,
  FilterList,
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

interface ProductCatalogProps {
  onProductUpdated?: () => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({
  onProductUpdated
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  
  const [productDialog, setProductDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    product?: Product;
    formData: {
      name: string;
      description: string;
      rennova_code: string;
      category: string;
      unit_type: string;
    };
    loading: boolean;
  }>({
    open: false,
    mode: 'create',
    formData: {
      name: '',
      description: '',
      rennova_code: '',
      category: '',
      unit_type: 'ml',
    },
    loading: false,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, unitTypeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch('/api/v1/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.rennova_code.toLowerCase().includes(term)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (unitTypeFilter) {
      filtered = filtered.filter(product => product.unit_type === unitTypeFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleCreateProduct = async () => {
    try {
      setProductDialog(prev => ({ ...prev, loading: true }));
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productDialog.formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao criar produto');
      }

      setProductDialog({
        open: false,
        mode: 'create',
        formData: {
          name: '',
          description: '',
          rennova_code: '',
          category: '',
          unit_type: 'ml',
        },
        loading: false,
      });
      
      await loadProducts();
      onProductUpdated?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao criar produto');
    } finally {
      setProductDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUpdateProduct = async () => {
    if (!productDialog.product) return;

    try {
      setProductDialog(prev => ({ ...prev, loading: true }));
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/v1/products/${productDialog.product.product_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productDialog.formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao atualizar produto');
      }

      setProductDialog({
        open: false,
        mode: 'create',
        formData: {
          name: '',
          description: '',
          rennova_code: '',
          category: '',
          unit_type: 'ml',
        },
        loading: false,
      });
      
      await loadProducts();
      onProductUpdated?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao atualizar produto');
    } finally {
      setProductDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const openCreateDialog = () => {
    setProductDialog({
      open: true,
      mode: 'create',
      formData: {
        name: '',
        description: '',
        rennova_code: '',
        category: '',
        unit_type: 'ml',
      },
      loading: false,
    });
  };

  const openEditDialog = (product: Product) => {
    setProductDialog({
      open: true,
      mode: 'edit',
      product,
      formData: {
        name: product.name,
        description: product.description,
        rennova_code: product.rennova_code,
        category: product.category,
        unit_type: product.unit_type,
      },
      loading: false,
    });
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

  const getUniqueCategories = () => {
    const categorySet = new Set(products.map(p => p.category));
    const categories = Array.from(categorySet);
    return categories.filter(Boolean).sort();
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
          Catálogo de Produtos
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={openCreateDialog}
        >
          Novo Produto
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={categoryFilter}
              label="Categoria"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {getUniqueCategories().map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Unidade</InputLabel>
            <Select
              value={unitTypeFilter}
              label="Unidade"
              onChange={(e) => setUnitTypeFilter(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="ml">ml</MenuItem>
              <MenuItem value="units">Unidades</MenuItem>
              <MenuItem value="vials">Frascos</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setUnitTypeFilter('');
            }}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Paper>

      {filteredProducts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Inventory sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            {products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {products.length === 0 
              ? 'Comece criando o primeiro produto do catálogo.'
              : 'Tente ajustar os filtros de busca.'
            }
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Código Rennova</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data de Criação</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.product_id} hover>
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
                      <Chip
                        label={product.status === 'approved' ? 'Aprovado' : 'Pendente'}
                        size="small"
                        color={product.status === 'approved' ? 'success' : 'warning'}
                        icon={product.status === 'approved' ? <CheckCircle /> : undefined}
                      />
                    </TableCell>
                    <TableCell>{formatDate(product.created_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar produto">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit />
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

      {/* Product Dialog */}
      <Dialog
        open={productDialog.open}
        onClose={() => !productDialog.loading && setProductDialog(prev => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {productDialog.mode === 'create' ? 'Novo Produto' : 'Editar Produto'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nome do Produto"
              value={productDialog.formData.name}
              onChange={(e) => setProductDialog(prev => ({
                ...prev,
                formData: { ...prev.formData, name: e.target.value }
              }))}
              required
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descrição"
              value={productDialog.formData.description}
              onChange={(e) => setProductDialog(prev => ({
                ...prev,
                formData: { ...prev.formData, description: e.target.value }
              }))}
              required
            />
            
            <TextField
              fullWidth
              label="Código Rennova"
              value={productDialog.formData.rennova_code}
              onChange={(e) => setProductDialog(prev => ({
                ...prev,
                formData: { ...prev.formData, rennova_code: e.target.value.toUpperCase() }
              }))}
              required
              disabled={productDialog.mode === 'edit'}
              helperText={productDialog.mode === 'edit' ? 'O código Rennova não pode ser alterado' : 'Use apenas letras maiúsculas, números e hífens'}
            />
            
            <TextField
              fullWidth
              label="Categoria"
              value={productDialog.formData.category}
              onChange={(e) => setProductDialog(prev => ({
                ...prev,
                formData: { ...prev.formData, category: e.target.value }
              }))}
              required
            />
            
            <FormControl fullWidth required>
              <InputLabel>Tipo de Unidade</InputLabel>
              <Select
                value={productDialog.formData.unit_type}
                label="Tipo de Unidade"
                onChange={(e) => setProductDialog(prev => ({
                  ...prev,
                  formData: { ...prev.formData, unit_type: e.target.value }
                }))}
              >
                <MenuItem value="ml">Mililitros (ml)</MenuItem>
                <MenuItem value="units">Unidades</MenuItem>
                <MenuItem value="vials">Frascos</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setProductDialog(prev => ({ ...prev, open: false }))}
            disabled={productDialog.loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={productDialog.mode === 'create' ? handleCreateProduct : handleUpdateProduct}
            variant="contained"
            color="primary"
            disabled={productDialog.loading || !productDialog.formData.name || !productDialog.formData.description}
            startIcon={productDialog.loading ? <CircularProgress size={16} /> : undefined}
          >
            {productDialog.loading 
              ? (productDialog.mode === 'create' ? 'Criando...' : 'Salvando...')
              : (productDialog.mode === 'create' ? 'Criar Produto' : 'Salvar Alterações')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductCatalog;