import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClinicStatusToggle from '../ClinicStatusToggle';
import { Clinic } from '../../../services/clinicService';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockActiveClinic: Clinic = {
  clinic_id: 'clinic-1',
  name: 'Clínica Alpha',
  cnpj: '12.345.678/0001-90',
  email: 'alpha@clinic.com',
  phone: '(11) 99999-9999',
  address: 'Rua Alpha, 123',
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
      alert_threshold_days: 7
    }
  }
};

const mockInactiveClinic: Clinic = {
  ...mockActiveClinic,
  clinic_id: 'clinic-2',
  name: 'Clínica Beta',
  status: 'inactive'
};

describe('ClinicStatusToggle Component', () => {
  const mockOnStatusChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render deactivation dialog for active clinic', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Desativar Clínica')).toBeInTheDocument();
      expect(screen.getByText('Tem certeza que deseja desativar a clínica "Clínica Alpha"?')).toBeInTheDocument();
    });

    it('should render activation dialog for inactive clinic', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockInactiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Ativar Clínica')).toBeInTheDocument();
      expect(screen.getByText('Tem certeza que deseja ativar a clínica "Clínica Beta"?')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Desativar Clínica')).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display current and new status correctly for active clinic', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Status atual:')).toBeInTheDocument();
      expect(screen.getByText('Ativa')).toBeInTheDocument();
      expect(screen.getByText('Novo status:')).toBeInTheDocument();
      expect(screen.getByText('Inativa')).toBeInTheDocument();
    });

    it('should display current and new status correctly for inactive clinic', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockInactiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Status atual:')).toBeInTheDocument();
      expect(screen.getByText('Inativa')).toBeInTheDocument();
      expect(screen.getByText('Novo status:')).toBeInTheDocument();
      expect(screen.getByText('Ativa')).toBeInTheDocument();
    });
  });

  describe('Impact Messages', () => {
    it('should show deactivation impact message for active clinic', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Ao desativar a clínica, os usuários não conseguirão mais fazer login/)).toBeInTheDocument();
    });

    it('should show activation impact message for inactive clinic', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockInactiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Ao ativar a clínica, os usuários poderão fazer login normalmente/)).toBeInTheDocument();
    });

    it('should show additional warning for deactivation', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Esta ação afetará todos os usuários da clínica imediatamente/)).toBeInTheDocument();
    });

    it('should not show additional warning for activation', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockInactiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText(/Esta ação afetará todos os usuários da clínica imediatamente/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onStatusChange when confirm button is clicked', async () => {
      mockOnStatusChange.mockResolvedValue(undefined);

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith(mockActiveClinic, 'inactive');
      });
    });

    it('should show loading state during status change', async () => {
      let resolveStatusChange: () => void;
      const statusChangePromise = new Promise<void>((resolve) => {
        resolveStatusChange = resolve;
      });
      mockOnStatusChange.mockReturnValue(statusChangePromise);

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Desativando...')).toBeInTheDocument();
      });

      // Resolve the promise to complete the test
      resolveStatusChange!();
      await waitFor(() => {
        expect(screen.queryByText('Desativando...')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during loading', async () => {
      let resolveStatusChange: () => void;
      const statusChangePromise = new Promise<void>((resolve) => {
        resolveStatusChange = resolve;
      });
      mockOnStatusChange.mockReturnValue(statusChangePromise);

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });

      // Resolve the promise to complete the test
      resolveStatusChange!();
    });
  });

  describe('Success Feedback', () => {
    it('should show success message after successful status change', async () => {
      mockOnStatusChange.mockResolvedValue(undefined);

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Status da clínica alterado com sucesso!')).toBeInTheDocument();
      });
    });

    it('should auto-close dialog after success', async () => {
      jest.useFakeTimers();
      mockOnStatusChange.mockResolvedValue(undefined);

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Status da clínica alterado com sucesso!')).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-close
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when status change fails', async () => {
      const errorMessage = 'Failed to update clinic status';
      mockOnStatusChange.mockRejectedValue(new Error(errorMessage));

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show generic error message when error has no message', async () => {
      mockOnStatusChange.mockRejectedValue(new Error());

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Falha ao alterar status da clínica')).toBeInTheDocument();
      });
    });

    it('should clear error when dialog is closed', async () => {
      const errorMessage = 'Failed to update clinic status';
      mockOnStatusChange.mockRejectedValue(new Error(errorMessage));

      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'status-toggle-dialog-title');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'status-toggle-dialog-description');
      
      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      expect(confirmButton).toHaveAttribute('aria-label', 'Desativar clínica Clínica Alpha');
    });

    it('should have proper ARIA labels for activation', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockInactiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /ativar clínica clínica beta/i });
      expect(confirmButton).toHaveAttribute('aria-label', 'Ativar clínica Clínica Beta');
    });

    it('should be keyboard navigable', async () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });

      // Tab should move focus between buttons
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();

      fireEvent.keyDown(cancelButton, { key: 'Tab' });
      expect(confirmButton).toHaveFocus();
    });
  });

  describe('Disabled State', () => {
    it('should disable confirm button when disabled prop is true', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
          disabled={true}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /desativar clínica clínica alpha/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should not disable cancel button when disabled prop is true', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
          disabled={true}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Button Text and Icons', () => {
    it('should show correct button text for deactivation', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockActiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /desativar clínica clínica alpha/i })).toBeInTheDocument();
      expect(screen.getByTestId('PowerSettingsNewIcon')).toBeInTheDocument();
    });

    it('should show correct button text for activation', () => {
      renderWithTheme(
        <ClinicStatusToggle
          clinic={mockInactiveClinic}
          onStatusChange={mockOnStatusChange}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /ativar clínica clínica beta/i })).toBeInTheDocument();
      expect(screen.getByTestId('PowerSettingsNewIcon')).toBeInTheDocument();
    });
  });
});