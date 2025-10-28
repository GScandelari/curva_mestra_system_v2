import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClinicList from '../ClinicList';
import clinicService, { Clinic, ClinicStats } from '../../../services/clinicService';

// Mock the clinic service
jest.mock('../../../services/clinicService');
const mockClinicService = clinicService as jest.Mocked<typeof clinicService>;

// Mock lodash debounce
jest.mock('lodash', () => ({
  debounce: (fn: any) => {
    fn.cancel = jest.fn();
    return fn;
  }
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockClinics: Clinic[] = [
  {
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
  },
  {
    clinic_id: 'clinic-2',
    name: 'Clínica Beta',
    cnpj: '98.765.432/0001-10',
    email: 'beta@clinic.com',
    phone: '(11) 88888-8888',
    address: 'Rua Beta, 456',
    city: 'Rio de Janeiro',
    admin_user_id: 'admin-2',
    status: 'inactive',
    created_at: new Date('2023-02-20'),
    updated_at: new Date('2023-02-20'),
    settings: {
      timezone: 'America/Sao_Paulo',
      notification_preferences: {
        low_stock_alerts: false,
        expiration_alerts: true,
        email_notifications: false,
        alert_threshold_days: 5
      }
    }
  }
];

const mockStats: Record<string, ClinicStats> = {
  'clinic-1': {
    total_users: 5,
    total_patients: 120,
    total_products: 45,
    recent_activity_count: 8
  },
  'clinic-2': {
    total_users: 3,
    total_patients: 80,
    total_products: 30,
    recent_activity_count: 2
  }
};

describe('ClinicList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClinicService.getClinics.mockResolvedValue(mockClinics);
    mockClinicService.getClinicStats.mockImplementation((clinicId) => 
      Promise.resolve(mockStats[clinicId])
    );
  });

  describe('Basic Rendering', () => {
    it('should render the clinic list with header', async () => {
      renderWithTheme(<ClinicList />);

      expect(screen.getByText('Gerenciamento de Clínicas')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Clínica Alpha')).toBeInTheDocument();
        expect(screen.getByText('Clínica Beta')).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      renderWithTheme(<ClinicList />);
      
      // Should show skeleton loaders - they don't have testid, so check for the table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should display clinic information correctly', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('Clínica Alpha')).toBeInTheDocument();
        expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
        expect(screen.getByText('alpha@clinic.com')).toBeInTheDocument();
        expect(screen.getByText('São Paulo')).toBeInTheDocument();
        expect(screen.getByText('Ativa')).toBeInTheDocument();
        
        expect(screen.getByText('Clínica Beta')).toBeInTheDocument();
        expect(screen.getByText('98.765.432/0001-10')).toBeInTheDocument();
        expect(screen.getByText('beta@clinic.com')).toBeInTheDocument();
        expect(screen.getByText('Rio de Janeiro')).toBeInTheDocument();
        expect(screen.getByText('Inativa')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      renderWithTheme(<ClinicList />);

      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should call getClinics with search term', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      await userEvent.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('Alpha', {
          status: 'all',
          sortBy: 'name',
          sortOrder: 'asc'
        });
      });
    });

    it('should show clear search button when search term exists', async () => {
      renderWithTheme(<ClinicList />);

      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      await userEvent.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(screen.getByTestId('ClearIcon')).toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      renderWithTheme(<ClinicList />);

      const searchInput = screen.getByPlaceholderText('Buscar por nome ou CNPJ...');
      await userEvent.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(screen.getByTestId('ClearIcon')).toBeInTheDocument();
      });

      const clearButton = screen.getByTestId('ClearIcon').closest('button');
      await userEvent.click(clearButton!);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Filter Functionality', () => {
    it('should render status filter dropdown', () => {
      renderWithTheme(<ClinicList />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Todos')).toBeInTheDocument();
    });

    it('should call getClinics with status filter', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledTimes(1);
      });

      const statusSelect = screen.getByRole('combobox');
      await userEvent.click(statusSelect);

      const activeOption = screen.getByText('Ativas');
      await userEvent.click(activeOption);

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'active',
          sortBy: 'name',
          sortOrder: 'asc'
        });
      });
    });
  });

  describe('Sorting Functionality', () => {
    it('should render sortable column headers', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nome/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cidade/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /criada em/i })).toBeInTheDocument();
      });
    });

    it('should sort by name when name header is clicked', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledTimes(1);
      });

      const nameHeader = screen.getByRole('button', { name: /nome/i });
      fireEvent.click(nameHeader);

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'all',
          sortBy: 'name',
          sortOrder: 'desc'
        });
      });
    });

    it('should toggle sort order when same column is clicked twice', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledTimes(1);
      });

      const nameHeader = screen.getByRole('button', { name: /nome/i });
      
      // First click - should change to desc
      fireEvent.click(nameHeader);
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'all',
          sortBy: 'name',
          sortOrder: 'desc'
        });
      });

      // Second click - should change back to asc
      fireEvent.click(nameHeader);
      await waitFor(() => {
        expect(mockClinicService.getClinics).toHaveBeenCalledWith('', {
          status: 'all',
          sortBy: 'name',
          sortOrder: 'asc'
        });
      });
    });
  });

  describe('Status Toggle Functionality', () => {
    it('should render status toggle buttons', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('Clínica Alpha')).toBeInTheDocument();
      });

      // Check that power icons are present (status toggle buttons)
      const powerIcons = screen.getAllByTestId('PowerSettingsNewIcon');
      expect(powerIcons).toHaveLength(2);
    });

    it('should display correct status chips', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('Ativa')).toBeInTheDocument();
        expect(screen.getByText('Inativa')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should render pagination controls', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('Linhas por página:')).toBeInTheDocument();
      });
    });

    it('should display correct pagination info', async () => {
      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('1-2 de 2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when getClinics fails', async () => {
      mockClinicService.getClinics.mockRejectedValue(new Error('Failed to load clinics'));

      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load clinics')).toBeInTheDocument();
      });
    });
  });

  describe('Callback Props', () => {
    it('should render create button when onCreateClinic is provided', () => {
      const onCreateClinic = jest.fn();

      renderWithTheme(<ClinicList onCreateClinic={onCreateClinic} />);

      expect(screen.getByRole('button', { name: /nova clínica/i })).toBeInTheDocument();
    });

    it('should render action buttons when callbacks are provided', async () => {
      const onEditClinic = jest.fn();
      const onClinicSelect = jest.fn();

      renderWithTheme(<ClinicList onEditClinic={onEditClinic} onClinicSelect={onClinicSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Clínica Alpha')).toBeInTheDocument();
      });

      // Check that edit and view icons are present
      expect(screen.getAllByTestId('EditIcon')).toHaveLength(2);
      expect(screen.getAllByTestId('VisibilityIcon')).toHaveLength(2);
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no clinics are found', async () => {
      mockClinicService.getClinics.mockResolvedValue([]);

      renderWithTheme(<ClinicList />);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma clínica encontrada')).toBeInTheDocument();
      });
    });
  });
});