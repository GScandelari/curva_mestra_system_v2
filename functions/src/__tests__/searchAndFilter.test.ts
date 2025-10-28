import {
  searchClinics,
  filterClinics,
  sortClinics,
  processClinicList,
  validateFilters,
  Clinic
} from '../utils/searchAndFilter';

// Mock clinic data for testing
const mockClinics: Clinic[] = [
  {
    clinic_id: '1',
    name: 'Clínica Bella Vista',
    cnpj: '11.222.333/0001-81',
    email: 'contato@bellavista.com',
    phone: '(11) 3333-4444',
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    admin_user_id: 'admin1',
    status: 'active',
    created_at: new Date('2023-01-15'),
    updated_at: new Date('2023-01-15')
  },
  {
    clinic_id: '2',
    name: 'Estética Moderna',
    cnpj: '22.333.444/0001-92',
    email: 'info@esteticamoderna.com',
    phone: '(21) 99999-8888',
    address: 'Av. Copacabana, 456',
    city: 'Rio de Janeiro',
    admin_user_id: 'admin2',
    status: 'inactive',
    created_at: new Date('2023-02-20'),
    updated_at: new Date('2023-02-20')
  },
  {
    clinic_id: '3',
    name: 'Centro de Beleza Alpha',
    cnpj: '33.444.555/0001-03',
    email: 'contato@alphabeleza.com',
    phone: '(11) 98888-7777',
    address: 'Rua Augusta, 789',
    city: 'São Paulo',
    admin_user_id: 'admin3',
    status: 'active',
    created_at: new Date('2023-03-10'),
    updated_at: new Date('2023-03-10')
  }
];

describe('Search and Filter Utilities', () => {
  describe('searchClinics', () => {
    it('should return all clinics when search query is empty', () => {
      expect(searchClinics(mockClinics, '')).toEqual(mockClinics);
      expect(searchClinics(mockClinics, '   ')).toEqual(mockClinics);
    });

    it('should search by clinic name', () => {
      const result = searchClinics(mockClinics, 'bella');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Clínica Bella Vista');
      
      const result2 = searchClinics(mockClinics, 'beleza');
      expect(result2).toHaveLength(1);
      expect(result2[0].name).toBe('Centro de Beleza Alpha');
    });

    it('should search by CNPJ', () => {
      const result = searchClinics(mockClinics, '11.222.333');
      expect(result).toHaveLength(1);
      expect(result[0].cnpj).toBe('11.222.333/0001-81');
    });

    it('should search by CNPJ without formatting', () => {
      const result = searchClinics(mockClinics, '11222333');
      expect(result).toHaveLength(1);
      expect(result[0].cnpj).toBe('11.222.333/0001-81');
    });

    it('should search by email', () => {
      const result = searchClinics(mockClinics, 'esteticamoderna');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('info@esteticamoderna.com');
    });

    it('should search by city', () => {
      const result = searchClinics(mockClinics, 'são paulo');
      expect(result).toHaveLength(2);
      expect(result.every(clinic => clinic.city === 'São Paulo')).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = searchClinics(mockClinics, 'BELLA');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Clínica Bella Vista');
    });

    it('should return empty array when no matches found', () => {
      const result = searchClinics(mockClinics, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterClinics', () => {
    it('should return all clinics when no filters applied', () => {
      const result = filterClinics(mockClinics, {});
      expect(result).toEqual(mockClinics);
    });

    it('should filter by active status', () => {
      const result = filterClinics(mockClinics, { status: 'active' });
      expect(result).toHaveLength(2);
      expect(result.every(clinic => clinic.status === 'active')).toBe(true);
    });

    it('should filter by inactive status', () => {
      const result = filterClinics(mockClinics, { status: 'inactive' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('inactive');
    });

    it('should return all clinics when status is "all"', () => {
      const result = filterClinics(mockClinics, { status: 'all' });
      expect(result).toEqual(mockClinics);
    });
  });

  describe('sortClinics', () => {
    it('should sort by name in ascending order by default', () => {
      const result = sortClinics(mockClinics);
      expect(result[0].name).toBe('Centro de Beleza Alpha');
      expect(result[1].name).toBe('Clínica Bella Vista');
      expect(result[2].name).toBe('Estética Moderna');
    });

    it('should sort by name in descending order', () => {
      const result = sortClinics(mockClinics, 'name', 'desc');
      expect(result[0].name).toBe('Estética Moderna');
      expect(result[1].name).toBe('Clínica Bella Vista');
      expect(result[2].name).toBe('Centro de Beleza Alpha');
    });

    it('should sort by city', () => {
      const result = sortClinics(mockClinics, 'city', 'asc');
      expect(result[0].city).toBe('Rio de Janeiro');
      expect(result[1].city).toBe('São Paulo');
      expect(result[2].city).toBe('São Paulo');
    });

    it('should sort by created_at date', () => {
      const result = sortClinics(mockClinics, 'created_at', 'asc');
      expect(result[0].clinic_id).toBe('1'); // January 15
      expect(result[1].clinic_id).toBe('2'); // February 20
      expect(result[2].clinic_id).toBe('3'); // March 10
    });

    it('should sort by created_at date in descending order', () => {
      const result = sortClinics(mockClinics, 'created_at', 'desc');
      expect(result[0].clinic_id).toBe('3'); // March 10
      expect(result[1].clinic_id).toBe('2'); // February 20
      expect(result[2].clinic_id).toBe('1'); // January 15
    });
  });

  describe('processClinicList', () => {
    it('should apply search, filter, and sort together', () => {
      const result = processClinicList(
        mockClinics,
        'são paulo',
        { status: 'active', sortBy: 'name', sortOrder: 'desc' }
      );
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Clínica Bella Vista');
      expect(result[1].name).toBe('Centro de Beleza Alpha');
      expect(result.every(clinic => clinic.status === 'active')).toBe(true);
      expect(result.every(clinic => clinic.city === 'São Paulo')).toBe(true);
    });

    it('should work with empty search and default filters', () => {
      const result = processClinicList(mockClinics);
      expect(result).toEqual(mockClinics);
    });

    it('should handle search with no results', () => {
      const result = processClinicList(
        mockClinics,
        'nonexistent',
        { status: 'active' }
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('validateFilters', () => {
    it('should return default values for empty input', () => {
      const result = validateFilters({});
      expect(result).toEqual({
        status: 'all',
        sortBy: 'name',
        sortOrder: 'asc'
      });
    });

    it('should validate and return correct status values', () => {
      expect(validateFilters({ status: 'active' }).status).toBe('active');
      expect(validateFilters({ status: 'inactive' }).status).toBe('inactive');
      expect(validateFilters({ status: 'all' }).status).toBe('all');
      expect(validateFilters({ status: 'invalid' }).status).toBe('all');
    });

    it('should validate and return correct sortBy values', () => {
      expect(validateFilters({ sortBy: 'name' }).sortBy).toBe('name');
      expect(validateFilters({ sortBy: 'created_at' }).sortBy).toBe('created_at');
      expect(validateFilters({ sortBy: 'city' }).sortBy).toBe('city');
      expect(validateFilters({ sortBy: 'invalid' }).sortBy).toBe('name');
    });

    it('should validate and return correct sortOrder values', () => {
      expect(validateFilters({ sortOrder: 'asc' }).sortOrder).toBe('asc');
      expect(validateFilters({ sortOrder: 'desc' }).sortOrder).toBe('desc');
      expect(validateFilters({ sortOrder: 'invalid' }).sortOrder).toBe('asc');
    });

    it('should handle mixed valid and invalid values', () => {
      const result = validateFilters({
        status: 'active',
        sortBy: 'invalid',
        sortOrder: 'desc'
      });
      
      expect(result).toEqual({
        status: 'active',
        sortBy: 'name',
        sortOrder: 'desc'
      });
    });
  });
});