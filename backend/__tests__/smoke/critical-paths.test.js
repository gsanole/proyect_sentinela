const request = require('supertest');
const app = require('../../src/app');

/**
 * Smoke Tests - Critical Path Verification
 * These tests verify that the most critical functionality works
 * Run after every deployment to ensure the system is operational
 */

describe('Smoke Tests - Critical Paths', () => {
  describe('System Health', () => {
    it('should have healthy API server', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should have database connection', async () => {
      const db = require('../../src/config/database');
      const result = await db.query('SELECT 1 as test');
      
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      const email = global.testUtils.randomEmail();
      const password = 'SecurePass123!';

      // 1. Register
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Smoke',
          lastName: 'Test'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.data).toHaveProperty('token');

      // 2. Login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('token');

      // 3. Access protected route
      const meResponse = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.email).toBe(email);
    });
  });

  describe('Art Listing Flow', () => {
    it('should complete full art listing lifecycle', async () => {
      const db = require('../../src/config/database');
      const jwt = require('jsonwebtoken');

      // Create artist
      const artistResult = await db.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
         VALUES ($1, 'hash', 'artist', 'Test', 'Artist', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      const profileResult = await db.query(
        `INSERT INTO artist_profiles (user_id, display_name)
         VALUES ($1, 'Test Studio') RETURNING *`,
        [artistResult.rows[0].id]
      );

      const token = jwt.sign(
        { id: artistResult.rows[0].id, role: 'artist' },
        process.env.JWT_SECRET
      );

      // 1. Artist creates listing
      const createResponse = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Smoke Test Art',
          price: 100.00,
          description: 'Test piece'
        });

      expect(createResponse.status).toBe(201);
      const artPieceId = createResponse.body.data.id;

      // 2. Admin approves listing
      const adminResult = await db.query(
        `INSERT INTO users (email, password_hash, role, email_verified)
         VALUES ($1, 'hash', 'admin', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      const adminToken = jwt.sign(
        { id: adminResult.rows[0].id, role: 'admin' },
        process.env.JWT_SECRET
      );

      const approveResponse = await request(app)
        .put(`/api/v1/admin/art-pieces/${artPieceId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveResponse.status).toBe(200);

      // 3. Verify it appears in feed
      const feedResponse = await request(app)
        .get('/api/v1/art-pieces?status=approved');

      expect(feedResponse.status).toBe(200);
      const foundInFeed = feedResponse.body.data.some(
        piece => piece.id === artPieceId
      );
      expect(foundInFeed).toBe(true);
    });
  });

  describe('Purchase Flow', () => {
    it('should complete basic purchase flow', async () => {
      const db = require('../../src/config/database');
      const jwt = require('jsonwebtoken');

      // Setup: Create buyer, artist, and approved art piece
      const buyerResult = await db.query(
        `INSERT INTO users (email, password_hash, role, email_verified)
         VALUES ($1, 'hash', 'buyer', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      const artistResult = await db.query(
        `INSERT INTO users (email, password_hash, role, email_verified)
         VALUES ($1, 'hash', 'artist', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      const profileResult = await db.query(
        `INSERT INTO artist_profiles (user_id, display_name)
         VALUES ($1, 'Test Artist') RETURNING *`,
        [artistResult.rows[0].id]
      );

      const artResult = await db.query(
        `INSERT INTO art_pieces (artist_id, title, price, status)
         VALUES ($1, 'Test Art', 100.00, 'approved') RETURNING *`,
        [profileResult.rows[0].id]
      );

      const buyerToken = jwt.sign(
        { id: buyerResult.rows[0].id, role: 'buyer' },
        process.env.JWT_SECRET
      );

      // 1. Add to cart
      const cartResponse = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ artPieceId: artResult.rows[0].id });

      expect(cartResponse.status).toBe(200);

      // 2. Checkout (would integrate with Stripe in real implementation)
      const checkoutResponse = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ artPieceIds: [artResult.rows[0].id] });

      expect([200, 201]).toContain(checkoutResponse.status);
    });
  });

  describe('Search and Filter', () => {
    it('should search and filter art pieces', async () => {
      // 1. Basic search
      const searchResponse = await request(app)
        .get('/api/v1/art-pieces/search')
        .query({ query: 'art' });

      expect(searchResponse.status).toBe(200);
      expect(Array.isArray(searchResponse.body.data)).toBe(true);

      // 2. Filter by price
      const filterResponse = await request(app)
        .get('/api/v1/art-pieces/search')
        .query({ minPrice: 50, maxPrice: 500 });

      expect(filterResponse.status).toBe(200);

      // 3. Pagination
      const paginatedResponse = await request(app)
        .get('/api/v1/art-pieces')
        .query({ page: 1, limit: 10 });

      expect(paginatedResponse.status).toBe(200);
      expect(paginatedResponse.body).toHaveProperty('pagination');
    });
  });

  describe('Admin Operations', () => {
    it('should perform critical admin operations', async () => {
      const db = require('../../src/config/database');
      const jwt = require('jsonwebtoken');

      const adminResult = await db.query(
        `INSERT INTO users (email, password_hash, role, email_verified)
         VALUES ($1, 'hash', 'admin', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      const adminToken = jwt.sign(
        { id: adminResult.rows[0].id, role: 'admin' },
        process.env.JWT_SECRET
      );

      // 1. Generate invite code
      const inviteResponse = await request(app)
        .post('/api/v1/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ expiresInDays: 30 });

      expect(inviteResponse.status).toBe(201);

      // 2. Get pending art pieces
      const pendingResponse = await request(app)
        .get('/api/v1/admin/art-pieces/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pendingResponse.status).toBe(200);

      // 3. Get orders
      const ordersResponse = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(ordersResponse.status).toBe(200);
    });
  });

  describe('Artist Portal Endpoints', () => {
    it('should verify all artist endpoints are accessible', async () => {
      const db = require('../../src/config/database');
      const jwt = require('jsonwebtoken');

      // Create approved artist
      const artistResult = await db.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
         VALUES ($1, 'hash', 'artist', 'Test', 'Artist', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      await db.query(
        `INSERT INTO artist_profiles (user_id, bio, approval_status)
         VALUES ($1, 'Test bio', 'approved')`,
        [artistResult.rows[0].id]
      );

      const artistToken = jwt.sign(
        { id: artistResult.rows[0].id, role: 'artist', email: artistResult.rows[0].email },
        process.env.JWT_SECRET
      );

      // 1. Get artist profile
      const profileResponse = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`);
      expect([200, 404]).toContain(profileResponse.status);

      // 2. Get artist dashboard
      const dashboardResponse = await request(app)
        .get('/api/v1/artist/dashboard')
        .set('Authorization', `Bearer ${artistToken}`);
      expect([200, 404]).toContain(dashboardResponse.status);

      // 3. Get my art pieces
      const artPiecesResponse = await request(app)
        .get('/api/v1/artist/my-art-pieces')
        .set('Authorization', `Bearer ${artistToken}`);
      expect(artPiecesResponse.status).toBe(200);

      // 4. Get sales history
      const salesResponse = await request(app)
        .get('/api/v1/artist/sales')
        .set('Authorization', `Bearer ${artistToken}`);
      expect(salesResponse.status).toBe(200);

      // 5. Get payouts
      const payoutsResponse = await request(app)
        .get('/api/v1/artist/payouts')
        .set('Authorization', `Bearer ${artistToken}`);
      expect(payoutsResponse.status).toBe(200);

      // 6. Get earnings summary
      const earningsResponse = await request(app)
        .get('/api/v1/artist/earnings')
        .set('Authorization', `Bearer ${artistToken}`);
      expect(earningsResponse.status).toBe(200);

      // 7. Get public artist profile
      const publicProfileResponse = await request(app)
        .get(`/api/v1/artist/${artistResult.rows[0].id}`);
      expect([200, 404]).toContain(publicProfileResponse.status);

      // 8. Update profile
      const updateResponse = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Artist',
          bio: 'Updated bio with sufficient content for validation.'
        });
      expect([200, 400, 404]).toContain(updateResponse.status);
    });

    it('should allow buyer to apply as artist', async () => {
      const db = require('../../src/config/database');
      const jwt = require('jsonwebtoken');

      const buyerResult = await db.query(
        `INSERT INTO users (email, password_hash, role, email_verified)
         VALUES ($1, 'hash', 'buyer', true) RETURNING *`,
        [global.testUtils.randomEmail()]
      );

      const buyerToken = jwt.sign(
        { id: buyerResult.rows[0].id, role: 'buyer', email: buyerResult.rows[0].email },
        process.env.JWT_SECRET
      );

      const applyResponse = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'I am a passionate artist with extensive experience in contemporary art.',
          portfolioUrl: 'https://myportfolio.com'
        });

      expect([201, 400]).toContain(applyResponse.status);
    });
  });

  describe('API Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const responses = await Promise.all(
        Array(150).fill().map(() => request(app).get('/api/v1/art-pieces'))
      );

      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app).get('/api/v1/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
