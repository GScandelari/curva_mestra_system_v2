import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  PowerSettingsNew as PowerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { Clinic } from '../../services/clinicService';

interface ClinicStatusToggleProps {
  clinic: Clinic;
  onStatusChange: (clinic: Clinic, newStatus: 'active' | 'inactive') => Promise<void>;
  disabled?: boolean;
  open: boolean;
  onClose: () => void;
}

const ClinicStatusToggle: React.FC<ClinicStatusToggleProps> = ({
  clinic,
  onStatusChange,
  disabled = false,
  open,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const newStatus = clinic.status === 'active' ? 'inactive' : 'active';
  const isDeactivating = clinic.status === 'active';

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await onStatusChange(clinic, newStatus);
      
      setSuccess(true);
      
      // Close dialog after showing success message briefly
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error toggling clinic status:', error);
      setError(error.message || 'Falha ao alterar status da clínica');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const getImpactMessage = () => {
    if (isDeactivating) {
      return 'Ao desativar a clínica, os usuários não conseguirão mais fazer login no sistema e todas as operações serão bloqueadas.';
    } else {
      return 'Ao ativar a clínica, os usuários poderão fazer login normalmente e todas as funcionalidades estarão disponíveis.';
    }
  };

  const getConfirmationText = () => {
    if (isDeactivating) {
      return 'Para confirmar a desativação, clique no botão "Desativar" abaixo.';
    } else {
      return 'Para confirmar a ativação, clique no botão "Ativar" abaixo.';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="status-toggle-dialog-title"
      aria-describedby="status-toggle-dialog-description"
    >
      <DialogTitle id="status-toggle-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <PowerIcon color={isDeactivating ? 'warning' : 'success'} />
          {isDeactivating ? 'Desativar Clínica' : 'Ativar Clínica'}
        </Box>
      </DialogTitle>

      <DialogContent id="status-toggle-dialog-description">
        {success ? (
          <Box display="flex" alignItems="center" gap={2} sx={{ py: 2 }}>
            <CheckIcon color="success" />
            <Typography color="success.main">
              Status da clínica alterado com sucesso!
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              Tem certeza que deseja {isDeactivating ? 'desativar' : 'ativar'} a clínica "{clinic.name}"?
            </Typography>

            {/* Current and New Status Display */}
            <Box sx={{ my: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="textSecondary">
                  Status atual:
                </Typography>
                <Chip
                  label={clinic.status === 'active' ? 'Ativa' : 'Inativa'}
                  color={clinic.status === 'active' ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  Novo status:
                </Typography>
                <Chip
                  label={newStatus === 'active' ? 'Ativa' : 'Inativa'}
                  color={newStatus === 'active' ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>

            {/* Impact Warning */}
            <Alert 
              severity={isDeactivating ? 'warning' : 'info'} 
              icon={isDeactivating ? <WarningIcon /> : <CheckIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>Impacto da alteração:</strong>
              </Typography>
              <Typography variant="body2">
                {getImpactMessage()}
              </Typography>
            </Alert>

            {/* Confirmation Requirement */}
            {isDeactivating && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Atenção:</strong> Esta ação afetará todos os usuários da clínica imediatamente.
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="textSecondary">
              {getConfirmationText()}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          Cancelar
        </Button>
        {!success && (
          <Button
            onClick={handleConfirm}
            color={isDeactivating ? 'warning' : 'success'}
            variant="contained"
            disabled={loading || disabled}
            startIcon={loading ? <CircularProgress size={16} /> : <PowerIcon />}
            aria-label={`${isDeactivating ? 'Desativar' : 'Ativar'} clínica ${clinic.name}`}
          >
            {loading 
              ? (isDeactivating ? 'Desativando...' : 'Ativando...')
              : (isDeactivating ? 'Desativar' : 'Ativar')
            }
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ClinicStatusToggle;