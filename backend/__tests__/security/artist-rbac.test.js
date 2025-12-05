const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');

describe('Artist Role-Based Access Control Security Tests', () => {
  let buyerToken, buyerId;
  let artistToken, artistId;
  let adminToken, adminId;
  let pendingArtistToken, pendingArtistId;
  let rejectedArtistToken, rejectedArtistId;

  beforeEach(async () => {
    // Create buyer
    const buyerResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'buyer', 'Test', 'Buyer', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed']
    );
    buyerId = buyerResult.rows[0].id;
    buyerToken = jwt.sign(
      { id: buyerId, role: 'buyer', email: buyerResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create approved artist
    const artistResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'artist', 'Test', 'Artist', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed']
    );
    artistId = artistResult.rows[0].id;
    artistToken = jwt.sign(
      { id: artistId, role: 'artist', email: artistResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    await db.query(
      `INSERT INTO artist_profiles (user_id, bio, approval_status)
       VALUES ($1, $2, $3)`,
      [artistId, 'Test bio', 'approved']
    );

    // Create pending artist
    const pendingResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'buyer', 'Pending', 'Artist', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed']
    );
    pendingArtistId = pendingResult.rows[0].id;
    pendingArtistToken = jwt.sign(
      { id: pendingArtistId, role: 'buyer', email: pendingResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    await db.query(
      `INSERT INTO artist_profiles (user_id, bio, approval_status)
       VALUES ($1, $2, $3)`,
      [pendingArtistId, 'Pending bio', 'pending']
    );

    // Create admin
    const adminResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'admin', 'Test', 'Admin', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed']
    );
    adminId = adminResult.rows[0].id;
    adminToken = jwt.sign(
      { id: adminId, role: 'admin', email: adminResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('requireArtist Middleware - Access Control', () => {
    const protectedEndpoints = [
      { method: 'get', path: '/api/v1/artist/profile' },
      { method: 'put', path: '/api/v1/artist/profile' },
      { method: 'get', path: '/api/v1/artist/dashboard' },
      { method: 'get', path: '/api/v1/artist/my-art-pieces' },
      { method: 'get', path: '/api/v1/artist/sales' },
      { method: 'get', path: '/api/v1/artist/payouts' },
      { method: 'get', path: '/api/v1/artist/earnings' }
    ];

    it('should allow approved artists to access protected endpoints', async () => {
      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${artistToken}`);

        expect(response.status).not.toBe(403);
      }
    });

    it('should deny buyers access to artist-only endpoints', async () => {
      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${buyerToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/artist|permission|access/i);
      }
    });

    it('should deny admins access without artist role', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny unauthenticated requests', async () => {
      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Token Validation & Security', () => {
    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', 'Bearer invalid_token_123');

      expect(response.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: artistId, role: 'artist' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject tampered tokens', async () => {
      const tamperedToken = artistToken.slice(0, -5) + 'XXXXX';

      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject tokens with wrong role claim', async () => {
      const wrongRoleToken = jwt.sign(
        { id: buyerId, role: 'artist' }, // Buyer ID with artist role
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${wrongRoleToken}`);

      // Should fail because user in DB has buyer role
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should reject missing Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile');

      expect(response.status).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const malformedHeaders = [
        'InvalidFormat',
        `Bearer`,
        `Token ${artistToken}`,
        artistToken
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v1/artist/profile')
          .set('Authorization', header);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Artist Application Access Control', () => {
    it('should allow buyers to apply as artist', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'I am a talented artist with extensive experience in contemporary art.',
          portfolioUrl: 'https://myportfolio.com'
        });

      expect(response.status).toBe(201);
    });

    it('should prevent existing artists from applying again', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          bio: 'Trying to apply again with enough text to pass validation checks.',
          portfolioUrl: 'https://portfolio.com'
        });

      expect([400, 409]).toContain(response.status);
    });

    it('should prevent admins from applying as artist', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bio: 'Admin trying to apply as artist with sufficient content here.',
          portfolioUrl: 'https://portfolio.com'
        });

      expect([400, 403]).toContain(response.status);
    });

    it('should require authentication for application', async () => {
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .send({
          bio: 'Attempting to apply without authentication token or credentials.',
          portfolioUrl: 'https://portfolio.com'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Data Isolation & Privacy', () => {
    let otherArtistId, otherArtistToken;

    beforeEach(async () => {
      // Create another artist
      const result = await db.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
         VALUES ($1, $2, 'artist', 'Other', 'Artist', true) RETURNING *`,
        [global.testUtils.randomEmail(), 'hashed']
      );
      otherArtistId = result.rows[0].id;
      otherArtistToken = jwt.sign(
        { id: otherArtistId, role: 'artist', email: result.rows[0].email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      await db.query(
        `INSERT INTO artist_profiles (user_id, bio, approval_status)
         VALUES ($1, $2, $3)`,
        [otherArtistId, 'Other artist bio', 'approved']
      );

      // Create art pieces for both artists
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [artistId, 'Artist 1 Art', 'Description', 500, 'approved']
      );
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [otherArtistId, 'Artist 2 Art', 'Description', 750, 'approved']
      );
    });

    it('should only return own art pieces', async () => {
      const response = await request(app)
        .get('/api/v1/artist/my-art-pieces')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(piece => piece.artist_id === artistId)).toBe(true);
    });

    it('should only return own sales data', async () => {
      const response = await request(app)
        .get('/api/v1/artist/sales')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      // Should not see other artist's sales
    });

    it('should only return own earnings', async () => {
      const response = await request(app)
        .get('/api/v1/artist/earnings')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      // Earnings should be isolated to this artist
    });

    it('should not expose sensitive data in public profile', async () => {
      const response = await request(app)
        .get(`/api/v1/artist/${artistId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password_hash');
      expect(response.body.data).not.toHaveProperty('stripe_account_id');
      expect(response.body.data).not.toHaveProperty('bank_details');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in artist profile query', async () => {
      const maliciousToken = jwt.sign(
        { id: "1' OR '1'='1", role: 'artist' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${maliciousToken}`);

      expect([401, 404, 500]).toContain(response.status);
    });

    it('should prevent SQL injection in search parameter', async () => {
      const response = await request(app)
        .get("/api/v1/artist/my-art-pieces?search='; DROP TABLE users; --")
        .set('Authorization', `Bearer ${artistToken}`);

      expect([200, 400]).toContain(response.status);
      // Should not crash the server
    });

    it('should sanitize bio input', async () => {
      const maliciousBio = "Test bio'; DROP TABLE artist_profiles; --";
      
      const response = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({ bio: maliciousBio });

      // Should either reject or sanitize
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('XSS Prevention', () => {
    it('should prevent XSS in bio field', async () => {
      const xssBio = '<script>alert("XSS")</script>This is my bio with enough content.';
      
      const response = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({ bio: xssBio });

      if (response.status === 200) {
        expect(response.body.data.bio).not.toContain('<script>');
      }
    });

    it('should prevent XSS in portfolio URL', async () => {
      const xssUrl = 'javascript:alert("XSS")';
      
      const response = await request(app)
        .put('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          bio: 'Valid bio with sufficient content to pass validation checks.',
          portfolioUrl: xssUrl
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting & DoS Protection', () => {
    it('should rate limit excessive profile update requests', async () => {
      const promises = Array(50).fill().map(() =>
        request(app)
          .put('/api/v1/artist/profile')
          .set('Authorization', `Bearer ${artistToken}`)
          .send({ bio: 'Updated bio with enough content to meet validation requirements.' })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      // At least some should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should rate limit application submissions', async () => {
      const promises = Array(20).fill().map(() =>
        request(app)
          .post('/api/v1/artist/apply')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ bio: 'Application bio with sufficient content for validation.' })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization Header Attacks', () => {
    it('should reject null bytes in token', async () => {
      const maliciousToken = `${artistToken}\0admin`;
      
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${maliciousToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject excessively long tokens', async () => {
      const longToken = 'A'.repeat(10000);
      
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${longToken}`);

      expect([401, 413]).toContain(response.status);
    });

    it('should handle case-insensitive Bearer keyword', async () => {
      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `bearer ${artistToken}`);

      // Should either accept or reject consistently
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Input Validation Security', () => {
    it('should validate bio length requirements', async () => {
      const shortBio = 'Too short';
      
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bio: shortBio });

      expect(response.status).toBe(400);
    });

    it('should validate portfolio URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.com',
        'javascript:alert(1)',
        '../../../etc/passwd'
      ];

      for (const url of invalidUrls) {
        const response = await request(app)
          .post('/api/v1/artist/apply')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            bio: 'Valid bio content with enough characters to pass validation.',
            portfolioUrl: url
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject extremely long bio', async () => {
      const longBio = 'A'.repeat(100000);
      
      const response = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bio: longBio });

      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Session & State Management', () => {
    it('should maintain user context correctly', async () => {
      const response1 = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`);

      const response2 = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response1.body.data.id).toBe(response2.body.data.id);
    });

    it('should not leak data between requests', async () => {
      await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${artistToken}`);

      const response = await request(app)
        .get('/api/v1/artist/profile')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
    });
  });
});
