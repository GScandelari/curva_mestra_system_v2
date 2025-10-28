import React, { useState } from 'react';
import { Box, Alert } from '@mui/material';
import toast from 'react-hot-toast';
import { usePatients } from '../hooks/usePatients';
import { usePermissions } from '../hooks/usePermissions';
import PatientList from '../components/patients/PatientList';
import PatientForm from '../components/patients/PatientForm';
import PatientDetail from '../components/patients/PatientDetail';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Patient, CreatePatientData } from '../types/patient';

const PatientsPage: React.FC = () => {
  const { 
    patients, 
    loading, 
    error, 
    createPatient, 
    updatePatient, 
    applyFilters 
  } = usePatients();
  
  const { 
    checkPermission, 
    canManagePatients 
  } = usePermissions();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Check permissions
  const canCreate = checkPermission('create_patient');
  const canUpdate = checkPermission('update_patient');
  const canView = checkPermission('read_patient');

  if (!canView) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Você não tem permissão para visualizar pacientes.
        </Alert>
      </Box>
    );
  }

  const handleCreate = () => {
    if (!canCreate) {
      toast.error('Você não tem permissão para criar pacientes');
      return;
    }
    setEditingPatient(null);
    setShowForm(true);
  };

  const handleEdit = (patient: Patient) => {
    if (!canUpdate) {
      toast.error('Você não tem permissão para editar pacientes');
      return;
    }
    setEditingPatient(patient);
    setShowForm(true);
  };

  const handleView = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetail(true);
  };

  const handleFormSubmit = async (data: CreatePatientData) => {
    try {
      setFormLoading(true);
      
      if (editingPatient) {
        await updatePatient(editingPatient.patient_id, data);
        toast.success('Paciente atualizado com sucesso!');
      } else {
        await createPatient(data);
        toast.success('Paciente criado com sucesso!');
      }
      
      setShowForm(false);
      setEditingPatient(null);
    } catch (err: any) {
      toast.error(err.message);
      throw err; // Re-throw to prevent form from closing
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPatient(null);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedPatient(null);
  };

  const handleEditFromDetail = (patient: Patient) => {
    setShowDetail(false);
    handleEdit(patient);
  };

  const getInitialFormData = (): Partial<CreatePatientData> | undefined => {
    if (!editingPatient) return undefined;

    return {
      first_name: editingPatient.first_name,
      last_name: editingPatient.last_name,
      birth_date: editingPatient.birth_date,
      phone: editingPatient.phone,
      email: editingPatient.email,
      address: editingPatient.address,
    };
  };

  return (
    <ErrorBoundary>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <PatientList
          patients={patients}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onFiltersChange={applyFilters}
        />

        {/* Patient Form Dialog */}
        <PatientForm
          open={showForm}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialData={getInitialFormData()}
          loading={formLoading}
        />

        {/* Patient Detail Dialog */}
        <PatientDetail
          open={showDetail}
          onClose={handleCloseDetail}
          onEdit={canUpdate ? handleEditFromDetail : undefined}
          patient={selectedPatient}
        />
      </Box>
    </ErrorBoundary>
  );
};

export default PatientsPage;