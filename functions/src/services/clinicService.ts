import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Clinic, User, NotificationSettings, AuditLog } from '../models/types';
import { UserRole } from '../config/auth';
import FirestoreService from './firestoreService';
import { UserService } from './userService';
import AuditService from './auditService';

export interface CreateClinicRequest {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  admin_email: string;
  admin_profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  admin_password: string;
  settings?: {
    timezone?: string;
    notification_preferences?: Partial<NotificationSettings>;
  };
}

export interface UpdateClinicRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  status?: 'active' | 'inactive';
  settings?: {
    timezone?: string;
    notification_preferences?: Partial<NotificationSettings>;
  };
}

export interface ClinicFilters {
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'created_at' | 'city';
  sortOrder?: 'asc' | 'desc';
}

export class ClinicService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Create a new clinic with an admin user
   */
  async createClinic(
    request: CreateClinicRequest,
    createdBy: string,
    creatorRole: UserRole
  ): Promise<Clinic> {
    // Only system_admin can create clinics
    if (creatorRole !== UserRole.SYSTEM_ADMIN) {
      throw new Error('Insufficient permissions to create clinics');
    }

    // Validate CNPJ format
    const ValidationService = (await import('./validationService')).default;
    if (!ValidationService.isValidCNPJ(request.cnpj)) {
      throw new Error('Invalid CNPJ format');
    }

    // Validate email format
    if (!ValidationService.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    if (!ValidationService.isValidEmail(request.admin_email)) {
      throw new Error('Invalid admin email format');
    }

    // Validate phone format
    if (!ValidationService.isValidPhone(request.phone)) {
      throw new Error('Invalid phone format');
    }

    // Check for duplicate CNPJ
    const existingClinicByCNPJ = await this.findClinicByCNPJ(request.cnpj);
    if (existingClinicByCNPJ) {
      throw new Error('A clinic with this CNPJ already exists');
    }

    // Check for duplicate clinic email
    const existingClinicByEmail = await this.findClinicByEmail(request.email);
    if (existingClinicByEmail) {
      throw new Error('A clinic with this email already exists');
    }

    // Check for duplicate admin email
    const existingUserByEmail = await FirestoreService.getUserByEmail(request.admin_email);
    if (existingUserByEmail) {
      throw new Error('A user with this admin email already exists');
    }

    const clinicId = uuidv4();
    const adminUserId = uuidv4();

    // Default notification settings
    const defaultNotificationSettings: NotificationSettings = {
      low_stock_alerts: true,
      expiration_alerts: true,
      email_notifications: true,
      alert_threshold_days: 30
    };

    // Create clinic data
    const clinic: Clinic = {
      clinic_id: clinicId,
      name: request.name,
      cnpj: request.cnpj,
      email: request.email,
      phone: request.phone,
      address: request.address,
      city: request.city,
      admin_user_id: adminUserId,
      status: 'active',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      settings: {
        timezone: request.settings?.timezone || 'America/Sao_Paulo',
        notification_preferences: {
          ...defaultNotificationSettings,
          ...request.settings?.notification_preferences
        }
      }
    };

    try {
      // Use transaction to ensure both clinic and admin user are created together
      await FirestoreService.runTransaction(async (transaction) => {
        // Create the clinic
        const clinicRef = FirestoreService.clinicsCollection.doc(clinicId);
        transaction.set(clinicRef, clinic);

        // Create the admin user
        const adminUser: User = {
          user_id: adminUserId,
          email: request.admin_email,
          role: UserRole.CLINIC_ADMIN,
          clinic_id: clinicId,
          permissions: [
            'create_patient', 'read_patient', 'update_patient', 'delete_patient',
            'create_invoice', 'read_invoice', 'update_invoice', 'delete_invoice',
            'create_request', 'read_request', 'update_request', 'delete_request',
            'read_inventory', 'read_dashboard', 'manage_users'
          ],
          profile: request.admin_profile,
          created_at: Timestamp.now()
        };

        const userRef = FirestoreService.usersCollection.doc(adminUserId);
        transaction.set(userRef, adminUser);
      });

      // Create Firebase Auth user for the admin (outside transaction)
      await this.userService.createFirebaseAuthUser(
        adminUserId,
        request.admin_email,
        request.admin_password,
        UserRole.CLINIC_ADMIN,
        clinicId
      );

      // Log clinic creation for audit trail
      await AuditService.logClinicCreation(clinic, createdBy);

      return clinic;
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      throw new Error(`Failed to create clinic: ${error.message}`);
    }
  }

  /**
   * Get clinic by ID
   */
  async getClinicById(clinicId: string): Promise<Clinic | null> {
    try {
      return await FirestoreService.getClinicById(clinicId);
    } catch (error: any) {
      console.error('Error getting clinic:', error);
      throw new Error(`Failed to get clinic: ${error.message}`);
    }
  }

  /**
   * List all clinics (system_admin only)
   */
  async listClinics(userRole: UserRole, userClinicId?: string): Promise<Clinic[]> {
    try {
      if (userRole === UserRole.SYSTEM_ADMIN) {
        // System admin can see all clinics
        return await FirestoreService.listClinics();
      } else if (userRole === UserRole.CLINIC_ADMIN && userClinicId) {
        // Clinic admin can only see their own clinic
        const clinic = await FirestoreService.getClinicById(userClinicId);
        return clinic ? [clinic] : [];
      } else {
        throw new Error('Insufficient permissions to list clinics');
      }
    } catch (error: any) {
      console.error('Error listing clinics:', error);
      throw new Error(`Failed to list clinics: ${error.message}`);
    }
  }

  /**
   * Search and filter clinics with sorting
   */
  async searchClinics(
    query: string,
    filters: ClinicFilters,
    userRole: UserRole,
    userClinicId?: string
  ): Promise<Clinic[]> {
    try {
      // Check permissions
      if (userRole !== UserRole.SYSTEM_ADMIN) {
        throw new Error('Insufficient permissions to search clinics');
      }

      // Get all clinics first (Firestore doesn't support full-text search natively)
      let clinics = await FirestoreService.listClinics();

      // Apply text search filter (case-insensitive search on name, CNPJ, and email)
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        clinics = clinics.filter(clinic => 
          clinic.name.toLowerCase().includes(searchTerm) ||
          clinic.cnpj.toLowerCase().includes(searchTerm) ||
          clinic.email.toLowerCase().includes(searchTerm)
        );
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        clinics = clinics.filter(clinic => clinic.status === filters.status);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';

      clinics.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'city':
            aValue = a.city.toLowerCase();
            bValue = b.city.toLowerCase();
            break;
          case 'created_at':
          default:
            aValue = a.created_at.toMillis();
            bValue = b.created_at.toMillis();
            break;
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      return clinics;
    } catch (error: any) {
      console.error('Error searching clinics:', error);
      throw new Error(`Failed to search clinics: ${error.message}`);
    }
  }

  /**
   * Update clinic information
   */
  async updateClinic(
    clinicId: string,
    updates: UpdateClinicRequest,
    userRole: UserRole,
    userClinicId?: string,
    userId?: string
  ): Promise<Clinic> {
    try {
      // Check permissions
      if (userRole === UserRole.SYSTEM_ADMIN) {
        // System admin can update any clinic
      } else if (userRole === UserRole.CLINIC_ADMIN && userClinicId === clinicId) {
        // Clinic admin can only update their own clinic
      } else {
        throw new Error('Insufficient permissions to update clinic');
      }

      // Get current clinic data
      const currentClinic = await FirestoreService.getClinicById(clinicId);
      if (!currentClinic) {
        throw new Error('Clinic not found');
      }

      // Validate and check for duplicates if email is being updated
      if (updates.email && updates.email !== currentClinic.email) {
        const ValidationService = (await import('./validationService')).default;
        if (!ValidationService.isValidEmail(updates.email)) {
          throw new Error('Invalid email format');
        }

        const existingClinicByEmail = await this.findClinicByEmail(updates.email);
        if (existingClinicByEmail && existingClinicByEmail.clinic_id !== clinicId) {
          throw new Error('A clinic with this email already exists');
        }
      }

      // Validate phone format if being updated
      if (updates.phone) {
        const ValidationService = (await import('./validationService')).default;
        if (!ValidationService.isValidPhone(updates.phone)) {
          throw new Error('Invalid phone format');
        }
      }

      // Prepare update data
      const updateData: Partial<Clinic> = {
        updated_at: Timestamp.now()
      };
      
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      
      if (updates.email !== undefined) {
        updateData.email = updates.email;
      }
      
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone;
      }
      
      if (updates.address !== undefined) {
        updateData.address = updates.address;
      }
      
      if (updates.city !== undefined) {
        updateData.city = updates.city;
      }
      
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      
      if (updates.settings) {
        updateData.settings = {
          ...currentClinic.settings,
          ...updates.settings,
          notification_preferences: {
            ...currentClinic.settings.notification_preferences,
            ...updates.settings.notification_preferences
          }
        };
      }

      // Calculate changes for audit log
      const changes: any = {};
      Object.keys(updates).forEach(key => {
        if (key !== 'settings' && updates[key as keyof UpdateClinicRequest] !== undefined) {
          changes[key] = {
            from: (currentClinic as any)[key],
            to: updates[key as keyof UpdateClinicRequest]
          };
        }
      });

      if (updates.settings) {
        changes.settings = {
          from: currentClinic.settings,
          to: updateData.settings
        };
      }

      // Update the clinic
      await FirestoreService.updateClinic(clinicId, updateData);

      // Return updated clinic
      const updatedClinic = await FirestoreService.getClinicById(clinicId);
      if (!updatedClinic) {
        throw new Error('Failed to retrieve updated clinic');
      }

      // Log clinic update for audit trail
      if (userId) {
        await AuditService.logClinicUpdate(
          clinicId,
          updatedClinic.name,
          changes,
          userId
        );
      }

      return updatedClinic;
    } catch (error: any) {
      console.error('Error updating clinic:', error);
      throw new Error(`Failed to update clinic: ${error.message}`);
    }
  }

  /**
   * Toggle clinic status between active and inactive
   */
  async toggleClinicStatus(
    clinicId: string,
    newStatus: 'active' | 'inactive',
    userRole: UserRole,
    userId: string
  ): Promise<Clinic> {
    try {
      // Only system_admin can toggle clinic status
      if (userRole !== UserRole.SYSTEM_ADMIN) {
        throw new Error('Insufficient permissions to toggle clinic status');
      }

      // Validate status value
      if (!['active', 'inactive'].includes(newStatus)) {
        throw new Error('Invalid status value. Must be "active" or "inactive"');
      }

      // Get current clinic data
      const currentClinic = await FirestoreService.getClinicById(clinicId);
      if (!currentClinic) {
        throw new Error('Clinic not found');
      }

      // Check if status is actually changing
      if (currentClinic.status === newStatus) {
        throw new Error(`Clinic is already ${newStatus}`);
      }

      const oldStatus = currentClinic.status;

      // Update clinic status
      const updateData: Partial<Clinic> = {
        status: newStatus,
        updated_at: Timestamp.now()
      };

      await FirestoreService.updateClinic(clinicId, updateData);

      // Return updated clinic
      const updatedClinic = await FirestoreService.getClinicById(clinicId);
      if (!updatedClinic) {
        throw new Error('Failed to retrieve updated clinic');
      }

      // Log clinic status change for audit trail
      await AuditService.logClinicStatusChange(
        clinicId,
        updatedClinic.name,
        oldStatus,
        newStatus,
        userId
      );

      return updatedClinic;
    } catch (error: any) {
      console.error('Error toggling clinic status:', error);
      throw new Error(`Failed to toggle clinic status: ${error.message}`);
    }
  }

  /**
   * Delete clinic (system_admin only)
   */
  async deleteClinic(
    clinicId: string,
    userRole: UserRole
  ): Promise<void> {
    try {
      // Only system_admin can delete clinics
      if (userRole !== UserRole.SYSTEM_ADMIN) {
        throw new Error('Insufficient permissions to delete clinics');
      }

      // Check if clinic exists
      const clinic = await FirestoreService.getClinicById(clinicId);
      if (!clinic) {
        throw new Error('Clinic not found');
      }

      // Get all users in this clinic
      const users = await FirestoreService.usersCollection
        .where('clinic_id', '==', clinicId)
        .get();

      // Use transaction to delete clinic and all related data
      await FirestoreService.runTransaction(async (transaction) => {
        // Delete all users in the clinic
        users.docs.forEach(userDoc => {
          transaction.delete(userDoc.ref);
        });

        // Delete the clinic
        const clinicRef = FirestoreService.clinicsCollection.doc(clinicId);
        transaction.delete(clinicRef);
      });

      // Delete Firebase Auth users (outside transaction)
      for (const userDoc of users.docs) {
        const userData = userDoc.data() as User;
        try {
          await this.userService.deleteFirebaseAuthUser(userData.user_id);
        } catch (error) {
          console.warn(`Failed to delete Firebase Auth user ${userData.user_id}:`, error);
          // Continue with other deletions even if one fails
        }
      }

    } catch (error: any) {
      console.error('Error deleting clinic:', error);
      throw new Error(`Failed to delete clinic: ${error.message}`);
    }
  }

  /**
   * Get clinic statistics
   */
  async getClinicStats(
    clinicId: string,
    userRole: UserRole,
    userClinicId?: string
  ): Promise<{
    total_users: number;
    total_patients: number;
    total_products: number;
    recent_activity_count: number;
  }> {
    try {
      // Check permissions
      if (userRole === UserRole.SYSTEM_ADMIN) {
        // System admin can get stats for any clinic
      } else if (userRole === UserRole.CLINIC_ADMIN && userClinicId === clinicId) {
        // Clinic admin can only get stats for their own clinic
      } else {
        throw new Error('Insufficient permissions to view clinic statistics');
      }

      // Get counts from various collections
      const [usersSnapshot, patientsSnapshot, inventorySnapshot, requestsSnapshot] = await Promise.all([
        FirestoreService.usersCollection.where('clinic_id', '==', clinicId).get(),
        FirestoreService.getPatientsCollection(clinicId).get(),
        FirestoreService.getInventoryCollection(clinicId).get(),
        FirestoreService.getRequestsCollection(clinicId)
          .where('created_at', '>=', Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
          .get()
      ]);

      return {
        total_users: usersSnapshot.size,
        total_patients: patientsSnapshot.size,
        total_products: inventorySnapshot.size,
        recent_activity_count: requestsSnapshot.size
      };
    } catch (error: any) {
      console.error('Error getting clinic stats:', error);
      throw new Error(`Failed to get clinic statistics: ${error.message}`);
    }
  }

  /**
   * Find clinic by CNPJ
   */
  private async findClinicByCNPJ(cnpj: string): Promise<Clinic | null> {
    try {
      const snapshot = await FirestoreService.clinicsCollection
        .where('cnpj', '==', cnpj)
        .limit(1)
        .get();
      
      return snapshot.empty ? null : snapshot.docs[0].data() as Clinic;
    } catch (error: any) {
      console.error('Error finding clinic by CNPJ:', error);
      return null;
    }
  }

  /**
   * Find clinic by email
   */
  private async findClinicByEmail(email: string): Promise<Clinic | null> {
    try {
      const snapshot = await FirestoreService.clinicsCollection
        .where('email', '==', email)
        .limit(1)
        .get();
      
      return snapshot.empty ? null : snapshot.docs[0].data() as Clinic;
    } catch (error: any) {
      console.error('Error finding clinic by email:', error);
      return null;
    }
  }

  /**
   * Get clinic audit logs with pagination
   */
  async getClinicAuditLogs(
    clinicId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      return await AuditService.getClinicAuditLogs(clinicId, limit, offset);
    } catch (error: any) {
      console.error('Error getting clinic audit logs:', error);
      throw new Error(`Failed to get clinic audit logs: ${error.message}`);
    }
  }
}

export default ClinicService;