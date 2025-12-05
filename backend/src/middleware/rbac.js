/**
 * Role-based access control middleware
 */

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'Access denied. Insufficient permissions.',
          requiredRole: allowedRoles,
          currentRole: req.user.role
        }
      });
    }

    next();
  };
};

/**
 * Email verification required middleware
 */
const requireEmailVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' }
    });
  }

  const emailVerificationService = require('../services/emailVerification.service');
  const isVerified = await emailVerificationService.isEmailVerified(req.user.id);

  if (!isVerified) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Email verification required. Please check your email and verify your account.',
        requiresEmailVerification: true
      }
    });
  }

  next();
};

/**
 * Artist approval required middleware
 */
const requireArtistApproved = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' }
    });
  }

  if (req.user.role !== 'artist') {
    return res.status(403).json({
      success: false,
      error: { message: 'Artist account required' }
    });
  }

  const pool = require('../config/database');
  const result = await pool.query(
    'SELECT approval_status FROM artist_profiles WHERE user_id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(403).json({
      success: false,
      error: { message: 'Artist profile not found' }
    });
  }

  const { approval_status } = result.rows[0];

  if (approval_status !== 'approved') {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Your artist account is pending approval. You will be notified once approved.',
        approvalStatus: approval_status
      }
    });
  }

  next();
};

/**
 * Combined middleware: require specific role AND email verification
 */
const requireRoleAndVerified = (...roles) => {
  return [requireRole(...roles), requireEmailVerified];
};

module.exports = {
  requireRole,
  requireEmailVerified,
  requireArtistApproved,
  requireRoleAndVerified
};
