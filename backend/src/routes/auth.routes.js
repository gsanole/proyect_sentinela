const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const twoFactorService = require('../services/twoFactor.service');
const emailVerificationService = require('../services/emailVerification.service');
const { authenticate } = require('../middleware/auth');
const { requireEmailVerified } = require('../middleware/rbac');
const { isValidEmail, isStrongPassword, isValidPhone } = require('../utils/validation');
const { 
  loginLimiter, 
  registrationLimiter, 
  passwordResetLimiter, 
  sensitiveLimiter,
  checkAccountLock 
} = require('../middleware/rateLimiter');

// POST /api/v1/auth/register/buyer - Register as buyer
router.post('/register/buyer', registrationLimiter, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email, password, first name, and last name are required' }
      });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' }
      });
    }

    // Validate password strength
    const passwordValidation = isStrongPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { message: passwordValidation.message }
      });
    }

    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid phone number format' }
      });
    }

    const result = await authService.registerBuyer({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim()
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/register/artist - Register as artist (requires invite code)
router.post('/register/artist', registrationLimiter, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, inviteCode, bio, portfolioUrl } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !inviteCode) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email, password, first name, last name, and invite code are required' }
      });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' }
      });
    }

    // Validate password strength
    const passwordValidation = isStrongPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { message: passwordValidation.message }
      });
    }

    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid phone number format' }
      });
    }

    const result = await authService.registerArtist({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      inviteCode: inviteCode.trim(),
      bio: bio?.trim(),
      portfolioUrl: portfolioUrl?.trim()
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login - Login
router.post('/login', loginLimiter, checkAccountLock, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
    }

    const result = await authService.login(email.toLowerCase().trim(), password, req);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/verify-2fa - Verify 2FA code
router.post('/verify-2fa', loginLimiter, async (req, res, next) => {
  try {
    const { userId, code, useBackupCode } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: { message: 'User ID and code are required' }
      });
    }

    const result = await authService.verify2FA(userId, code, useBackupCode, req);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout - Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    const refreshToken = req.headers['x-refresh-token'] || req.body.refreshToken;

    const result = await authService.logout(req.user.id, sessionToken, refreshToken);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh-token - Refresh access token using refresh token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token is required' }
      });
    }

    const result = await authService.refreshAccessToken(refreshToken, req);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh - Deprecated: Use /refresh-token instead
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    // Generate new token with current user data
    const token = authService.generateToken(req.user);

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/forgot-password - Request password reset
router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email is required' }
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' }
      });
    }

    const result = await authService.requestPasswordReset(email.toLowerCase().trim());

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/reset-password - Reset password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token and new password are required' }
      });
    }

    // Validate password strength
    const passwordValidation = isStrongPassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { message: passwordValidation.message }
      });
    }

    const result = await authService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/change-password - Change password (authenticated)
router.post('/change-password', authenticate, sensitiveLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password and new password are required' }
      });
    }

    // Validate password strength
    const passwordValidation = isStrongPassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { message: passwordValidation.message }
      });
    }

    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      req
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/verify-email - Verify email with token
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Verification token is required' }
      });
    }

    const user = await emailVerificationService.verifyEmail(token);

    // Generate JWT token now that email is verified
    const jwtToken = authService.generateToken(user);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: { user, token: jwtToken }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email is required' }
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' }
      });
    }

    const result = await emailVerificationService.resendVerificationEmail(email.toLowerCase().trim());

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/2fa/enable - Enable 2FA (requires authentication and verified email)
router.post('/2fa/enable', authenticate, requireEmailVerified, async (req, res, next) => {
  try {
    const result = await twoFactorService.enable2FA(req.user.id);

    res.json({
      success: true,
      message: '2FA enabled successfully. Save your backup codes in a safe place.',
      data: {
        backupCodes: result.backupCodes
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/2fa/disable - Disable 2FA
router.post('/2fa/disable', authenticate, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password is required to disable 2FA' }
      });
    }

    // Verify password before disabling 2FA
    const bcrypt = require('bcryptjs');
    const pool = require('../config/database');
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, result.rows[0].password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid password' }
      });
    }

    await twoFactorService.disable2FA(req.user.id);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/2fa/status - Check 2FA status
router.get('/2fa/status', authenticate, async (req, res, next) => {
  try {
    const enabled = await twoFactorService.is2FAEnabled(req.user.id);

    res.json({
      success: true,
      data: { enabled }
    });
  } catch (error) {
    next(error);
  }
});

// DEV ONLY: Manually verify email without clicking link
// Remove this in production!
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/verify-email-manual', async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email is required' }
        });
      }

      const pool = require('../config/database');
      const result = await pool.query(
        'UPDATE users SET email_verified = true WHERE email = $1 RETURNING id, email, email_verified',
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      res.json({
        success: true,
        message: 'Email verified successfully (DEV MODE)',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = router;
