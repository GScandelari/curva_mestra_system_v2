import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Request, RequestFilters, CreateRequestData } from '../types/request';

export const useRequests = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RequestFilters>({
    status: 'all',
  });

  // Fetch requests from API
  const fetchRequests = async (currentFilters: RequestFilters = filters) => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      setError(null);

      // Prepare query parameters
      const params: any = {};
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.status = currentFilters.status;
      }
      if (currentFilters.patient_id) {
        params.patient_id = currentFilters.patient_id;
      }
      if (currentFilters.treatment_type) {
        params.treatment_type = currentFilters.treatment_type;
      }
      if (currentFilters.date_from) {
        params.date_from = currentFilters.date_from;
      }
      if (currentFilters.date_to) {
        params.date_to = currentFilters.date_to;
      }
      if (currentFilters.search) {
        params.search = currentFilters.search;
      }

      const data = await apiService.getRequests(profile.clinic_id, params);
      setRequests(data as Request[]);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  // Create new request
  const createRequest = async (requestData: CreateRequestData): Promise<Request> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const newRequest = await apiService.post<Request>(
        `/clinics/${profile.clinic_id}/requests`,
        requestData
      );
      
      // Add to local state
      setRequests(prev => [newRequest, ...prev]);
      
      return newRequest;
    } catch (err: any) {
      console.error('Error creating request:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao criar solicitação');
    }
  };

  // Update existing request
  const updateRequest = async (requestId: string, requestData: Partial<CreateRequestData>): Promise<Request> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const updatedRequest = await apiService.put<Request>(
        `/clinics/${profile.clinic_id}/requests/${requestId}`,
        requestData
      );
      
      // Update local state
      setRequests(prev => 
        prev.map(request => 
          request.request_id === requestId ? updatedRequest : request
        )
      );
      
      return updatedRequest;
    } catch (err: any) {
      console.error('Error updating request:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao atualizar solicitação');
    }
  };

  // Update request status
  const updateRequestStatus = async (requestId: string, status: 'consumed' | 'cancelled'): Promise<Request> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const updatedRequest = await apiService.put<Request>(
        `/clinics/${profile.clinic_id}/requests/${requestId}`,
        { status }
      );
      
      // Update local state
      setRequests(prev => 
        prev.map(request => 
          request.request_id === requestId ? updatedRequest : request
        )
      );
      
      return updatedRequest;
    } catch (err: any) {
      console.error('Error updating request status:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao atualizar status da solicitação');
    }
  };

  // Delete request
  const deleteRequest = async (requestId: string): Promise<void> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      await apiService.delete(`/clinics/${profile.clinic_id}/requests/${requestId}`);
      
      // Remove from local state
      setRequests(prev => prev.filter(request => request.request_id !== requestId));
    } catch (err: any) {
      console.error('Error deleting request:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao excluir solicitação');
    }
  };

  // Apply filters
  const applyFilters = (newFilters: RequestFilters) => {
    setFilters(newFilters);
    fetchRequests(newFilters);
  };

  // Refresh data
  const refresh = () => {
    fetchRequests();
  };

  // Load requests when component mounts or clinic changes
  useEffect(() => {
    if (profile?.clinic_id) {
      fetchRequests();
    }
  }, [profile?.clinic_id]);

  return {
    requests,
    loading,
    error,
    filters,
    createRequest,
    updateRequest,
    updateRequestStatus,
    deleteRequest,
    applyFilters,
    refresh,
  };
};