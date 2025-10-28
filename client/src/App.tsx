import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/common/LoadingScreen';
import AppNavigation from './components/navigation/AppNavigation';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import PatientsPage from './pages/PatientsPage';
import RequestsPage from './pages/RequestsPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is not authenticated, show login page
  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    );
  }

  // If user is authenticated, show app with navigation
  return (
    <AppNavigation>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requiredPermission="read_dashboard">
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Placeholder routes for future implementation */}
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute requiredPermission="read_inventory">
              <Box sx={{ p: 2 }}>
                <h2>Estoque - Em desenvolvimento</h2>
              </Box>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/patients" 
          element={
            <ProtectedRoute requiredPermission="read_patient">
              <PatientsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/invoices" 
          element={
            <ProtectedRoute requiredPermission="read_invoice">
              <InvoicesPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/requests" 
          element={
            <ProtectedRoute requiredPermission="read_request">
              <RequestsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requiredPermission="manage_users">
              <Box sx={{ p: 2 }}>
                <h2>Usuários - Em desenvolvimento</h2>
              </Box>
            </ProtectedRoute>
          } 
        />
        
        {/* System Admin Routes */}
        <Route 
          path="/admin/clinics" 
          element={
            <ProtectedRoute requiredRole="system_admin">
              <Box sx={{ p: 2 }}>
                <h2>Clínicas - Em desenvolvimento</h2>
              </Box>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/products" 
          element={
            <ProtectedRoute requiredRole="system_admin">
              <Box sx={{ p: 2 }}>
                <h2>Produtos - Em desenvolvimento</h2>
              </Box>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/logs" 
          element={
            <ProtectedRoute requiredRole="system_admin">
              <Box sx={{ p: 2 }}>
                <h2>Logs do Sistema - Em desenvolvimento</h2>
              </Box>
            </ProtectedRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppNavigation>
  );
}

export default App;