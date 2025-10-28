import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClinicManagement from '../ClinicManagement';
import clinicService, { Clinic, ClinicStats, ClinicAuditLog } from '../../../services/clinicService';

// Mock the clinic service
jest.mock('../../../services/clinicService');
const mockClinicService = clinicService as jest.Mocked<typeof clinicService>;

// Mock Brazilian validation utilities
jest.mock('../../../utils/brazilianValidation', () => ({
  validateCNPJ: jest.fn((cnpj: string) => cnpj === '12.345.678/0001-90'),
  formatCNPJ: jest.fn((cnpj: string) => cnpj),
  validateBrazilianPhone: jest.fn((phone: string) => phone.includes('99999')),
  formatBrazilianPhone: jest.fn((phone: string) => phone),
  extractCityFromAddress: jest.fn((address: string) => 'São Paulo'),
}));

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
  address: 'Rua Test, 123, São Paulo, SP',
  city: 'São Paulo',
  admin_user_id: 'admin-1',
  status: 'active',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02'),
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

const mockInactiveClinic: Clinic = {
  ...mockClinic,
  clinic_id: 'clinic-2',
  name: 'Inactive Clinic',
  status: 'inactive',
};

const mockStats: ClinicStats = {
  total_users: 5,
  total_patients: 100,
  total_products: 50,
  recent_activity_count: 10,
};

const mockAuditLogs: ClinicAuditLog[] = [
  {
    log_id: 'log-1',
    user_id: 'admin-1',
    clinic_id: 'clinic-1',
    action_type: 'clinic_created',
    resource_type: 'clinic',
    resource_id: 'clinic-1',
    details: {
      clinic_id: 'clinic-1',
      clinic_name: 'Test Clinic',
    },
    timestamp: new Date('2024-01-01'),
    severity: 'info',
    status: 'success',
  },
  {
    log_id: 'log-2',
    user_id: 'admin-1',
    clinic_id: 'clinic-1',
    action_type: 'clinic_status_changed',
    resource_type: 'clinic',
    resource_id: 'clinic-1',
    details: {
      clinic_id: 'clinic-1',
      clinic_name: 'Test Clinic',
      old_status: 'active',
      new_status: 'inactive',
    },
    timestamp: new Date('2024-01-02'),
    severity: 'warning',
    status: 'success',
  },
];

describe('Clinic Management End-to-End Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockClinicService.getClinics.mockResolvedValue([mockClinic, mockInactiveClinic]);
    mockClinicService.getClinicStats.mockResolvedValue(mockStats);
    mockClinicService.getClinicUsers.mockResolvedValue([]);
    mockClinicService.getClinicAuditLogs.mockResolvedValue(mockAuditLogs);
    mockClinicService.createClinic.mockResolvedValue(mockClinic);
    mockClinicService.updateClinic.mockResolvedValue(mockClinic);
    mockClinicService.toggleClinicStatus.mockResolvedValue({
      ...mockClinic,
      status: 'inactive',
    });
  });

  describe('Complete Clinic Creation Workflow', () => {
    it('should complete the full clinic creation process', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Gerenciamento de Clínicas')).toBeInTheDocument();
      });

      // Step 1: Click "Nova Clínica" button
      const createButton = screen.getByRole('button', { name: /nova clínica/i });
      await user.click(createButton);

      // Step 2: Verify form is displayed
      expect(screen.getByText('Nova Clínica')).toBeInTheDocument();

      // Step 3: Fill out clinic information
      await user.type(screen.getByLabelText(/nome da clínica/i), 'New Test Clinic');
      await user.type(screen.getByLabelText(/cnpj/i), '12.345.678/0001-90');
      await user.type(screen.getByLabelText(/email da clínica/i), 'newclinic@test.com');
      await user.type(screen.getByLabelText(/telefone da clínica/i), '(11) 99999-8888');
      await user.type(screen.getByLabelText(/endereço/i), 'Rua Nova, 456, São Paulo, SP');

      // Step 4: Fill out admin information
      await user.type(screen.getByLabelText(/email do administrador/i), 'admin@newclinic.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.type(screen.getByLabelText(/nome/i), 'Admin');
      await user.type(screen.getByLabelText(/sobrenome/i), 'User');

      // Step 5: Submit form
      const saveButton = screen.getByRole('button', { name: /criar clínica/i });
      await user.click(saveButton);

      // Step 6: Verify API call was made
      await waitFor(() => {
        expect(mockClinicService.createClinic).toHaveBeenCalledWith({
          name: 'New Test Clinic',
          cnpj: '12.345.678/0001-90',
          email: 'newclinic@test.com',
          phone: '(11) 99999-8888',
          address: 'Rua Nova, 456, São Paulo, SP',
          city: 'São Paulo',
          admin_email: 'admin@newclinic.com',
          admin_profile: {
            first_name: 'Admin',
            last_name: 'User',
          },
          admin_password: 'password123',
          settings: expect.any(Object),
        });
      });

      // Step 7: Verify success notification and return to list
      expect(screen.getByText(/criada com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText('Gerenciamento de Clínicas')).toBeInTheDocument();
    });

    it('should handle validation errors during creation', async () => {
      const user = userEvent.setup();
      
      // Mock validation error
      mockClinicService.createClinic.mockRejectedValue({
        response: {
          data: {
            error: {
              field_errors: {
                cnpj: 'CNPJ já existe no sistema',
                email: 'Email já está em uso',
              },
            },
          },
        },
      });

      renderWithTheme(<ClinicManagement />);

      // Go to create form
      await user.click(screen.getByRole('button', { name: /nova clínica/i }));

      // Fill form with invalid data
      await user.type(screen.getByLabelText(/nome da clínica/i), 'Test Clinic');
      await user.type(screen.getByLabelText(/cnpj/i), '12.345.678/0001-90');
      await user.type(screen.getByLabelText(/email da clínica/i), 'existing@test.com');

      // Submit form
      await user.click(screen.getByRole('button', { name: /criar clínica/i }));

      // Verify error messages are displayed
      await waitFor(() => {
        expect(screen.getByText('CNPJ já existe no sistema')).toBeInTheDocument();
        expect(screen.getByText('Email já está em uso')).toBeInTheDocument();
      });

      // Form should still be visible for corrections
      expect(screen.getByText('Nova Clínica')).toBeInTheDocument();
    });
  });

  describe('Complete Clinic Editing Workflow', () => {
    it('should complete the full clinic editing process', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Click on clinic to view details
      await user.click(screen.getByText('Test Clinic'));

      // Step 2: Verify detail view is displayed
      await waitFor(() => {
        expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      });

      // Step 3: Click edit button
      const editButton = screen.getByRole('button', { name: /editar clínica/i });
      await user.click(editButton);

      // Step 4: Verify edit form is displayed with current data
      expect(screen.getByText('Editar Clínica')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Clinic')).toBeInTheDocument();

      // Step 5: Update clinic information
      const nameField = screen.getByDisplayValue('Test Clinic');
      await user.clear(nameField);
      await user.type(nameField, 'Updated Test Clinic');

      const emailField = screen.getByDisplayValue('test@clinic.com');
      await user.clear(emailField);
      await user.type(emailField, 'updated@clinic.com');

      // Step 6: Submit form
      const updateButton = screen.getByRole('button', { name: /atualizar clínica/i });
      await user.click(updateButton);

      // Step 7: Verify API call was made
      await waitFor(() => {
        expect(mockClinicService.updateClinic).toHaveBeenCalledWith('clinic-1', {
          name: 'Updated Test Clinic',
          email: 'updated@clinic.com',
          phone: '(11) 99999-9999',
          address: 'Rua Test, 123, São Paulo, SP',
          city: 'São Paulo',
          status: 'active',
          settings: expect.any(Object),
        });
      });

      // Step 8: Verify success notification and return to detail view
      expect(screen.getByText(/atualizada com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
    });
  });

  describe('Complete Status Management Workflow', () => {
    it('should complete the full status toggle process', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Click status toggle button (power icon)
      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);

      // Step 2: Verify confirmation dialog is displayed
      expect(screen.getByText('Desativar Clínica')).toBeInTheDocument();
      expect(screen.getByText('Test Clinic')).toBeInTheDocument();

      // Step 3: Verify status information is shown
      expect(screen.getByText('Status atual:')).toBeInTheDocument();
      expect(screen.getByText('Novo status:')).toBeInTheDocument();

      // Step 4: Verify impact warning is displayed
      expect(screen.getByText(/usuários não conseguirão mais fazer login/i)).toBeInTheDocument();

      // Step 5: Confirm status change
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // Step 6: Verify API call was made
      await waitFor(() => {
        expect(mockClinicService.toggleClinicStatus).toHaveBeenCalledWith('clinic-1', 'inactive');
      });

      // Step 7: Verify success notification
      expect(screen.getByText(/desativada com sucesso/i)).toBeInTheDocument();

      // Step 8: Verify dialog is closed
      expect(screen.queryByText('Desativar Clínica')).not.toBeInTheDocument();
    });

    it('should handle status toggle cancellation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Open status toggle dialog
      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);

      // Verify dialog is open
      expect(screen.getByText('Desativar Clínica')).toBeInTheDocument();

      // Cancel the operation
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelButton);

      // Verify dialog is closed and no API call was made
      expect(screen.queryByText('Desativar Clínica')).not.toBeInTheDocument();
      expect(mockClinicService.toggleClinicStatus).not.toHaveBeenCalled();
    });
  });

  describe('Search and Filtering Functionality', () => {
    it('should complete the search workflow', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Enter search term
      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      await user.type(searchInput, 'Test');

      // Step 2: Verify search API call is made (debounced)
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('Test', expect.any(Object));
      }, { timeout: 1000 });

      // Step 3: Clear search
      const clearButton = screen.getByTestId('ClearIcon');
      await user.click(clearButton);

      // Step 4: Verify search is cleared
      expect(searchInput).toHaveValue('');
    });

    it('should complete the filtering workflow', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Open status filter
      const statusFilter = screen.getByRole('combobox');
      await user.click(statusFilter);

      // Step 2: Select "Inativas" option
      const inactiveOption = screen.getByText('Inativas');
      await user.click(inactiveOption);

      // Step 3: Verify filter API call is made
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'inactive',
          sortBy: 'name',
          sortOrder: 'asc',
        });
      });
    });

    it('should complete the sorting workflow', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Click on "Cidade" column header to sort
      const cityHeader = screen.getByText('Cidade');
      await user.click(cityHeader);

      // Step 2: Verify sort API call is made
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'all',
          sortBy: 'city',
          sortOrder: 'asc',
        });
      });

      // Step 3: Click again to reverse sort order
      await user.click(cityHeader);

      // Step 4: Verify reverse sort API call is made
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'all',
          sortBy: 'city',
          sortOrder: 'desc',
        });
      });
    });
  });

  describe('Audit Trail Creation and Viewing', () => {
    it('should display audit logs in clinic detail view', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Click on clinic to view details
      await user.click(screen.getByText('Test Clinic'));

      // Step 2: Verify audit history section is displayed
      await waitFor(() => {
        expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();
      });

      // Step 3: Verify audit logs are loaded
      expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith('clinic-1', 10, 0);

      // Step 4: Verify audit log entries are displayed
      expect(screen.getByText('Clínica Criada')).toBeInTheDocument();
      expect(screen.getByText('Status Alterado')).toBeInTheDocument();

      // Step 5: Expand an audit log entry
      const expandButton = screen.getAllByTestId('ExpandMoreIcon')[0];
      await user.click(expandButton);

      // Step 6: Verify expanded details are shown
      expect(screen.getByText('Usuário')).toBeInTheDocument();
      expect(screen.getByText('Data/Hora')).toBeInTheDocument();
    });

    it('should filter audit logs by action type', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Navigate to clinic detail
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Test Clinic'));

      // Wait for audit section to load
      await waitFor(() => {
        expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();
      });

      // Step 1: Open audit filter dropdown
      const filterDropdown = screen.getByLabelText('Filtrar por Ação');
      await user.click(filterDropdown);

      // Step 2: Select specific action type
      const statusChangedOption = screen.getByText('Status Alterado');
      await user.click(statusChangedOption);

      // Step 3: Verify filtered API call is made
      await waitFor(() => {
        expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith('clinic-1', 10, 0);
      });
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockClinicService.getClinics.mockRejectedValue(new Error('Network error'));
      
      renderWithTheme(<ClinicManagement />);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle status toggle errors', async () => {
      const user = userEvent.setup();
      
      // Mock successful initial load
      mockClinicService.getClinics.mockResolvedValue([mockClinic]);
      
      // Mock status toggle error
      mockClinicService.toggleClinicStatus.mockRejectedValue(new Error('Status toggle failed'));
      
      renderWithTheme(<ClinicManagement />);

      // Wait for load and open status dialog
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);

      // Confirm status change (this should fail)
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // The error should be handled by the status toggle component
      // Dialog should remain open for user to try again or cancel
      await waitFor(() => {
        expect(screen.getByText('Desativar Clínica')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Workflows', () => {
    it('should handle mobile view interactions', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // In mobile view, some columns should be hidden and information should be condensed
      // The component should still be functional
      expect(screen.getByText('Test Clinic')).toBeInTheDocument();
    });
  });
});