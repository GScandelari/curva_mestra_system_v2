import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { auth } from '../config/firebase';
import { retryRequest, isRetryableError, logError } from '../utils/errorHandler';

class ApiService {
  private api: AxiosInstance;
  private requestId = 0;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api/v1',
      timeout: 30000, // Increased timeout for better UX
    });

    // Request interceptor to add auth token and request ID
    this.api.interceptors.request.use(
      async (config) => {
        // Add request ID for tracking
        this.requestId++;
        config.headers['X-Request-ID'] = `client_${Date.now()}_${this.requestId}`;
        
        // Add auth token
        const user = auth.currentUser;
        if (user) {
          try {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
          } catch (tokenError) {
            console.error('Failed to get auth token:', tokenError);
            // Don't reject here, let the server handle the missing token
          }
        }
        
        return config;
      },
      (error) => {
        logError(error, { source: 'ApiService.request' });
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            requestId: response.config.headers['X-Request-ID']
          });
        }
        return response;
      },
      (error: AxiosError) => {
        // Enhanced error handling
        const context = {
          source: 'ApiService.response',
          method: error.config?.method,
          url: error.config?.url,
          requestId: error.config?.headers?.['X-Request-ID'],
          status: error.response?.status
        };
        
        logError(error, context);
        
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.handleAuthenticationError();
        } else if (error.response?.status === 403) {
          // Permission denied - don't redirect, let component handle
          console.warn('Permission denied:', error.response.data);
        } else if (!error.response) {
          // Network error
          console.error('Network error:', error.message);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private handleAuthenticationError(): void {
    // Clear auth state and redirect to login
    auth.signOut().then(() => {
      window.location.href = '/login';
    }).catch((signOutError) => {
      console.error('Error signing out:', signOutError);
      // Force redirect even if sign out fails
      window.location.href = '/login';
    });
  }

  private async makeRequest<T>(
    requestFn: () => Promise<any>,
    retryable: boolean = true
  ): Promise<T> {
    if (retryable) {
      return retryRequest(
        async () => {
          const response = await requestFn();
          return response.data;
        },
        3, // Max 3 attempts
        (attempt, error) => {
          console.log(`Retrying request (attempt ${attempt}):`, error.message);
        }
      );
    } else {
      const response = await requestFn();
      return response.data;
    }
  }

  // Generic GET request
  async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.get(url, { params, ...config }));
  }

  // Generic POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.post(url, data, config));
  }

  // Generic PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.put(url, data, config));
  }

  // Generic DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.delete(url, config));
  }

  // Non-retryable requests (for operations that shouldn't be retried)
  async postNoRetry<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.post(url, data, config), false);
  }

  async putNoRetry<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.put(url, data, config), false);
  }

  async deleteNoRetry<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.makeRequest(() => this.api.delete(url, config), false);
  }

  // Get current user's clinic dashboard data
  async getDashboardData(clinicId: string) {
    return this.get(`/clinics/${clinicId}/dashboard`);
  }

  // Get clinic inventory
  async getInventory(clinicId: string) {
    return this.get(`/clinics/${clinicId}/inventory`);
  }

  // Get clinic patients
  async getPatients(clinicId: string, params?: any) {
    return this.get(`/clinics/${clinicId}/patients`, params);
  }

  // Get clinic invoices
  async getInvoices(clinicId: string, params?: any) {
    return this.get(`/clinics/${clinicId}/invoices`, params);
  }

  // Get clinic requests
  async getRequests(clinicId: string, params?: any) {
    return this.get(`/clinics/${clinicId}/requests`, params);
  }

  // Get approved products
  async getProducts() {
    return this.get('/products');
  }

  // System admin endpoints
  async getClinics() {
    return this.get('/clinics');
  }

  async getPendingProducts() {
    return this.get('/products/pending');
  }

  async getSystemLogs(params?: any) {
    return this.get('/logs', params);
  }
}

export const apiService = new ApiService();