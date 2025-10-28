import * as admin from 'firebase-admin';
import { UserRole, Permission, CustomClaims, UserProfile, authConfig } from '../config/auth';

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
  clinic_id?: string;
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  permissions?: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  expires_in: number;
}

export class UserService {
  private db: admin.firestore.Firestore | null = null;

  private getDb() {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Create a new user with role and permissions
   */
  async createUser(
    createUserRequest: CreateUserRequest,
    createdBy: string,
    creatorRole: UserRole,
    creatorClinicId?: string
  ): Promise<UserProfile> {
    const { email, password, role, clinic_id, profile, permissions } = createUserRequest;

    // Validate role assignment permissions
    if (!authConfig.canAssignRole(creatorRole, role)) {
      throw new Error('Insufficient permissions to assign this role');
    }

    // Validate clinic assignment
    if (role !== UserRole.SYSTEM_ADMIN && !clinic_id) {
      throw new Error('Clinic ID is required for non-system admin users');
    }

    // Validate clinic isolation for clinic admins
    if (creatorRole === UserRole.CLINIC_ADMIN && clinic_id !== creatorClinicId) {
      throw new Error('Cannot create users for other clinics');
    }

    try {
      // Create Firebase Auth user
      const userRecord = await authConfig.createUser(email, password);

      // Determine permissions
      const userPermissions = permissions || authConfig.getDefaultPermissions(role);

      // Set custom claims
      const customClaims: CustomClaims = {
        role,
        clinic_id: role === UserRole.SYSTEM_ADMIN ? undefined : clinic_id,
        permissions: userPermissions
      };

      await authConfig.setCustomClaims(userRecord.uid, customClaims);

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        user_id: userRecord.uid,
        email,
        role,
        clinic_id: role === UserRole.SYSTEM_ADMIN ? null : clinic_id!,
        permissions: userPermissions,
        profile,
        created_at: admin.firestore.Timestamp.now()
      };

      await this.getDb().collection('users').doc(userRecord.uid).set(userProfile);

      // Log user creation
      await this.logUserAction(createdBy, 'user_created', {
        created_user_id: userRecord.uid,
        created_user_email: email,
        created_user_role: role,
        created_user_clinic_id: clinic_id
      });

      return userProfile;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await this.getDb().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      return userDoc.data() as UserProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>,
    updatedBy: string
  ): Promise<UserProfile> {
    try {
      const userRef = this.getDb().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentProfile = userDoc.data() as UserProfile;
      const updatedProfile = {
        ...currentProfile,
        ...updates,
        user_id: userId, // Ensure ID doesn't change
        created_at: currentProfile.created_at, // Preserve creation date
        updated_at: admin.firestore.Timestamp.now()
      };

      await userRef.update(updatedProfile);

      // Update custom claims if role or permissions changed
      if (updates.role || updates.permissions || updates.clinic_id !== undefined) {
        const customClaims: CustomClaims = {
          role: updatedProfile.role,
          clinic_id: updatedProfile.role === UserRole.SYSTEM_ADMIN ? undefined : updatedProfile.clinic_id || undefined,
          permissions: updatedProfile.permissions
        };

        await authConfig.setCustomClaims(userId, customClaims);
      }

      // Log user update
      await this.logUserAction(updatedBy, 'user_updated', {
        updated_user_id: userId,
        changes: updates
      });

      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      // Get user profile before deletion for logging
      const userProfile = await this.getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error('User not found');
      }

      // Delete from Firebase Auth
      await authConfig.deleteUser(userId);

      // Delete from Firestore
      await this.getDb().collection('users').doc(userId).delete();

      // Log user deletion
      await this.logUserAction(deletedBy, 'user_deleted', {
        deleted_user_id: userId,
        deleted_user_email: userProfile.email,
        deleted_user_role: userProfile.role
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get users by clinic
   */
  async getUsersByClinic(clinicId: string): Promise<UserProfile[]> {
    try {
      const usersSnapshot = await this.getDb()
        .collection('users')
        .where('clinic_id', '==', clinicId)
        .get();

      return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      console.error('Error getting users by clinic:', error);
      throw new Error('Failed to get clinic users');
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.getDb().collection('users').doc(userId).update({
        last_login: admin.firestore.Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error for login timestamp update failure
    }
  }

  /**
   * Generate password reset link
   */
  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      const actionCodeSettings = {
        url: 'https://curvamestra.com.br/auth/reset-password',
        handleCodeInApp: false
      };

      return await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    } catch (error) {
      console.error('Error generating password reset link:', error);
      throw new Error('Failed to generate password reset link');
    }
  }

  /**
   * Verify password reset code
   * Note: This functionality requires client-side Firebase Auth SDK
   */
  async verifyPasswordResetCode(code: string): Promise<string> {
    try {
      // In Firebase Admin SDK, we cannot verify reset codes directly
      // This would typically be handled on the client side
      // For now, we'll throw an error indicating this should be handled client-side
      throw new Error('Password reset verification must be handled on the client side');
    } catch (error) {
      console.error('Error verifying password reset code:', error);
      throw new Error('Invalid or expired password reset code');
    }
  }

  /**
   * Confirm password reset
   * Note: This functionality requires client-side Firebase Auth SDK
   */
  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      // In Firebase Admin SDK, we cannot confirm password resets directly
      // This would typically be handled on the client side
      // For now, we'll throw an error indicating this should be handled client-side
      throw new Error('Password reset confirmation must be handled on the client side');
    } catch (error) {
      console.error('Error confirming password reset:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Create Firebase Auth user (used by ClinicService)
   */
  async createFirebaseAuthUser(
    userId: string,
    email: string,
    password: string,
    role: UserRole,
    clinicId?: string
  ): Promise<void> {
    try {
      // Create Firebase Auth user with specific UID
      await authConfig.createUserWithUid(userId, email, password);

      // Set custom claims
      const customClaims: CustomClaims = {
        role,
        clinic_id: role === UserRole.SYSTEM_ADMIN ? undefined : clinicId,
        permissions: authConfig.getDefaultPermissions(role)
      };

      await authConfig.setCustomClaims(userId, customClaims);
    } catch (error) {
      console.error('Error creating Firebase Auth user:', error);
      throw new Error('Failed to create Firebase Auth user');
    }
  }

  /**
   * Delete Firebase Auth user (used by ClinicService)
   */
  async deleteFirebaseAuthUser(userId: string): Promise<void> {
    try {
      await authConfig.deleteUser(userId);
    } catch (error) {
      console.error('Error deleting Firebase Auth user:', error);
      throw new Error('Failed to delete Firebase Auth user');
    }
  }

  /**
   * Log user-related actions
   */
  private async logUserAction(
    userId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      const logEntry = {
        user_id: userId,
        action_type: action,
        details,
        timestamp: admin.firestore.Timestamp.now(),
        ip_address: null, // Will be set by the API endpoint
        user_agent: null // Will be set by the API endpoint
      };

      await this.getDb().collection('logs').add(logEntry);
    } catch (error) {
      console.error('Error logging user action:', error);
      // Don't throw error for logging failure
    }
  }
}