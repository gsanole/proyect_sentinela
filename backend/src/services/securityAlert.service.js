const pool = require('../config/database');
const { sendEmail } = require('../utils/email');

class SecurityAlertService {
  /**
   * Create a security alert
   */
  async createAlert(userId, alertType, severity, details) {
    await pool.query(
      `INSERT INTO security_alerts (user_id, alert_type, severity, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, alertType, severity, JSON.stringify(details)]
    );
  }

  /**
   * Send new device login alert
   */
  async sendNewDeviceAlert(user, deviceInfo, ipAddress, location) {
    await this.createAlert(user.id, 'new_device', 'medium', {
      device: deviceInfo,
      ip: ipAddress,
      location
    });

    await sendEmail(
      user.email,
      'New Device Login Detected',
      `
        <h2>New Device Login</h2>
        <p>Hi ${user.first_name},</p>
        <p>We detected a login to your account from a new device:</p>
        <ul>
          <li><strong>Device:</strong> ${deviceInfo.deviceName}</li>
          <li><strong>Browser:</strong> ${deviceInfo.browser}</li>
          <li><strong>Location:</strong> ${location.city}, ${location.country}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this wasn't you, please secure your account immediately by changing your password.</p>
      `
    );
  }

  /**
   * Send suspicious IP alert
   */
  async sendSuspiciousIPAlert(user, ipAddress, location) {
    await this.createAlert(user.id, 'suspicious_ip', 'high', {
      ip: ipAddress,
      location
    });

    await sendEmail(
      user.email,
      'Suspicious Login Location Detected',
      `
        <h2>Unusual Login Location</h2>
        <p>Hi ${user.first_name},</p>
        <p>We detected a login from an unusual location:</p>
        <ul>
          <li><strong>Location:</strong> ${location.city}, ${location.country}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this wasn't you, your account may be compromised. Please change your password immediately.</p>
      `
    );
  }

  /**
   * Send multiple failed attempts alert
   */
  async sendFailedAttemptsAlert(email, attemptCount, ipAddress) {
    await sendEmail(
      email,
      'Multiple Failed Login Attempts',
      `
        <h2>Security Alert: Failed Login Attempts</h2>
        <p>We detected ${attemptCount} failed login attempts on your account.</p>
        <ul>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this wasn't you, your account may be under attack. Consider changing your password and enabling 2FA.</p>
      `
    );
  }

  /**
   * Send password change confirmation
   */
  async sendPasswordChangeAlert(user, ipAddress, location) {
    await this.createAlert(user.id, 'password_change', 'low', {
      ip: ipAddress,
      location
    });

    await sendEmail(
      user.email,
      'Password Changed Successfully',
      `
        <h2>Password Changed</h2>
        <p>Hi ${user.first_name},</p>
        <p>Your password was successfully changed.</p>
        <ul>
          <li><strong>Location:</strong> ${location.city}, ${location.country}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>If you didn't make this change, please contact support immediately.</p>
      `
    );
  }

  /**
   * Get user alerts
   */
  async getUserAlerts(userId, limit = 20) {
    const result = await pool.query(
      `SELECT * FROM security_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, userId) {
    await pool.query(
      `UPDATE security_alerts 
       SET acknowledged = TRUE 
       WHERE id = $1 AND user_id = $2`,
      [alertId, userId]
    );
  }
}

module.exports = SecurityAlertService;
