import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Business,
  Add,
  Assessment,
  History,
} from '@mui/icons-material';
import AdminNavigation from '../components/navigation/AdminNavigation';
import AdminSidebar from '../components/navigation/AdminSidebar';
import ClinicSelector from '../components/common/ClinicSelector';
import PendingProductsList from '../components/products/PendingProductsList';
import ProductCatalog from '../components/products/ProductCatalog';
import ClinicManagement from '../components/clinics/ClinicManagement';
import UserForm from '../components/clinics/UserForm';
import LogsList from '../components/logs/LogsList';
import LogDetail from '../components/logs/LogDetail';
import LogsSearch from '../components/logs/LogsSearch';
import ProductService from '../services/productService';
import { Clinic, User } from '../services/clinicService';
import { AuditLog } from '../services/logsService';

interface ClinicSelectorData {
  id: string;
  name: string;
}

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedClinic, setSelectedClinic] = useState<ClinicSelectorData | null>(null);
  const [pendingProductsCount, setPendingProductsCount] = useState(0);
  
  // User management state (for clinic users)
  const [editingUser, setEditingUser] = useState<{ clinic: Clinic; user: User | null }>({ clinic: null as any, user: null });
  const [creatingUser, setCreatingUser] = useState<string | null>(null);
  
  // Logs management state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const handleClinicChange = (clinic: ClinicSelectorData | null) => {
    setSelectedClinic(clinic);
  };

  // User management handlers (for clinic users)
  const handleCreateUser = (clinicId: string) => {
    setCreatingUser(clinicId);
    setCurrentView('user-form');
  };

  const handleEditUser = (clinic: Clinic, user: User) => {
    setEditingUser({ clinic, user });
    setCurrentView('user-form');
  };

  const handleUserSaved = (user: User) => {
    setCreatingUser(null);
    setEditingUser({ clinic: null as any, user: null });
    setCurrentView('clinics-list');
  };

  const handleUserFormCancel = () => {
    setCreatingUser(null);
    setEditingUser({ clinic: null as any, user: null });
    setCurrentView('clinics-list');
  };

  // Logs management handlers
  const handleLogSelect = (log: AuditLog) => {
    setSelectedLog(log);
    setCurrentView('log-detail');
  };

  const handleBackToLogs = () => {
    setSelectedLog(null);
    setCurrentView('logs');
  };

  const loadPendingProductsCount = async () => {
    try {
      const products = await ProductService.getPendingProducts();
      setPendingProductsCount(products.length);
    } catch (error) {
      console.error('Error loading pending products count:', error);
      setPendingProductsCount(0);
    }
  };

  const handleProductUpdated = () => {
    loadPendingProductsCount();
  };

  useEffect(() => {
    loadPendingProductsCount();
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Dashboard Administrativo
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Seleção de Clínica
                  </Typography>
                  <ClinicSelector
                    selectedClinicId={selectedClinic?.id}
                    onClinicChange={handleClinicChange}
                    fullWidth
                  />
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ cursor: 'pointer' }} onClick={() => handleViewChange('clinics-list')}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Clínicas Ativas
                    </Typography>
                    <Typography variant="h3" color="primary">
                      -
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total de clínicas no sistema
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                      Clique para gerenciar clínicas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ cursor: 'pointer' }} onClick={() => handleViewChange('products-pending')}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Produtos Pendentes
                    </Typography>
                    <Typography variant="h3" color="warning.main">
                      {pendingProductsCount}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Aguardando aprovação
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                      Clique para revisar produtos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ cursor: 'pointer' }} onClick={() => handleViewChange('logs')}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Usuários Ativos
                    </Typography>
                    <Typography variant="h3" color="success.main">
                      -
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total de usuários no sistema
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                      Clique para ver logs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Acesso Rápido ao Gerenciamento */}
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Acesso Rápido - Gerenciamento de Clínicas
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Business />}
                    onClick={() => handleViewChange('clinics-list')}
                  >
                    Ver Todas as Clínicas
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => handleViewChange('clinics-list')}
                  >
                    Nova Clínica
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Assessment />}
                    onClick={() => handleViewChange('reports')}
                  >
                    Relatórios
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<History />}
                    onClick={() => handleViewChange('logs')}
                  >
                    Logs do Sistema
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {selectedClinic && (
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Clínica Selecionada: {selectedClinic.name}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Use o menu lateral para acessar as funcionalidades específicas da clínica.
                </Typography>
              </Paper>
            )}
          </Box>
        );

      case 'products-pending':
        return (
          <PendingProductsList onProductApproved={handleProductUpdated} />
        );

      case 'products-approved':
        return (
          <ProductCatalog onProductUpdated={handleProductUpdated} />
        );

      case 'clinics':
      case 'clinics-list':
        return (
          <ClinicManagement
            onViewChange={(view) => {
              // Map clinic management views to dashboard views if needed
              if (view === 'user-form') {
                // This would be handled by the clinic management component internally
                // but we can still track it here if needed
              }
            }}
          />
        );

      case 'user-form':
        if (creatingUser) {
          // This would need to be integrated with the clinic management component
          // For now, redirect back to clinic management
          setCurrentView('clinics-list');
          return (
            <ClinicManagement
              onViewChange={(view) => {
                // Handle view changes if needed
              }}
            />
          );
        } else if (editingUser.clinic && editingUser.user) {
          return (
            <UserForm
              clinic={editingUser.clinic}
              user={editingUser.user}
              onSave={handleUserSaved}
              onCancel={handleUserFormCancel}
            />
          );
        }
        return null;

      case 'logs':
        return (
          <LogsList onLogSelect={handleLogSelect} />
        );

      case 'logs-search':
        return (
          <LogsSearch onLogSelect={handleLogSelect} />
        );

      case 'log-detail':
        return selectedLog ? (
          <LogDetail
            log={selectedLog}
            onBack={handleBackToLogs}
          />
        ) : (
          <LogsList onLogSelect={handleLogSelect} />
        );
      
      default:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </Typography>
            <Typography variant="body1">
              Esta funcionalidade será implementada nas próximas tarefas.
            </Typography>
          </Paper>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminNavigation 
        currentClinic={selectedClinic ? { id: selectedClinic.id, name: selectedClinic.name } : null}
      />
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={handleViewChange}
          pendingProductsCount={pendingProductsCount}
        />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - 280px)` },
          }}
        >
          {isMobile && (
            <Box sx={{ mb: 2 }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleSidebarToggle}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          )}
          
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;