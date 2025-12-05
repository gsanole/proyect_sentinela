const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const analyticsService = require('../services/analytics.service');
const adminService = require('../services/admin.service');

// All admin routes require admin role
router.use(auth);
router.use(requireRole('admin'));

// Analytics - Dashboard Stats
router.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Analytics - Revenue Chart
router.get('/analytics/revenue-chart', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getRevenueChart(days);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

// Analytics - Top Artists
router.get('/analytics/top-artists', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const artists = await analyticsService.getTopArtists(limit);
    
    res.json({
      success: true,
      data: artists
    });
  } catch (error) {
    next(error);
  }
});

// Analytics - Recent Orders
router.get('/analytics/recent-orders', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const orders = await analyticsService.getRecentOrders(limit);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
});

// PLACEHOLDER - Keep existing routes below
router.get('/analytics/dashboard-old', async (req, res, next) => {
  try {
    const pool = require('../config/database');
    // Get total counts
    const usersResult = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');
    const artistsResult = await pool.query('SELECT COUNT(*) FROM artist_profiles WHERE approval_status = $1', ['approved']);
    const artPiecesResult = await pool.query('SELECT COUNT(*) FROM art_pieces WHERE approval_status = $1', ['approved']);
    const ordersResult = await pool.query('SELECT COUNT(*) FROM orders');
    
    // Get total revenue
    const revenueResult = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status != $1',
      ['cancelled']
    );
    
    // Get pending approvals
    const pendingArtistsResult = await pool.query(
      'SELECT COUNT(*) FROM artist_profiles WHERE approval_status = $1',
      ['pending']
    );
    const pendingArtResult = await pool.query(
      'SELECT COUNT(*) FROM art_pieces WHERE approval_status = $1',
      ['pending']
    );
    
    // Get recent activity (last 30 days)
    const recentOrdersResult = await pool.query(
      `SELECT COUNT(*) FROM orders 
       WHERE created_at > NOW() - INTERVAL '30 days'`
    );
    const recentUsersResult = await pool.query(
      `SELECT COUNT(*) FROM users 
       WHERE created_at > NOW() - INTERVAL '30 days'`
    );
    
    // Get top selling categories
    const topCategoriesResult = await pool.query(
      `SELECT c.name, COUNT(oi.id) as sales_count
       FROM categories c
       JOIN art_pieces ap ON c.id = ap.category_id
       JOIN order_items oi ON ap.id = oi.art_piece_id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled'
       GROUP BY c.id, c.name
       ORDER BY sales_count DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: parseInt(usersResult.rows[0].count),
          totalArtists: parseInt(artistsResult.rows[0].count),
          totalArtPieces: parseInt(artPiecesResult.rows[0].count),
          totalOrders: parseInt(ordersResult.rows[0].count),
          totalRevenue: parseFloat(revenueResult.rows[0].total_revenue)
        },
        pending: {
          artists: parseInt(pendingArtistsResult.rows[0].count),
          artPieces: parseInt(pendingArtResult.rows[0].count)
        },
        recentActivity: {
          ordersLast30Days: parseInt(recentOrdersResult.rows[0].count),
          usersLast30Days: parseInt(recentUsersResult.rows[0].count)
        },
        topCategories: topCategoriesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Analytics - Sales Data
router.get('/analytics/sales', async (req, res, next) => {
  try {
    const { period = '30days' } = req.query;
    
    let interval = '30 days';
    if (period === '7days') interval = '7 days';
    if (period === '90days') interval = '90 days';
    if (period === '1year') interval = '1 year';
    
    const salesData = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue
       FROM orders
       WHERE created_at > NOW() - INTERVAL '${interval}'
         AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: salesData.rows
    });
  } catch (error) {
    next(error);
  }
});

// Analytics - User Growth
router.get('/analytics/users', async (req, res, next) => {
  try {
    const { period = '30days' } = req.query;
    
    let interval = '30 days';
    if (period === '7days') interval = '7 days';
    if (period === '90days') interval = '90 days';
    if (period === '1year') interval = '1 year';
    
    const userData = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        SUM(CASE WHEN role = 'artist' THEN 1 ELSE 0 END) as new_artists,
        SUM(CASE WHEN role = 'buyer' THEN 1 ELSE 0 END) as new_buyers
       FROM users
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: userData.rows
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ARTISTS MANAGEMENT ====================

// Get all artists with filters
router.get('/artists', async (req, res, next) => {
  try {
    const { status, search, limit, offset } = req.query;
    const result = await adminService.getArtists({ status, search, limit, offset });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Approve artist
router.post('/artists/:id/approve', async (req, res, next) => {
  try {
    const result = await adminService.approveArtist(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Artist approved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Reject artist
router.post('/artists/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rejection reason is required' }
      });
    }
    
    const result = await adminService.rejectArtist(req.params.id, req.user.id, reason);
    
    res.json({
      success: true,
      message: 'Artist rejected'
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ART PIECES MANAGEMENT ====================

// Get all art pieces with filters
router.get('/art-pieces', async (req, res, next) => {
  try {
    const { status, artistId, categoryId, search, limit, offset } = req.query;
    const result = await adminService.getArtPieces({ status, artistId, categoryId, search, limit, offset });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Approve art piece
router.post('/art-pieces/:id/approve', async (req, res, next) => {
  try {
    const result = await adminService.approveArtPiece(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Art piece approved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Reject art piece
router.post('/art-pieces/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rejection reason is required' }
      });
    }
    
    const result = await adminService.rejectArtPiece(req.params.id, req.user.id, reason);
    
    res.json({
      success: true,
      message: 'Art piece rejected'
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ORDERS MANAGEMENT ====================

// Get all orders with filters
router.get('/orders', async (req, res, next) => {
  try {
    const { status, buyerId, artistId, search, limit, offset } = req.query;
    const result = await adminService.getOrders({ status, buyerId, artistId, search, limit, offset });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Update order status
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['pending_payment', 'paid', 'ready_for_pickup', 'picked_up', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status' }
      });
    }
    
    const result = await adminService.updateOrderStatus(req.params.id, status, req.user.id);
    
    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ==================== PAYOUTS MANAGEMENT ====================

// Get all payouts with filters
router.get('/payouts', async (req, res, next) => {
  try {
    const { status, artistId, limit, offset } = req.query;
    const result = await adminService.getPayouts({ status, artistId, limit, offset });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Process payout
router.post('/payouts/:id/process', async (req, res, next) => {
  try {
    const result = await adminService.processPayout(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Payout processed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ==================== INVITE CODES MANAGEMENT ====================

// Get all invite codes
router.get('/invite-codes', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await adminService.getInviteCodes({ status, limit, offset });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Generate new invite code
router.post('/invite-codes', async (req, res, next) => {
  try {
    const { maxUses, expiresInDays } = req.body;
    const result = await adminService.generateInviteCode(req.user.id, { maxUses, expiresInDays });
    
    res.json({
      success: true,
      data: result,
      message: 'Invite code generated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate invite code
router.post('/invite-codes/:id/deactivate', async (req, res, next) => {
  try {
    const result = await adminService.deactivateInviteCode(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Invite code deactivated'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
