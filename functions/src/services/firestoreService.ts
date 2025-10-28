import * as admin from 'firebase-admin';
import {
  User,
  Clinic,
  Product,
  Invoice,
  Patient,
  Request,
  InventoryItem,
  AuditLog
} from '../models/types';

// Initialize Firestore lazily to avoid initialization issues
let db: admin.firestore.Firestore;

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  CLINICS: 'clinics',
  PRODUCTS: 'products',
  LOGS: 'logs',
  // Subcollections (within clinics)
  INVOICES: 'invoices',
  PATIENTS: 'patients',
  REQUESTS: 'requests',
  INVENTORY: 'inventory'
} as const;

/**
 * Firestore Service for managing database operations
 */
export class FirestoreService {

  // Get database instance
  static getDb() {
    if (!db) {
      db = admin.firestore();
    }
    return db;
  }

  // Global collections
  static get usersCollection() {
    return this.getDb().collection(COLLECTIONS.USERS);
  }

  static get clinicsCollection() {
    return this.getDb().collection(COLLECTIONS.CLINICS);
  }

  static get productsCollection() {
    return this.getDb().collection(COLLECTIONS.PRODUCTS);
  }

  static get logsCollection() {
    return this.getDb().collection(COLLECTIONS.LOGS);
  }

  // Clinic subcollections
  static getClinicSubcollection(clinicId: string, subcollection: string) {
    return this.getDb().collection(COLLECTIONS.CLINICS)
      .doc(clinicId)
      .collection(subcollection);
  }

  static getInvoicesCollection(clinicId: string) {
    return this.getClinicSubcollection(clinicId, COLLECTIONS.INVOICES);
  }

  static getPatientsCollection(clinicId: string) {
    return this.getClinicSubcollection(clinicId, COLLECTIONS.PATIENTS);
  }

  static getRequestsCollection(clinicId: string) {
    return this.getClinicSubcollection(clinicId, COLLECTIONS.REQUESTS);
  }

  static getInventoryCollection(clinicId: string) {
    return this.getClinicSubcollection(clinicId, COLLECTIONS.INVENTORY);
  }

  // User operations
  static async createUser(user: User): Promise<void> {
    await this.usersCollection.doc(user.user_id).set(user);
  }

  static async getUserById(userId: string): Promise<User | null> {
    const doc = await this.usersCollection.doc(userId).get();
    return doc.exists ? doc.data() as User : null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const query = await this.usersCollection.where('email', '==', email).limit(1).get();
    return query.empty ? null : query.docs[0].data() as User;
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await this.usersCollection.doc(userId).update(updates);
  }

  // Clinic operations
  static async createClinic(clinic: Clinic): Promise<void> {
    await this.clinicsCollection.doc(clinic.clinic_id).set(clinic);
  }

  static async getClinicById(clinicId: string): Promise<Clinic | null> {
    const doc = await this.clinicsCollection.doc(clinicId).get();
    return doc.exists ? doc.data() as Clinic : null;
  }

  static async updateClinic(clinicId: string, updates: Partial<Clinic>): Promise<void> {
    await this.clinicsCollection.doc(clinicId).update(updates);
  }

  static async listClinics(): Promise<Clinic[]> {
    const snapshot = await this.clinicsCollection.get();
    return snapshot.docs.map(doc => doc.data() as Clinic);
  }

  // Product operations
  static async createProduct(product: Product): Promise<void> {
    await this.productsCollection.doc(product.product_id).set(product);
  }

  static async getProductById(productId: string): Promise<Product | null> {
    const doc = await this.productsCollection.doc(productId).get();
    return doc.exists ? doc.data() as Product : null;
  }

  static async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    await this.productsCollection.doc(productId).update(updates);
  }

  static async listProducts(status?: 'approved' | 'pending'): Promise<Product[]> {
    let query = this.productsCollection.orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', '==', status) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as Product);
  }

  // Invoice operations
  static async createInvoice(clinicId: string, invoice: Invoice): Promise<void> {
    await this.getInvoicesCollection(clinicId).doc(invoice.invoice_id).set(invoice);
  }

  static async getInvoiceById(clinicId: string, invoiceId: string): Promise<Invoice | null> {
    const doc = await this.getInvoicesCollection(clinicId).doc(invoiceId).get();
    return doc.exists ? doc.data() as Invoice : null;
  }

  static async listInvoices(clinicId: string): Promise<Invoice[]> {
    const snapshot = await this.getInvoicesCollection(clinicId)
      .orderBy('created_at', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as Invoice);
  }

  static async updateInvoice(clinicId: string, invoiceId: string, updates: Partial<Invoice>): Promise<void> {
    await this.getInvoicesCollection(clinicId).doc(invoiceId).update(updates);
  }

  static async deleteInvoice(clinicId: string, invoiceId: string): Promise<void> {
    await this.getInvoicesCollection(clinicId).doc(invoiceId).delete();
  }

  // Patient operations
  static async createPatient(clinicId: string, patient: Patient): Promise<void> {
    await this.getPatientsCollection(clinicId).doc(patient.patient_id).set(patient);
  }

  static async getPatientById(clinicId: string, patientId: string): Promise<Patient | null> {
    const doc = await this.getPatientsCollection(clinicId).doc(patientId).get();
    return doc.exists ? doc.data() as Patient : null;
  }

  static async listPatients(clinicId: string): Promise<Patient[]> {
    const snapshot = await this.getPatientsCollection(clinicId)
      .orderBy('created_at', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as Patient);
  }

  // Request operations
  static async createRequest(clinicId: string, request: Request): Promise<void> {
    await this.getRequestsCollection(clinicId).doc(request.request_id).set(request);
  }

  static async getRequestById(clinicId: string, requestId: string): Promise<Request | null> {
    const doc = await this.getRequestsCollection(clinicId).doc(requestId).get();
    return doc.exists ? doc.data() as Request : null;
  }

  static async listRequests(clinicId: string): Promise<Request[]> {
    const snapshot = await this.getRequestsCollection(clinicId)
      .orderBy('created_at', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as Request);
  }

  // Inventory operations
  static async createInventoryItem(clinicId: string, item: InventoryItem): Promise<void> {
    await this.getInventoryCollection(clinicId).doc(item.inventory_id).set(item);
  }

  static async getInventoryItem(clinicId: string, inventoryId: string): Promise<InventoryItem | null> {
    const doc = await this.getInventoryCollection(clinicId).doc(inventoryId).get();
    return doc.exists ? doc.data() as InventoryItem : null;
  }

  static async getInventoryByProduct(clinicId: string, productId: string): Promise<InventoryItem | null> {
    const query = await this.getInventoryCollection(clinicId)
      .where('product_id', '==', productId)
      .limit(1)
      .get();
    return query.empty ? null : query.docs[0].data() as InventoryItem;
  }

  static async listInventory(clinicId: string): Promise<InventoryItem[]> {
    const snapshot = await this.getInventoryCollection(clinicId)
      .orderBy('last_update', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as InventoryItem);
  }

  static async updateInventoryItem(clinicId: string, inventoryId: string, updates: Partial<InventoryItem>): Promise<void> {
    await this.getInventoryCollection(clinicId).doc(inventoryId).update(updates);
  }

  // Audit logging
  static async createAuditLog(log: AuditLog): Promise<void> {
    await this.logsCollection.doc(log.log_id).set(log);
  }

  static async getAuditLogById(logId: string): Promise<AuditLog | null> {
    const doc = await this.logsCollection.doc(logId).get();
    return doc.exists ? doc.data() as AuditLog : null;
  }

  static async listAuditLogs(filters?: {
    clinicId?: string;
    userId?: string;
    actionType?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    let query = this.logsCollection.orderBy('timestamp', 'desc');

    // Apply Firestore-level filters (indexed queries)
    if (filters?.clinicId) {
      query = query.where('clinic_id', '==', filters.clinicId) as any;
    }

    if (filters?.userId) {
      query = query.where('user_id', '==', filters.userId) as any;
    }

    // Apply date range filters
    if (filters?.startDate) {
      query = query.where('timestamp', '>=', filters.startDate) as any;
    }

    if (filters?.endDate) {
      query = query.where('timestamp', '<=', filters.endDate) as any;
    }

    // Apply limit for initial query
    const queryLimit = filters?.limit ? Math.min(filters.limit + (filters.offset || 0), 1000) : 1000;
    query = query.limit(queryLimit) as any;

    const snapshot = await query.get();
    let logs = snapshot.docs.map(doc => doc.data() as AuditLog);

    // Apply client-side filters for non-indexed fields
    if (filters?.actionType) {
      logs = logs.filter(log => log.action_type.includes(filters.actionType!));
    }

    if (filters?.resourceType) {
      logs = logs.filter(log => log.resource_type === filters.resourceType);
    }

    // Apply pagination
    if (filters?.offset) {
      logs = logs.slice(filters.offset);
    }

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  static async countAuditLogs(filters?: {
    clinicId?: string;
    userId?: string;
    actionType?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    let query = this.logsCollection;

    // Apply filters
    if (filters?.clinicId) {
      query = query.where('clinic_id', '==', filters.clinicId) as any;
    }

    if (filters?.userId) {
      query = query.where('user_id', '==', filters.userId) as any;
    }

    if (filters?.startDate) {
      query = query.where('timestamp', '>=', filters.startDate) as any;
    }

    if (filters?.endDate) {
      query = query.where('timestamp', '<=', filters.endDate) as any;
    }

    const snapshot = await query.get();
    let count = snapshot.size;

    // Apply client-side filters for accurate count
    if (filters?.actionType || filters?.resourceType) {
      let logs = snapshot.docs.map(doc => doc.data() as AuditLog);

      if (filters?.actionType) {
        logs = logs.filter(log => log.action_type.includes(filters.actionType!));
      }

      if (filters?.resourceType) {
        logs = logs.filter(log => log.resource_type === filters.resourceType);
      }

      count = logs.length;
    }

    return count;
  }

  static async getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
    clinicId?: string
  ): Promise<AuditLog[]> {
    let query = this.logsCollection
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'desc');

    if (clinicId) {
      query = query.where('clinic_id', '==', clinicId) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as AuditLog);
  }

  static async getAuditLogsByUser(
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const query = this.logsCollection
      .where('user_id', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as AuditLog);
  }

  static async getAuditLogsByAction(
    actionType: string,
    clinicId?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    let query = this.logsCollection.orderBy('timestamp', 'desc').limit(limit);

    if (clinicId) {
      query = query.where('clinic_id', '==', clinicId) as any;
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => doc.data() as AuditLog);

    // Filter by action type (client-side since it's not indexed for partial matches)
    return logs.filter(log => log.action_type.includes(actionType));
  }

  static async deleteAuditLogsBatch(
    beforeDate: Date,
    batchSize: number = 500
  ): Promise<number> {
    const query = this.logsCollection
      .where('timestamp', '<', beforeDate)
      .limit(batchSize);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = this.getBatch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  // Batch operations for better performance
  static getBatch() {
    return this.getDb().batch();
  }

  // Transaction support
  static async runTransaction<T>(updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>): Promise<T> {
    return this.getDb().runTransaction(updateFunction);
  }
}

export default FirestoreService;