const pool = require('../config/database');

class LoginHistoryService {
  /**
   * Log a login attempt
   */
  async logLoginAttempt(email, userId, success, ipAddress, userAgent, deviceInfo, location, failureReason = null) {
    await pool.query(
      `INSERT INTO login_history (
        user_id, email, success, ip_address, user_agent, 
        device_info, location, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        email,
        success,
        ipAddress,
        userAgent,
        JSON.stringify(deviceInfo),
        JSON.stringify(location),
        failureReason
      ]
    );
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId, limit = 50) {
    const result = await pool.query(
      `SELECT 
        id,
        success,
        ip_address,
        device_info,
        location,
        failure_reason,
        created_at
      FROM login_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get failed login attempts for an email (for rate limiting)
   */
  async getRecentFailedAttempts(email, minutesAgo = 15) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM login_history
       WHERE email = $1 
       AND success = FALSE 
       AND created_at > NOW() - INTERVAL '${minutesAgo} minutes'`,
      [email]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Check if login is from a new device
   */
  async isNewDevice(userId, deviceInfo) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM login_history
       WHERE user_id = $1 
       AND success = TRUE
       AND device_info::text LIKE $2
       LIMIT 1`,
      [userId, `%${deviceInfo.browser}%`]
    );

    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Check if IP is suspicious (new location)
   */
  async isSuspiciousIP(userId, ipAddress) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM login_history
       WHERE user_id = $1 
       AND success = TRUE
       AND ip_address = $2
       LIMIT 1`,
      [userId, ipAddress]
    );

    return parseInt(result.rows[0].count) === 0;
  }
}

module.exports = LoginHistoryService;
