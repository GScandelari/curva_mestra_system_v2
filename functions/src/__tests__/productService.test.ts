import { ProductService } from '../services/productService';
import { FirestoreService } from '../services/firestoreService';

// Mock dependencies
jest.mock('../services/firestoreService');
jest.mock('../services/validationService');

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProductData', () => {
    it('should validate correct product data', () => {
      const validProductData = {
        name: 'Test Product',
        description: 'A test product description',
        rennova_code: 'REN-TEST123',
        category: 'Facial',
        unit_type: 'ml',
      };

      const result = ProductService.validateProductData(validProductData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidProductData = {
        name: '',
        description: '',
        rennova_code: '',
        category: '',
        unit_type: 'ml',
      };

      const result = ProductService.validateProductData(invalidProductData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Product name is required');
      expect(result.errors).toContain('Product description is required');
      expect(result.errors).toContain('Rennova code is required');
    });

    it('should validate Rennova code format', () => {
      const productDataWithInvalidCode = {
        name: 'Test Product',
        description: 'A test product description',
        rennova_code: 'invalid-code',
        category: 'Facial',
        unit_type: 'ml',
      };

      const result = ProductService.validateProductData(productDataWithInvalidCode);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rennova code must contain only uppercase letters, numbers, and hyphens');
    });

    it('should validate product name length', () => {
      const productDataWithLongName = {
        name: 'A'.repeat(101), // Too long
        description: 'A test product description',
        rennova_code: 'REN-TEST123',
        category: 'Facial',
        unit_type: 'ml',
      };

      const result = ProductService.validateProductData(productDataWithLongName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product name must be 100 characters or less');
    });
  });

  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product description',
        rennova_code: 'REN-TEST123',
        category: 'Facial',
        unit_type: 'ml' as const,
        status: 'pending' as const,
      };

      (FirestoreService.createProduct as jest.Mock).mockResolvedValue(undefined);

      const result = await ProductService.createProduct(productData);

      expect(result).toBeDefined();
      expect(result.name).toBe(productData.name);
      expect(result.status).toBe('pending');
      expect(result.product_id).toBeDefined();
      expect(FirestoreService.createProduct).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      const mockProduct = {
        product_id: 'test-product-id',
        name: 'Test Product',
        status: 'approved' as const,
        rennova_code: 'REN-TEST123',
      };

      (FirestoreService.getProductById as jest.Mock).mockResolvedValue(mockProduct);

      const result = await ProductService.getProductById('test-product-id');
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      (FirestoreService.getProductById as jest.Mock).mockResolvedValue(null);

      const result = await ProductService.getProductById('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('listProducts', () => {
    it('should return list of products', async () => {
      const mockProducts = [
        { product_id: '1', name: 'Product 1', status: 'approved' },
        { product_id: '2', name: 'Product 2', status: 'pending' },
      ];

      (FirestoreService.listProducts as jest.Mock).mockResolvedValue(mockProducts);

      const result = await ProductService.listProducts();
      expect(result).toEqual(mockProducts);
      expect(FirestoreService.listProducts).toHaveBeenCalled();
    });
  });
});