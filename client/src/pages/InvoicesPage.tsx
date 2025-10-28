import React, { useState } from 'react';
import { Box, Alert } from '@mui/material';
import toast from 'react-hot-toast';
import { useInvoices } from '../hooks/useInvoices';
import { usePermissions } from '../hooks/usePermissions';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceForm from '../components/invoices/InvoiceForm';
import InvoiceDetail from '../components/invoices/InvoiceDetail';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Invoice, CreateInvoiceData } from '../types/invoice';

const InvoicesPage: React.FC = () => {
  const { 
    invoices, 
    loading, 
    error, 
    createInvoice, 
    updateInvoice, 
    applyFilters 
  } = useInvoices();
  
  const { 
    checkPermission, 
    canManageInvoices 
  } = usePermissions();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Check permissions
  const canCreate = checkPermission('create_invoice');
  const canUpdate = checkPermission('update_invoice');
  const canView = checkPermission('read_invoice');

  if (!canView) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Você não tem permissão para visualizar notas fiscais.
        </Alert>
      </Box>
    );
  }

  const handleCreate = () => {
    if (!canCreate) {
      toast.error('Você não tem permissão para criar notas fiscais');
      return;
    }
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleEdit = (invoice: Invoice) => {
    if (!canUpdate) {
      toast.error('Você não tem permissão para editar notas fiscais');
      return;
    }
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetail(true);
  };

  const handleFormSubmit = async (data: CreateInvoiceData) => {
    try {
      setFormLoading(true);
      
      if (editingInvoice) {
        await updateInvoice(editingInvoice.invoice_id, data);
        toast.success('Nota fiscal atualizada com sucesso!');
      } else {
        await createInvoice(data);
        toast.success('Nota fiscal criada com sucesso!');
      }
      
      setShowForm(false);
      setEditingInvoice(null);
    } catch (err: any) {
      toast.error(err.message);
      throw err; // Re-throw to prevent form from closing
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedInvoice(null);
  };

  const handleEditFromDetail = (invoice: Invoice) => {
    setShowDetail(false);
    handleEdit(invoice);
  };

  const getInitialFormData = (): Partial<CreateInvoiceData> | undefined => {
    if (!editingInvoice) return undefined;

    return {
      invoice_number: editingInvoice.invoice_number,
      supplier: editingInvoice.supplier,
      emission_date: editingInvoice.emission_date,
      products: editingInvoice.products.map(product => ({
        product_id: product.product_id,
        quantity: product.quantity,
        unit_price: product.unit_price,
        expiration_date: product.expiration_date,
        lot: product.lot,
        batch_number: product.batch_number,
      })),
      total_value: editingInvoice.total_value,
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

        <InvoiceList
          invoices={invoices}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onFiltersChange={applyFilters}
        />

        {/* Invoice Form Dialog */}
        <InvoiceForm
          open={showForm}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialData={getInitialFormData()}
          loading={formLoading}
        />

        {/* Invoice Detail Dialog */}
        <InvoiceDetail
          open={showDetail}
          onClose={handleCloseDetail}
          onEdit={canUpdate ? handleEditFromDetail : undefined}
          invoice={selectedInvoice}
        />
      </Box>
    </ErrorBoundary>
  );
};

export default InvoicesPage;