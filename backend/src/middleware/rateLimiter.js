const rateLimit = require('express-rate-limit');
const pool = require('../config/database');

/**
 * Login rate limiter - 5 attempts per 15 minutes
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + email as key
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.email || 'unknown'}`;
  }
});

/**
 * General API rate limiter - 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Sensitive operations limiter - 3 attempts per hour
 */
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again in an hour.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Password reset limiter - 3 attempts per hour per email
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again in an hour.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.email || 'unknown'}`;
  }
});

/**
 * Registration limiter - 3 registrations per hour per IP
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again in an hour.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Check if user account is locked
 */
const checkAccountLock = async (req, res, next) => {
  if (!req.body.email) {
    return next();
  }

  try {
    const result = await pool.query(
      `SELECT account_locked_until, failed_login_attempts 
       FROM users 
       WHERE email = $1`,
      [req.body.email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account temporarily locked due to multiple failed login attempts. Please try again later.'
          }
        });
      }

      // Lock account after 5 failed attempts
      if (user.failed_login_attempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Lock for 30 minutes

        await pool.query(
          `UPDATE users 
           SET account_locked_until = $1 
           WHERE email = $2`,
          [lockUntil, req.body.email]
        );

        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account locked due to multiple failed login attempts. Please try again in 30 minutes.'
          }
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginLimiter,
  apiLimiter,
  sensitiveLimiter,
  passwordResetLimiter,
  registrationLimiter,
  checkAccountLock
};
