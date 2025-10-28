import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClinicForm from '../ClinicForm';
import clinicService, { Clinic, CreateClinicRequest, UpdateClinicRequest } from '../../../services/clinicService';

// Mock the clinic service
jest.mock('../../../services/clinicService');
const mockClinicService = clinicService as jest.Mocked<typeof clinicService>;

// Mock Brazilian validation utilities
jest.mock('../../../utils/brazilianValidation', () => ({
  validateCNPJ: jest.fn(),
  formatCNPJ: jest.fn(),
  validateBrazilianPhone: jest.fn(),
  formatBrazilianPhone: jest.fn(),
  extractCityFromAddress: jest.fn(),
}));

import { validateCNPJ, formatCNPJ, validateBrazilianPhone, formatBrazilianPhone, extractCityFromAddress } from '../../../utils/brazilianValidation';

const mockValidateCNPJ = validateCNPJ as jest.MockedFunction<typeof validateCNPJ>;
const mockFormatCNPJ = formatCNPJ as jest.MockedFunction<typeof formatCNPJ>;
const mockValidateBrazilianPhone = validateBrazilianPhone as jest.MockedFunction<typeof validateBrazilianPhone>;
const mockFormatBrazilianPhone = formatBrazilianPhone as jest.MockedFunction<typeof formatBrazilianPhone>;
const mockExtractCityFromAddress = extractCityFromAddress as jest.MockedFunction<typeof extractCityFromAddress>;

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
  name: 'Clínica Alpha',
  cnpj: '12.345.678/0001-90',
  email: 'alpha@clinic.com',
  phone: '(11) 99999-9999',
  address: 'Rua Alpha, 123, São Paulo - SP',
  city: 'São Paulo',
  admin_user_id: 'admin-1',
  status: 'active',
  created_at: new Date('2023-01-15'),
  updated_at: new Date('2023-01-15'),
  settings: {
    timezone: 'America/Sao_Paulo',
    notification_preferences: {
      low_stock_alerts: true,
      expiration_alerts: true,
      email_notifications: true,
      alert_threshold_days: 30
    }
  }
};

describe('ClinicForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockValidateCNPJ.mockReturnValue(true);
    mockFormatCNPJ.mockImplementation((cnpj) => cnpj);
    mockValidateBrazilianPhone.mockReturnValue(true);
    mockFormatBrazilianPhone.mockImplementation((phone) => phone);
    mockExtractCityFromAddress.mockReturnValue('São Paulo');
    
    mockClinicService.getClinics.mockResolvedValue([]);
    mockClinicService.createClinic.mockResolvedValue(mockClinic);
    mockClinicService.updateClinic.mockResolvedValue(mockClinic);
  });

  describe('Create Mode', () => {
    it('should render create form with all required fields', () => {
      renderWithTheme(<ClinicForm />);

      expect(screen.getByText('Nova Clínica')).toBeInTheDocument();
      
      // Clinic information fields
      expect(screen.getByLabelText('Nome da Clínica')).toBeInTheDocument();
      expect(screen.getByLabelText('CNPJ')).toBeInTheDocument();
      expect(screen.getByLabelText('Email da Clínica')).toBeInTheDocument();
      expect(screen.getByLabelText('Telefone da Clínica')).toBeInTheDocument();
      expect(screen.getByLabelText('Endereço')).toBeInTheDocument();
      expect(screen.getByLabelText('Cidade')).toBeInTheDocument();
      
      // Admin fields
      expect(screen.getByLabelText('Email do Administrador')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
      expect(screen.getByLabelText('Sobrenome')).toBeInTheDocument();
      expect(screen.getByLabelText('Telefone (opcional)')).toBeInTheDocument();
      
      // Settings
      expect(screen.getByLabelText('Fuso Horário')).toBeInTheDocument();
      expect(screen.getByLabelText('Dias de Alerta para Vencimento')).toBeInTheDocument();
      
      // Should not show status field in create mode
      expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: /criar clínica/i })).toBeInTheDocument();
    });

    it('should format CNPJ input as user types', async () => {
      mockFormatCNPJ.mockReturnValue('12.345.678/0001-90');
      
      renderWithTheme(<ClinicForm />);

      const cnpjInput = screen.getByLabelText('CNPJ');
      fireEvent.change(cnpjInput, { target: { value: '12345678000190' } });

      expect(mockFormatCNPJ).toHaveBeenCalledWith('12345678000190');
    });

    it('should format phone input as user types', async () => {
      mockFormatBrazilianPhone.mockReturnValue('(11) 99999-9999');
      
      renderWithTheme(<ClinicForm />);

      const phoneInput = screen.getByLabelText('Telefone da Clínica');
      fireEvent.change(phoneInput, { target: { value: '11999999999' } });

      expect(mockFormatBrazilianPhone).toHaveBeenCalledWith('11999999999');
    });

    it('should extract city from address automatically', async () => {
      mockExtractCityFromAddress.mockReturnValue('Rio de Janeiro');
      
      renderWithTheme(<ClinicForm />);

      const addressInput = screen.getByLabelText('Endereço');
      fireEvent.change(addressInput, { target: { value: 'Rua Test, 123, Rio de Janeiro - RJ' } });

      expect(mockExtractCityFromAddress).toHaveBeenCalledWith('Rua Test, 123, Rio de Janeiro - RJ');
    });

    it('should validate required fields on submit', async () => {
      renderWithTheme(<ClinicForm />);

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Nome da clínica é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('CNPJ é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Email da clínica é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Telefone da clínica é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Endereço é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Cidade é obrigatória')).toBeInTheDocument();
        expect(screen.getByText('Email do administrador é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Nome do administrador é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Sobrenome do administrador é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument();
      });

      expect(mockClinicService.createClinic).not.toHaveBeenCalled();
    });

    it('should validate CNPJ format', async () => {
      mockValidateCNPJ.mockReturnValue(false);
      
      renderWithTheme(<ClinicForm />);

      const cnpjInput = screen.getByLabelText('CNPJ');
      fireEvent.change(cnpjInput, { target: { value: '12.345.678/0001-99' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('CNPJ inválido. Verifique os dígitos verificadores.')).toBeInTheDocument();
      });
    });

    it('should validate Brazilian phone format', async () => {
      mockValidateBrazilianPhone.mockReturnValue(false);
      
      renderWithTheme(<ClinicForm />);

      const phoneInput = screen.getByLabelText('Telefone da Clínica');
      fireEvent.change(phoneInput, { target: { value: '123456' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Telefone inválido. Use o formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      renderWithTheme(<ClinicForm />);

      const emailInput = screen.getByLabelText('Email da Clínica');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Formato de email inválido')).toBeInTheDocument();
      });
    });

    it('should check for duplicate CNPJ and email', async () => {
      const existingClinic = { ...mockClinic, clinic_id: 'existing-clinic' };
      mockClinicService.getClinics.mockResolvedValue([existingClinic]);
      
      renderWithTheme(<ClinicForm />);

      // Fill form with valid data
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'alpha@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Este CNPJ já está cadastrado no sistema')).toBeInTheDocument();
        expect(screen.getByText('Este email já está cadastrado no sistema')).toBeInTheDocument();
      });

      expect(mockClinicService.createClinic).not.toHaveBeenCalled();
    });

    it('should create clinic with valid data', async () => {
      renderWithTheme(<ClinicForm />);

      // Fill form with valid data
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'test@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockClinicService.createClinic).toHaveBeenCalledWith({
          name: 'Test Clinic',
          cnpj: '12.345.678/0001-90',
          email: 'test@clinic.com',
          phone: '(11) 99999-9999',
          address: 'Test Address',
          city: 'Test City',
          admin_email: 'admin@test.com',
          admin_profile: {
            first_name: 'Admin',
            last_name: 'User',
            phone: undefined
          },
          admin_password: 'password123',
          settings: {
            timezone: 'America/Sao_Paulo',
            notification_preferences: {
              low_stock_alerts: true,
              expiration_alerts: true,
              email_notifications: true,
              alert_threshold_days: 30
            }
          }
        });
      });
    });
  });

  describe('Edit Mode', () => {
    it('should render edit form with clinic data', () => {
      renderWithTheme(<ClinicForm clinic={mockClinic} />);

      expect(screen.getByText('Editar Clínica')).toBeInTheDocument();
      
      expect(screen.getByDisplayValue('Clínica Alpha')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12.345.678/0001-90')).toBeInTheDocument();
      expect(screen.getByDisplayValue('alpha@clinic.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Rua Alpha, 123, São Paulo - SP')).toBeInTheDocument();
      expect(screen.getByDisplayValue('São Paulo')).toBeInTheDocument();
      
      // Should show status field in edit mode
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      
      // Should not show admin fields in edit mode
      expect(screen.queryByLabelText('Email do Administrador')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: /atualizar clínica/i })).toBeInTheDocument();
    });

    it('should disable CNPJ field in edit mode', () => {
      renderWithTheme(<ClinicForm clinic={mockClinic} />);

      const cnpjInput = screen.getByLabelText('CNPJ');
      expect(cnpjInput).toBeDisabled();
    });

    it('should update clinic with valid data', async () => {
      renderWithTheme(<ClinicForm clinic={mockClinic} />);

      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Updated Clinic' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'updated@clinic.com' } });

      const submitButton = screen.getByRole('button', { name: /atualizar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockClinicService.updateClinic).toHaveBeenCalledWith('clinic-1', {
          name: 'Updated Clinic',
          email: 'updated@clinic.com',
          phone: '(11) 99999-9999',
          address: 'Rua Alpha, 123, São Paulo - SP',
          city: 'São Paulo',
          status: 'active',
          settings: {
            timezone: 'America/Sao_Paulo',
            notification_preferences: {
              low_stock_alerts: true,
              expiration_alerts: true,
              email_notifications: true,
              alert_threshold_days: 30
            }
          }
        });
      });
    });
  });

  describe('Real-time Validation', () => {
    it('should show real-time CNPJ validation feedback', async () => {
      mockValidateCNPJ.mockReturnValue(true);
      
      renderWithTheme(<ClinicForm />);

      const cnpjInput = screen.getByLabelText('CNPJ');
      fireEvent.change(cnpjInput, { target: { value: '12.345.678/0001-90' } });

      await waitFor(() => {
        expect(screen.getByText('CNPJ válido')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show real-time phone validation feedback', async () => {
      mockValidateBrazilianPhone.mockReturnValue(true);
      
      renderWithTheme(<ClinicForm />);

      const phoneInput = screen.getByLabelText('Telefone da Clínica');
      fireEvent.change(phoneInput, { target: { value: '(11) 99999-9999' } });

      await waitFor(() => {
        expect(screen.getByText('Telefone válido')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show real-time email validation feedback', async () => {
      renderWithTheme(<ClinicForm />);

      const emailInput = screen.getByLabelText('Email da Clínica');
      fireEvent.change(emailInput, { target: { value: 'test@clinic.com' } });

      await waitFor(() => {
        expect(screen.getByText('Email válido')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      mockClinicService.createClinic.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithTheme(<ClinicForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'test@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should show checking duplicates state', async () => {
      mockClinicService.getClinics.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));
      
      renderWithTheme(<ClinicForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'test@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Verificando...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display API error message', async () => {
      mockClinicService.createClinic.mockRejectedValue(new Error('Server error'));
      
      renderWithTheme(<ClinicForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'test@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('should handle field-specific API errors', async () => {
      const apiError = {
        field_errors: {
          cnpj: 'CNPJ já existe',
          email: 'Email já existe'
        }
      };
      mockClinicService.createClinic.mockRejectedValue(apiError);
      
      renderWithTheme(<ClinicForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'test@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('CNPJ já existe')).toBeInTheDocument();
        expect(screen.getByText('Email já existe')).toBeInTheDocument();
      });
    });
  });

  describe('Callback Props', () => {
    it('should call onSave when clinic is created successfully', async () => {
      const onSave = jest.fn();
      
      renderWithTheme(<ClinicForm onSave={onSave} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText('Nome da Clínica'), { target: { value: 'Test Clinic' } });
      fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '12.345.678/0001-90' } });
      fireEvent.change(screen.getByLabelText('Email da Clínica'), { target: { value: 'test@clinic.com' } });
      fireEvent.change(screen.getByLabelText('Telefone da Clínica'), { target: { value: '(11) 99999-9999' } });
      fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Test Address' } });
      fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText('Email do Administrador'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin' } });
      fireEvent.change(screen.getByLabelText('Sobrenome'), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /criar clínica/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(mockClinic);
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      
      renderWithTheme(<ClinicForm onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      renderWithTheme(<ClinicForm />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });
  });
});