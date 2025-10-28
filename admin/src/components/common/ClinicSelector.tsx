import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Business, CheckCircle } from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface Clinic {
  id: string;
  name: string;
  address: string;
  admin_user_id: string;
  created_at: any;
  settings?: {
    timezone?: string;
    notification_preferences?: any;
  };
}

interface ClinicSelectorProps {
  selectedClinicId?: string;
  onClinicChange: (clinic: Clinic | null) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

const ClinicSelector: React.FC<ClinicSelectorProps> = ({
  selectedClinicId,
  onClinicChange,
  fullWidth = false,
  size = 'medium',
}) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      setError('');

      const clinicsQuery = query(
        collection(db, 'clinics'),
        orderBy('name')
      );

      const snapshot = await getDocs(clinicsQuery);
      const clinicsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Clinic[];

      setClinics(clinicsData);
    } catch (error) {
      console.error('Error loading clinics:', error);
      setError('Erro ao carregar clínicas');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (clinicId: string) => {
    if (clinicId === '') {
      onClinicChange(null);
      return;
    }

    const selectedClinic = clinics.find(clinic => clinic.id === clinicId);
    onClinicChange(selectedClinic || null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="textSecondary">
          Carregando clínicas...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} size={size}>
      <InputLabel id="clinic-selector-label">
        Selecionar Clínica
      </InputLabel>
      <Select
        labelId="clinic-selector-label"
        value={selectedClinicId || ''}
        label="Selecionar Clínica"
        onChange={(e) => handleChange(e.target.value)}
        startAdornment={<Business sx={{ mr: 1, color: 'action.active' }} />}
      >
        <MenuItem value="">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography color="textSecondary">
              Visão Global do Sistema
            </Typography>
          </Box>
        </MenuItem>
        
        {clinics.map((clinic) => (
          <MenuItem key={clinic.id} value={clinic.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Business color="primary" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {clinic.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {clinic.address}
                </Typography>
              </Box>
              <Chip
                icon={<CheckCircle />}
                label="Ativa"
                size="small"
                color="success"
                variant="outlined"
              />
            </Box>
          </MenuItem>
        ))}
      </Select>
      
      {clinics.length === 0 && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
          Nenhuma clínica encontrada
        </Typography>
      )}
    </FormControl>
  );
};

export default ClinicSelector;