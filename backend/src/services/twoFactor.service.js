const crypto = require('crypto');
const pool = require('../config/database');

class TwoFactorService {
  /**
   * Generate TOTP secret for a user
   */
  generateSecret() {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Generate a 6-digit OTP code
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId) {
    const secret = this.generateSecret();
    
    await pool.query(
      `UPDATE users 
       SET two_factor_secret = $1, two_factor_enabled = true, updated_at = NOW()
       WHERE id = $2`,
      [secret, userId]
    );

    // Generate backup codes (8 codes)
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store hashed backup codes
    const bcrypt = require('bcryptjs');
    for (const code of backupCodes) {
      const hashedCode = await bcrypt.hash(code, 10);
      await pool.query(
        'INSERT INTO two_factor_backup_codes (user_id, code_hash) VALUES ($1, $2)',
        [userId, hashedCode]
      );
    }

    return { secret, backupCodes };
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE users 
         SET two_factor_secret = NULL, two_factor_enabled = false, updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      await client.query(
        'DELETE FROM two_factor_backup_codes WHERE user_id = $1',
        [userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send OTP code via email
   */
  async sendOTPCode(userId, email, firstName) {
    const code = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP code
    await pool.query(
      `INSERT INTO two_factor_codes (user_id, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
      [userId, code, expiresAt]
    );

    // Send email
    const { sendEmail } = require('../utils/email');
    const subject = 'Your 2FA Verification Code - Art Hub Milwaukee';
    const html = `
      <h1>Hi ${firstName},</h1>
      <p>Your verification code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${code}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email and secure your account.</p>
      <p>Best regards,<br>Art Hub Milwaukee Team</p>
    `;

    await sendEmail(email, subject, html);
    return { expiresAt };
  }

  /**
   * Verify OTP code
   */
  async verifyOTPCode(userId, code) {
    const result = await pool.query(
      `SELECT code, expires_at FROM two_factor_codes 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { code: storedCode } = result.rows[0];

    if (code !== storedCode) {
      throw new Error('Invalid verification code');
    }

    // Delete used code
    await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [userId]);

    return true;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    const bcrypt = require('bcryptjs');
    
    const result = await pool.query(
      'SELECT id, code_hash FROM two_factor_backup_codes WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    for (const row of result.rows) {
      const isValid = await bcrypt.compare(code, row.code_hash);
      if (isValid) {
        // Mark as used
        await pool.query(
          'UPDATE two_factor_backup_codes SET used_at = NOW() WHERE id = $1',
          [row.id]
        );
        return true;
      }
    }

    throw new Error('Invalid backup code');
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId) {
    const result = await pool.query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows.length > 0 && result.rows[0].two_factor_enabled;
  }
}

module.exports = new TwoFactorService();
