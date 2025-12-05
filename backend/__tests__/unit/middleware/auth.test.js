const { auth, requireRole } = require('../../../src/middleware/auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('auth middleware', () => {
    it('should authenticate valid token', async () => {
      const decoded = { id: 'user123', email: 'test@example.com', role: 'buyer' };
      req.header.mockReturnValue('Bearer valid-token');
      jwt.verify.mockReturnValue(decoded);

      await auth(req, res, next);

      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      req.header.mockReturnValue(undefined);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication required'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty token', async () => {
      req.header.mockReturnValue('Bearer ');

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication required'
        }
      });
    });

    it('should reject invalid token', async () => {
      req.header.mockReturnValue('Bearer invalid-token');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      req.header.mockReturnValue('Bearer expired-token');
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    });

    it('should handle malformed authorization header', async () => {
      req.header.mockReturnValue('InvalidFormat');

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    });

    it('should verify token with JWT_SECRET', async () => {
      process.env.JWT_SECRET = 'test-secret';
      req.header.mockReturnValue('Bearer valid-token');
      jwt.verify.mockReturnValue({ id: 'user123' });

      await auth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      req.user = { id: 'user123', role: 'buyer' };
    });

    it('should allow user with required role', () => {
      const middleware = requireRole('buyer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple required roles', () => {
      req.user.role = 'artist';
      const middleware = requireRole('artist', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      req.user.role = 'buyer';
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      req.user = undefined;
      const middleware = requireRole('buyer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple roles correctly', () => {
      req.user.role = 'buyer';
      const middleware = requireRole('artist', 'admin', 'buyer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should be case-sensitive for roles', () => {
      req.user.role = 'Buyer';
      const middleware = requireRole('buyer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
