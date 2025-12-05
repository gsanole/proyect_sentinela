const crypto = require('crypto');
const pool = require('../config/database');
const { sendEmail } = require('../utils/email');

class EmailVerificationService {
  /**
   * Generate verification token
   */
  generateToken() {
    // Generate a simple 6-character alphanumeric code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like O, 0, I, 1
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId, email, firstName) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    // Send email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const subject = 'Verify Your Email - Art Hub Milwaukee';
    const html = `
      <h1>Welcome to Art Hub Milwaukee, ${firstName}!</h1>
      <p>Please verify your email address to activate your account:</p>
      <p>
        <a href="${verificationUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #1976d2; 
                  color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify Email Address
        </a>
      </p>
      <p>Or copy this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <p>Best regards,<br>Art Hub Milwaukee Team</p>
    `;

    // Try to send email, but don't fail if it doesn't work in development
    try {
      await sendEmail(email, subject, html);
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError.message);
      if (process.env.NODE_ENV !== 'development') {
        throw emailError; // Only throw in production
      }
      console.log('⚠️  Email sending failed, but continuing in development mode');
    }

    // In development mode, log the verification token to console
    if (process.env.NODE_ENV === 'development') {
      console.log('\n========================================');
      console.log('📧 EMAIL VERIFICATION');
      console.log('========================================');
      console.log('Email:', email);
      console.log('Name:', firstName);
      console.log('Token:', token);
      console.log('API Endpoint:', `POST http://localhost:5000/api/v1/auth/verify-email`);
      console.log('Request Body:', JSON.stringify({ token }, null, 2));
      console.log('Expires:', expiresAt.toLocaleString());
      console.log('========================================\n');
    }

    return { token, expiresAt };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    const result = await pool.query(
      `SELECT user_id FROM email_verification_tokens 
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification token');
    }

    const { user_id } = result.rows[0];

    // Mark user as verified
    await pool.query(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
      [user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1',
      [token]
    );

    // Get updated user
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, email_verified FROM users WHERE id = $1',
      [user_id]
    );

    return userResult.rows[0];
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    const result = await pool.query(
      `SELECT id, first_name, email_verified FROM users 
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists
      return { message: 'If an account exists, a verification email will be sent' };
    }

    const user = result.rows[0];

    if (user.email_verified) {
      throw new Error('Email is already verified');
    }

    // Delete old tokens
    await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

    // Send new verification email
    await this.sendVerificationEmail(user.id, email, user.first_name);

    return { message: 'Verification email sent' };
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(userId) {
    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows.length > 0 && result.rows[0].email_verified;
  }
}

module.exports = new EmailVerificationService();
