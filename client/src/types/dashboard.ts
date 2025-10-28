export interface InventoryItem {
  inventory_id: string;
  product_id: string;
  product_name: string;
  quantity_in_stock: number;
  minimum_stock_level: number;
  expiration_dates: Array<{
    date: string;
    lot: string;
    quantity: number;
  }>;
}

export interface RecentActivity {
  id: string;
  type: 'invoice' | 'request' | 'patient';
  action: 'created' | 'updated' | 'viewed';
  description: string;
  user_name: string;
  timestamp: string;
}

export interface DashboardStats {
  total_patients: number;
  total_invoices: number;
  total_requests: number;
  recent_activities: RecentActivity[];
}

export interface RealTimeMetrics {
  total_products: number;
  low_stock_alerts: number;
  expiring_soon: number;
  last_update: string;
}

export interface DashboardData {
  inventory: InventoryItem[];
  stats: DashboardStats;
  realTimeMetrics: RealTimeMetrics | null;
}