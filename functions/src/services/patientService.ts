import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase-admin/firestore';
import FirestoreService from './firestoreService';
import { Patient, MedicalEntry } from '../models/types';

export class PatientService {

    /**
     * Create a new patient for a clinic
     */
    static async createPatient(
        clinicId: string,
        patientData: Omit<Patient, 'patient_id' | 'clinic_id' | 'created_at' | 'updated_at' | 'treatment_history' | 'medical_history'>
    ): Promise<Patient> {
        const patient: Patient = {
            patient_id: uuidv4(),
            clinic_id: clinicId,
            treatment_history: [],
            medical_history: [],
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
            ...patientData
        };

        await FirestoreService.createPatient(clinicId, patient);
        
        // Update dashboard activity (import dynamically to avoid circular dependency)
        try {
            const { DashboardService } = await import('./dashboardService');
            await DashboardService.updateRecentActivity(clinicId, {
                type: 'patient',
                action: 'created',
                resource_id: patient.patient_id,
                description: `Patient ${patient.first_name} ${patient.last_name} registered`,
                user_id: 'system' // We don't have user context in service, this should be passed from route
            });
        } catch (error) {
            console.warn('Failed to update dashboard activity:', error);
        }
        
        return patient;
    }

    /**
     * Get patient by ID within a clinic
     */
    static async getPatient(clinicId: string, patientId: string): Promise<Patient | null> {
        return FirestoreService.getPatientById(clinicId, patientId);
    }

    /**
     * List all patients for a clinic
     */
    static async listPatients(clinicId: string): Promise<Patient[]> {
        return FirestoreService.listPatients(clinicId);
    }

    /**
     * Update patient information
     */
    static async updatePatient(
        clinicId: string,
        patientId: string,
        updates: Partial<Omit<Patient, 'patient_id' | 'clinic_id' | 'created_at'>>
    ): Promise<void> {
        const patientRef = FirestoreService.getPatientsCollection(clinicId).doc(patientId);
        await patientRef.update({
            ...updates,
            updated_at: Timestamp.now()
        });
    }

    /**
     * Delete patient
     */
    static async deletePatient(clinicId: string, patientId: string): Promise<void> {
        const patientRef = FirestoreService.getPatientsCollection(clinicId).doc(patientId);
        await patientRef.delete();
    }

    /**
     * Add medical history entry
     */
    static async addMedicalEntry(
        clinicId: string,
        patientId: string,
        entry: Omit<MedicalEntry, 'date' | 'created_by'>,
        userId: string
    ): Promise<void> {
        const patient = await this.getPatient(clinicId, patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        const medicalEntry: MedicalEntry = {
            date: new Date(),
            created_by: userId,
            ...entry
        };

        const updatedHistory = [...patient.medical_history, medicalEntry];

        const patientRef = FirestoreService.getPatientsCollection(clinicId).doc(patientId);
        await patientRef.update({
            medical_history: updatedHistory,
            updated_at: Timestamp.now()
        });
    }

    /**
     * Add treatment request to patient history
     */
    static async addTreatmentToHistory(
        clinicId: string,
        patientId: string,
        requestId: string
    ): Promise<void> {
        const patient = await this.getPatient(clinicId, patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        const updatedHistory = [...patient.treatment_history, requestId];

        const patientRef = FirestoreService.getPatientsCollection(clinicId).doc(patientId);
        await patientRef.update({
            treatment_history: updatedHistory,
            updated_at: Timestamp.now()
        });
    }

    /**
     * Search patients by name
     */
    static async searchPatientsByName(
        clinicId: string,
        searchTerm: string
    ): Promise<Patient[]> {
        const patients = await this.listPatients(clinicId);

        const lowerSearchTerm = searchTerm.toLowerCase();
        return patients.filter(patient =>
            patient.first_name.toLowerCase().includes(lowerSearchTerm) ||
            patient.last_name.toLowerCase().includes(lowerSearchTerm) ||
            `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(lowerSearchTerm)
        );
    }

    /**
     * Get patients by phone number
     */
    static async getPatientByPhone(
        clinicId: string,
        phone: string
    ): Promise<Patient | null> {
        const snapshot = await FirestoreService.getPatientsCollection(clinicId)
            .where('phone', '==', phone)
            .limit(1)
            .get();

        return snapshot.empty ? null : snapshot.docs[0].data() as Patient;
    }

    /**
     * Get patients by email
     */
    static async getPatientByEmail(
        clinicId: string,
        email: string
    ): Promise<Patient | null> {
        const snapshot = await FirestoreService.getPatientsCollection(clinicId)
            .where('email', '==', email)
            .limit(1)
            .get();

        return snapshot.empty ? null : snapshot.docs[0].data() as Patient;
    }

    /**
     * Get patient treatment history with request details
     */
    static async getPatientTreatmentHistory(
        clinicId: string,
        patientId: string
    ): Promise<any[]> {
        const patient = await this.getPatient(clinicId, patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        // Get all requests for this patient directly from requests collection
        const snapshot = await FirestoreService.getRequestsCollection(clinicId)
            .where('patient_id', '==', patientId)
            .orderBy('request_date', 'desc')
            .get();

        const requests = snapshot.docs.map(doc => doc.data());
        return requests;
    }

    /**
     * Get patient treatment timeline with detailed information
     */
    static async getPatientTreatmentTimeline(
        clinicId: string,
        patientId: string
    ): Promise<any[]> {
        const patient = await this.getPatient(clinicId, patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        // Get all requests for this patient
        const requests = await this.getPatientTreatmentHistory(clinicId, patientId);

        // Create timeline entries combining medical history and treatment requests
        const timeline: any[] = [];

        // Add medical history entries
        patient.medical_history.forEach(entry => {
            timeline.push({
                type: 'medical_history',
                date: entry.date,
                notes: entry.notes,
                created_by: entry.created_by,
                timestamp: entry.date
            });
        });

        // Add treatment requests
        requests.forEach(request => {
            timeline.push({
                type: 'treatment_request',
                date: request.request_date,
                request_id: request.request_id,
                treatment_type: request.treatment_type,
                products_used: request.products_used,
                status: request.status,
                notes: request.notes,
                performed_by: request.performed_by,
                timestamp: request.request_date
            });
        });

        // Sort timeline by date (most recent first)
        timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return timeline;
    }

    /**
     * Get patient statistics
     */
    static async getPatientStatistics(
        clinicId: string,
        patientId: string
    ): Promise<{
        total_treatments: number;
        completed_treatments: number;
        pending_treatments: number;
        cancelled_treatments: number;
        last_treatment_date?: Date;
        most_used_products: { product_id: string; quantity: number }[];
    }> {
        const requests = await this.getPatientTreatmentHistory(clinicId, patientId);

        const stats = {
            total_treatments: requests.length,
            completed_treatments: requests.filter(r => r.status === 'consumed').length,
            pending_treatments: requests.filter(r => r.status === 'pending').length,
            cancelled_treatments: requests.filter(r => r.status === 'cancelled').length,
            last_treatment_date: undefined as Date | undefined,
            most_used_products: [] as { product_id: string; quantity: number }[]
        };

        // Find last treatment date
        const completedRequests = requests.filter(r => r.status === 'consumed');
        if (completedRequests.length > 0) {
            stats.last_treatment_date = completedRequests
                .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())[0]
                .request_date;
        }

        // Calculate most used products
        const productUsage = new Map<string, number>();
        requests.forEach(request => {
            if (request.status === 'consumed') {
                request.products_used.forEach((product: any) => {
                    const currentUsage = productUsage.get(product.product_id) || 0;
                    productUsage.set(product.product_id, currentUsage + product.quantity);
                });
            }
        });

        stats.most_used_products = Array.from(productUsage.entries())
            .map(([product_id, quantity]) => ({ product_id, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5); // Top 5 most used products

        return stats;
    }
}

export default PatientService;