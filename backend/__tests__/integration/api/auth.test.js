const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/config/database');
const bcrypt = require('bcryptjs');

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new buyer account', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: global.testUtils.randomEmail(),
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+14141234567'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.role).toBe('buyer');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: global.testUtils.randomEmail(),
          password: '123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const email = global.testUtils.randomEmail();
      
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      // Duplicate registration
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          firstName: 'Jane',
          lastName: 'Smith'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register/artist', () => {
    let validInviteCode;

    beforeEach(async () => {
      // Create a valid invite code
      validInviteCode = `INVITE_${global.testUtils.randomString()}`;
      await db.query(
        'INSERT INTO invite_codes (code, is_used) VALUES ($1, false)',
        [validInviteCode]
      );
    });

    it('should register artist with valid invite code', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/artist')
        .send({
          email: global.testUtils.randomEmail(),
          password: 'SecurePass123!',
          firstName: 'Jane',
          lastName: 'Artist',
          inviteCode: validInviteCode,
          displayName: 'Jane Artist Studio',
          bio: 'Contemporary painter'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('artist');
    });

    it('should fail with invalid invite code', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/artist')
        .send({
          email: global.testUtils.randomEmail(),
          password: 'SecurePass123!',
          firstName: 'Jane',
          lastName: 'Artist',
          inviteCode: 'INVALID_CODE',
          displayName: 'Jane Artist Studio'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with already used invite code', async () => {
      // Mark code as used
      await db.query(
        'UPDATE invite_codes SET is_used = true WHERE code = $1',
        [validInviteCode]
      );

      const response = await request(app)
        .post('/api/v1/auth/register/artist')
        .send({
          email: global.testUtils.randomEmail(),
          password: 'SecurePass123!',
          firstName: 'Jane',
          lastName: 'Artist',
          inviteCode: validInviteCode,
          displayName: 'Jane Artist Studio'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user
      const email = global.testUtils.randomEmail();
      const password = 'SecurePass123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.query(
        'INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
        [email, hashedPassword, 'buyer', 'Test', 'User']
      );

      testUser = { ...result.rows[0], password };
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      const email = global.testUtils.randomEmail();
      
      // Make multiple failed login attempts
      const promises = Array(101).fill().map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong' })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
