export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface MedicalEntry {
  date: string;
  description: string;
  doctor: string;
}

export interface Patient {
  patient_id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string;
  email: string;
  address?: Address;
  medical_history: MedicalEntry[];
  treatment_history: string[]; // request_ids
  created_at: string;
  updated_at: string;
}

export interface CreatePatientData {
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string;
  email: string;
  address?: Address;
}

export interface PatientFilters {
  search?: string;
  age_from?: number;
  age_to?: number;
  has_treatments?: boolean;
}