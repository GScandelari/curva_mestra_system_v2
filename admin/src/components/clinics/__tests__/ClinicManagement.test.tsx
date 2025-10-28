import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClinicManagement from '../ClinicManagement';
import clinicService, { Clinic, ClinicStats } from '../../../services/clinicService';

// Mock the clinic service
jest.mock('../../../services/clinicService');
const mockClinicService = clinicService as jest.Mocked<typeof clinicService>;

// Mock child components to focus on integration logic
jest.mock('../ClinicList', () => {
  return function MockClinicList({ onClinicSelect, onCreateClinic, onEditClinic, onStatusToggle }: any) {
    return (
      <div data-testid="clinic-list">
        <button onClick={() => onClinicSelect(mockClinic)} data-testid="select-clinic">
          Select Clinic
        </button>
        <button onClick={onCreateClinic} data-testid="create-clinic">
          Create Clinic
        </button>
        <button onClick={() => onEditClinic(mockClinic)} data-testid="edit-clinic">
          Edit Clinic
        </button>
        <button onClick={() => onStatusToggle(mockClinic)} data-testid="toggle-status">
          Toggle Status
        </button>
      </div>
    );
  };
});

jest.mock('../ClinicDetail', () => {
  return function MockClinicDetail({ clinic, onBack, onEdit, onStatusToggle, onCreateUser, onEditUser }: any) {
    return (
      <div data-testid="clinic-detail">
        <h2>{clinic.name}</h2>
        <button onClick={onBack} data-testid="back-to-list">
          Back to List
        </button>
        <button onClick={() => onEdit(clinic)} data-testid="edit-from-detail">
          Edit Clinic
        </button>
        <button onClick={() => onStatusToggle(clinic)} data-testid="toggle-from-detail">
          Toggle Status
        </button>
        <button onClick={() => onCreateUser(clinic.clinic_id)} data-testid="create-user">
          Create User
        </button>
        <button onClick={() => onEditUser(clinic, mockUser)} data-testid="edit-user">
          Edit User
        </button>
      </div>
    );
  };
});

jest.mock('../ClinicForm', () => {
  return function MockClinicForm({ clinic, onSave, onCancel }: any) {
    return (
      <div data-testid="clinic-form">
        <h2>{clinic ? 'Edit Clinic' : 'Create Clinic'}</h2>
        <button onClick={() => onSave(clinic || mockClinic)} data-testid="save-clinic">
          Save Clinic
        </button>
        <button onClick={onCancel} data-testid="cancel-form">
          Cancel
        </button>
      </div>
    );
  };
});

jest.mock('../ClinicStatusToggle', () => {
  return function MockClinicStatusToggle({ clinic, onStatusChange, open, onClose }: any) {
    if (!open) return null;
    
    return (
      <div data-testid="status-toggle-dialog">
        <h3>Toggle Status for {clinic.name}</h3>
        <button 
          onClick={() => onStatusChange(clinic, clinic.status === 'active' ? 'inactive' : 'active')}
          data-testid="confirm-status-toggle"
        >
          Confirm Toggle
        </button>
        <button onClick={onClose} data-testid="cancel-status-toggle">
          Cancel
        </button>
      </div>
    );
  };
});

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockClinic: Clinic = {
  clinic_id: 'clinic-1',
  name: 'Test Clinic',
  cnpj: '12.345.678/0001-90',
  email: 'test@clinic.com',
  phone: '(11) 99999-9999',
  address: 'Test Address',
  city: 'São Paulo',
  admin_user_id: 'admin-1',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
  settings: {
    timezone: 'America/Sao_Paulo',
    notification_preferences: {
      low_stock_alerts: true,
      expiration_alerts: true,
      email_notifications: true,
      alert_threshold_days: 30,
    },
  },
};

const mockUser = {
  user_id: 'user-1',
  email: 'user@clinic.com',
  role: 'clinic_user' as const,
  clinic_id: 'clinic-1',
  permissions: [],
  profile: {
    first_name: 'Test',
    last_name: 'User',
  },
  created_at: new Date(),
};

const mockStats: ClinicStats = {
  total_users: 5,
  total_patients: 100,
  total_products: 50,
  recent_activity_count: 10,
};

describe('ClinicManagement Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClinicService.getClinics.mockResolvedValue([mockClinic]);
    mockClinicService.getClinicStats.mockResolvedValue(mockStats);
    mockClinicService.getClinicUsers.mockResolvedValue([mockUser]);
    mockClinicService.getClinicAuditLogs.mockResolvedValue([]);
    mockClinicService.toggleClinicStatus.mockResolvedValue({
      ...mockClinic,
      status: 'inactive',
    });
  });

  describe('View Navigation', () => {
    it('should start with clinic list view', () => {
      renderWithTheme(<ClinicManagement />);
      
      expect(screen.getByTestId('clinic-list')).toBeInTheDocument();
    });

    it('should navigate to clinic detail when clinic is selected', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      await user.click(screen.getByTestId('select-clinic'));
      
      expect(screen.getByTestId('clinic-detail')).toBeInTheDocument();
      expect(screen.getByText('Test Clinic')).toBeInTheDocument();
    });

    it('should navigate to clinic form when create is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      await user.click(screen.getByTestId('create-clinic'));
      
      expect(screen.getByTestId('clinic-form')).toBeInTheDocument();
      expect(screen.getByText('Create Clinic')).toBeInTheDocument();
    });

    it('should navigate to edit form when edit is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      await user.click(screen.getByTestId('edit-clinic'));
      
      expect(screen.getByTestId('clinic-form')).toBeInTheDocument();
      expect(screen.getByText('Edit Clinic')).toBeInTheDocument();
    });

    it('should navigate back to list from detail', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to detail
      await user.click(screen.getByTestId('select-clinic'));
      expect(screen.getByTestId('clinic-detail')).toBeInTheDocument();
      
      // Go back to list
      await user.click(screen.getByTestId('back-to-list'));
      expect(screen.getByTestId('clinic-list')).toBeInTheDocument();
    });

    it('should navigate back to list from form when cancelled', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to create form
      await user.click(screen.getByTestId('create-clinic'));
      expect(screen.getByTestId('clinic-form')).toBeInTheDocument();
      
      // Cancel form
      await user.click(screen.getByTestId('cancel-form'));
      expect(screen.getByTestId('clinic-list')).toBeInTheDocument();
    });

    it('should navigate back to detail from form when editing and cancelled', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to detail
      await user.click(screen.getByTestId('select-clinic'));
      expect(screen.getByTestId('clinic-detail')).toBeInTheDocument();
      
      // Go to edit form
      await user.click(screen.getByTestId('edit-from-detail'));
      expect(screen.getByTestId('clinic-form')).toBeInTheDocument();
      
      // Cancel form
      await user.click(screen.getByTestId('cancel-form'));
      expect(screen.getByTestId('clinic-detail')).toBeInTheDocument();
    });
  });

  describe('Status Toggle Integration', () => {
    it('should open status toggle dialog when requested from list', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      await user.click(screen.getByTestId('toggle-status'));
      
      expect(screen.getByTestId('status-toggle-dialog')).toBeInTheDocument();
      expect(screen.getByText('Toggle Status for Test Clinic')).toBeInTheDocument();
    });

    it('should open status toggle dialog when requested from detail', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to detail
      await user.click(screen.getByTestId('select-clinic'));
      
      // Toggle status from detail
      await user.click(screen.getByTestId('toggle-from-detail'));
      
      expect(screen.getByTestId('status-toggle-dialog')).toBeInTheDocument();
    });

    it('should handle status toggle confirmation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Open status toggle dialog
      await user.click(screen.getByTestId('toggle-status'));
      
      // Confirm toggle
      await user.click(screen.getByTestId('confirm-status-toggle'));
      
      await waitFor(() => {
        expect(mockClinicService.toggleClinicStatus).toHaveBeenCalledWith('clinic-1', 'inactive');
      });
      
      // Dialog should close
      expect(screen.queryByTestId('status-toggle-dialog')).not.toBeInTheDocument();
      
      // Should show success notification
      expect(screen.getByText(/desativada com sucesso/i)).toBeInTheDocument();
    });

    it('should close status toggle dialog when cancelled', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Open status toggle dialog
      await user.click(screen.getByTestId('toggle-status'));
      expect(screen.getByTestId('status-toggle-dialog')).toBeInTheDocument();
      
      // Cancel toggle
      await user.click(screen.getByTestId('cancel-status-toggle'));
      
      // Dialog should close
      expect(screen.queryByTestId('status-toggle-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('should handle clinic creation success', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to create form
      await user.click(screen.getByTestId('create-clinic'));
      
      // Save clinic
      await user.click(screen.getByTestId('save-clinic'));
      
      // Should return to list
      expect(screen.getByTestId('clinic-list')).toBeInTheDocument();
      
      // Should show success notification
      expect(screen.getByText(/criada com sucesso/i)).toBeInTheDocument();
    });

    it('should handle clinic edit success and return to detail', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to detail
      await user.click(screen.getByTestId('select-clinic'));
      
      // Go to edit form
      await user.click(screen.getByTestId('edit-from-detail'));
      
      // Save clinic
      await user.click(screen.getByTestId('save-clinic'));
      
      // Should return to detail
      expect(screen.getByTestId('clinic-detail')).toBeInTheDocument();
      
      // Should show success notification
      expect(screen.getByText(/atualizada com sucesso/i)).toBeInTheDocument();
    });
  });

  describe('User Management Integration', () => {
    it('should handle create user request', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to detail
      await user.click(screen.getByTestId('select-clinic'));
      
      // Click create user
      await user.click(screen.getByTestId('create-user'));
      
      // Should show info notification (since user management is not fully implemented)
      expect(screen.getByText(/será implementada em breve/i)).toBeInTheDocument();
    });

    it('should handle edit user request', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Go to detail
      await user.click(screen.getByTestId('select-clinic'));
      
      // Click edit user
      await user.click(screen.getByTestId('edit-user'));
      
      // Should show info notification (since user management is not fully implemented)
      expect(screen.getByText(/será implementada em breve/i)).toBeInTheDocument();
    });
  });

  describe('Notification System', () => {
    it('should close notifications when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);
      
      // Trigger a notification
      await user.click(screen.getByTestId('create-clinic'));
      await user.click(screen.getByTestId('save-clinic'));
      
      // Should show notification
      const notification = screen.getByText(/criada com sucesso/i);
      expect(notification).toBeInTheDocument();
      
      // Close notification
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      // Notification should be gone
      await waitFor(() => {
        expect(notification).not.toBeInTheDocument();
      });
    });
  });

  describe('Props Integration', () => {
    it('should call onViewChange when provided', async () => {
      const onViewChange = jest.fn();
      const user = userEvent.setup();
      
      renderWithTheme(<ClinicManagement onViewChange={onViewChange} />);
      
      await user.click(screen.getByTestId('select-clinic'));
      
      expect(onViewChange).toHaveBeenCalledWith('detail');
    });

    it('should start with initial view when provided', () => {
      renderWithTheme(<ClinicManagement initialView="form" />);
      
      expect(screen.getByTestId('clinic-form')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle status toggle errors gracefully', async () => {
      const user = userEvent.setup();
      mockClinicService.toggleClinicStatus.mockRejectedValue(new Error('Network error'));
      
      renderWithTheme(<ClinicManagement />);
      
      // Open status toggle dialog
      await user.click(screen.getByTestId('toggle-status'));
      
      // Confirm toggle (this should fail)
      await user.click(screen.getByTestId('confirm-status-toggle'));
      
      // The error should be handled by the ClinicStatusToggle component
      // The dialog should remain open for the user to try again or cancel
      expect(screen.getByTestId('status-toggle-dialog')).toBeInTheDocument();
    });
  });
});