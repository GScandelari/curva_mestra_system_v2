import { 
  signInWithEmailAndPassword, 
  signOut, 
  User,
  AuthError as FirebaseAuthError
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, LoginCredentials, AuthError } from '../types/auth';

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; profile: UserProfile }> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      const user = userCredential.user;
      
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Perfil do usuário não encontrado');
      }
      
      const profile = userDoc.data() as UserProfile;
      
      return { user, profile };
    } catch (error) {
      const firebaseError = error as FirebaseAuthError;
      throw this.handleAuthError(firebaseError);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      const firebaseError = error as FirebaseAuthError;
      throw this.handleAuthError(firebaseError);
    }
  }

  async getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return userDoc.data() as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  private handleAuthError(error: FirebaseAuthError): AuthError {
    let message = 'Erro de autenticação';
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Usuário não encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Senha incorreta';
        break;
      case 'auth/invalid-email':
        message = 'Email inválido';
        break;
      case 'auth/user-disabled':
        message = 'Usuário desabilitado';
        break;
      case 'auth/too-many-requests':
        message = 'Muitas tentativas. Tente novamente mais tarde';
        break;
      case 'auth/network-request-failed':
        message = 'Erro de conexão. Verifique sua internet';
        break;
      default:
        message = error.message || 'Erro desconhecido';
    }
    
    return {
      code: error.code,
      message
    };
  }
}

export const authService = new AuthService();