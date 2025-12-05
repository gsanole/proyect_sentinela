const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Admin Service
 * Handles all admin management operations
 */
class AdminService {
  /**
   * Get all artists with filters
   */
  async getArtists(filters = {}) {
    const { status, search, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT 
        u.id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.created_at,
        ap.bio,
        ap.portfolio_url,
        ap.approval_status,
        ap.approved_at,
        ap.rejected_reason,
        (SELECT COUNT(*) FROM art_pieces WHERE artist_id = u.id) as art_pieces_count,
        (SELECT COALESCE(SUM(oi.price), 0) 
         FROM order_items oi 
         WHERE oi.artist_id = u.id) as total_sales
      FROM users u
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'artist'
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND ap.approval_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM users u LEFT JOIN artist_profiles ap ON u.id = ap.user_id WHERE u.role = 'artist'`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND ap.approval_status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (CONCAT(u.first_name, ' ', u.last_name) ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      artists: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Approve artist application
   */
  async approveArtist(userId, adminId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update artist profile
      await client.query(
        `UPDATE artist_profiles 
         SET approval_status = 'approved',
             approved_at = NOW(),
             approved_by = $1,
             rejected_reason = NULL
         WHERE user_id = $2`,
        [adminId, userId]
      );
      
      // Log activity
      await client.query(
        `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'approve_artist', 'user', $2, $3)`,
        [adminId, userId, JSON.stringify({ approved_at: new Date() })]
      );
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject artist application
   */
  async rejectArtist(userId, adminId, reason) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE artist_profiles 
         SET approval_status = 'rejected',
             rejected_reason = $1,
             approved_at = NULL,
             approved_by = NULL
         WHERE user_id = $2`,
        [reason, userId]
      );
      
      await client.query(
        `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'reject_artist', 'user', $2, $3)`,
        [adminId, userId, JSON.stringify({ reason, rejected_at: new Date() })]
      );
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all art pieces with filters
   */
  async getArtPieces(filters = {}) {
    const { status, artistId, categoryId, search, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT 
        ap.id,
        ap.title,
        ap.description,
        ap.price,
        ap.dimensions,
        ap.medium,
        ap.year_created,
        ap.approval_status,
        ap.approved_at,
        ap.rejected_reason,
        ap.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as artist_name,
        u.email as artist_email,
        c.name as category_name,
        (SELECT s3_url FROM art_images WHERE art_piece_id = ap.id ORDER BY display_order LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM art_images WHERE art_piece_id = ap.id) as image_count
      FROM art_pieces ap
      JOIN users u ON ap.artist_id = u.id
      LEFT JOIN categories c ON ap.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND ap.approval_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (artistId) {
      query += ` AND ap.artist_id = $${paramIndex}`;
      params.push(artistId);
      paramIndex++;
    }
    
    if (categoryId) {
      query += ` AND ap.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (ap.title ILIKE $${paramIndex} OR ap.description ILIKE $${paramIndex} OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY ap.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM art_pieces ap JOIN users u ON ap.artist_id = u.id WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND ap.approval_status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (artistId) {
      countQuery += ` AND ap.artist_id = $${countParamIndex}`;
      countParams.push(artistId);
      countParamIndex++;
    }
    
    if (categoryId) {
      countQuery += ` AND ap.category_id = $${countParamIndex}`;
      countParams.push(categoryId);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (ap.title ILIKE $${countParamIndex} OR ap.description ILIKE $${countParamIndex} OR u.full_name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      artPieces: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Approve art piece
   */
  async approveArtPiece(artPieceId, adminId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE art_pieces 
         SET approval_status = 'approved',
             approved_at = NOW(),
             approved_by = $1,
             rejected_reason = NULL
         WHERE id = $2`,
        [adminId, artPieceId]
      );
      
      await client.query(
        `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'approve_art_piece', 'art_piece', $2, $3)`,
        [adminId, artPieceId, JSON.stringify({ approved_at: new Date() })]
      );
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject art piece
   */
  async rejectArtPiece(artPieceId, adminId, reason) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE art_pieces 
         SET approval_status = 'rejected',
             rejected_reason = $1,
             approved_at = NULL,
             approved_by = NULL
         WHERE id = $2`,
        [reason, artPieceId]
      );
      
      await client.query(
        `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'reject_art_piece', 'art_piece', $2, $3)`,
        [adminId, artPieceId, JSON.stringify({ reason, rejected_at: new Date() })]
      );
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all orders with filters
   */
  async getOrders(filters = {}) {
    const { status, buyerId, artistId, search, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT 
        o.id,
        o.id as order_number,
        o.status,
        o.total_amount,
        o.created_at,
        o.pickup_deadline,
        o.picked_up_at,
        CONCAT(buyer.first_name, ' ', buyer.last_name) as buyer_name,
        buyer.email as buyer_email,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
        (SELECT json_agg(json_build_object(
          'id', oi.id,
          'art_piece_id', oi.art_piece_id,
          'title', ap.title,
          'artist_name', CONCAT(artist.first_name, ' ', artist.last_name),
          'price', oi.price
        ))
        FROM order_items oi
        JOIN art_pieces ap ON oi.art_piece_id = ap.id
        JOIN users artist ON ap.artist_id = artist.id
        WHERE oi.order_id = o.id) as items
      FROM orders o
      JOIN users buyer ON o.buyer_id = buyer.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (buyerId) {
      query += ` AND o.buyer_id = $${paramIndex}`;
      params.push(buyerId);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (o.order_number ILIKE $${paramIndex} OR buyer.full_name ILIKE $${paramIndex} OR buyer.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM orders o JOIN users buyer ON o.buyer_id = buyer.id WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND o.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (buyerId) {
      countQuery += ` AND o.buyer_id = $${countParamIndex}`;
      countParams.push(buyerId);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (o.order_number ILIKE $${countParamIndex} OR buyer.full_name ILIKE $${countParamIndex} OR buyer.email ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, adminId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updates = { status };
      if (status === 'picked_up') {
        updates.completed_at = new Date();
      }
      
      await client.query(
        `UPDATE orders 
         SET status = $1,
             ${status === 'picked_up' ? 'completed_at = NOW(),' : ''}
             updated_at = NOW()
         WHERE id = $2`,
        [status, orderId]
      );
      
      await client.query(
        `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'update_order_status', 'order', $2, $3)`,
        [adminId, orderId, JSON.stringify({ status, updated_at: new Date() })]
      );
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payouts
   */
  async getPayouts(filters = {}) {
    const { status, artistId, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT 
        p.id,
        p.amount,
        p.status,
        p.created_at,
        p.processed_at,
        CONCAT(u.first_name, ' ', u.last_name) as artist_name,
        u.email as artist_email,
        ap.stripe_account_id,
        (SELECT COUNT(*) FROM payouts WHERE artist_id = p.artist_id) as orders_count
      FROM payouts p
      JOIN users u ON p.artist_id = u.id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (artistId) {
      query += ` AND p.artist_id = $${paramIndex}`;
      params.push(artistId);
      paramIndex++;
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    const countQuery = `SELECT COUNT(*) FROM payouts WHERE 1=1${status ? ' AND status = $1' : ''}${artistId ? ` AND artist_id = $${status ? '2' : '1'}` : ''}`;
    const countParams = [];
    if (status) countParams.push(status);
    if (artistId) countParams.push(artistId);
    
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      payouts: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Process payout
   */
  async processPayout(payoutId, adminId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE payouts 
         SET status = 'processed',
             processed_at = NOW()
         WHERE id = $1`,
        [payoutId]
      );
      
      await client.query(
        `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'process_payout', 'payout', $2, $3)`,
        [adminId, payoutId, JSON.stringify({ processed_at: new Date() })]
      );
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get invite codes
   */
  async getInviteCodes(filters = {}) {
    const { status, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT 
        ic.id,
        ic.code,
        ic.created_by,
        (ic.used_by IS NULL AND (ic.expires_at IS NULL OR ic.expires_at > NOW())) as is_active,
        1 as max_uses,
        CASE WHEN ic.used_by IS NOT NULL THEN 1 ELSE 0 END as uses_count,
        ic.expires_at,
        ic.created_at,
        ic.used_at,
        CONCAT(admin.first_name, ' ', admin.last_name) as created_by_name,
        admin.email as created_by_email
      FROM invite_codes ic
      JOIN users admin ON ic.created_by = admin.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status === 'active') {
      query += ` AND ic.used_by IS NULL AND (ic.expires_at IS NULL OR ic.expires_at > NOW())`;
    } else if (status === 'inactive') {
      query += ` AND (ic.used_by IS NOT NULL OR ic.expires_at <= NOW())`;
    }
    
    query += ` ORDER BY ic.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    const countQuery = `SELECT COUNT(*) FROM invite_codes WHERE 1=1${status === 'active' ? ' AND used_by IS NULL AND (expires_at IS NULL OR expires_at > NOW())' : status === 'inactive' ? ' AND (used_by IS NOT NULL OR expires_at <= NOW())' : ''}`;
    const countResult = await pool.query(countQuery);
    
    return {
      inviteCodes: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Generate invite code
   */
  async generateInviteCode(adminId, options = {}) {
    const { maxUses, expiresInDays } = options;
    
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    
    const result = await pool.query(
      `INSERT INTO invite_codes (code, created_by, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code, adminId, expiresAt]
    );
    
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'generate_invite_code', 'invite_code', $2, $3)`,
      [adminId, result.rows[0].id, JSON.stringify({ code, expiresAt })]
    );
    
    return result.rows[0];
  }

  /**
   * Deactivate invite code (mark as used by setting expires_at to past date)
   */
  async deactivateInviteCode(codeId, adminId) {
    await pool.query(
      `UPDATE invite_codes SET expires_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
      [codeId]
    );
    
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'deactivate_invite_code', 'invite_code', $2, $3)`,
      [adminId, codeId, JSON.stringify({ deactivated_at: new Date() })]
    );
    
    return { success: true };
  }
}

module.exports = new AdminService();
