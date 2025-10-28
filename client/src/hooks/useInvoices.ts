import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Invoice, InvoiceFilters, CreateInvoiceData } from '../types/invoice';

export const useInvoices = () => {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: 'all',
  });

  // Fetch invoices from API
  const fetchInvoices = async (currentFilters: InvoiceFilters = filters) => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      setError(null);

      // Prepare query parameters
      const params: any = {};
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.status = currentFilters.status;
      }
      if (currentFilters.supplier) {
        params.supplier = currentFilters.supplier;
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

      const data = await apiService.getInvoices(profile.clinic_id, params);
      setInvoices(data as Invoice[]);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message || 'Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  // Create new invoice
  const createInvoice = async (invoiceData: CreateInvoiceData): Promise<Invoice> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const newInvoice = await apiService.post<Invoice>(
        `/clinics/${profile.clinic_id}/invoices`,
        invoiceData
      );
      
      // Add to local state
      setInvoices(prev => [newInvoice, ...prev]);
      
      return newInvoice;
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao criar nota fiscal');
    }
  };

  // Update existing invoice
  const updateInvoice = async (invoiceId: string, invoiceData: Partial<CreateInvoiceData>): Promise<Invoice> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      const updatedInvoice = await apiService.put<Invoice>(
        `/clinics/${profile.clinic_id}/invoices/${invoiceId}`,
        invoiceData
      );
      
      // Update local state
      setInvoices(prev => 
        prev.map(invoice => 
          invoice.invoice_id === invoiceId ? updatedInvoice : invoice
        )
      );
      
      return updatedInvoice;
    } catch (err: any) {
      console.error('Error updating invoice:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao atualizar nota fiscal');
    }
  };

  // Delete invoice
  const deleteInvoice = async (invoiceId: string): Promise<void> => {
    if (!profile?.clinic_id) {
      throw new Error('Clínica não identificada');
    }

    try {
      await apiService.delete(`/clinics/${profile.clinic_id}/invoices/${invoiceId}`);
      
      // Remove from local state
      setInvoices(prev => prev.filter(invoice => invoice.invoice_id !== invoiceId));
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      throw new Error(err.response?.data?.error?.message || 'Erro ao excluir nota fiscal');
    }
  };

  // Apply filters
  const applyFilters = (newFilters: InvoiceFilters) => {
    setFilters(newFilters);
    fetchInvoices(newFilters);
  };

  // Refresh data
  const refresh = () => {
    fetchInvoices();
  };

  // Load invoices when component mounts or clinic changes
  useEffect(() => {
    if (profile?.clinic_id) {
      fetchInvoices();
    }
  }, [profile?.clinic_id]);

  return {
    invoices,
    loading,
    error,
    filters,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    applyFilters,
    refresh,
  };
};