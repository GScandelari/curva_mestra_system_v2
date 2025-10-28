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
];

describe('Clinic Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful responses
    mockClinicService.getClinics.mockResolvedValue([mockClinic]);
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

  describe('Complete User Workflows', () => {
    it('should handle complete clinic creation workflow with validation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Gerenciamento de Clínicas')).toBeInTheDocument();
      });

      // Step 1: Start clinic creation
      const createButton = screen.getByRole('button', { name: /nova clínica/i });
      await user.click(createButton);

      // Step 2: Fill form with valid data
      await user.type(screen.getByLabelText(/nome da clínica/i), 'New Test Clinic');
      await user.type(screen.getByLabelText(/cnpj/i), '12.345.678/0001-90');
      await user.type(screen.getByLabelText(/email da clínica/i), 'newclinic@test.com');
      await user.type(screen.getByLabelText(/telefone da clínica/i), '(11) 99999-8888');
      await user.type(screen.getByLabelText(/endereço/i), 'Rua Nova, 456, São Paulo, SP');
      await user.type(screen.getByLabelText(/email do administrador/i), 'admin@newclinic.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.type(screen.getByLabelText(/nome/i), 'Admin');
      await user.type(screen.getByLabelText(/sobrenome/i), 'User');

      // Step 3: Submit form
      const saveButton = screen.getByRole('button', { name: /criar clínica/i });
      await user.click(saveButton);

      // Step 4: Verify API call and success flow
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

      // Step 5: Verify success notification and navigation
      expect(screen.getByText(/criada com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText('Gerenciamento de Clínicas')).toBeInTheDocument();
    });

    it('should handle complete clinic editing workflow', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Navigate to clinic detail
      await user.click(screen.getByText('Test Clinic'));

      // Wait for detail view
      await waitFor(() => {
        expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      });

      // Step 2: Start editing
      const editButton = screen.getByRole('button', { name: /editar clínica/i });
      await user.click(editButton);

      // Step 3: Modify clinic data
      const nameField = screen.getByDisplayValue('Test Clinic');
      await user.clear(nameField);
      await user.type(nameField, 'Updated Test Clinic');

      // Step 4: Submit changes
      const updateButton = screen.getByRole('button', { name: /atualizar clínica/i });
      await user.click(updateButton);

      // Step 5: Verify API call and success flow
      await waitFor(() => {
        expect(mockClinicService.updateClinic).toHaveBeenCalledWith('clinic-1', {
          name: 'Updated Test Clinic',
          email: 'test@clinic.com',
          phone: '(11) 99999-9999',
          address: 'Rua Test, 123, São Paulo, SP',
          city: 'São Paulo',
          status: 'active',
          settings: expect.any(Object),
        });
      });

      // Step 6: Verify success and return to detail view
      expect(screen.getByText(/atualizada com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
    });

    it('should handle complete status management workflow', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ClinicManagement />);

      // Wait for clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Step 1: Initiate status toggle
      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);

      // Step 2: Verify confirmation dialog
      expect(screen.getByText('Desativar Clínica')).toBeInTheDocument();
      expect(screen.getByText(/usuários não conseguirão mais fazer login/i)).toBeInTheDocument();

      // Step 3: Confirm status change
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // Step 4: Verify API call and success flow
      await waitFor(() => {
        expect(mockClinicService.toggleClinicStatus).toHaveBeenCalledWith('clinic-1', 'inactive');
      });

      // Step 5: Verify success notification
      expect(screen.getByText(/desativada com sucesso/i)).toBeInTheDocument();
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      mockClinicService.getClinics.mockRejectedValue(new Error('Network error'));
      
      renderWithTheme(<ClinicManagement />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors during clinic creation', async () => {
      const user = userEvent.setup();
      
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

      // Navigate to create form
      await user.click(screen.getByRole('button', { name: /nova clínica/i }));

      // Fill and submit form
      await user.type(screen.getByLabelText(/nome da clínica/i), 'Test Clinic');
      await user.type(screen.getByLabelText(/cnpj/i), '12.345.678/0001-90');
      await user.type(screen.getByLabelText(/email da clínica/i), 'existing@test.com');
      await user.type(screen.getByLabelText(/telefone da clínica/i), '(11) 99999-9999');
      await user.type(screen.getByLabelText(/endereço/i), 'Test Address');
      await user.type(screen.getByLabelText(/email do administrador/i), 'admin@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.type(screen.getByLabelText(/nome/i), 'Admin');
      await user.type(screen.getByLabelText(/sobrenome/i), 'User');

      await user.click(screen.getByRole('button', { name: /criar clínica/i }));

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('CNPJ já existe no sistema')).toBeInTheDocument();
        expect(screen.getByText('Email já está em uso')).toBeInTheDocument();
      });

      // Form should remain open for corrections
      expect(screen.getByText('Nova Clínica')).toBeInTheDocument();
    });

    it('should handle status toggle errors', async () => {
      const user = userEvent.setup();
      
      mockClinicService.getClinics.mockResolvedValue([mockClinic]);
      mockClinicService.toggleClinicStatus.mockRejectedValue(new Error('Status toggle failed'));
      
      renderWithTheme(<ClinicManagement />);

      // Wait for load and initiate status toggle
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);

      // Confirm status change (this should fail)
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // Dialog should remain open for retry or cancellation
      await waitFor(() => {
        expect(screen.getByText('Desativar Clínica')).toBeInTheDocument();
      });
    });

    it('should handle concurrent operations', async () => {
      const user = userEvent.setup();
      
      // Mock delayed responses to simulate concurrent operations
      mockClinicService.getClinics.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([mockClinic]), 100))
      );
      mockClinicService.toggleClinicStatus.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ...mockClinic, status: 'inactive' }), 200))
      );

      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Start multiple operations quickly
      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);
      
      // Confirm quickly
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // Should handle the operation properly
      await waitFor(() => {
        expect(mockClinicService.toggleClinicStatus).toHaveBeenCalledWith('clinic-1', 'inactive');
      }, { timeout: 3000 });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large clinic lists efficiently', async () => {
      // Create a large list of clinics
      const largeClinics = Array.from({ length: 100 }, (_, i) => ({
        ...mockClinic,
        clinic_id: `clinic-${i}`,
        name: `Test Clinic ${i}`,
        email: `test${i}@clinic.com`,
      }));

      mockClinicService.getClinics.mockResolvedValue(largeClinics);
      mockClinicService.getClinicStats.mockResolvedValue(mockStats);

      const startTime = performance.now();
      renderWithTheme(<ClinicManagement />);

      // Wait for all clinics to load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time (less than 2 seconds)
      expect(loadTime).toBeLessThan(2000);

      // Should display pagination for large lists
      expect(screen.getByText(/linhas por página/i)).toBeInTheDocument();
    });

    it('should handle rapid search operations', async () => {
      const user = userEvent.setup();
      
      // Mock search responses
      mockClinicService.getClinics.mockImplementation((search) => {
        if (search === 'Test') {
          return Promise.resolve([mockClinic]);
        }
        return Promise.resolve([]);
      });

      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Perform rapid search operations
      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      
      await user.type(searchInput, 'T');
      await user.type(searchInput, 'e');
      await user.type(searchInput, 's');
      await user.type(searchInput, 't');

      // Should debounce and make only one final search call
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('Test', expect.any(Object));
      }, { timeout: 1000 });

      // Should not make excessive API calls
      expect(mockClinicService.getClinics).toHaveBeenCalledTimes(2); // Initial load + search
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const user = userEvent.setup();
      
      let currentClinic = { ...mockClinic };
      
      // Mock service to track state changes
      mockClinicService.toggleClinicStatus.mockImplementation(async (id, status) => {
        currentClinic = { ...currentClinic, status };
        return currentClinic;
      });

      mockClinicService.getClinics.mockImplementation(async () => [currentClinic]);

      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Verify initial status
      expect(screen.getByText('Ativa')).toBeInTheDocument();

      // Toggle status
      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // Wait for status change to complete
      await waitFor(() => {
        expect(screen.getByText(/desativada com sucesso/i)).toBeInTheDocument();
      });

      // Data should be consistent - the clinic should now show as inactive
      expect(currentClinic.status).toBe('inactive');
    });

    it('should handle optimistic updates correctly', async () => {
      const user = userEvent.setup();
      
      // Mock delayed status toggle
      mockClinicService.toggleClinicStatus.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ ...mockClinic, status: 'inactive' }), 500)
        )
      );

      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Start status toggle
      const statusButtons = screen.getAllByTestId('PowerSettingsNewIcon');
      await user.click(statusButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /desativar/i });
      await user.click(confirmButton);

      // Should show loading state during operation
      expect(screen.getByText(/desativando/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/desativada com sucesso/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility and Usability', () => {
    it('should be accessible with keyboard navigation', async () => {
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Should be able to navigate with keyboard
      const createButton = screen.getByRole('button', { name: /nova clínica/i });
      createButton.focus();
      expect(document.activeElement).toBe(createButton);

      // Tab navigation should work
      fireEvent.keyDown(createButton, { key: 'Tab' });
      
      // Search input should be focusable
      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should provide proper ARIA labels and roles', async () => {
      renderWithTheme(<ClinicManagement />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Check for proper ARIA attributes
      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      expect(searchInput).toHaveAttribute('aria-invalid', 'false');

      const statusFilter = screen.getByRole('combobox');
      expect(statusFilter).toHaveAttribute('aria-haspopup', 'listbox');

      // Table should have proper structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });
});