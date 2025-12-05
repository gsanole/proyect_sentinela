const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendEmail } = require('../utils/email');
const SessionService = require('./session.service');
const RefreshTokenService = require('./refreshToken.service');
const LoginHistoryService = require('./loginHistory.service');
const SecurityAlertService = require('./securityAlert.service');

class AuthService {
  constructor() {
    this.sessionService = new SessionService();
    this.refreshTokenService = new RefreshTokenService();
    this.loginHistoryService = new LoginHistoryService();
    this.securityAlertService = new SecurityAlertService();
  }
  /**
   * Register a new buyer
   */
  async registerBuyer(userData) {
    const { email, password, firstName, lastName, phone } = userData;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'buyer')
       RETURNING id, email, first_name, last_name, phone, role, created_at`,
      [email, hashedPassword, firstName, lastName, phone]
    );

    const user = result.rows[0];

    // Send email verification (non-blocking)
    const emailVerificationService = require('./emailVerification.service');
    emailVerificationService.sendVerificationEmail(user.id, user.email, user.first_name)
      .catch(console.error);

    // Note: Token will be provided after email verification
    return { 
      user: { ...user, email_verified: false }, 
      message: 'Registration successful. Please check your email to verify your account.',
      requiresEmailVerification: true
    };
  }

  /**
   * Register a new artist with invite code
   */
  async registerArtist(userData) {
    const { email, password, firstName, lastName, phone, inviteCode, bio, portfolioUrl } = userData;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify invite code
      const inviteResult = await client.query(
        `SELECT id, used_by, expires_at FROM invite_codes 
         WHERE code = $1 FOR UPDATE`,
        [inviteCode]
      );

      if (inviteResult.rows.length === 0) {
        throw new Error('Invalid invite code');
      }

      const invite = inviteResult.rows[0];

      if (invite.used_by) {
        throw new Error('Invite code has already been used');
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('Invite code has expired');
      }

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
         VALUES ($1, $2, $3, $4, $5, 'artist')
         RETURNING id, email, first_name, last_name, phone, role, created_at`,
        [email, hashedPassword, firstName, lastName, phone]
      );

      const user = userResult.rows[0];

      // Create artist profile
      const artistResult = await client.query(
        `INSERT INTO artist_profiles (user_id, bio, portfolio_url, approval_status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id, bio, portfolio_url, approval_status, created_at`,
        [user.id, bio, portfolioUrl]
      );

      const artistProfile = artistResult.rows[0];

      // Mark invite code as used
      await client.query(
        'UPDATE invite_codes SET used_by = $1, used_at = NOW() WHERE id = $2',
        [user.id, invite.id]
      );

      await client.query('COMMIT');

      // Send email verification (non-blocking)
      const emailVerificationService = require('./emailVerification.service');
      emailVerificationService.sendVerificationEmail(user.id, user.email, user.first_name)
        .catch(console.error);

      return { 
        user: { ...user, artistProfile, email_verified: false },
        message: 'Registration successful. Please check your email to verify your account.',
        requiresEmailVerification: true
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Login user
   */
  async login(email, password, req) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Get user with password hash
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
              u.phone, u.role, u.is_active, u.email_verified, u.two_factor_enabled, u.created_at,
              u.failed_login_attempts, u.account_locked_until,
              ap.id as artist_profile_id, ap.bio, ap.portfolio_url, 
              ap.approval_status, ap.stripe_account_id
       FROM users u
       LEFT JOIN artist_profiles ap ON u.id = ap.user_id
       WHERE u.email = $1`,
      [email]
    );

    const deviceInfo = this.sessionService.parseDeviceInfo(req);
    const location = this.sessionService.getLocation(ipAddress);

    if (result.rows.length === 0) {
      // Log failed attempt
      await this.loginHistoryService.logLoginAttempt(
        email, null, false, ipAddress, userAgent, deviceInfo, location, 'Invalid credentials'
      );

      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      await this.loginHistoryService.logLoginAttempt(
        email, user.id, false, ipAddress, userAgent, deviceInfo, location, 'Account locked'
      );
      throw new Error('Account temporarily locked due to multiple failed login attempts');
    }

    // Check if account is active
    if (!user.is_active) {
      await this.loginHistoryService.logLoginAttempt(
        email, user.id, false, ipAddress, userAgent, deviceInfo, location, 'Account deactivated'
      );
      throw new Error('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      // Increment failed attempts
      await pool.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             account_locked_until = CASE 
               WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
               ELSE NULL
             END
         WHERE id = $1`,
        [user.id]
      );

      // Log failed attempt
      await this.loginHistoryService.logLoginAttempt(
        email, user.id, false, ipAddress, userAgent, deviceInfo, location, 'Invalid password'
      );

      // Send alert after 5 failed attempts
      const recentFailedAttempts = await this.loginHistoryService.getRecentFailedAttempts(email, 15);
      if (recentFailedAttempts >= 5) {
        await this.securityAlertService.sendFailedAttemptsAlert(email, recentFailedAttempts, ipAddress);
      }

      throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (!user.email_verified) {
      await this.loginHistoryService.logLoginAttempt(
        email, user.id, false, ipAddress, userAgent, deviceInfo, location, 'Email not verified'
      );
      throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      // Send OTP code
      const twoFactorService = require('./twoFactor.service');
      await twoFactorService.sendOTPCode(user.id, user.email, user.first_name);
      
      return {
        requires2FA: true,
        userId: user.id,
        message: 'Please enter the verification code sent to your email'
      };
    }

    // Login successful - complete login process
    return await this.completeLogin(user, req);
  }

  /**
   * Complete login process (called after password validation or 2FA)
   */
  async completeLogin(user, req) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const deviceInfo = this.sessionService.parseDeviceInfo(req);
    const location = this.sessionService.getLocation(ipAddress);

    // Remove password hash from response
    const { password_hash, failed_login_attempts, account_locked_until, ...userWithoutPassword } = user;

    // If artist, include profile
    if (user.role === 'artist' && user.artist_profile_id) {
      userWithoutPassword.artistProfile = {
        id: user.artist_profile_id,
        bio: user.bio,
        portfolioUrl: user.portfolio_url,
        approvalStatus: user.approval_status,
        stripeAccountId: user.stripe_account_id
      };

      // Clean up flat fields
      delete userWithoutPassword.artist_profile_id;
      delete userWithoutPassword.bio;
      delete userWithoutPassword.portfolio_url;
      delete userWithoutPassword.approval_status;
      delete userWithoutPassword.stripe_account_id;
    }

    // Generate refresh token
    const refreshTokenData = await this.refreshTokenService.generateRefreshToken(
      user.id, deviceInfo, ipAddress, userAgent
    );

    // Create session
    const session = await this.sessionService.createSession(
      user.id, refreshTokenData.id, req
    );

    // Reset failed login attempts and update last login
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           account_locked_until = NULL,
           last_login = NOW(),
           last_ip = $1
       WHERE id = $2`,
      [ipAddress, user.id]
    );

    // Log successful login
    await this.loginHistoryService.logLoginAttempt(
      user.email, user.id, true, ipAddress, userAgent, deviceInfo, location
    );

    // Check for security alerts
    const isNewDevice = await this.loginHistoryService.isNewDevice(user.id, deviceInfo);
    const isSuspiciousIP = await this.loginHistoryService.isSuspiciousIP(user.id, ipAddress);

    if (isNewDevice) {
      await this.securityAlertService.sendNewDeviceAlert(
        { id: user.id, email: user.email, first_name: user.first_name },
        deviceInfo,
        ipAddress,
        location
      );
    }

    if (isSuspiciousIP && !isNewDevice) { // Only alert for suspicious IP if not already alerting for new device
      await this.securityAlertService.sendSuspiciousIPAlert(
        { id: user.id, email: user.email, first_name: user.first_name },
        ipAddress,
        location
      );
    }

    // Generate JWT token
    const token = this.generateToken(userWithoutPassword);

    return { 
      user: userWithoutPassword, 
      token,
      refreshToken: refreshTokenData.token,
      sessionToken: session.session_token
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const result = await pool.query(
      'SELECT id, first_name FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return { message: 'If an account exists, a reset link will be sent' };
    }

    const user = result.rows[0];

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email (non-blocking)
    this.sendPasswordResetEmail(email, user.first_name, resetToken).catch(console.error);

    return { message: 'If an account exists, a reset link will be sent' };
  }

  /**
   * Reset password
   */
  async resetPassword(resetToken, newPassword) {
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id`,
      [hashedPassword, decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found or inactive');
    }

    return { message: 'Password successfully reset' };
  }

  /**
   * Verify 2FA code and complete login
   */
  async verify2FA(userId, code, useBackupCode = false, req) {
    const twoFactorService = require('./twoFactor.service');
    
    // Verify code
    if (useBackupCode) {
      await twoFactorService.verifyBackupCode(userId, code);
    } else {
      await twoFactorService.verifyOTPCode(userId, code);
    }

    // Get user data
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.password_hash,
              u.phone, u.role, u.is_active, u.created_at,
              ap.id as artist_profile_id, ap.bio, ap.portfolio_url, 
              ap.approval_status, ap.stripe_account_id
       FROM users u
       LEFT JOIN artist_profiles ap ON u.id = ap.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Complete login with session/refresh token creation
    return await this.completeLogin(user, req);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, req) {
    try {
      // Validate refresh token
      const tokenData = await this.refreshTokenService.validateRefreshToken(refreshToken);
      
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const deviceInfo = this.sessionService.parseDeviceInfo(req);

      // Rotate refresh token (revoke old, create new)
      const newRefreshToken = await this.refreshTokenService.rotateRefreshToken(
        refreshToken, deviceInfo, ipAddress, userAgent
      );

      // Get user data
      const result = await pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, 
                u.phone, u.role, u.is_active, u.created_at,
                ap.id as artist_profile_id, ap.bio, ap.portfolio_url, 
                ap.approval_status, ap.stripe_account_id
         FROM users u
         LEFT JOIN artist_profiles ap ON u.id = ap.user_id
         WHERE u.id = $1`,
        [tokenData.user_id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      const { ...userWithoutPassword } = user;

      // If artist, format profile
      if (user.role === 'artist' && user.artist_profile_id) {
        userWithoutPassword.artistProfile = {
          id: user.artist_profile_id,
          bio: user.bio,
          portfolioUrl: user.portfolio_url,
          approvalStatus: user.approval_status,
          stripeAccountId: user.stripe_account_id
        };
        delete userWithoutPassword.artist_profile_id;
        delete userWithoutPassword.bio;
        delete userWithoutPassword.portfolio_url;
        delete userWithoutPassword.approval_status;
        delete userWithoutPassword.stripe_account_id;
      }

      // Generate new JWT
      const token = this.generateToken(userWithoutPassword);

      return {
        token,
        refreshToken: newRefreshToken.token,
        user: userWithoutPassword
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user - revoke refresh token and session
   */
  async logout(userId, sessionToken, refreshToken) {
    try {
      // Revoke refresh token
      if (refreshToken) {
        await this.refreshTokenService.revokeRefreshToken(refreshToken);
      }

      // Deactivate session
      if (sessionToken) {
        const sessionResult = await pool.query(
          'SELECT id FROM user_sessions WHERE session_token = $1 AND user_id = $2',
          [sessionToken, userId]
        );
        
        if (sessionResult.rows.length > 0) {
          await this.sessionService.revokeSession(sessionResult.rows[0].id, userId);
        }
      }

      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error on logout - best effort
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId, currentPassword, newPassword, req) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const location = this.sessionService.getLocation(ipAddress);

    // Get current password hash and user info
    const result = await pool.query(
      'SELECT password_hash, email, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const { password_hash, email, first_name } = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    // Send security alert
    await this.securityAlertService.sendPasswordChangeAlert(
      { id: userId, email, first_name },
      ipAddress,
      location
    );

    // Revoke all refresh tokens (force re-login on all devices)
    await this.refreshTokenService.revokeAllUserTokens(userId);

    return { message: 'Password successfully changed. Please log in again on all devices.' };
  }

  /**
   * Send welcome email to buyer
   */
  async sendWelcomeEmail(email, firstName) {
    const subject = 'Welcome to Art Hub Milwaukee!';
    const html = `
      <h1>Welcome, ${firstName}!</h1>
      <p>Thank you for joining Art Hub Milwaukee, your curated marketplace for local art.</p>
      <p>Start exploring amazing artwork from talented Milwaukee artists!</p>
      <p>Happy collecting!</p>
    `;

    return sendEmail(email, subject, html);
  }

  /**
   * Send welcome email to artist
   */
  async sendArtistWelcomeEmail(email, firstName) {
    const subject = 'Welcome to Art Hub Milwaukee - Artist Application Received';
    const html = `
      <h1>Welcome, ${firstName}!</h1>
      <p>Thank you for joining Art Hub Milwaukee as an artist!</p>
      <p>Your application is currently under review. Our team will review your profile and get back to you within 2-3 business days.</p>
      <p>Once approved, you'll be able to start listing your artwork for sale.</p>
      <p>Best regards,<br>Art Hub Milwaukee Team</p>
    `;

    return sendEmail(email, subject, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, firstName, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password - Art Hub Milwaukee';
    const html = `
      <h1>Hi ${firstName},</h1>
      <p>You requested to reset your password for Art Hub Milwaukee.</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Art Hub Milwaukee Team</p>
    `;

    return sendEmail(email, subject, html);
  }
}

module.exports = new AuthService();
