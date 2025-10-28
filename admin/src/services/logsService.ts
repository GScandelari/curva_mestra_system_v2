import apiService from './apiService';

export interface AuditLog {
  log_id: string;
  timestamp: string;
  user_id: string;
  clinic_id?: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  ip_address?: string;
  user_agent?: string;
  details: any;
}

export interface LogsResponse {
  logs: AuditLog[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface LogsSearchResponse {
  logs: AuditLog[];
  search_metadata: {
    query?: string;
    total_results: number;
    filters_applied: number;
  };
}

export interface LogsStats {
  total_logs: number;
  action_types: Record<string, number>;
  resource_types: Record<string, number>;
  users: Record<string, number>;
  clinics: Record<string, number>;
  date_range: {
    start?: string;
    end?: string;
    oldest_log?: string;
    newest_log?: string;
  };
}

export interface LogsFilters {
  clinic_id?: string;
  user_id?: string;
  action_type?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface LogsSearchFilters extends LogsFilters {
  q?: string; // General search query
  action_types?: string; // Comma-separated list
  resource_types?: string; // Comma-separated list
  ip_address?: string;
}

class LogsService {
  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(filters: LogsFilters = {}): Promise<LogsResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiService.get(`/logs?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch logs');
    }
  }

  /**
   * Get a specific audit log by ID
   */
  async getLog(logId: string): Promise<AuditLog> {
    try {
      const response = await apiService.get(`/logs/${logId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching log:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch log');
    }
  }

  /**
   * Get log statistics and summary
   */
  async getLogsStats(filters: Omit<LogsFilters, 'limit' | 'offset'> = {}): Promise<LogsStats> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiService.get(`/logs/stats/summary?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching logs stats:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch logs statistics');
    }
  }

  /**
   * Advanced log search with multiple criteria
   */
  async searchLogs(filters: LogsSearchFilters = {}): Promise<LogsSearchResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiService.get(`/logs/search?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error searching logs:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to search logs');
    }
  }

  /**
   * Export logs to CSV format
   */
  async exportLogs(filters: Omit<LogsFilters, 'limit' | 'offset'> = {}): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      // Add format parameter
      params.append('format', 'csv');

      const response = await apiService.get(`/logs/export?${params.toString()}`);
      
      // Convert response to blob for download
      return new Blob([response.data], { type: 'text/csv' });
    } catch (error: any) {
      console.error('Error exporting logs:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to export logs');
    }
  }

  /**
   * Clean up old logs (dry run or actual deletion)
   */
  async cleanupLogs(beforeDate: string, dryRun: boolean = true): Promise<{
    dry_run?: boolean;
    logs_to_delete?: number;
    deleted_count?: number;
    before_date: string;
    batches_processed?: number;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('before_date', beforeDate);
      params.append('dry_run', dryRun.toString());

      const response = await apiService.delete(`/logs/cleanup?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error cleaning up logs:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to cleanup logs');
    }
  }

  /**
   * Download exported logs as a file
   */
  downloadLogsFile(blob: Blob, filename?: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

const logsService = new LogsService();
export default logsService;