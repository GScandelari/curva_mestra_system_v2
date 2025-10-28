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
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CreateRequestData, ProductUsage } from '../../types/request';
import { Patient } from '../../types/patient';
import { apiService } from '../../services/apiService';

interface Product {
  product_id: string;
  name: string;
  rennova_code: string;
}

interface InventoryItem {
  inventory_id: string;
  product_id: string;
  product_name: string;
  quantity_in_stock: number;
  expiration_dates: Array<{
    date: string;
    lot: string;
    quantity: number;
  }>;
}

const productUsageSchema = yup.object({
  product_id: yup.string().required('Produto é obrigatório'),
  quantity: yup.number().min(1, 'Quantidade deve ser maior que 0').required('Quantidade é obrigatória'),
  lot: yup.string().required('Lote é obrigatório'),
  expiration_date: yup.string().required('Data de vencimento é obrigatória'),
});

const schema = yup.object({
  patient_id: yup.string().required('Paciente é obrigatório'),
  request_date: yup.string().required('Data da solicitação é obrigatória'),
  treatment_type: yup.string().required('Tipo de tratamento é obrigatório'),
  products_used: yup.array().of(productUsageSchema).min(1, 'Pelo menos um produto é obrigatório').required('Produtos são obrigatórios'),
  notes: yup.string(),
});

interface RequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRequestData) => Promise<void>;
  initialData?: Partial<CreateRequestData>;
  loading?: boolean;
}

const RequestForm: React.FC<RequestFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateRequestData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      patient_id: '',
      request_date: new Date().toISOString().split('T')[0],
      treatment_type: '',
      products_used: [
        {
          product_id: '',
          quantity: 1,
          lot: '',
          expiration_date: '',
        },
      ],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products_used',
  });

  // Load patients and inventory on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        // This would need to be implemented in the API service
        // For now, we'll use placeholder data
        setPatients([]);
        setInventory([]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset(initialData as CreateRequestData);
      } else {
        reset({
          patient_id: '',
          request_date: new Date().toISOString().split('T')[0],
          treatment_type: '',
          products_used: [
            {
              product_id: '',
              quantity: 1,
              lot: '',
              expiration_date: '',
            },
          ],
          notes: '',
        });
      }
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: CreateRequestData) => {
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
      lot: '',
      expiration_date: '',
    });
  };

  const removeProduct = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const getAvailableLots = (productId: string) => {
    const inventoryItem = inventory.find(item => item.product_id === productId);
    return inventoryItem?.expiration_dates || [];
  };

  const getProductStock = (productId: string) => {
    const inventoryItem = inventory.find(item => item.product_id === productId);
    return inventoryItem?.quantity_in_stock || 0;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h6">
              {initialData ? 'Editar Solicitação' : 'Nova Solicitação'}
            </Typography>
          </Box>
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
                name="patient_id"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={patients}
                    getOptionLabel={(option) => 
                      typeof option === 'string' 
                        ? option 
                        : `${option.first_name} ${option.last_name}`
                    }
                    value={patients.find(p => p.patient_id === field.value) || null}
                    onChange={(_, value) => field.onChange(value?.patient_id || '')}
                    loading={loadingData}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Paciente"
                        error={!!errors.patient_id}
                        helperText={errors.patient_id?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="request_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Data da Solicitação"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.request_date}
                    helperText={errors.request_date?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="treatment_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tipo de Tratamento"
                    placeholder="Ex: Preenchimento labial, Botox, etc."
                    error={!!errors.treatment_type}
                    helperText={errors.treatment_type?.message}
                  />
                )}
              />
            </Grid>

            {/* Products Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Produtos Utilizados</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addProduct}
                >
                  Adicionar Produto
                </Button>
              </Box>

              {errors.products_used && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.products_used.message}
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Quantidade</TableCell>
                      <TableCell>Lote</TableCell>
                      <TableCell>Vencimento</TableCell>
                      <TableCell>Estoque</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, index) => {
                      const selectedProductId = watch(`products_used.${index}.product_id`);
                      const availableLots = getAvailableLots(selectedProductId);
                      const currentStock = getProductStock(selectedProductId);
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Controller
                              name={`products_used.${index}.product_id`}
                              control={control}
                              render={({ field: productField }) => (
                                <Autocomplete
                                  {...productField}
                                  options={inventory}
                                  getOptionLabel={(option) => 
                                    typeof option === 'string' 
                                      ? option 
                                      : option.product_name
                                  }
                                  value={inventory.find(p => p.product_id === productField.value) || null}
                                  onChange={(_, value) => productField.onChange(value?.product_id || '')}
                                  loading={loadingData}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      size="small"
                                      error={!!errors.products_used?.[index]?.product_id}
                                      helperText={errors.products_used?.[index]?.product_id?.message}
                                    />
                                  )}
                                  sx={{ minWidth: 200 }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`products_used.${index}.quantity`}
                              control={control}
                              render={({ field: qtyField }) => (
                                <TextField
                                  {...qtyField}
                                  size="small"
                                  type="number"
                                  inputProps={{ min: 1, max: currentStock }}
                                  error={!!errors.products_used?.[index]?.quantity}
                                  helperText={errors.products_used?.[index]?.quantity?.message}
                                  sx={{ width: 80 }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`products_used.${index}.lot`}
                              control={control}
                              render={({ field: lotField }) => (
                                <Autocomplete
                                  {...lotField}
                                  options={availableLots}
                                  getOptionLabel={(option) => 
                                    typeof option === 'string' ? option : option.lot
                                  }
                                  value={availableLots.find(lot => lot.lot === lotField.value) || null}
                                  onChange={(_, value) => {
                                    lotField.onChange(value?.lot || '');
                                    // Auto-fill expiration date when lot is selected
                                    if (value) {
                                      const expirationField = `products_used.${index}.expiration_date` as const;
                                      // This would need to be implemented properly with setValue
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      size="small"
                                      error={!!errors.products_used?.[index]?.lot}
                                      helperText={errors.products_used?.[index]?.lot?.message}
                                    />
                                  )}
                                  sx={{ width: 120 }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`products_used.${index}.expiration_date`}
                              control={control}
                              render={({ field: expField }) => (
                                <TextField
                                  {...expField}
                                  size="small"
                                  type="date"
                                  InputLabelProps={{ shrink: true }}
                                  error={!!errors.products_used?.[index]?.expiration_date}
                                  helperText={errors.products_used?.[index]?.expiration_date?.message}
                                  sx={{ width: 140 }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={currentStock > 0 ? 'success.main' : 'error.main'}>
                              {currentStock} un.
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
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Observações"
                    multiline
                    rows={3}
                    placeholder="Observações sobre o tratamento..."
                  />
                )}
              />
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

export default RequestForm;