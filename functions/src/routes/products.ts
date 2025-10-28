import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateSystemAdmin } from '../middleware/permissions';
import ProductService from '../services/productService';
import { UserRole } from '../config/auth';

const router = Router();

/**
 * POST /products
 * Create a new product
 * - System admins create approved products
 * - Other users create pending products (via invoice workflow)
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, rennova_code, category, unit_type } = req.body;

    // Validate required fields
    const validation = ProductService.validateProductData({
      name,
      description,
      rennova_code,
      category,
      unit_type
    });

    if (!validation.isValid) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid product data',
          details: validation.errors,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Check if product with same rennova_code already exists
    const existingProduct = await ProductService.getProductByRennovaCode(rennova_code);
    if (existingProduct) {
      res.status(409).json({
        error: {
          code: 'PRODUCT_EXISTS',
          message: 'Product with this Rennova code already exists',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Determine product status based on user role
    const status = req.user!.role === UserRole.SYSTEM_ADMIN ? 'approved' : 'pending';
    const requested_by_clinic_id = req.user!.role !== UserRole.SYSTEM_ADMIN ? req.user!.clinic_id : undefined;

    const product = await ProductService.createProduct({
      name,
      description,
      rennova_code,
      category,
      unit_type,
      status,
      requested_by_clinic_id
    });

    res.status(201).json({
      data: product,
      message: status === 'approved' ? 'Product created and approved' : 'Product created and pending approval',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create product',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /products
 * List approved products (available to all authenticated users)
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const products = await ProductService.getApprovedProducts();

    res.status(200).json({
      data: products,
      count: products.length,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve products',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /products/pending
 * List pending products (system admin only)
 */
router.get('/pending', authenticateToken, validateSystemAdmin, async (req: Request, res: Response) => {
  try {
    const products = await ProductService.getPendingProducts();

    res.status(200).json({
      data: products,
      count: products.length,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error listing pending products:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve pending products',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /products/:id
 * Get product by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await ProductService.getProductById(id);

    if (!product) {
      res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Non-system admins can only see approved products
    if (req.user!.role !== UserRole.SYSTEM_ADMIN && product.status !== 'approved') {
      res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    res.status(200).json({
      data: product,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve product',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * PUT /products/:id/approve
 * Approve a pending product (system admin only)
 */
router.put('/:id/approve', authenticateToken, validateSystemAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const product = await ProductService.approveProduct(id, req.user!.uid, notes);

    res.status(200).json({
      data: product,
      message: 'Product approved successfully',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error approving product:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Product not found') {
        res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
      
      if (error.message === 'Product is already approved') {
        res.status(409).json({
          error: {
            code: 'PRODUCT_ALREADY_APPROVED',
            message: 'Product is already approved',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to approve product',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * PUT /products/:id
 * Update product information (system admin only)
 */
router.put('/:id', authenticateToken, validateSystemAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, category, unit_type } = req.body;

    // Validate update data
    const validation = ProductService.validateProductData({
      name,
      description,
      category,
      unit_type
    });

    if (!validation.isValid) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid product data',
          details: validation.errors,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (unit_type !== undefined) updates.unit_type = unit_type;

    const product = await ProductService.updateProduct(id, updates);

    res.status(200).json({
      data: product,
      message: 'Product updated successfully',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error instanceof Error && error.message === 'Product not found') {
      res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update product',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

export default router;