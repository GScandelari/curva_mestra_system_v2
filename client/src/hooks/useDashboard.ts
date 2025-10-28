import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { 
  DashboardData, 
  DashboardStats, 
  InventoryItem, 
  RealTimeMetrics 
} from '../types/dashboard';

export const useDashboard = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData>({
    inventory: [],
    stats: {
      total_patients: 0,
      total_invoices: 0,
      total_requests: 0,
      recent_activities: [],
    },
    realTimeMetrics: null as RealTimeMetrics | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial dashboard data
  const fetchDashboardData = async () => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats and inventory in parallel
      const [dashboardResponse, inventoryResponse] = await Promise.all([
        apiService.getDashboardData(profile.clinic_id),
        apiService.getInventory(profile.clinic_id),
      ]);

      setData(prevData => ({
        ...prevData,
        stats: dashboardResponse as DashboardStats,
        inventory: inventoryResponse as InventoryItem[],
      }));
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time updates for dashboard metrics
  useEffect(() => {
    if (!profile?.clinic_id) return;

    const dashboardRef = ref(rtdb, `clinics/${profile.clinic_id}/dashboard`);

    const handleRealtimeUpdate = (snapshot: any) => {
      const realtimeData = snapshot.val();
      if (realtimeData) {
        setData(prevData => ({
          ...prevData,
          realTimeMetrics: realtimeData,
        }));
      }
    };

    // Listen for real-time updates
    onValue(dashboardRef, handleRealtimeUpdate);

    // Cleanup listener on unmount
    return () => {
      off(dashboardRef, 'value', handleRealtimeUpdate);
    };
  }, [profile?.clinic_id]);

  // Fetch initial data when component mounts or clinic changes
  useEffect(() => {
    if (profile?.clinic_id) {
      fetchDashboardData();
    }
  }, [profile?.clinic_id]);

  // Refresh function for manual updates
  const refresh = () => {
    fetchDashboardData();
  };

  return {
    data,
    loading,
    error,
    refresh,
  };
};