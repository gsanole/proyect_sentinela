const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/config/database');
const jwt = require('jsonwebtoken');

describe('Artist API Integration Tests', () => {
  let buyerToken;
  let buyerId;
  let artistToken;
  let artistId;
  let artistProfileId;
  let adminToken;
  let adminId;

  beforeEach(async () => {
    // Create buyer user
    const buyerResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'buyer', 'John', 'Buyer', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed_password']
    );
    buyerId = buyerResult.rows[0].id;
    buyerToken = jwt.sign(
      { id: buyerId, role: 'buyer', email: buyerResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create artist user
    const artistResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'artist', 'Jane', 'Artist', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed_password']
    );
    artistId = artistResult.rows[0].id;
    artistToken = jwt.sign(
      { id: artistId, role: 'artist', email: artistResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create artist profile
    const profileResult = await db.query(
      `INSERT INTO artist_profiles (user_id, bio, portfolio_url, approval_status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [artistId, 'Contemporary artist', 'https://portfolio.com', 'approved']
    );
    artistProfileId = profileResult.rows[0].id;

    // Create admin user
    const adminResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'admin', 'Admin', 'User', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed_password']
    );
    adminId = adminResult.rows[0].id;
    adminToken = jwt.sign(
      { id: adminId, role: 'admin', email: adminResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/v1/artist/apply', () => {
    it('should allow buyer to apply as artist', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'I am a passionate contemporary artist with over 10 years of experience.',
          portfolioUrl: 'https://myportfolio.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.bio).toContain('passionate');
      expect(response.body.data.approval_status).toBe('pending');
    });

    it('should reject application with short bio', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'Too short',
          portfolioUrl: 'https://portfolio.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should allow application without portfolio URL', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'I am a talented artist with extensive experience in contemporary art.'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.portfolio_url).toBeNull();
    });

    it('should reject unauthenticated application', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .send({
          bio: 'My bio here with enough characters to pass validation check.'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/artist/profile', () => {
    it('should return artist profile with stats', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('bio');
      expect(response.body.data).toHaveProperty('total_art_pieces');
      expect(response.body.data).toHaveProperty('followers_count');
    });

    it('should reject non-artist access', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/artist/profile', () => {
    it('should update artist profile', async () => {
      const response = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Updated',
          bio: 'Updated bio with more information about my artistic journey.',
          portfolioUrl: 'https://newportfolio.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bio).toContain('Updated bio');
      expect(response.body.data.portfolio_url).toBe('https://newportfolio.com');
    });

    it('should allow partial updates', async () => {
      const response = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          bio: 'Only updating the bio field here with sufficient content.'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.bio).toContain('Only updating');
    });

    it('should reject non-artist updates', async () => {
      const response = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'Trying to update as buyer with enough text for validation.'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/artist/dashboard', () => {
    beforeEach(async () => {
      // Create some art pieces for the artist
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [artistId, 'Test Art 1', 'Description', 500, 'approved']
      );
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [artistId, 'Test Art 2', 'Description', 750, 'pending']
      );
    });

    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/v1/artist/dashboard')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_revenue');
      expect(response.body.data).toHaveProperty('total_sales');
      expect(response.body.data).toHaveProperty('total_art_pieces');
      expect(response.body.data).toHaveProperty('pending_art_pieces');
      expect(response.body.data).toHaveProperty('followers_count');
    });

    it('should reject non-artist access', async () => {
      const response = await request(app)
        .get('/api/v1/artist/dashboard')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/artist/my-art-pieces', () => {
    let artPieceId1, artPieceId2;

    beforeEach(async () => {
      // Create art pieces with different statuses
      const result1 = await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [artistId, 'Approved Art', 'Description', 500, 'approved']
      );
      artPieceId1 = result1.rows[0].id;

      const result2 = await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [artistId, 'Pending Art', 'Description', 750, 'pending']
      );
      artPieceId2 = result2.rows[0].id;
    });

    it('should return all art pieces for artist', async () => {
      const response = await request(app)
        .get('/api/v1/artist/my-art-pieces')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by approval status', async () => {
      const response = await request(app)
        .get('/api/v1/artist/my-art-pieces?status=approved')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Approved Art');
    });

    it('should support search by title', async () => {
      const response = await request(app)
        .get('/api/v1/artist/my-art-pieces?search=pending')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].title).toContain('Pending');
    });

    it('should reject non-artist access', async () => {
      const response = await request(app)
        .get('/api/v1/artist/my-art-pieces')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/artist/sales', () => {
    beforeEach(async () => {
      // Create art piece
      const artResult = await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [artistId, 'Sold Art', 'Description', 1000, 'approved']
      );
      const artPieceId = artResult.rows[0].id;

      // Create order
      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, total_amount, status)
         VALUES ($1, $2, $3) RETURNING id`,
        [buyerId, 1000, 'completed']
      );
      const orderId = orderResult.rows[0].id;

      // Create order item
      await db.query(
        `INSERT INTO order_items (order_id, art_piece_id, artist_id, price, artist_payout, commission)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, artPieceId, artistId, 1000, 850, 150]
      );
    });

    it('should return sales history', async () => {
      const response = await request(app)
        .get('/api/v1/artist/sales')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('order_id');
      expect(response.body.data[0]).toHaveProperty('price');
      expect(response.body.data[0]).toHaveProperty('artist_payout');
      expect(response.body.data[0]).toHaveProperty('commission');
    });

    it('should calculate commission correctly', async () => {
      const response = await request(app)
        .get('/api/v1/artist/sales')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      const sale = response.body.data[0];
      expect(parseFloat(sale.price)).toBe(1000);
      expect(parseFloat(sale.commission)).toBe(150);
      expect(parseFloat(sale.artist_payout)).toBe(850);
    });
  });

  describe('GET /api/v1/artist/payouts', () => {
    beforeEach(async () => {
      // Create payout record
      await db.query(
        `INSERT INTO payouts (artist_id, amount, status, payment_method)
         VALUES ($1, $2, $3, $4)`,
        [artistId, 850, 'completed', 'bank_transfer']
      );
      await db.query(
        `INSERT INTO payouts (artist_id, amount, status, payment_method)
         VALUES ($1, $2, $3, $4)`,
        [artistId, 500, 'pending', 'bank_transfer']
      );
    });

    it('should return payout history', async () => {
      const response = await request(app)
        .get('/api/v1/artist/payouts')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by payout status', async () => {
      const response = await request(app)
        .get('/api/v1/artist/payouts?status=completed')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('completed');
    });
  });

  describe('GET /api/v1/artist/earnings', () => {
    it('should return earnings summary', async () => {
      const response = await request(app)
        .get('/api/v1/artist/earnings')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_earned');
      expect(response.body.data).toHaveProperty('total_paid_out');
      expect(response.body.data).toHaveProperty('pending_payout');
      expect(response.body.data).toHaveProperty('lifetime_sales');
    });

    it('should reject non-artist access', async () => {
      const response = await request(app)
        .get('/api/v1/artist/earnings')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/artist/:id (Public Profile)', () => {
    it('should return public artist profile', async () => {
      const response = await request(app)
        .get(`/api/v1/artist/${artistId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('bio');
      expect(response.body.data).toHaveProperty('total_art_pieces');
      // Should not expose sensitive data
      expect(response.body.data).not.toHaveProperty('email');
    });

    it('should return 404 for non-existent artist', async () => {
      const response = await request(app)
        .get('/api/v1/artist/99999');

      expect(response.status).toBe(404);
    });

    it('should allow unauthenticated access to public profile', async () => {
      const response = await request(app)
        .get(`/api/v1/artist/${artistId}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow artists to access artist endpoints', async () => {
      const endpoints = [
        '/api/v1/artist/profile',
        '/api/v1/artist/dashboard',
        '/api/v1/artist/my-art-pieces',
        '/api/v1/artist/sales',
        '/api/v1/artist/payouts',
        '/api/v1/artist/earnings'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${artistToken}`);

        expect(response.status).not.toBe(403);
      }
    });

    it('should deny buyers access to artist endpoints', async () => {
      const endpoints = [
        '/api/v1/artist/profile',
        '/api/v1/artist/dashboard',
        '/api/v1/artist/my-art-pieces',
        '/api/v1/artist/sales',
        '/api/v1/artist/payouts',
        '/api/v1/artist/earnings'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${buyerToken}`);

        expect(response.status).toBe(403);
      }
    });

    it('should deny unauthenticated access to protected endpoints', async () => {
      const endpoints = [
        '/api/v1/artist/profile',
        '/api/v1/artist/dashboard',
        '/api/v1/artist/apply'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate bio length on application', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'Short'
        });

      expect(response.status).toBe(400);
    });

    it('should validate portfolio URL format', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'This is a sufficiently long bio with enough content to pass validation.',
          portfolioUrl: 'not-a-valid-url'
        });

      expect(response.status).toBe(400);
    });
  });
});
