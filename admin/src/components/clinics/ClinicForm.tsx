import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Assignment as AssignmentIcon,
  LocationCity as LocationCityIcon,
  ToggleOn as ToggleOnIcon,
} from '@mui/icons-material';
import clinicService, { Clinic, CreateClinicRequest, UpdateClinicRequest } from '../../services/clinicService';
import { validateCNPJ, formatCNPJ, validateBrazilianPhone, formatBrazilianPhone, extractCityFromAddress } from '../../utils/brazilianValidation';

interface ClinicFormProps {
  clinic?: Clinic | null;
  onSave?: (clinic: Clinic) => void;
  onCancel?: () => void;
}

const ClinicForm: React.FC<ClinicFormProps> = ({
  clinic,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'active' as 'active' | 'inactive',
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_phone: '',
    admin_password: '',
    timezone: 'America/Sao_Paulo',
    low_stock_alerts: true,
    expiration_alerts: true,
    email_notifications: true,
    alert_threshold_days: 30,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<Record<string, { isValid: boolean; message: string }>>({});

  const isEditing = !!clinic;

  // Debounced validation for real-time feedback
  const validateFieldRealTime = useCallback((field: string, value: string) => {
    let isValid = true;
    let message = '';

    if (field === 'cnpj' && value) {
      isValid = validateCNPJ(value);
      message = isValid ? 'CNPJ válido' : 'CNPJ inválido';
    } else if (field === 'phone' && value) {
      isValid = validateBrazilianPhone(value);
      message = isValid ? 'Telefone válido' : 'Formato inválido';
    } else if (field === 'email' && value) {
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      message = isValid ? 'Email válido' : 'Formato inválido';
    }

    if (value) {
      setFieldValidation(prev => ({
        ...prev,
        [field]: { isValid, message }
      }));
    } else {
      setFieldValidation(prev => {
        const newState = { ...prev };
        delete newState[field];
        return newState;
      });
    }
  }, []);

  // Debounce the real-time validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.cnpj && !isEditing) {
        validateFieldRealTime('cnpj', formData.cnpj);
      }
      if (formData.phone) {
        validateFieldRealTime('phone', formData.phone);
      }
      if (formData.email) {
        validateFieldRealTime('email', formData.email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.cnpj, formData.phone, formData.email, validateFieldRealTime, isEditing]);

  // Function to check for duplicate CNPJ and email
  const checkForDuplicates = async (cnpj: string, email: string): Promise<{ cnpjExists: boolean; emailExists: boolean }> => {
    try {
      setCheckingDuplicates(true);
      
      // Get all clinics to check for duplicates
      const allClinics = await clinicService.getClinics();
      
      const cnpjExists = allClinics.some(c => 
        c.cnpj === cnpj && (!isEditing || c.clinic_id !== clinic?.clinic_id)
      );
      
      const emailExists = allClinics.some(c => 
        c.email === email && (!isEditing || c.clinic_id !== clinic?.clinic_id)
      );
      
      return { cnpjExists, emailExists };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { cnpjExists: false, emailExists: false };
    } finally {
      setCheckingDuplicates(false);
    }
  };

  useEffect(() => {
    if (clinic) {
      setFormData({
        name: clinic.name,
        cnpj: clinic.cnpj || '',
        email: clinic.email || '',
        phone: clinic.phone || '',
        address: clinic.address,
        city: clinic.city || '',
        status: clinic.status || 'active',
        admin_email: '', // Don't populate email for editing
        admin_first_name: '',
        admin_last_name: '',
        admin_phone: '',
        admin_password: '',
        timezone: clinic.settings.timezone,
        low_stock_alerts: clinic.settings.notification_preferences.low_stock_alerts,
        expiration_alerts: clinic.settings.notification_preferences.expiration_alerts,
        email_notifications: clinic.settings.notification_preferences.email_notifications,
        alert_threshold_days: clinic.settings.notification_preferences.alert_threshold_days,
      });
    }
  }, [clinic]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    // Apply formatting for specific fields
    if (field === 'cnpj' && typeof value === 'string') {
      value = formatCNPJ(value);
    } else if (field === 'phone' && typeof value === 'string') {
      value = formatBrazilianPhone(value);
    } else if (field === 'address' && typeof value === 'string') {
      // Auto-extract city from address
      const extractedCity = extractCityFromAddress(value);
      if (extractedCity && extractedCity !== formData.city) {
        setFormData(prev => ({
          ...prev,
          city: extractedCity,
        }));
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome da clínica é obrigatório';
    }

    if (!formData.cnpj.trim()) {
      errors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCNPJ(formData.cnpj)) {
      errors.cnpj = 'CNPJ inválido. Verifique os dígitos verificadores.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email da clínica é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Formato de email inválido';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Telefone da clínica é obrigatório';
    } else if (!validateBrazilianPhone(formData.phone)) {
      errors.phone = 'Telefone inválido. Use o formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX';
    }

    if (!formData.address.trim()) {
      errors.address = 'Endereço é obrigatório';
    }

    if (!formData.city.trim()) {
      errors.city = 'Cidade é obrigatória';
    }

    if (!isEditing) {
      if (!formData.admin_email.trim()) {
        errors.admin_email = 'Email do administrador é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
        errors.admin_email = 'Formato de email inválido';
      }

      if (!formData.admin_first_name.trim()) {
        errors.admin_first_name = 'Nome do administrador é obrigatório';
      }

      if (!formData.admin_last_name.trim()) {
        errors.admin_last_name = 'Sobrenome do administrador é obrigatório';
      }

      if (!formData.admin_password.trim()) {
        errors.admin_password = 'Senha é obrigatória';
      } else if (formData.admin_password.length < 8) {
        errors.admin_password = 'Senha deve ter pelo menos 8 caracteres';
      }
    }

    if (formData.alert_threshold_days < 1 || formData.alert_threshold_days > 365) {
      errors.alert_threshold_days = 'Dias de alerta deve estar entre 1 e 365';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateFormWithDuplicates = async (): Promise<boolean> => {
    // First run basic validation
    if (!validateForm()) {
      return false;
    }

    // Then check for duplicates
    const { cnpjExists, emailExists } = await checkForDuplicates(formData.cnpj, formData.email);
    
    const duplicateErrors: Record<string, string> = {};
    
    if (cnpjExists) {
      duplicateErrors.cnpj = 'Este CNPJ já está cadastrado no sistema';
    }
    
    if (emailExists) {
      duplicateErrors.email = 'Este email já está cadastrado no sistema';
    }
    
    if (Object.keys(duplicateErrors).length > 0) {
      setValidationErrors(prev => ({
        ...prev,
        ...duplicateErrors,
      }));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!(await validateFormWithDuplicates())) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let savedClinic: Clinic;

      if (isEditing && clinic) {
        // Update existing clinic
        const updateData: UpdateClinicRequest = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          status: formData.status,
          settings: {
            timezone: formData.timezone,
            notification_preferences: {
              low_stock_alerts: formData.low_stock_alerts,
              expiration_alerts: formData.expiration_alerts,
              email_notifications: formData.email_notifications,
              alert_threshold_days: formData.alert_threshold_days,
            },
          },
        };

        savedClinic = await clinicService.updateClinic(clinic.clinic_id, updateData);
      } else {
        // Create new clinic
        const createData: CreateClinicRequest = {
          name: formData.name,
          cnpj: formData.cnpj,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          admin_email: formData.admin_email,
          admin_profile: {
            first_name: formData.admin_first_name,
            last_name: formData.admin_last_name,
            phone: formData.admin_phone || undefined,
          },
          admin_password: formData.admin_password,
          settings: {
            timezone: formData.timezone,
            notification_preferences: {
              low_stock_alerts: formData.low_stock_alerts,
              expiration_alerts: formData.expiration_alerts,
              email_notifications: formData.email_notifications,
              alert_threshold_days: formData.alert_threshold_days,
            },
          },
        };

        savedClinic = await clinicService.createClinic(createData);
      }

      if (onSave) {
        onSave(savedClinic);
      }
    } catch (error: any) {
      console.error('Error saving clinic:', error);
      
      // Handle field-specific errors from API response
      if (error.response?.data?.error?.field_errors) {
        setValidationErrors(error.response.data.error.field_errors);
        setError(null);
      } else if (error.field_errors) {
        setValidationErrors(error.field_errors);
        setError(null);
      } else {
        setError(error.response?.data?.error?.message || error.message || 'Falha ao salvar clínica. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {isEditing ? 'Editar Clínica' : 'Nova Clínica'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Clinic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informações da Clínica
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome da Clínica"
                value={formData.name}
                onChange={handleInputChange('name')}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CNPJ"
                value={formData.cnpj}
                onChange={handleInputChange('cnpj')}
                error={!!validationErrors.cnpj || (fieldValidation.cnpj && !fieldValidation.cnpj.isValid)}
                helperText={
                  validationErrors.cnpj || 
                  (fieldValidation.cnpj?.message) ||
                  'Formato: 00.000.000/0000-00'
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AssignmentIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="00.000.000/0000-00"
                disabled={isEditing} // CNPJ cannot be changed after creation
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email da Clínica"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!validationErrors.email || (fieldValidation.email && !fieldValidation.email.isValid)}
                helperText={
                  validationErrors.email || 
                  (fieldValidation.email?.message) ||
                  'Email de contato da clínica'
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone da Clínica"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                error={!!validationErrors.phone || (fieldValidation.phone && !fieldValidation.phone.isValid)}
                helperText={
                  validationErrors.phone || 
                  (fieldValidation.phone?.message) ||
                  'Formato: (11) 99999-9999'
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="(11) 99999-9999"
                required
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Endereço"
                value={formData.address}
                onChange={handleInputChange('address')}
                error={!!validationErrors.address}
                helperText={validationErrors.address || 'A cidade será extraída automaticamente'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Cidade"
                value={formData.city}
                onChange={handleInputChange('city')}
                error={!!validationErrors.city}
                helperText={validationErrors.city || 'Extraída do endereço'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationCityIcon />
                    </InputAdornment>
                  ),
                }}
                required
              />
            </Grid>

            {isEditing && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Status"
                  value={formData.status}
                  onChange={handleInputChange('status')}
                  select
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ToggleOnIcon />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                </TextField>
              </Grid>
            )}

            {/* Admin User Information (only for new clinics) */}
            {!isEditing && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Administrador da Clínica
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email do Administrador"
                    type="email"
                    value={formData.admin_email}
                    onChange={handleInputChange('admin_email')}
                    error={!!validationErrors.admin_email}
                    helperText={validationErrors.admin_email}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Senha"
                    type="password"
                    value={formData.admin_password}
                    onChange={handleInputChange('admin_password')}
                    error={!!validationErrors.admin_password}
                    helperText={validationErrors.admin_password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={formData.admin_first_name}
                    onChange={handleInputChange('admin_first_name')}
                    error={!!validationErrors.admin_first_name}
                    helperText={validationErrors.admin_first_name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Sobrenome"
                    value={formData.admin_last_name}
                    onChange={handleInputChange('admin_last_name')}
                    error={!!validationErrors.admin_last_name}
                    helperText={validationErrors.admin_last_name}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Telefone (opcional)"
                    value={formData.admin_phone}
                    onChange={handleInputChange('admin_phone')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                    placeholder="(11) 99999-9999"
                  />
                </Grid>
              </>
            )}

            {/* Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Configurações
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fuso Horário"
                value={formData.timezone}
                onChange={handleInputChange('timezone')}
                select
                SelectProps={{
                  native: true,
                }}
              >
                <option value="America/Sao_Paulo">América/São Paulo</option>
                <option value="America/Manaus">América/Manaus</option>
                <option value="America/Fortaleza">América/Fortaleza</option>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dias de Alerta para Vencimento"
                type="number"
                value={formData.alert_threshold_days}
                onChange={handleInputChange('alert_threshold_days')}
                error={!!validationErrors.alert_threshold_days}
                helperText={validationErrors.alert_threshold_days || 'Entre 1 e 365 dias'}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Notificações
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.low_stock_alerts}
                      onChange={handleInputChange('low_stock_alerts')}
                    />
                  }
                  label="Alertas de Estoque Baixo"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.expiration_alerts}
                      onChange={handleInputChange('expiration_alerts')}
                    />
                  }
                  label="Alertas de Vencimento"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.email_notifications}
                      onChange={handleInputChange('email_notifications')}
                    />
                  }
                  label="Notificações por Email"
                />
              </Box>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box 
                display="flex" 
                gap={2} 
                justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
                flexDirection={{ xs: 'column', sm: 'row' }}
                mt={2}
              >
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={loading || checkingDuplicates}
                    startIcon={<CancelIcon />}
                    sx={{ order: { xs: 2, sm: 1 } }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || checkingDuplicates}
                  startIcon={(loading || checkingDuplicates) ? <CircularProgress size={16} /> : <SaveIcon />}
                  sx={{ order: { xs: 1, sm: 2 } }}
                >
                  {checkingDuplicates ? 'Verificando...' : 
                   loading ? 'Salvando...' : 
                   (isEditing ? 'Atualizar Clínica' : 'Criar Clínica')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ClinicForm;