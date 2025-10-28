import React, { useState, useCallback } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import ClinicList from './ClinicList';
import ClinicDetail from './ClinicDetail';
import ClinicForm from './ClinicForm';
import ClinicStatusToggle from './ClinicStatusToggle';
import clinicService, { Clinic, User } from '../../services/clinicService';

type ViewType = 'list' | 'detail' | 'form' | 'user-form';

interface ClinicManagementProps {
  initialView?: ViewType;
  onViewChange?: (view: ViewType) => void;
}

const ClinicManagement: React.FC<ClinicManagementProps> = ({
  initialView = 'list',
  onViewChange,
}) => {
  // View state
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  
  // Data state
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [clinicToToggleStatus, setClinicToToggleStatus] = useState<Clinic | null>(null);
  
  // UI state
  const [statusToggleOpen, setStatusToggleOpen] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Helper function to change view and notify parent
  const changeView = useCallback((view: ViewType) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    }
  }, [onViewChange]);

  // Helper function to show notifications
  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  }, []);

  // Helper function to trigger refresh
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Clinic List handlers
  const handleClinicSelect = useCallback((clinic: Clinic) => {
    setSelectedClinic(clinic);
    changeView('detail');
  }, [changeView]);

  const handleCreateClinic = useCallback(() => {
    setEditingClinic(null);
    changeView('form');
  }, [changeView]);

  const handleEditClinic = useCallback((clinic: Clinic) => {
    setEditingClinic(clinic);
    changeView('form');
  }, [changeView]);

  const handleStatusToggleRequest = useCallback((clinic: Clinic) => {
    setClinicToToggleStatus(clinic);
    setStatusToggleOpen(true);
  }, []);

  // Clinic Form handlers
  const handleClinicSaved = useCallback((clinic: Clinic) => {
    const isEditing = !!editingClinic;
    setEditingClinic(null);
    
    showNotification(
      isEditing 
        ? `Clínica "${clinic.name}" atualizada com sucesso!`
        : `Clínica "${clinic.name}" criada com sucesso!`,
      'success'
    );
    
    // If we were editing the currently selected clinic, update it
    if (isEditing && selectedClinic?.clinic_id === clinic.clinic_id) {
      setSelectedClinic(clinic);
      changeView('detail');
    } else {
      changeView('list');
    }
    
    triggerRefresh();
  }, [editingClinic, selectedClinic, showNotification, changeView, triggerRefresh]);

  const handleClinicFormCancel = useCallback(() => {
    setEditingClinic(null);
    
    // Return to detail view if we were editing a selected clinic, otherwise go to list
    if (selectedClinic && editingClinic?.clinic_id === selectedClinic.clinic_id) {
      changeView('detail');
    } else {
      changeView('list');
    }
  }, [editingClinic, selectedClinic, changeView]);

  // Clinic Detail handlers
  const handleBackToList = useCallback(() => {
    setSelectedClinic(null);
    changeView('list');
  }, [changeView]);

  const handleClinicDetailEdit = useCallback((clinic: Clinic) => {
    setEditingClinic(clinic);
    changeView('form');
  }, [changeView]);

  const handleClinicDetailStatusToggle = useCallback((clinic: Clinic) => {
    setClinicToToggleStatus(clinic);
    setStatusToggleOpen(true);
  }, []);

  // Status Toggle handlers
  const handleStatusToggleConfirm = useCallback(async (clinic: Clinic, newStatus: 'active' | 'inactive') => {
    try {
      const updatedClinic = await clinicService.toggleClinicStatus(clinic.clinic_id, newStatus);
      
      // Update the selected clinic if it's the one being toggled
      if (selectedClinic?.clinic_id === clinic.clinic_id) {
        setSelectedClinic(updatedClinic);
      }
      
      showNotification(
        `Clínica "${clinic.name}" ${newStatus === 'active' ? 'ativada' : 'desativada'} com sucesso!`,
        'success'
      );
      
      triggerRefresh();
      setStatusToggleOpen(false);
      setClinicToToggleStatus(null);
    } catch (error: any) {
      console.error('Error toggling clinic status:', error);
      throw error; // Let the ClinicStatusToggle component handle the error display
    }
  }, [selectedClinic, showNotification, triggerRefresh]);

  const handleStatusToggleClose = useCallback(() => {
    setStatusToggleOpen(false);
    setClinicToToggleStatus(null);
  }, []);

  // Notification handlers
  const handleNotificationClose = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // User management handlers (for future integration)
  const handleCreateUser = useCallback((clinicId: string) => {
    // This will be implemented when user management is integrated
    console.log('Create user for clinic:', clinicId);
    showNotification('Funcionalidade de criação de usuário será implementada em breve', 'info');
  }, [showNotification]);

  const handleEditUser = useCallback((clinic: Clinic, user: User) => {
    // This will be implemented when user management is integrated
    console.log('Edit user:', user, 'for clinic:', clinic);
    showNotification('Funcionalidade de edição de usuário será implementada em breve', 'info');
  }, [showNotification]);

  // Render the appropriate view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <ClinicList
            key={refreshTrigger} // Force re-render when refresh is triggered
            onClinicSelect={handleClinicSelect}
            onCreateClinic={handleCreateClinic}
            onEditClinic={handleEditClinic}
            onStatusToggle={handleStatusToggleRequest}
          />
        );

      case 'detail':
        return selectedClinic ? (
          <ClinicDetail
            clinic={selectedClinic}
            onBack={handleBackToList}
            onEdit={handleClinicDetailEdit}
            onStatusToggle={handleClinicDetailStatusToggle}
            onCreateUser={handleCreateUser}
            onEditUser={handleEditUser}
          />
        ) : (
          // Fallback to list if no clinic is selected
          <ClinicList
            key={refreshTrigger}
            onClinicSelect={handleClinicSelect}
            onCreateClinic={handleCreateClinic}
            onEditClinic={handleEditClinic}
            onStatusToggle={handleStatusToggleRequest}
          />
        );

      case 'form':
        return (
          <ClinicForm
            clinic={editingClinic}
            onSave={handleClinicSaved}
            onCancel={handleClinicFormCancel}
          />
        );

      default:
        return (
          <ClinicList
            key={refreshTrigger}
            onClinicSelect={handleClinicSelect}
            onCreateClinic={handleCreateClinic}
            onEditClinic={handleEditClinic}
            onStatusToggle={handleStatusToggleRequest}
          />
        );
    }
  };

  return (
    <Box>
      {renderCurrentView()}

      {/* Status Toggle Dialog */}
      {clinicToToggleStatus && (
        <ClinicStatusToggle
          clinic={clinicToToggleStatus}
          onStatusChange={handleStatusToggleConfirm}
          open={statusToggleOpen}
          onClose={handleStatusToggleClose}
        />
      )}

      {/* Success/Error Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClinicManagement;