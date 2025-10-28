import axios, { AxiosInstance, AxiosError } from 'axios';
import { auth } from '../config/firebase';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || '/api/v1',
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get(url: string, params?: any) {
    const response = await this.api.get(url, { params });
    return response;
  }

  // Generic POST request
  async post(url: string, data?: any) {
    const response = await this.api.post(url, data);
    return response;
  }

  // Generic PUT request
  async put(url: string, data?: any) {
    const response = await this.api.put(url, data);
    return response;
  }

  // Generic DELETE request
  async delete(url: string) {
    const response = await this.api.delete(url);
    return response;
  }
}

const apiService = new ApiService();
export default apiService;