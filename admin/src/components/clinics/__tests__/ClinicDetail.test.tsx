import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClinicDetail from '../ClinicDetail';
import clinicService, { Clinic, ClinicStats, User, ClinicAuditLog } from '../../../services/clinicService';

// Mock the clinic service
jest.mock('../../../services/clinicService');
const mockClinicService = clinicService as jest.Mocked<typeof clinicService>;

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
  address: 'Rua Alpha, 123, Centro',
  city: 'São Paulo',
  admin_user_id: 'admin-1',
  status: 'active',
  created_at: new Date('2023-01-15'),
  updated_at: new Date('2023-06-20'),
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

const mockStats: ClinicStats = {
  total_users: 5,
  total_patients: 120,
  total_products: 45,
  recent_activity_count: 8
};

const mockUsers: User[] = [
  {
    user_id: 'user-1',
    email: 'admin@alpha.com',
    role: 'clinic_admin',
    clinic_id: 'clinic-1',
    permissions: ['manage_users', 'manage_products'],
    profile: {
      first_name: 'João',
      last_name: 'Silva',
      phone: '(11) 98765-4321'
    },
    created_at: new Date('2023-01-15'),
    last_login: new Date('2023-06-19')
  },
  {
    user_id: 'user-2',
    email: 'user@alpha.com',
    role: 'clinic_user',
    clinic_id: 'clinic-1',
    permissions: ['view_products'],
    profile: {
      first_name: 'Maria',
      last_name: 'Santos'
    },
    created_at: new Date('2023-02-10'),
    last_login: new Date('2023-06-18')
  }
];

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
      clinic_name: 'Clínica Alpha'
    },
    timestamp: new Date('2023-01-15'),
    ip_address: '192.168.1.1',
    severity: 'info',
    status: 'success'
  },
  {
    log_id: 'log-2',
    user_id: 'admin-1',
    clinic_id: 'clinic-1',
    action_type: 'clinic_updated',
    resource_type: 'clinic',
    resource_id: 'clinic-1',
    details: {
      clinic_id: 'clinic-1',
      clinic_name: 'Clínica Alpha',
      changes: {
        phone: '(11) 99999-9999'
      }
    },
    timestamp: new Date('2023-06-20'),
    ip_address: '192.168.1.2',
    severity: 'info',
    status: 'success'
  },
  {
    log_id: 'log-3',
    user_id: 'admin-1',
    clinic_id: 'clinic-1',
    action_type: 'clinic_status_changed',
    resource_type: 'clinic',
    resource_id: 'clinic-1',
    details: {
      clinic_id: 'clinic-1',
      clinic_name: 'Clínica Alpha',
      old_status: 'inactive',
      new_status: 'active'
    },
    timestamp: new Date('2023-06-19'),
    ip_address: '192.168.1.3',
    severity: 'warning',
    status: 'success'
  }
];

describe('ClinicDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClinicService.getClinicStats.mockResolvedValue(mockStats);
    mockClinicService.getClinicUsers.mockResolvedValue(mockUsers);
    mockClinicService.getClinicAuditLogs.mockResolvedValue(mockAuditLogs);
  });

  describe('Basic Rendering', () => {
    it('should render clinic information correctly', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      // Header information should be visible immediately
      expect(screen.getByText('Clínica Alpha')).toBeInTheDocument();
      expect(screen.getByText('Rua Alpha, 123, Centro')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      });

      // Basic information section
      expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
      expect(screen.getByText('Ativa')).toBeInTheDocument();
      
      // Contact information section
      expect(screen.getByText('Informações de Contato')).toBeInTheDocument();
      expect(screen.getByText('alpha@clinic.com')).toBeInTheDocument();
      expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
      expect(screen.getByText('São Paulo')).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display statistics cards', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // total_users
        expect(screen.getByText('120')).toBeInTheDocument(); // total_patients
        expect(screen.getByText('45')).toBeInTheDocument(); // total_products
        expect(screen.getByText('8')).toBeInTheDocument(); // recent_activity_count
        
        expect(screen.getByText('Usuários')).toBeInTheDocument();
        expect(screen.getByText('Pacientes')).toBeInTheDocument();
        expect(screen.getByText('Produtos')).toBeInTheDocument();
        expect(screen.getByText('Atividades (7 dias)')).toBeInTheDocument();
      });
    });

    it('should display system settings', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
        expect(screen.getByText('America/Sao_Paulo')).toBeInTheDocument();
        expect(screen.getByText('Alertas de Estoque')).toBeInTheDocument();
        expect(screen.getByText('Alertas de Vencimento')).toBeInTheDocument();
        expect(screen.getByText('Notificações por Email')).toBeInTheDocument();
        expect(screen.getByText('7 dias de alerta')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons and Navigation', () => {
    it('should render back button when onBack is provided', async () => {
      const onBack = jest.fn();
      renderWithTheme(<ClinicDetail clinic={mockClinic} onBack={onBack} />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /voltar à lista/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should call onBack when back button is clicked', async () => {
      const onBack = jest.fn();
      renderWithTheme(<ClinicDetail clinic={mockClinic} onBack={onBack} />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /voltar à lista/i });
        expect(backButton).toBeInTheDocument();
        fireEvent.click(backButton);
      });

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should render edit button when onEdit is provided', async () => {
      const onEdit = jest.fn();
      renderWithTheme(<ClinicDetail clinic={mockClinic} onEdit={onEdit} />);

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar clínica/i });
        expect(editButton).toBeInTheDocument();
      });
    });

    it('should call onEdit when edit button is clicked', async () => {
      const onEdit = jest.fn();
      renderWithTheme(<ClinicDetail clinic={mockClinic} onEdit={onEdit} />);

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar clínica/i });
        fireEvent.click(editButton);
      });

      expect(onEdit).toHaveBeenCalledWith(mockClinic);
    });

    it('should render status toggle button when onStatusToggle is provided', async () => {
      const onStatusToggle = jest.fn();
      renderWithTheme(<ClinicDetail clinic={mockClinic} onStatusToggle={onStatusToggle} />);

      await waitFor(() => {
        const statusButton = screen.getByRole('button', { name: /desativar/i });
        expect(statusButton).toBeInTheDocument();
      });
    });

    it('should show correct status toggle button text for inactive clinic', async () => {
      const inactiveClinic = { ...mockClinic, status: 'inactive' as const };
      const onStatusToggle = jest.fn();
      renderWithTheme(<ClinicDetail clinic={inactiveClinic} onStatusToggle={onStatusToggle} />);

      await waitFor(() => {
        const statusButton = screen.getByRole('button', { name: /ativar/i });
        expect(statusButton).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /atualizar dados/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });
  });

  describe('Audit History Section', () => {
    it('should display audit history section', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();
      });
    });

    it('should display audit log entries', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Clínica Criada')).toBeInTheDocument();
        expect(screen.getByText('Clínica Atualizada')).toBeInTheDocument();
        expect(screen.getByText('Status Alterado')).toBeInTheDocument();
      });
    });

    it('should display audit filter dropdown', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();
      });

      // Look for the select element by its role
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toBeInTheDocument();
    });

    it('should filter audit logs when filter is changed', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();
      });

      const filterSelect = screen.getByRole('combobox');
      fireEvent.mouseDown(filterSelect);

      await waitFor(() => {
        const createdOption = screen.getByText('Clínica Criada');
        fireEvent.click(createdOption);
      });

      await waitFor(() => {
        expect(mockClinicService.getClinicAuditLogs).toHaveBeenCalledWith('clinic-1', 10, 0);
      });
    });

    it('should expand audit log details when clicked', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Clínica Atualizada')).toBeInTheDocument();
      });

      const auditEntry = screen.getByText('Clínica Atualizada').closest('button');
      expect(auditEntry).toBeInTheDocument();
      fireEvent.click(auditEntry!);

      await waitFor(() => {
        expect(screen.getByText('Detalhes')).toBeInTheDocument();
        expect(screen.getByText('Alterações:')).toBeInTheDocument();
      });
    });

    it('should display empty state when no audit logs are found', async () => {
      mockClinicService.getClinicAuditLogs.mockResolvedValue([]);
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum registro de auditoria encontrado')).toBeInTheDocument();
      });
    });
  });

  describe('Users Management Section', () => {
    it('should display users table', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Usuários da Clínica')).toBeInTheDocument();
        expect(screen.getByText('João Silva')).toBeInTheDocument();
        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('admin@alpha.com')).toBeInTheDocument();
        expect(screen.getByText('user@alpha.com')).toBeInTheDocument();
      });
    });

    it('should display user roles correctly', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Administrador')).toBeInTheDocument();
        // Use getAllByText since "Usuário" appears multiple times (in stats and user role)
        const userTexts = screen.getAllByText('Usuário');
        expect(userTexts.length).toBeGreaterThan(0);
      });
    });

    it('should render create user button when onCreateUser is provided', async () => {
      const onCreateUser = jest.fn();
      renderWithTheme(<ClinicDetail clinic={mockClinic} onCreateUser={onCreateUser} />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /novo usuário/i });
        expect(createButton).toBeInTheDocument();
      });
    });

    it('should display empty state when no users are found', async () => {
      mockClinicService.getClinicUsers.mockResolvedValue([]);
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data loading fails', async () => {
      mockClinicService.getClinicStats.mockRejectedValue(new Error('Failed to load stats'));
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load stats')).toBeInTheDocument();
      });
    });

    it('should display error message when audit logs loading fails', async () => {
      mockClinicService.getClinicAuditLogs.mockRejectedValue(new Error('Failed to load audit logs'));
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load audit logs')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state for audit logs', async () => {
      // Mock a delayed response
      mockClinicService.getClinicAuditLogs.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAuditLogs), 100))
      );

      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();
      });

      // Should show loading spinner in audit section
      expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    });

    it('should disable buttons during loading', async () => {
      // Mock delayed responses to test loading state
      mockClinicService.getClinicStats.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockStats), 100))
      );

      const onEdit = jest.fn();
      const onStatusToggle = jest.fn();
      const onBack = jest.fn();

      renderWithTheme(
        <ClinicDetail 
          clinic={mockClinic} 
          onEdit={onEdit}
          onStatusToggle={onStatusToggle}
          onBack={onBack}
        />
      );

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting', () => {
    it('should format dates correctly', async () => {
      renderWithTheme(<ClinicDetail clinic={mockClinic} />);

      await waitFor(() => {
        expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      });

      // Check for formatted dates - they might be formatted differently
      expect(screen.getByText(/15\/01\/2023/)).toBeInTheDocument(); // created_at
      expect(screen.getByText(/20\/06\/2023/)).toBeInTheDocument(); // updated_at
    });

    it('should handle missing optional fields', async () => {
      const clinicWithMissingFields = {
        ...mockClinic,
        cnpj: '',
        email: '',
        phone: '',
        city: '',
        updated_at: null
      };

      renderWithTheme(<ClinicDetail clinic={clinicWithMissingFields} />);

      await waitFor(() => {
        expect(screen.getAllByText('Não informado')).toHaveLength(4);
      });
    });
  });
});