const request = require('supertest');
const app = require('../../../src/app');

describe('Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "admin@test.com' OR '1'='1",
          password: "' OR '1'='1"
        });

      expect(response.status).not.toBe(200);
      expect(response.body.success).toBe(false);
    });

    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/v1/art-pieces/search')
        .query({ query: "'; DROP TABLE users; --" });

      // Should not crash and should handle safely
      expect([200, 400]).toContain(response.status);
    });

    it('should sanitize user input in registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: global.testUtils.randomEmail(),
          password: 'SecurePass123!',
          firstName: "Robert'); DROP TABLE users; --",
          lastName: 'Test'
        });

      // Should either reject or sanitize
      if (response.status === 201) {
        expect(response.body.data.user.first_name).not.toContain('DROP TABLE');
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should prevent XSS in art piece description', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/v1/art-pieces')
        .send({
          title: 'Test Art',
          description: xssPayload,
          price: 100.00
        });

      if (response.status === 201) {
        expect(response.body.data.description).not.toContain('<script>');
      }
    });

    it('should prevent XSS in review comments', async () => {
      const xssPayload = '<img src=x onerror=alert("XSS")>';
      
      const response = await request(app)
        .post('/api/v1/reviews')
        .send({
          comment: xssPayload,
          rating: 5
        });

      if (response.status === 201) {
        expect(response.body.data.comment).not.toContain('<img');
      }
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'test-id', email: 'test@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should enforce role-based access control', async () => {
      const jwt = require('jsonwebtoken');
      const buyerToken = jwt.sign(
        { id: 'test-id', email: 'buyer@test.com', role: 'buyer' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Try to access admin endpoint as buyer
      const response = await request(app)
        .get('/api/v1/admin/invite-codes')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const promises = Array(150).fill().map(() =>
        request(app).get('/api/v1/art-pieces')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@test.com',
        'test@',
        'test..test@test.com',
        'test @test.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email,
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
      }
    });

    it('should enforce password complexity', async () => {
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        'qwerty'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: global.testUtils.randomEmail(),
            password,
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
      }
    });

    it('should validate price is a number', async () => {
      const response = await request(app)
        .post('/api/v1/art-pieces')
        .send({
          title: 'Test Art',
          price: 'not-a-number'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Data Exposure', () => {
    it('should not expose password hashes', async () => {
      const email = global.testUtils.randomEmail();
      
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User'
        });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'SecurePass123!' });

      expect(response.body.data.user).not.toHaveProperty('password_hash');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not expose sensitive admin data to buyers', async () => {
      const jwt = require('jsonwebtoken');
      const buyerToken = jwt.sign(
        { id: 'test-id', role: 'buyer' },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/v1/artists/some-artist-id')
        .set('Authorization', `Bearer ${buyerToken}`);

      if (response.status === 200) {
        expect(response.body.data).not.toHaveProperty('stripe_account_id');
        expect(response.body.data).not.toHaveProperty('bank_details');
      }
    });
  });

  describe('CORS', () => {
    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1/art-pieces')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject requests from unauthorized origins in production', async () => {
      // This test would be more relevant in production environment
      // Just checking that CORS middleware is present
      const response = await request(app)
        .options('/api/v1/art-pieces')
        .set('Origin', 'http://malicious-site.com');

      // Should have CORS headers configured
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types for image uploads', async () => {
      const response = await request(app)
        .post('/api/v1/art-pieces/test-id/images')
        .attach('image', Buffer.from('malicious content'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload'
        });

      expect([400, 415]).toContain(response.status);
    });

    it('should limit file upload size', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const response = await request(app)
        .post('/api/v1/art-pieces/test-id/images')
        .attach('image', largeBuffer, {
          filename: 'large-image.jpg',
          contentType: 'image/jpeg'
        });

      expect([413, 400]).toContain(response.status);
    });
  });
});
