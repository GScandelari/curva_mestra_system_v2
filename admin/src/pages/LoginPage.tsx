import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Check if user has system admin claims in Firebase Auth
        const idTokenResult = await user.getIdTokenResult();
        const customClaims = idTokenResult.claims;
        
        if (customClaims.admin === true || customClaims.role === 'administrator' || 
            (customClaims.permissions && Array.isArray(customClaims.permissions) && 
             (customClaims.permissions as string[]).includes('system_admin'))) {
          
          // Create user profile in Firestore for system admin
          const userProfile = {
            user_id: user.uid,
            email: user.email,
            role: 'system_admin',
            clinic_id: null,
            permissions: [
              'create_patient', 'read_patient', 'update_patient', 'delete_patient',
              'create_invoice', 'read_invoice', 'update_invoice', 'delete_invoice',
              'create_request', 'read_request', 'update_request', 'delete_request',
              'read_inventory', 'read_dashboard', 'manage_users'
            ],
            profile: {
              first_name: user.displayName?.split(' ')[0] || 'Admin',
              last_name: user.displayName?.split(' ').slice(1).join(' ') || 'User',
              phone: null
            },
            created_at: new Date(),
            last_login: null,
            isActive: true
          };
          
          // Save to Firestore
          await import('firebase/firestore').then(({ setDoc }) => 
            setDoc(doc(db, 'users', user.uid), userProfile)
          );
          
          // Force token refresh to get updated claims
          await user.getIdToken(true);
          
          console.log('✅ System admin profile created automatically');
        } else {
          throw new Error('Usuário não encontrado no sistema');
        }
      } else {
        const userData = userDoc.data();
        
        if (userData.role !== 'system_admin') {
          // Sign out if not system admin
          await auth.signOut();
          throw new Error('Acesso negado. Apenas administradores do sistema podem acessar este painel.');
        }
      }

      // Success - user will be redirected by App.tsx
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou senha incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Conta desabilitada. Entre em contato com o suporte.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          borderRadius: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <AdminPanelSettings 
            sx={{ 
              fontSize: 48, 
              color: 'primary.main', 
              mb: 1 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Curva Mestra
          </Typography>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Painel Administrativo
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Acesso restrito a administradores do sistema
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 2 }}
            autoComplete="email"
          />

          <TextField
            fullWidth
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !email || !password}
            sx={{ mb: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Entrar'
            )}
          </Button>
        </Box>

        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
          Sistema de Gestão de Inventário Rennova
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginPage;