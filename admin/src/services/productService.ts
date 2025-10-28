interface Product {
  product_id: string;
  name: string;
  description: string;
  rennova_code: string;
  category: string;
  unit_type: 'ml' | 'units' | 'vials';
  status: 'approved' | 'pending';
  requested_by_clinic_id?: string;
  approval_history: any[];
  created_at: any;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  count?: number;
  timestamp: string;
  request_id: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    request_id: string;
  };
}

class ProductService {
  private static getBaseURL(): string {
    return process.env.REACT_APP_API_BASE_URL || '/api/v1';
  }

  private static async getAuthHeaders() {
    const { auth } = await import('../config/firebase');
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const token = await user.getIdToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error?.message || 'Erro na requisição');
    }

    const data: ApiResponse<T> = await response.json();
    return data.data;
  }

  /**
   * Get all approved products
   */
  static async getApprovedProducts(): Promise<Product[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.getBaseURL()}/products`, {
      headers,
    });

    return this.handleResponse<Product[]>(response);
  }

  /**
   * Get all pending products (system admin only)
   */
  static async getPendingProducts(): Promise<Product[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.getBaseURL()}/products/pending`, {
      headers,
    });

    return this.handleResponse<Product[]>(response);
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId: string): Promise<Product> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.getBaseURL()}/products/${productId}`, {
      headers,
    });

    return this.handleResponse<Product>(response);
  }

  /**
   * Create a new product (system admin only)
   */
  static async createProduct(productData: {
    name: string;
    description: string;
    rennova_code: string;
    category: string;
    unit_type: 'ml' | 'units' | 'vials';
  }): Promise<Product> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.getBaseURL()}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(productData),
    });

    return this.handleResponse<Product>(response);
  }

  /**
   * Update product information (system admin only)
   */
  static async updateProduct(
    productId: string,
    updates: {
      name?: string;
      description?: string;
      category?: string;
      unit_type?: 'ml' | 'units' | 'vials';
    }
  ): Promise<Product> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.getBaseURL()}/products/${productId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    return this.handleResponse<Product>(response);
  }

  /**
   * Approve a pending product (system admin only)
   */
  static async approveProduct(productId: string, notes?: string): Promise<Product> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.getBaseURL()}/products/${productId}/approve`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ notes }),
    });

    return this.handleResponse<Product>(response);
  }

  /**
   * Batch approve multiple products
   */
  static async batchApproveProducts(
    productIds: string[],
    notes?: string
  ): Promise<Product[]> {
    const approvalPromises = productIds.map(productId =>
      this.approveProduct(productId, notes)
    );

    return Promise.all(approvalPromises);
  }

  /**
   * Get product statistics
   */
  static async getProductStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    categories: { [key: string]: number };
  }> {
    try {
      const [approved, pending] = await Promise.all([
        this.getApprovedProducts(),
        this.getPendingProducts(),
      ]);

      const allProducts = [...approved, ...pending];
      const categories: { [key: string]: number } = {};

      allProducts.forEach(product => {
        categories[product.category] = (categories[product.category] || 0) + 1;
      });

      return {
        total: allProducts.length,
        approved: approved.length,
        pending: pending.length,
        categories,
      };
    } catch (error) {
      console.error('Error getting product stats:', error);
      throw error;
    }
  }
}

export default ProductService;
export type { Product };