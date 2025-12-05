const express = require('express');
const router = express.Router();
const SessionService = require('../services/session.service');
const LoginHistoryService = require('../services/loginHistory.service');
const SecurityAlertService = require('../services/securityAlert.service');
const { auth } = require('../middleware/auth');

const sessionService = new SessionService();
const loginHistoryService = new LoginHistoryService();
const securityAlertService = new SecurityAlertService();

/**
 * GET /api/v1/sessions
 * Get all active sessions for authenticated user
 */
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await sessionService.getActiveSessions(req.user.id);
    
    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch sessions'
      }
    });
  }
});

/**
 * DELETE /api/v1/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await sessionService.revokeSession(sessionId, req.user.id);
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    
    if (error.message === 'Session not found or unauthorized') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to revoke session'
      }
    });
  }
});

/**
 * DELETE /api/v1/sessions/others/all
 * Revoke all sessions except current
 */
router.delete('/others/all', auth, async (req, res) => {
  try {
    // Get current session token from request header
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_TOKEN',
          message: 'Session token required to revoke other sessions'
        }
      });
    }
    
    const revokedCount = await sessionService.revokeAllOtherSessions(
      req.user.id, 
      sessionToken
    );
    
    res.json({
      success: true,
      message: `${revokedCount} session(s) revoked successfully`
    });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to revoke sessions'
      }
    });
  }
});

/**
 * GET /api/v1/sessions/history
 * Get login history for authenticated user
 */
router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await loginHistoryService.getLoginHistory(req.user.id, limit);
    
    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch login history'
      }
    });
  }
});

/**
 * GET /api/v1/sessions/alerts
 * Get security alerts for authenticated user
 */
router.get('/alerts', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const alerts = await securityAlertService.getUserAlerts(req.user.id, limit);
    
    res.json({
      success: true,
      data: { alerts }
    });
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch security alerts'
      }
    });
  }
});

/**
 * PUT /api/v1/sessions/alerts/:alertId/acknowledge
 * Mark a security alert as acknowledged
 */
router.put('/alerts/:alertId/acknowledge', auth, async (req, res) => {
  try {
    const { alertId } = req.params;
    
    await securityAlertService.acknowledgeAlert(alertId, req.user.id);
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    
    if (error.message === 'Alert not found or unauthorized') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to acknowledge alert'
      }
    });
  }
});

module.exports = router;
