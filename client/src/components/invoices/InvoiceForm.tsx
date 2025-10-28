import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CreateInvoiceData, InvoiceProduct } from '../../types/invoice';
import { apiService } from '../../services/apiService';

interface Product {
  product_id: string;
  name: string;
  rennova_code: string;
}

const productSchema = yup.object({
  product_id: yup.string().required('Produto é obrigatório'),
  quantity: yup.number().min(1, 'Quantidade deve ser maior que 0').required('Quantidade é obrigatória'),
  unit_price: yup.number().min(0, 'Preço deve ser maior ou igual a 0').required('Preço é obrigatório'),
  expiration_date: yup.string().required('Data de vencimento é obrigatória'),
  lot: yup.string().required('Lote é obrigatório'),
  batch_number: yup.string(),
});

const schema = yup.object({
  invoice_number: yup.string().required('Número da nota fiscal é obrigatório'),
  supplier: yup.string().required('Fornecedor é obrigatório'),
  emission_date: yup.string().required('Data de emissão é obrigatória'),
  products: yup.array().of(productSchema).min(1, 'Pelo menos um produto é obrigatório').required('Produtos são obrigatórios'),
  total_value: yup.number().min(0, 'Valor total deve ser maior ou igual a 0').required('Valor total é obrigatório'),
});

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceData) => Promise<void>;
  initialData?: Partial<CreateInvoiceData>;
  loading?: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateInvoiceData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      invoice_number: '',
      supplier: '',
      emission_date: '',
      products: [
        {
          product_id: '',
          quantity: 1,
          unit_price: 0,
          expiration_date: '',
          lot: '',
          batch_number: '',
        },
      ],
      total_value: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products',
  });

  const watchedProducts = watch('products');

  // Calculate total value automatically
  useEffect(() => {
    const total = watchedProducts.reduce((sum, product) => {
      return sum + (product.quantity * product.unit_price);
    }, 0);
    setValue('total_value', total);
  }, [watchedProducts, setValue]);

  // Load products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const productsData = await apiService.getProducts();
        setProducts(productsData as Product[]);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (open) {
      loadProducts();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset(initialData as CreateInvoiceData);
      } else {
        reset({
          invoice_number: '',
          supplier: '',
          emission_date: '',
          products: [
            {
              product_id: '',
              quantity: 1,
              unit_price: 0,
              expiration_date: '',
              lot: '',
              batch_number: '',
            },
          ],
          total_value: 0,
        });
      }
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: CreateInvoiceData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const addProduct = () => {
    append({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      expiration_date: '',
      lot: '',
      batch_number: '',
    });
  };

  const removeProduct = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {initialData ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit as any)}>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Basic Information */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="invoice_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Número da Nota Fiscal"
                    error={!!errors.invoice_number}
                    helperText={errors.invoice_number?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Fornecedor"
                    error={!!errors.supplier}
                    helperText={errors.supplier?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="emission_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Data de Emissão"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.emission_date}
                    helperText={errors.emission_date?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="total_value"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Valor Total"
                    type="number"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                    }}
                    disabled
                    helperText="Calculado automaticamente"
                  />
                )}
              />
            </Grid>

            {/* Products Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Produtos</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addProduct}
                >
                  Adicionar Produto
                </Button>
              </Box>

              {errors.products && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.products.message}
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Quantidade</TableCell>
                      <TableCell>Preço Unitário</TableCell>
                      <TableCell>Vencimento</TableCell>
                      <TableCell>Lote</TableCell>
                      <TableCell>Lote Fabricante</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`products.${index}.product_id`}
                            control={control}
                            render={({ field: productField }) => (
                              <Autocomplete
                                {...productField}
                                options={products}
                                getOptionLabel={(option) => 
                                  typeof option === 'string' 
                                    ? option 
                                    : `${option.name} (${option.rennova_code})`
                                }
                                value={products.find(p => p.product_id === productField.value) || null}
                                onChange={(_, value) => productField.onChange(value?.product_id || '')}
                                loading={loadingProducts}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    error={!!errors.products?.[index]?.product_id}
                                    helperText={errors.products?.[index]?.product_id?.message}
                                  />
                                )}
                                sx={{ minWidth: 200 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`products.${index}.quantity`}
                            control={control}
                            render={({ field: qtyField }) => (
                              <TextField
                                {...qtyField}
                                size="small"
                                type="number"
                                inputProps={{ min: 1 }}
                                error={!!errors.products?.[index]?.quantity}
                                helperText={errors.products?.[index]?.quantity?.message}
                                sx={{ width: 80 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`products.${index}.unit_price`}
                            control={control}
                            render={({ field: priceField }) => (
                              <TextField
                                {...priceField}
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 0.01 }}
                                error={!!errors.products?.[index]?.unit_price}
                                helperText={errors.products?.[index]?.unit_price?.message}
                                sx={{ width: 100 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`products.${index}.expiration_date`}
                            control={control}
                            render={({ field: expField }) => (
                              <TextField
                                {...expField}
                                size="small"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                error={!!errors.products?.[index]?.expiration_date}
                                helperText={errors.products?.[index]?.expiration_date?.message}
                                sx={{ width: 140 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`products.${index}.lot`}
                            control={control}
                            render={({ field: lotField }) => (
                              <TextField
                                {...lotField}
                                size="small"
                                error={!!errors.products?.[index]?.lot}
                                helperText={errors.products?.[index]?.lot?.message}
                                sx={{ width: 100 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`products.${index}.batch_number`}
                            control={control}
                            render={({ field: batchField }) => (
                              <TextField
                                {...batchField}
                                size="small"
                                sx={{ width: 100 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            R$ {(watchedProducts[index]?.quantity * watchedProducts[index]?.unit_price || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => removeProduct(index)}
                            disabled={fields.length === 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InvoiceForm;