export interface ProductUsage {
  product_id: string;
  product_name?: string;
  quantity: number;
  lot: string;
  expiration_date: string;
}

export interface Request {
  request_id: string;
  clinic_id: string;
  patient_id: string;
  patient_name?: string;
  request_date: string;
  treatment_type: string;
  products_used: ProductUsage[];
  status: 'pending' | 'consumed' | 'cancelled';
  notes: string;
  performed_by: string;
  performed_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateRequestData {
  patient_id: string;
  request_date: string;
  treatment_type: string;
  products_used: Omit<ProductUsage, 'product_name'>[];
  notes: string;
}

export interface RequestFilters {
  status?: 'pending' | 'consumed' | 'cancelled' | 'all';
  patient_id?: string;
  treatment_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}