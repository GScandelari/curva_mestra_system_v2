import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Dashboard,
  Inventory,
  People,
  Receipt,
  Assignment,
  AdminPanelSettings,
  Business,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
  role?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Dashboard />,
    permission: 'read_dashboard',
  },
  {
    label: 'Estoque',
    path: '/inventory',
    icon: <Inventory />,
    permission: 'read_inventory',
  },
  {
    label: 'Pacientes',
    path: '/patients',
    icon: <People />,
    permission: 'read_patient',
  },
  {
    label: 'Notas Fiscais',
    path: '/invoices',
    icon: <Receipt />,
    permission: 'read_invoice',
  },
  {
    label: 'Solicitações',
    path: '/requests',
    icon: <Assignment />,
    permission: 'read_request',
  },
  {
    label: 'Usuários',
    path: '/users',
    icon: <AdminPanelSettings />,
    permission: 'manage_users',
  },
];

const systemAdminItems: NavigationItem[] = [
  {
    label: 'Clínicas',
    path: '/admin/clinics',
    icon: <Business />,
    role: 'system_admin',
  },
  {
    label: 'Produtos',
    path: '/admin/products',
    icon: <Inventory />,
    role: 'system_admin',
  },
  {
    label: 'Logs do Sistema',
    path: '/admin/logs',
    icon: <Assignment />,
    role: 'system_admin',
  },
];

const drawerWidth = 240;

interface AppNavigationProps {
  children: React.ReactNode;
}

const AppNavigation: React.FC<AppNavigationProps> = ({ children }) => {
  const { profile, logout, hasPermission, isRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const getFilteredNavigationItems = () => {
    const items = [...navigationItems];
    
    // Add system admin items if user is system admin
    if (isRole('system_admin')) {
      items.push(...systemAdminItems);
    }
    
    return items.filter(item => {
      if (item.role) {
        return isRole(item.role);
      }
      if (item.permission) {
        return hasPermission(item.permission);
      }
      return true;
    });
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Curva Mestra
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {getFilteredNavigationItems().map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {profile?.profile.first_name && profile?.profile.last_name
              ? `${profile.profile.first_name} ${profile.profile.last_name}`
              : profile?.email}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {profile?.role === 'system_admin' && 'Administrador do Sistema'}
              {profile?.role === 'clinic_admin' && 'Administrador da Clínica'}
              {profile?.role === 'clinic_user' && 'Usuário da Clínica'}
            </Typography>
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default AppNavigation;