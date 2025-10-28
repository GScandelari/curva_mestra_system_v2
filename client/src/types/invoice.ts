export interface InvoiceProduct {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  expiration_date: string;
  lot: string;
  batch_number?: string;
}

export interface Invoice {
  invoice_id: string;
  clinic_id: string;
  invoice_number: string;
  supplier: string;
  emission_date: string;
  products: InvoiceProduct[];
  total_value: number;
  status: 'pending' | 'approved' | 'rejected';
  attachments: string[];
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateInvoiceData {
  invoice_number: string;
  supplier: string;
  emission_date: string;
  products: Omit<InvoiceProduct, 'product_name'>[];
  total_value: number;
}

export interface InvoiceFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  supplier?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}