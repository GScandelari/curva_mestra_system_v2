import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  TrendingUp,
  Error as ErrorIcon,
  Speed,
  Timeline,
  Assessment,
  Warning
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAdminApiTracking } from '../../hooks/useAdminMonitoring';

interface SystemMetrics {
  totalClinics: number;
  totalUsers: number;
  totalProducts: number;
  pendingProducts: number;
  activeRequests: number;
  avgResponseTime: number;
  errorRate: number;
}

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  errorRate: number;
  requestCount: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  errorType: string;
  message: string;
  context: string;
  count: number;
}

const MonitoringDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackApiCall } = useAdminApiTracking();

  useEffect(() => {
    loadMonitoringData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      
      // Load system metrics
      const metrics = await trackApiCall('get_system_metrics', async () => {
        const response = await fetch('/api/v1/monitoring/system-metrics');
        return response.json();
      });
      
      setSystemMetrics(metrics);

      // Load performance data
      const performance = await trackApiCall('get_performance_metrics', async () => {
        const response = await fetch('/api/v1/monitoring/performance-metrics');
        return response.json();
      });
      
      setPerformanceData(performance);

      // Load error logs
      const errors = await trackApiCall('get_error_logs', async () => {
        const response = await fetch('/api/v1/monitoring/error-logs');
        return response.json();
      });
      
      setErrorLogs(errors);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getHealthStatus = (metrics: SystemMetrics) => {
    if (metrics.errorRate > 5) return { status: 'error', color: 'error' as const };
    if (metrics.avgResponseTime > 2000 || metrics.errorRate > 1) return { status: 'warning', color: 'warning' as const };
    return { status: 'healthy', color: 'success' as const };
  };

  if (loading && !systemMetrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>System Monitoring</Typography>
        <LinearProgress />
      </Box>
    );
  }

  const healthStatus = systemMetrics ? getHealthStatus(systemMetrics) : { status: 'unknown', color: 'default' as const };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Monitoring
      </Typography>

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">System Health</Typography>
              </Box>
              <Chip 
                label={healthStatus.status.toUpperCase()} 
                color={healthStatus.color}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Overall system status
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Speed sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Avg Response</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {systemMetrics?.avgResponseTime || 0}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                API response time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">Error Rate</Typography>
              </Box>
              <Typography variant="h4" color="error">
                {systemMetrics?.errorRate || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last 24 hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Active Users</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {systemMetrics?.totalUsers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total registered users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Statistics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Clinics</Typography>
                  <Typography variant="h5">{systemMetrics?.totalClinics || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Products</Typography>
                  <Typography variant="h5">{systemMetrics?.totalProducts || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Pending Products</Typography>
                  <Typography variant="h5" color="warning.main">
                    {systemMetrics?.pendingProducts || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Active Requests</Typography>
                  <Typography variant="h5" color="info.main">
                    {systemMetrics?.activeRequests || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Alerts</Typography>
              {systemMetrics?.pendingProducts && systemMetrics.pendingProducts > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {systemMetrics.pendingProducts} products awaiting approval
                </Alert>
              )}
              {systemMetrics?.errorRate && systemMetrics.errorRate > 1 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  High error rate detected: {systemMetrics.errorRate}%
                </Alert>
              )}
              {systemMetrics?.avgResponseTime && systemMetrics.avgResponseTime > 2000 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Slow response times detected: {systemMetrics.avgResponseTime}ms
                </Alert>
              )}
              {(!systemMetrics?.pendingProducts || systemMetrics.pendingProducts === 0) &&
               (!systemMetrics?.errorRate || systemMetrics.errorRate <= 1) &&
               (!systemMetrics?.avgResponseTime || systemMetrics.avgResponseTime <= 2000) && (
                <Alert severity="success">
                  All systems operating normally
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Monitoring Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Performance Metrics" />
            <Tab label="Error Logs" />
            <Tab label="API Analytics" />
          </Tabs>
        </Box>

        <CardContent>
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Performance Over Time</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#8884d8" 
                    name="Response Time (ms)"
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="errorRate" 
                    stroke="#82ca9d" 
                    name="Error Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Recent Error Logs</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Error Type</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Context</TableCell>
                      <TableCell>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {errorLogs.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell>{new Date(error.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip label={error.errorType} color="error" size="small" />
                        </TableCell>
                        <TableCell>{error.message}</TableCell>
                        <TableCell>{error.context}</TableCell>
                        <TableCell>{error.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>API Request Volume</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requestCount" fill="#8884d8" name="Request Count" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonitoringDashboard;