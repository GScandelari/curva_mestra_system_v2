import React, { useState } from 'react';
import { Box, Alert } from '@mui/material';
import toast from 'react-hot-toast';
import { useRequests } from '../hooks/useRequests';
import { usePermissions } from '../hooks/usePermissions';
import RequestList from '../components/requests/RequestList';
import RequestForm from '../components/requests/RequestForm';
import RequestDetail from '../components/requests/RequestDetail';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Request, CreateRequestData } from '../types/request';

const RequestsPage: React.FC = () => {
  const { 
    requests, 
    loading, 
    error, 
    createRequest, 
    updateRequest,
    updateRequestStatus,
    applyFilters 
  } = useRequests();
  
  const { 
    checkPermission, 
    canManageRequests 
  } = usePermissions();

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Check permissions
  const canCreate = checkPermission('create_request');
  const canUpdate = checkPermission('update_request');
  const canView = checkPermission('read_request');

  if (!canView) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Você não tem permissão para visualizar solicitações.
        </Alert>
      </Box>
    );
  }

  const handleCreate = () => {
    if (!canCreate) {
      toast.error('Você não tem permissão para criar solicitações');
      return;
    }
    setEditingRequest(null);
    setShowForm(true);
  };

  const handleEdit = (request: Request) => {
    if (!canUpdate) {
      toast.error('Você não tem permissão para editar solicitações');
      return;
    }
    setEditingRequest(request);
    setShowForm(true);
  };

  const handleView = (request: Request) => {
    setSelectedRequest(request);
    setShowDetail(true);
  };

  const handleStatusChange = async (request: Request, status: 'consumed' | 'cancelled') => {
    if (!canUpdate) {
      toast.error('Você não tem permissão para alterar o status das solicitações');
      return;
    }

    try {
      await updateRequestStatus(request.request_id, status);
      
      const statusText = status === 'consumed' ? 'consumida' : 'cancelada';
      toast.success(`Solicitação ${statusText} com sucesso!`);
      
      // Close detail dialog if it's open
      if (showDetail && selectedRequest?.request_id === request.request_id) {
        setShowDetail(false);
        setSelectedRequest(null);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFormSubmit = async (data: CreateRequestData) => {
    try {
      setFormLoading(true);
      
      if (editingRequest) {
        await updateRequest(editingRequest.request_id, data);
        toast.success('Solicitação atualizada com sucesso!');
      } else {
        await createRequest(data);
        toast.success('Solicitação criada com sucesso!');
      }
      
      setShowForm(false);
      setEditingRequest(null);
    } catch (err: any) {
      toast.error(err.message);
      throw err; // Re-throw to prevent form from closing
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRequest(null);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedRequest(null);
  };

  const handleEditFromDetail = (request: Request) => {
    setShowDetail(false);
    handleEdit(request);
  };

  const handleStatusChangeFromDetail = async (request: Request, status: 'consumed' | 'cancelled') => {
    await handleStatusChange(request, status);
  };

  const getInitialFormData = (): Partial<CreateRequestData> | undefined => {
    if (!editingRequest) return undefined;

    return {
      patient_id: editingRequest.patient_id,
      request_date: editingRequest.request_date,
      treatment_type: editingRequest.treatment_type,
      products_used: editingRequest.products_used.map(product => ({
        product_id: product.product_id,
        quantity: product.quantity,
        lot: product.lot,
        expiration_date: product.expiration_date,
      })),
      notes: editingRequest.notes,
    };
  };

  return (
    <ErrorBoundary>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <RequestList
          requests={requests}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onStatusChange={handleStatusChange}
          onFiltersChange={applyFilters}
        />

        {/* Request Form Dialog */}
        <RequestForm
          open={showForm}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialData={getInitialFormData()}
          loading={formLoading}
        />

        {/* Request Detail Dialog */}
        <RequestDetail
          open={showDetail}
          onClose={handleCloseDetail}
          onEdit={canUpdate ? handleEditFromDetail : undefined}
          onStatusChange={canUpdate ? handleStatusChangeFromDetail : undefined}
          request={selectedRequest}
        />
      </Box>
    </ErrorBoundary>
  );
};

export default RequestsPage;