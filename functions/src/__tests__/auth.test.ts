import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { authConfig } from '../config/auth';

// Mock the auth config
jest.mock('../config/auth', () => ({
  authConfig: {
    verifyIdToken: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should reject request without authorization header', async () => {
      await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: expect.any(String),
          request_id: expect.any(String),
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: expect.any(String),
          request_id: expect.any(String),
        },
      });
    });

    it('should verify valid token and set user context', async () => {
      const mockDecodedToken = {
        uid: 'test-user-id',
        email: 'test@example.com',
        role: 'clinic_admin',
        clinic_id: 'test-clinic-id',
        permissions: ['read_inventory', 'create_patient'],
      };

      mockRequest.headers = { authorization: 'Bearer valid-token' };
      
      (authConfig.verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);

      await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(authConfig.verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        uid: 'test-user-id',
        email: 'test@example.com',
        role: 'clinic_admin',
        clinic_id: 'test-clinic-id',
        permissions: ['read_inventory', 'create_patient'],
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      
      (authConfig.verifyIdToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          timestamp: expect.any(String),
          request_id: expect.any(String),
        },
      });
    });
  });
});