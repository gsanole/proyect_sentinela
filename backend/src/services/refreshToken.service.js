const pool = require('../config/database');
const crypto = require('crypto');

class RefreshTokenService {
  /**
   * Generate a new refresh token
   */
  async generateRefreshToken(userId, deviceInfo, ipAddress, userAgent) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const result = await pool.query(
      `INSERT INTO refresh_tokens (
        user_id, token, device_info, ip_address, user_agent, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [userId, token, JSON.stringify(deviceInfo), ipAddress, userAgent, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Validate and get refresh token
   */
  async validateRefreshToken(token) {
    const result = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    return result.rows[0];
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
      [token]
    );
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Rotate refresh token (revoke old, create new)
   */
  async rotateRefreshToken(oldToken, deviceInfo, ipAddress, userAgent) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate old token
      const oldTokenData = await this.validateRefreshToken(oldToken);

      // Revoke old token
      await client.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
        [oldToken]
      );

      // Generate new token
      const newToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const result = await client.query(
        `INSERT INTO refresh_tokens (
          user_id, token, device_info, ip_address, user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [oldTokenData.user_id, newToken, JSON.stringify(deviceInfo), ipAddress, userAgent, expiresAt]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens() {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE 
       WHERE expires_at < NOW() AND revoked = FALSE`
    );
  }
}

module.exports = RefreshTokenService;
