/**
 * Search and filter utilities for clinic management
 */

export interface ClinicFilters {
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'created_at' | 'city';
  sortOrder?: 'asc' | 'desc';
}

export interface Clinic {
  clinic_id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  admin_user_id: string;
  status: 'active' | 'inactive';
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
}

/**
 * Performs text search on clinic names and CNPJ
 * @param clinics - Array of clinics to search
 * @param searchQuery - Search query string
 * @returns filtered array of clinics matching the search query
 */
export function searchClinics(clinics: Clinic[], searchQuery: string): Clinic[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return clinics;
  }

  const query = searchQuery.toLowerCase().trim();
  
  return clinics.filter(clinic => {
    // Search in clinic name
    const nameMatch = clinic.name.toLowerCase().includes(query);
    
    // Search in CNPJ (both formatted and unformatted)
    const cnpjClean = clinic.cnpj.replace(/\D/g, '');
    const cnpjMatch = clinic.cnpj.toLowerCase().includes(query) || 
                     cnpjClean.includes(query);
    
    // Search in email
    const emailMatch = clinic.email.toLowerCase().includes(query);
    
    // Search in city
    const cityMatch = clinic.city.toLowerCase().includes(query);
    
    return nameMatch || cnpjMatch || emailMatch || cityMatch;
  });
}

/**
 * Filters clinics based on status and other criteria
 * @param clinics - Array of clinics to filter
 * @param filters - Filter criteria
 * @returns filtered array of clinics
 */
export function filterClinics(clinics: Clinic[], filters: ClinicFilters): Clinic[] {
  let filteredClinics = [...clinics];
  
  // Filter by status
  if (filters.status && filters.status !== 'all') {
    filteredClinics = filteredClinics.filter(clinic => clinic.status === filters.status);
  }
  
  return filteredClinics;
}

/**
 * Sorts clinics based on specified field and order
 * @param clinics - Array of clinics to sort
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort order (asc or desc)
 * @returns sorted array of clinics
 */
export function sortClinics(
  clinics: Clinic[], 
  sortBy: 'name' | 'created_at' | 'city' = 'name', 
  sortOrder: 'asc' | 'desc' = 'asc'
): Clinic[] {
  const sortedClinics = [...clinics];
  
  sortedClinics.sort((a, b) => {
    let valueA: any;
    let valueB: any;
    
    switch (sortBy) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'city':
        valueA = a.city.toLowerCase();
        valueB = b.city.toLowerCase();
        break;
      case 'created_at':
        // Handle Firestore Timestamp objects
        valueA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        valueB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        break;
      default:
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
    }
    
    let comparison = 0;
    
    if (sortBy === 'created_at') {
      comparison = valueA.getTime() - valueB.getTime();
    } else {
      comparison = valueA.localeCompare(valueB);
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return sortedClinics;
}

/**
 * Combines search, filter, and sort operations
 * @param clinics - Array of clinics to process
 * @param searchQuery - Search query string
 * @param filters - Filter criteria
 * @returns processed array of clinics
 */
export function processClinicList(
  clinics: Clinic[], 
  searchQuery: string = '', 
  filters: ClinicFilters = {}
): Clinic[] {
  let processedClinics = clinics;
  
  // Apply search
  if (searchQuery) {
    processedClinics = searchClinics(processedClinics, searchQuery);
  }
  
  // Apply filters
  processedClinics = filterClinics(processedClinics, filters);
  
  // Apply sorting
  if (filters.sortBy) {
    processedClinics = sortClinics(processedClinics, filters.sortBy, filters.sortOrder);
  }
  
  return processedClinics;
}

/**
 * Creates a Firestore query filter for text search
 * This is used for server-side filtering in Firestore queries
 * @param searchQuery - Search query string
 * @returns object with query parameters for Firestore
 */
export function createFirestoreSearchFilter(searchQuery: string) {
  if (!searchQuery || searchQuery.trim() === '') {
    return {};
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  // For Firestore, we'll use array-contains-any for searching
  // This requires the clinic documents to have searchable fields as arrays
  return {
    searchTerms: [query],
    // We can also return the query for client-side filtering if needed
    clientQuery: query
  };
}

/**
 * Validates filter parameters
 * @param filters - Filter object to validate
 * @returns validated filter object with defaults
 */
export function validateFilters(filters: any): ClinicFilters {
  const validatedFilters: ClinicFilters = {};
  
  // Validate status
  if (filters.status && ['active', 'inactive', 'all'].includes(filters.status)) {
    validatedFilters.status = filters.status;
  } else {
    validatedFilters.status = 'all';
  }
  
  // Validate sortBy
  if (filters.sortBy && ['name', 'created_at', 'city'].includes(filters.sortBy)) {
    validatedFilters.sortBy = filters.sortBy;
  } else {
    validatedFilters.sortBy = 'name';
  }
  
  // Validate sortOrder
  if (filters.sortOrder && ['asc', 'desc'].includes(filters.sortOrder)) {
    validatedFilters.sortOrder = filters.sortOrder;
  } else {
    validatedFilters.sortOrder = 'asc';
  }
  
  return validatedFilters;
}