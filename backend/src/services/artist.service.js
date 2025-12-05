const db = require('../config/database');

/**
 * Artist Service
 * Handles all artist-related operations
 */
class ArtistService {
  /**
   * Get artist profile by user ID
   */
  async getArtistProfile(userId) {
    const result = await db.query(
      `SELECT 
        u.id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.first_name,
        u.last_name,
        u.created_at,
        ap.bio,
        ap.portfolio_url,
        ap.approval_status,
        ap.approved_at,
        ap.rejected_reason,
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = u.id) as total_art_pieces,
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = u.id AND approval_status = 'approved') as approved_art_pieces,
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = u.id AND approval_status = 'pending') as pending_art_pieces,
        (SELECT COALESCE(SUM(oi.price), 0) 
         FROM order_items oi 
         WHERE oi.artist_id = u.id) as total_sales,
        (SELECT COUNT(DISTINCT o.id) 
         FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE oi.artist_id = u.id) as total_orders,
        (SELECT COUNT(*) FROM follows WHERE artist_id = u.id) as followers_count
      FROM users u
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE u.id = $1 AND u.role = 'artist'`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Artist not found');
    }

    return result.rows[0];
  }

  /**
   * Apply to become an artist
   */
  async applyAsArtist(userId, data) {
    const { bio, portfolioUrl } = data;

    // Check if user is already an artist
    const userCheck = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    if (userCheck.rows[0].role === 'artist') {
      throw new Error('User is already an artist');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Update user role to artist
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['artist', userId]
      );

      // Create artist profile with pending status
      await client.query(
        `INSERT INTO artist_profiles (user_id, bio, portfolio_url, approval_status)
         VALUES ($1, $2, $3, 'pending')`,
        [userId, bio, portfolioUrl || null]
      );

      await client.query('COMMIT');

      return { message: 'Artist application submitted successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Redeem invite code to become an artist
   */
  async redeemInviteCode(userId, code) {
    // Check if user is already an artist
    const userCheck = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    if (userCheck.rows[0].role === 'artist') {
      throw new Error('User is already an artist');
    }

    // Check if invite code is valid
    const codeCheck = await db.query(
      `SELECT id, used_by, expires_at 
       FROM invite_codes 
       WHERE code = $1`,
      [code]
    );

    if (codeCheck.rows.length === 0) {
      throw new Error('Invalid invite code');
    }

    const inviteCode = codeCheck.rows[0];

    if (inviteCode.used_by) {
      throw new Error('This invite code has already been used');
    }

    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      throw new Error('This invite code has expired');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Update user role to artist
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['artist', userId]
      );

      // Create artist profile with approved status (since they have an invite code)
      await client.query(
        `INSERT INTO artist_profiles (user_id, bio, portfolio_url, approval_status, approved_at)
         VALUES ($1, $2, $3, 'approved', NOW())`,
        [userId, 'Artist on ArtHub', null]
      );

      // Mark invite code as used
      await client.query(
        'UPDATE invite_codes SET used_by = $1, used_at = NOW() WHERE id = $2',
        [userId, inviteCode.id]
      );

      await client.query('COMMIT');

      return { message: 'Invite code redeemed successfully. You are now an artist!' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update artist profile
   */
  async updateArtistProfile(userId, data) {
    const { firstName, lastName, bio, portfolioUrl } = data;

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Update user info
      if (firstName || lastName) {
        await client.query(
          `UPDATE users 
           SET first_name = COALESCE($1, first_name),
               last_name = COALESCE($2, last_name)
           WHERE id = $3`,
          [firstName, lastName, userId]
        );
      }

      // Update artist profile
      await client.query(
        `UPDATE artist_profiles 
         SET bio = COALESCE($1, bio),
             portfolio_url = COALESCE($2, portfolio_url)
         WHERE user_id = $3`,
        [bio, portfolioUrl, userId]
      );

      await client.query('COMMIT');

      return await this.getArtistProfile(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get artist dashboard stats
   */
  async getDashboardStats(artistId) {
    // Get basic stats
    const statsQuery = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = $1) as total_art_pieces,
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = $1 AND approval_status = 'approved') as approved_pieces,
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = $1 AND approval_status = 'pending') as pending_pieces,
        (SELECT COALESCE(SUM(oi.price), 0) 
         FROM order_items oi 
         WHERE oi.artist_id = $1) as total_revenue,
        (SELECT COUNT(DISTINCT o.id) 
         FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE oi.artist_id = $1) as total_orders,
        (SELECT COUNT(*) FROM follows WHERE artist_id = $1) as followers
      `,
      [artistId]
    );

    // Get recent orders (last 30 days)
    const recentOrdersQuery = await db.query(
      `SELECT COUNT(*) as recent_orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.artist_id = $1
       AND o.created_at >= NOW() - INTERVAL '30 days'`,
      [artistId]
    );

    // Get pending payouts
    const pendingPayoutsQuery = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as pending_payout
       FROM payouts
       WHERE artist_id = $1 AND status = 'pending'`,
      [artistId]
    );

    // Get top selling pieces
    const topPiecesQuery = await db.query(
      `SELECT 
        ap.id,
        ap.title,
        COUNT(oi.id) as sales_count,
        SUM(oi.price) as total_revenue
       FROM art_pieces ap
       JOIN order_items oi ON ap.id = oi.art_piece_id
       WHERE ap.artist_id = $1
       GROUP BY ap.id, ap.title
       ORDER BY sales_count DESC
       LIMIT 5`,
      [artistId]
    );

    return {
      overview: statsQuery.rows[0],
      recentOrders: parseInt(recentOrdersQuery.rows[0].recent_orders),
      pendingPayout: parseFloat(pendingPayoutsQuery.rows[0].pending_payout),
      topSellingPieces: topPiecesQuery.rows
    };
  }

  /**
   * Get artist's art pieces
   */
  async getMyArtPieces(artistId, filters = {}) {
    const { status, search, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT 
        ap.id,
        ap.title,
        ap.description,
        ap.price,
        ap.medium,
        ap.dimensions,
        ap.year_created,
        ap.approval_status,
        ap.created_at,
        c.name as category_name,
        (SELECT ai.s3_url FROM art_images ai WHERE ai.art_piece_id = ap.id ORDER BY ai.display_order LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM favorites WHERE art_piece_id = ap.id) as favorites_count,
        (SELECT COUNT(*) FROM order_items WHERE art_piece_id = ap.id) as sales_count
      FROM art_pieces ap
      LEFT JOIN categories c ON ap.category_id = c.id
      WHERE ap.artist_id = $1
    `;

    const params = [artistId];
    let paramIndex = 2;

    if (status) {
      query += ` AND ap.approval_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (ap.title ILIKE $${paramIndex} OR ap.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY ap.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM art_pieces WHERE artist_id = $1';
    const countParams = [artistId];
    let countParamIndex = 2;

    if (status) {
      countQuery += ` AND approval_status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);

    return {
      artPieces: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Get artist's sales history
   */
  async getSalesHistory(artistId, filters = {}) {
    const { limit = 50, offset = 0 } = filters;

    const result = await db.query(
      `SELECT 
        o.id as order_id,
        o.created_at as order_date,
        o.status,
        CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
        ap.title as art_piece_title,
        oi.price as sale_price
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN art_pieces ap ON oi.art_piece_id = ap.id
       JOIN users u ON o.user_id = u.id
       WHERE oi.artist_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [artistId, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) 
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.artist_id = $1`,
      [artistId]
    );

    return {
      sales: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Get artist's payout history
   */
  async getPayoutHistory(artistId, filters = {}) {
    const { limit = 50, offset = 0 } = filters;

    const result = await db.query(
      `SELECT 
        id,
        amount,
        status,
        created_at,
        processed_at
       FROM payouts
       WHERE artist_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [artistId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM payouts WHERE artist_id = $1',
      [artistId]
    );

    return {
      payouts: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Get artist's earnings summary
   */
  async getEarningsSummary(artistId) {
    const result = await db.query(
      `SELECT 
        COALESCE(SUM(oi.price), 0) as total_earnings,
        COALESCE((SELECT SUM(amount) FROM payouts WHERE artist_id = $1 AND status = 'processed'), 0) as paid_out,
        COALESCE((SELECT SUM(amount) FROM payouts WHERE artist_id = $1 AND status = 'pending'), 0) as pending_payout,
        COUNT(DISTINCT oi.order_id) as total_sales
       FROM order_items oi
       WHERE oi.artist_id = $1`,
      [artistId]
    );

    const earnings = result.rows[0];
    const available = parseFloat(earnings.total_earnings) - parseFloat(earnings.paid_out) - parseFloat(earnings.pending_payout);

    return {
      totalEarnings: parseFloat(earnings.total_earnings),
      paidOut: parseFloat(earnings.paid_out),
      pendingPayout: parseFloat(earnings.pending_payout),
      availableForPayout: Math.max(0, available),
      totalSales: parseInt(earnings.total_sales)
    };
  }
}

module.exports = new ArtistService();

