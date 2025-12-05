const pool = require('../config/database');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

class SessionService {
  /**
   * Create a new session
   */
  async createSession(userId, refreshTokenId, req) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const deviceInfo = this.parseDeviceInfo(req);
    const location = this.getLocation(req.ip);
    
    const result = await pool.query(
      `INSERT INTO user_sessions (
        user_id, session_token, refresh_token_id,
        device_name, device_type, browser, os,
        ip_address, location, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '30 days')
      RETURNING *`,
      [
        userId,
        sessionToken,
        refreshTokenId,
        deviceInfo.deviceName,
        deviceInfo.deviceType,
        deviceInfo.browser,
        deviceInfo.os,
        req.ip,
        JSON.stringify(location)
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId) {
    const result = await pool.query(
      `SELECT 
        id,
        device_name,
        device_type,
        browser,
        os,
        ip_address,
        location,
        last_activity,
        created_at,
        (session_token = $2) as is_current
      FROM user_sessions
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY last_activity DESC`,
      [userId, null] // TODO: pass current session token
    );
    
    return result.rows;
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionToken) {
    await pool.query(
      `UPDATE user_sessions 
       SET last_activity = NOW() 
       WHERE session_token = $1`,
      [sessionToken]
    );
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId, userId) {
    const result = await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [sessionId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or unauthorized');
    }
    
    // Also revoke the refresh token
    if (result.rows[0].refresh_token_id) {
      await pool.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`,
        [result.rows[0].refresh_token_id]
      );
    }
    
    return result.rows[0];
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(userId, currentSessionToken) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all sessions except current
      const sessions = await client.query(
        `SELECT id, refresh_token_id 
         FROM user_sessions 
         WHERE user_id = $1 AND session_token != $2 AND is_active = TRUE`,
        [userId, currentSessionToken]
      );
      
      // Deactivate sessions
      await client.query(
        `UPDATE user_sessions 
         SET is_active = FALSE 
         WHERE user_id = $1 AND session_token != $2`,
        [userId, currentSessionToken]
      );
      
      // Revoke refresh tokens
      const refreshTokenIds = sessions.rows
        .map(s => s.refresh_token_id)
        .filter(id => id);
      
      if (refreshTokenIds.length > 0) {
        await client.query(
          `UPDATE refresh_tokens 
           SET revoked = TRUE 
           WHERE id = ANY($1)`,
          [refreshTokenIds]
        );
      }
      
      await client.query('COMMIT');
      
      return { revokedCount: sessions.rows.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Parse device info from request
   */
  parseDeviceInfo(req) {
    const ua = new UAParser(req.headers['user-agent']);
    const result = ua.getResult();
    
    return {
      deviceName: `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`,
      deviceType: result.device.type || 'desktop',
      browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim()
    };
  }

  /**
   * Get location from IP address
   */
  getLocation(ip) {
    // Skip for localhost/private IPs
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { city: 'Local', country: 'Local', region: 'Local' };
    }
    
    const geo = geoip.lookup(ip);
    if (!geo) {
      return { city: 'Unknown', country: 'Unknown', region: 'Unknown' };
    }
    
    return {
      city: geo.city || 'Unknown',
      country: geo.country || 'Unknown',
      region: geo.region || 'Unknown'
    };
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE 
       WHERE expires_at < NOW() AND is_active = TRUE`
    );
  }
}

module.exports = SessionService;
