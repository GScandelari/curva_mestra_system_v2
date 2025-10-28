import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase-admin/firestore';
import FirestoreService from './firestoreService';
import { PatientService } from './patientService';
import { Request, ProductUsage } from '../models/types';

export class RequestService {
  
  /**
   * Create a new treatment request for a clinic
   */
  static async createRequest(
    clinicId: string, 
    requestData: Omit<Request, 'request_id' | 'clinic_id' | 'created_at' | 'status'>
  ): Promise<Request> {
    const request: Request = {
      request_id: uuidv4(),
      clinic_id: clinicId,
      status: 'pending',
      created_at: Timestamp.now(),
      ...requestData
    };

    await FirestoreService.createRequest(clinicId, request);
    
    // Link request to patient's treatment history
    await PatientService.addTreatmentToHistory(clinicId, request.patient_id, request.request_id);
    
    // Update dashboard activity (import dynamically to avoid circular dependency)
    try {
      const { DashboardService } = await import('./dashboardService');
      await DashboardService.updateRecentActivity(clinicId, {
        type: 'request',
        action: 'created',
        resource_id: request.request_id,
        description: `Treatment request created for ${request.treatment_type}`,
        user_id: request.performed_by
      });
    } catch (error) {
      console.warn('Failed to update dashboard activity:', error);
    }
    
    return request;
  }

  /**
   * Get request by ID within a clinic
   */
  static async getRequest(clinicId: string, requestId: string): Promise<Request | null> {
    return FirestoreService.getRequestById(clinicId, requestId);
  }

  /**
   * List all requests for a clinic
   */
  static async listRequests(clinicId: string): Promise<Request[]> {
    return FirestoreService.listRequests(clinicId);
  }

  /**
   * Update request status
   */
  static async updateRequestStatus(
    clinicId: string, 
    requestId: string, 
    status: 'pending' | 'consumed' | 'cancelled'
  ): Promise<void> {
    const requestRef = FirestoreService.getRequestsCollection(clinicId).doc(requestId);
    await requestRef.update({ status });
  }

  /**
   * Get requests by status
   */
  static async getRequestsByStatus(
    clinicId: string, 
    status: 'pending' | 'consumed' | 'cancelled'
  ): Promise<Request[]> {
    const snapshot = await FirestoreService.getRequestsCollection(clinicId)
      .where('status', '==', status)
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Request);
  }

  /**
   * Get requests by patient
   */
  static async getRequestsByPatient(
    clinicId: string, 
    patientId: string
  ): Promise<Request[]> {
    const snapshot = await FirestoreService.getRequestsCollection(clinicId)
      .where('patient_id', '==', patientId)
      .orderBy('request_date', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Request);
  }

  /**
   * Get requests within date range
   */
  static async getRequestsByDateRange(
    clinicId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Request[]> {
    const snapshot = await FirestoreService.getRequestsCollection(clinicId)
      .where('request_date', '>=', startDate)
      .where('request_date', '<=', endDate)
      .orderBy('request_date', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Request);
  }

  /**
   * Add products to an existing request
   */
  static async addProductsToRequest(
    clinicId: string, 
    requestId: string, 
    products: ProductUsage[]
  ): Promise<void> {
    const request = await this.getRequest(clinicId, requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Cannot modify request that is not pending');
    }

    const updatedProducts = [...request.products_used, ...products];

    const requestRef = FirestoreService.getRequestsCollection(clinicId).doc(requestId);
    await requestRef.update({ products_used: updatedProducts });
  }

  /**
   * Update request notes
   */
  static async updateRequestNotes(
    clinicId: string, 
    requestId: string, 
    notes: string
  ): Promise<void> {
    const requestRef = FirestoreService.getRequestsCollection(clinicId).doc(requestId);
    await requestRef.update({ notes });
  }

  /**
   * Get product usage statistics for a clinic
   */
  static async getProductUsageStats(
    clinicId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Map<string, number>> {
    let query = FirestoreService.getRequestsCollection(clinicId)
      .where('status', '==', 'consumed');

    if (startDate) {
      query = query.where('request_date', '>=', startDate) as any;
    }
    
    if (endDate) {
      query = query.where('request_date', '<=', endDate) as any;
    }

    const snapshot = await query.get();
    const requests = snapshot.docs.map(doc => doc.data() as Request);

    const productUsage = new Map<string, number>();

    requests.forEach(request => {
      request.products_used.forEach(product => {
        const currentUsage = productUsage.get(product.product_id) || 0;
        productUsage.set(product.product_id, currentUsage + product.quantity);
      });
    });

    return productUsage;
  }

  /**
   * Get requests that use a specific product
   */
  static async getRequestsByProduct(
    clinicId: string, 
    productId: string
  ): Promise<Request[]> {
    const allRequests = await this.listRequests(clinicId);
    
    return allRequests.filter(request => 
      request.products_used.some(product => product.product_id === productId)
    );
  }

  /**
   * Cancel a pending request
   */
  static async cancelRequest(
    clinicId: string, 
    requestId: string, 
    reason?: string
  ): Promise<void> {
    const request = await this.getRequest(clinicId, requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only cancel pending requests');
    }

    const updates: any = { status: 'cancelled' };
    if (reason) {
      updates.notes = request.notes ? `${request.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`;
    }

    const requestRef = FirestoreService.getRequestsCollection(clinicId).doc(requestId);
    await requestRef.update(updates);
  }

  /**
   * Consume a request (validate inventory and deduct stock)
   */
  static async consumeRequest(
    clinicId: string, 
    requestId: string
  ): Promise<void> {
    const request = await this.getRequest(clinicId, requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only consume pending requests');
    }

    // Import InventoryService dynamically to avoid circular dependency
    const { InventoryService } = await import('./inventoryService');

    // Validate inventory availability
    const stockCheck = await InventoryService.checkStockAvailability(clinicId, request.products_used);
    if (!stockCheck.available) {
      throw new Error(`Insufficient stock: ${stockCheck.issues.join(', ')}`);
    }

    try {
      // First, deduct inventory
      await InventoryService.removeStock(clinicId, request.products_used, requestId);
      
      // Then update request status to consumed
      const requestRef = FirestoreService.getRequestsCollection(clinicId).doc(requestId);
      await requestRef.update({ status: 'consumed' });
      
    } catch (error: any) {
      // If inventory deduction fails, the request status remains pending
      throw new Error(`Failed to consume request: ${error.message}`);
    }
  }

  /**
   * Validate request before creation (check inventory availability)
   */
  static async validateRequestInventory(
    clinicId: string, 
    products: ProductUsage[]
  ): Promise<{ valid: boolean; issues: string[] }> {
    // Import InventoryService dynamically to avoid circular dependency
    const { InventoryService } = await import('./inventoryService');
    
    const stockCheck = await InventoryService.checkStockAvailability(clinicId, products);
    
    return {
      valid: stockCheck.available,
      issues: stockCheck.issues
    };
  }
}

export default RequestService;