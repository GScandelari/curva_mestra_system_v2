import * as admin from 'firebase-admin';

// User roles enum
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  CLINIC_ADMIN = 'clinic_admin',
  CLINIC_USER = 'clinic_user'
}

// Permission types
export type Permission = 
  | 'create_patient' | 'read_patient' | 'update_patient' | 'delete_patient'
  | 'create_invoice' | 'read_invoice' | 'update_invoice' | 'delete_invoice'
  | 'create_request' | 'read_request' | 'update_request' | 'delete_request'
  | 'read_inventory' | 'read_dashboard' | 'manage_users';

// Custom claims interface
export interface CustomClaims {
  role: UserRole;
  clinic_id?: string;
  permissions: Permission[];
}

// User profile interface
export interface UserProfile {
  user_id: string;
  email: string;
  role: UserRole;
  clinic_id: string | null;
  permissions: Permission[];
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  created_at: admin.firestore.Timestamp;
  last_login?: admin.firestore.Timestamp;
}

// Firebase Auth configuration
export class AuthConfig {
  private static instance: AuthConfig;
  
  private constructor() {}
  
  public static getInstance(): AuthConfig {
    if (!AuthConfig.instance) {
      AuthConfig.instance = new AuthConfig();
    }
    return AuthConfig.instance;
  }

  /**
   * Set custom claims for a user
   */
  async setCustomClaims(uid: string, claims: CustomClaims): Promise<void> {
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw new Error('Failed to set user claims');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().getUserByEmail(email);
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('User not found');
    }
  }

  /**
   * Create a new user with email and password
   */
  async createUser(email: string, password: string): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().createUser({
        email,
        password,
        emailVerified: false
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Create a new user with specific UID
   */
  async createUserWithUid(uid: string, email: string, password: string): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().createUser({
        uid,
        email,
        password,
        emailVerified: false
      });
    } catch (error) {
      console.error('Error creating user with UID:', error);
      throw new Error('Failed to create user with UID');
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Verify ID token and return decoded token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate custom token for a user
   */
  async createCustomToken(uid: string, additionalClaims?: object): Promise<string> {
    try {
      return await admin.auth().createCustomToken(uid, additionalClaims);
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw new Error('Failed to create custom token');
    }
  }

  /**
   * Get default permissions for a role
   */
  getDefaultPermissions(role: UserRole): Permission[] {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return [
          'create_patient', 'read_patient', 'update_patient', 'delete_patient',
          'create_invoice', 'read_invoice', 'update_invoice', 'delete_invoice',
          'create_request', 'read_request', 'update_request', 'delete_request',
          'read_inventory', 'read_dashboard', 'manage_users'
        ];
      case UserRole.CLINIC_ADMIN:
        return [
          'create_patient', 'read_patient', 'update_patient', 'delete_patient',
          'create_invoice', 'read_invoice', 'update_invoice', 'delete_invoice',
          'create_request', 'read_request', 'update_request', 'delete_request',
          'read_inventory', 'read_dashboard', 'manage_users'
        ];
      case UserRole.CLINIC_USER:
        return [
          'create_patient', 'read_patient', 'update_patient',
          'create_invoice', 'read_invoice', 'update_invoice',
          'create_request', 'read_request', 'update_request',
          'read_inventory', 'read_dashboard'
        ];
      default:
        return [];
    }
  }

  /**
   * Validate role assignment permissions
   */
  canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    switch (assignerRole) {
      case UserRole.SYSTEM_ADMIN:
        return true; // System admin can assign any role
      case UserRole.CLINIC_ADMIN:
        return targetRole !== UserRole.SYSTEM_ADMIN; // Clinic admin cannot create system admins
      case UserRole.CLINIC_USER:
        return false; // Clinic users cannot assign roles
      default:
        return false;
    }
  }
}

export const authConfig = AuthConfig.getInstance();