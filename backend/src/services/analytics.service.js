const { pool } = require('../config/database');

class AnalyticsService {
  async getDashboardStats() {
    try {
      // Get total users count
      const usersResult = await pool.query(
        'SELECT COUNT(*) as total FROM users WHERE is_active = true'
      );

      // Get total artists count
      const artistsResult = await pool.query(
        'SELECT COUNT(*) as total FROM users WHERE role = $1 AND is_active = true',
        ['artist']
      );

      // Get pending artists count
      const pendingArtistsResult = await pool.query(
        `SELECT COUNT(*) as total FROM artist_profiles WHERE approval_status = 'pending'`
      );

      // Get total art pieces count
      const artPiecesResult = await pool.query(
        'SELECT COUNT(*) as total FROM art_pieces'
      );

      // Get pending art pieces count
      const pendingArtResult = await pool.query(
        `SELECT COUNT(*) as total FROM art_pieces WHERE approval_status = 'pending'`
      );

      // Get total revenue (sum of all completed orders)
      const revenueResult = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total 
         FROM orders 
         WHERE status IN ('paid', 'ready_for_pickup', 'completed')`
      );

      // Get total orders count
      const ordersResult = await pool.query(
        'SELECT COUNT(*) as total FROM orders'
      );

      // Get users in last 30 days
      const recentUsersResult = await pool.query(
        `SELECT COUNT(*) as total FROM users 
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
      );

      // Get orders in last 30 days
      const recentOrdersResult = await pool.query(
        `SELECT COUNT(*) as total FROM orders 
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
      );

      // Get top categories
      const topCategoriesResult = await pool.query(
        `SELECT c.name, COUNT(oi.id) as sales_count
         FROM categories c
         LEFT JOIN art_pieces ap ON c.id = ap.category_id
         LEFT JOIN order_items oi ON ap.id = oi.art_piece_id
         GROUP BY c.id, c.name
         ORDER BY sales_count DESC
         LIMIT 5`
      );

      return {
        overview: {
          totalUsers: parseInt(usersResult.rows[0].total),
          totalArtists: parseInt(artistsResult.rows[0].total),
          totalArtPieces: parseInt(artPiecesResult.rows[0].total),
          totalOrders: parseInt(ordersResult.rows[0].total),
          totalRevenue: parseFloat(revenueResult.rows[0].total)
        },
        pending: {
          artists: parseInt(pendingArtistsResult.rows[0].total),
          artPieces: parseInt(pendingArtResult.rows[0].total)
        },
        recentActivity: {
          usersLast30Days: parseInt(recentUsersResult.rows[0].total),
          ordersLast30Days: parseInt(recentOrdersResult.rows[0].total)
        },
        topCategories: topCategoriesResult.rows.map(row => ({
          name: row.name,
          sales_count: parseInt(row.sales_count)
        }))
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  async getRevenueChart(days = 30) {
    try {
      const result = await pool.query(
        `SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
         FROM orders 
         WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
         AND status IN ('paid', 'ready_for_pickup', 'completed')
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      );

      return result.rows.map(row => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders)
      }));
    } catch (error) {
      console.error('Error getting revenue chart:', error);
      throw error;
    }
  }

  async getTopArtists(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(DISTINCT ap.id) as pieces_count,
          COALESCE(SUM(oi.price), 0) as total_sales,
          ap.approval_status
         FROM users u
         INNER JOIN artist_profiles ap ON u.id = ap.user_id
         LEFT JOIN art_pieces art ON u.id = art.artist_id
         LEFT JOIN order_items oi ON art.id = oi.art_piece_id
         WHERE u.role = 'artist'
         GROUP BY u.id, u.first_name, u.last_name, u.email, ap.approval_status
         ORDER BY total_sales DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        piecesCount: parseInt(row.pieces_count),
        totalSales: parseFloat(row.total_sales),
        status: row.approval_status
      }));
    } catch (error) {
      console.error('Error getting top artists:', error);
      throw error;
    }
  }

  async getRecentOrders(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          o.id,
          o.total_amount,
          o.status,
          o.created_at,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(oi.id) as items_count
         FROM orders o
         INNER JOIN users u ON o.buyer_id = u.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         GROUP BY o.id, o.total_amount, o.status, o.created_at, u.first_name, u.last_name, u.email
         ORDER BY o.created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        totalAmount: parseFloat(row.total_amount),
        status: row.status,
        createdAt: row.created_at,
        buyer: {
          name: `${row.first_name} ${row.last_name}`,
          email: row.email
        },
        itemsCount: parseInt(row.items_count)
      }));
    } catch (error) {
      console.error('Error getting recent orders:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
