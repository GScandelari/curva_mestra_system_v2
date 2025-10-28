import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  Inventory,
  Business,
  Assessment,
  People,
  Settings,
  CheckCircle,
  PendingActions,
  History,
} from '@mui/icons-material';

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  pendingProductsCount?: number;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  open,
  onClose,
  currentView,
  onViewChange,
  pendingProductsCount = 0,
}) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Dashboard />,
      description: 'Visão geral do sistema',
    },
    {
      id: 'products',
      label: 'Produtos',
      icon: <Inventory />,
      description: 'Catálogo global de produtos',
      children: [
        {
          id: 'products-approved',
          label: 'Produtos Aprovados',
          icon: <CheckCircle />,
        },
        {
          id: 'products-pending',
          label: 'Pendentes de Aprovação',
          icon: <PendingActions />,
          badge: pendingProductsCount > 0 ? pendingProductsCount : undefined,
        },
      ],
    },
    {
      id: 'clinics-list',
      label: 'Clínicas',
      icon: <Business />,
      description: 'Gerenciamento de clínicas',
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: <Assessment />,
      description: 'Relatórios e análises',
    },
    {
      id: 'logs',
      label: 'Logs do Sistema',
      icon: <History />,
      description: 'Auditoria e logs de atividades',
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: <Settings />,
      description: 'Configurações do sistema',
    },
  ];

  const handleItemClick = (itemId: string) => {
    onViewChange(itemId);
    if (window.innerWidth < 900) {
      onClose();
    }
  };

  const renderMenuItem = (item: any, level = 0) => {
    const isSelected = currentView === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ pl: level * 2 }}>
          <ListItemButton
            selected={isSelected}
            onClick={() => handleItemClick(item.id)}
            sx={{
              minHeight: 48,
              borderRadius: 1,
              mx: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              secondary={level === 0 ? item.description : undefined}
              primaryTypographyProps={{
                fontSize: level === 0 ? '0.875rem' : '0.8rem',
                fontWeight: isSelected ? 600 : 400,
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
              }}
            />
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <>
            {item.children.map((child: any) => renderMenuItem(child, level + 1))}
          </>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="primary" fontWeight="bold">
          Painel Administrativo
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Sistema Curva Mestra
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => renderMenuItem(item))}
      </List>
    </Drawer>
  );
};

export default AdminSidebar;