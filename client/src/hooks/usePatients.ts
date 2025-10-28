import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Patient, PatientFilters, CreatePatientData } from '../types/patient';

export const usePatients = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatientFilters>({});

  // Fetch patients from API
  const fetchPatients = async (currentFilters: PatientFilters = filters) => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      setError(null);

      // Prepare query parameters
      const params: any = {};
      
      if (currentFilters.search) {
        params.search = currentFilters.search;
      }
      if (currentFilters.age_from !== undefined) {
        params.age_from = currentFilters.age_from;
      }
      if (currentFilters.age_to !== undefined) {
        params.age_to = currentFilters.age_to;
      }
      if (currentFilters.has_treatments !== undefined) {
        params.has_treatments = currentFilters.has_treatments;
      }

      const data = await apiService.getPatients(profile.clinic_id, params);
      setPatients(data as Patient[]);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(err.message || 'Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  // Create new patient
  const createPatient = async (patientData: CreatePatientData): Promise<Patient> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const newPatient = await apiService.post<Patient>(
        `/clinics/${profile.clinic_id}/patients`,
        patientData
      );
      
      // Add to local state
      setPatients(prev => [newPatient, ...prev]);
      
      return newPatient;
    } catch (err: any) {
      console.error('Error creating patient:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao criar paciente');
    }
  };

  // Update existing patient
  const updatePatient = async (patientId: string, patientData: Partial<CreatePatientData>): Promise<Patient> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const updatedPatient = await apiService.put<Patient>(
        `/clinics/${profile.clinic_id}/patients/${patientId}`,
        patientData
      );
      
      // Update local state
      setPatients(prev => 
        prev.map(patient => 
          patient.patient_id === patientId ? updatedPatient : patient
        )
      );
      
      return updatedPatient;
    } catch (err: any) {
      console.error('Error updating patient:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao atualizar paciente');
    }
  };

  // Delete patient
  const deletePatient = async (patientId: string): Promise<void> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      await apiService.delete(`/clinics/${profile.clinic_id}/patients/${patientId}`);
      
      // Remove from local state
      setPatients(prev => prev.filter(patient => patient.patient_id !== patientId));
    } catch (err: any) {
      console.error('Error deleting patient:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao excluir paciente');
    }
  };

  // Apply filters
  const applyFilters = (newFilters: PatientFilters) => {
    setFilters(newFilters);
    fetchPatients(newFilters);
  };

  // Refresh data
  const refresh = () => {
    fetchPatients();
  };

  // Load patients when component mounts or clinic changes
  useEffect(() => {
    if (profile?.clinic_id) {
      fetchPatients();
    }
  }, [profile?.clinic_id]);

  return {
    patients,
    loading,
    error,
    filters,
    createPatient,
    updatePatient,
    deletePatient,
    applyFilters,
    refresh,
  };
};