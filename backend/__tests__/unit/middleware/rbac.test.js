const {
  requireRole,
  requireEmailVerified,
  requireArtistApproved,
  requireRoleAndVerified
} = require('../../../src/middleware/rbac');
const emailVerificationService = require('../../../src/services/emailVerification.service');
const pool = require('../../../src/config/database');

jest.mock('../../../src/services/emailVerification.service');
jest.mock('../../../src/config/database');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      req.user = { id: 'user123', role: 'admin' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple roles', () => {
      req.user = { id: 'user123', role: 'artist' };
      const middleware = requireRole('artist', 'admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user without required role', () => {
      req.user = { id: 'user123', role: 'buyer' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. Insufficient permissions.',
          requiredRole: ['admin'],
          currentRole: 'buyer'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated request', () => {
      req.user = null;
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Authentication required' }
      });
    });

    it('should handle multiple required roles', () => {
      req.user = { id: 'user123', role: 'buyer' };
      const middleware = requireRole('artist', 'admin', 'buyer');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should include all required roles in error message', () => {
      req.user = { id: 'user123', role: 'buyer' };
      const middleware = requireRole('artist', 'admin');

      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. Insufficient permissions.',
          requiredRole: ['artist', 'admin'],
          currentRole: 'buyer'
        }
      });
    });
  });

  describe('requireEmailVerified', () => {
    beforeEach(() => {
      req.user = { id: 'user123', role: 'buyer' };
    });

    it('should allow verified users', async () => {
      emailVerificationService.isEmailVerified.mockResolvedValue(true);

      await requireEmailVerified(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny unverified users', async () => {
      emailVerificationService.isEmailVerified.mockResolvedValue(false);

      await requireEmailVerified(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Email verification required. Please check your email and verify your account.',
          requiresEmailVerification: true
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated requests', async () => {
      req.user = null;

      await requireEmailVerified(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Authentication required' }
      });
    });

    it('should check verification status with user ID', async () => {
      emailVerificationService.isEmailVerified.mockResolvedValue(true);

      await requireEmailVerified(req, res, next);

      expect(emailVerificationService.isEmailVerified).toHaveBeenCalledWith('user123');
    });
  });

  describe('requireArtistApproved', () => {
    beforeEach(() => {
      req.user = { id: 'artist123', role: 'artist' };
    });

    it('should allow approved artists', async () => {
      pool.query.mockResolvedValue({
        rows: [{ approval_status: 'approved' }]
      });

      await requireArtistApproved(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny pending artists', async () => {
      pool.query.mockResolvedValue({
        rows: [{ approval_status: 'pending' }]
      });

      await requireArtistApproved(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Your artist account is pending approval. You will be notified once approved.',
          approvalStatus: 'pending'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny rejected artists', async () => {
      pool.query.mockResolvedValue({
        rows: [{ approval_status: 'rejected' }]
      });

      await requireArtistApproved(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Your artist account is pending approval. You will be notified once approved.',
          approvalStatus: 'rejected'
        }
      });
    });

    it('should deny non-artist users', async () => {
      req.user.role = 'buyer';

      await requireArtistApproved(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Artist account required' }
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated requests', async () => {
      req.user = null;

      await requireArtistApproved(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Authentication required' }
      });
    });

    it('should deny artists without profile', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await requireArtistApproved(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Artist profile not found' }
      });
    });

    it('should query with correct user ID', async () => {
      pool.query.mockResolvedValue({
        rows: [{ approval_status: 'approved' }]
      });

      await requireArtistApproved(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT approval_status FROM artist_profiles'),
        ['artist123']
      );
    });
  });

  describe('requireRoleAndVerified', () => {
    it('should return array of middleware functions', () => {
      const middleware = requireRoleAndVerified('buyer');

      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(2);
    });

    it('should include requireRole middleware', () => {
      const middleware = requireRoleAndVerified('buyer');
      req.user = { id: 'user123', role: 'admin' };

      middleware[0](req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should include requireEmailVerified middleware', () => {
      const middleware = requireRoleAndVerified('buyer');

      expect(middleware[1]).toBe(requireEmailVerified);
    });

    it('should work with multiple roles', () => {
      const middleware = requireRoleAndVerified('buyer', 'artist');
      req.user = { id: 'user123', role: 'artist' };

      middleware[0](req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
