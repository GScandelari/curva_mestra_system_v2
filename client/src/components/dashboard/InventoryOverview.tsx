import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { InventoryItem } from '../../types/dashboard';

interface InventoryOverviewProps {
  inventory: InventoryItem[];
  loading?: boolean;
}

const InventoryOverview: React.FC<InventoryOverviewProps> = ({ 
  inventory = [], 
  loading = false 
}) => {
  const totalProducts = inventory.length;
  const lowStockItems = inventory.filter(item => 
    item.quantity_in_stock <= item.minimum_stock_level
  );
  const outOfStockItems = inventory.filter(item => 
    item.quantity_in_stock === 0
  );

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity_in_stock === 0) {
      return { status: 'out', color: 'error', icon: <ErrorIcon /> };
    }
    if (item.quantity_in_stock <= item.minimum_stock_level) {
      return { status: 'low', color: 'warning', icon: <WarningIcon /> };
    }
    return { status: 'good', color: 'success', icon: <CheckCircleIcon /> };
  };

  const getStockPercentage = (item: InventoryItem) => {
    if (item.minimum_stock_level === 0) return 100;
    return Math.min((item.quantity_in_stock / item.minimum_stock_level) * 100, 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Visão Geral do Estoque
          </Typography>
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Visão Geral do Estoque
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {totalProducts}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total de Produtos
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {lowStockItems.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Estoque Baixo
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {outOfStockItems.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Sem Estoque
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>
          Status dos Produtos
        </Typography>

        {inventory.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
            Nenhum produto no estoque
          </Typography>
        ) : (
          <List dense>
            {inventory.slice(0, 5).map((item) => {
              const stockStatus = getStockStatus(item);
              const percentage = getStockPercentage(item);
              
              return (
                <ListItem key={item.inventory_id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {stockStatus.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {item.product_name}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${item.quantity_in_stock} un.`}
                          color={stockStatus.color as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          color={stockStatus.color as any}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
            {inventory.length > 5 && (
              <ListItem sx={{ px: 0 }}>
                <ListItemText>
                  <Typography variant="body2" color="textSecondary">
                    ... e mais {inventory.length - 5} produtos
                  </Typography>
                </ListItemText>
              </ListItem>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryOverview;