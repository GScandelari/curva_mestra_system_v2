import React, { useState, useEffect } from 'react';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import clinicService, { Clinic, User, CreateUserRequest, UpdateUserRequest } from '../../services/clinicService';

interface UserFormProps {
  clinic: Clinic;
  user?: User | null;
  onSave?: (user: User) => void;
  onCancel?: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'create_patient', label: 'Criar Pacientes' },
  { id: 'read_patient', label: 'Visualizar Pacientes' },
  { id: 'update_patient', label: 'Editar Pacientes' },
  { id: 'delete_patient', label: 'Excluir Pacientes' },
  { id: 'create_invoice', label: 'Criar Notas Fiscais' },
  { id: 'read_invoice', label: 'Visualizar Notas Fiscais' },
  { id: 'update_invoice', label: 'Editar Notas Fiscais' },
  { id: 'delete_invoice', label: 'Excluir Notas Fiscais' },
  { id: 'create_request', label: 'Criar Solicitações' },
  { id: 'read_request', label: 'Visualizar Solicitações' },
  { id: 'update_request', label: 'Editar Solicitações' },
  { id: 'delete_request', label: 'Excluir Solicitações' },
  { id: 'read_inventory', label: 'Visualizar Estoque' },
  { id: 'read_dashboard', label: 'Visualizar Dashboard' },
  { id: 'manage_users', label: 'Gerenciar Usuários' },
];

const UserForm: React.FC<UserFormProps> = ({
  clinic,
  user,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'clinic_user' as 'clinic_admin' | 'clinic_user',
    first_name: '',
    last_name: '',
    phone: '',
    permissions: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        role: user.role,
        first_name: user.profile.first_name,
        last_name: user.profile.last_name,
        phone: user.profile.phone || '',
        permissions: user.permissions || [],
      });
    }
  }, [user]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
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

  const handleRoleChange = (event: any) => {
    const role = event.target.value;
    setFormData(prev => ({
      ...prev,
      role,
      // Auto-assign permissions based on role
      permissions: role === 'clinic_admin' 
        ? AVAILABLE_PERMISSIONS.map(p => p.id)
        : ['read_patient', 'read_invoice', 'read_request', 'read_inventory', 'read_dashboard'],
    }));
  };

  const handlePermissionChange = (permission: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission),
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditing) {
      if (!formData.email.trim()) {
        errors.email = 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Email inválido';
      }

      if (!formData.password.trim()) {
        errors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 8) {
        errors.password = 'Senha deve ter pelo menos 8 caracteres';
      }
    }

    if (!formData.first_name.trim()) {
      errors.first_name = 'Nome é obrigatório';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Sobrenome é obrigatório';
    }

    if (formData.permissions.length === 0) {
      errors.permissions = 'Pelo menos uma permissão deve ser selecionada';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let savedUser: User;

      if (isEditing && user) {
        // Update existing user
        const updateData: UpdateUserRequest = {
          profile: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || undefined,
          },
          permissions: formData.permissions,
        };

        savedUser = await clinicService.updateUser(clinic.clinic_id, user.user_id, updateData);
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          email: formData.email,
          password: formData.password,
          role: formData.role,
          profile: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || undefined,
          },
          permissions: formData.permissions,
        };

        savedUser = await clinicService.createUser(clinic.clinic_id, createData);
      }

      if (onSave) {
        onSave(savedUser);
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      setError(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Clínica: {clinic.name}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* User Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informações do Usuário
              </Typography>
            </Grid>

            {!isEditing && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  error={!!validationErrors.email}
                  helperText={validationErrors.email}
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
            )}

            {!isEditing && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Senha"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!validationErrors.password}
                  helperText={validationErrors.password}
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
            )}

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                error={!!validationErrors.first_name}
                helperText={validationErrors.first_name}
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

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Sobrenome"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                error={!!validationErrors.last_name}
                helperText={validationErrors.last_name}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Telefone (opcional)"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Role Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Função</InputLabel>
                <Select
                  value={formData.role}
                  label="Função"
                  onChange={handleRoleChange}
                  disabled={isEditing && user?.role === 'clinic_admin'}
                >
                  <MenuItem value="clinic_admin">Administrador da Clínica</MenuItem>
                  <MenuItem value="clinic_user">Usuário da Clínica</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Permissions */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Permissões
              </Typography>
              {validationErrors.permissions && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {validationErrors.permissions}
                </Alert>
              )}
              <FormGroup>
                <Grid container spacing={1}>
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <Grid item xs={12} sm={6} md={4} key={permission.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.permissions.includes(permission.id)}
                            onChange={handlePermissionChange(permission.id)}
                            disabled={formData.role === 'clinic_admin'}
                          />
                        }
                        label={permission.label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
              {formData.role === 'clinic_admin' && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Administradores da clínica têm todas as permissões automaticamente.
                </Typography>
              )}
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={loading}
                    startIcon={<CancelIcon />}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                  {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Usuário')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default UserForm;