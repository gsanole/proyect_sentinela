const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/config/database');
const jwt = require('jsonwebtoken');

describe('Art Pieces API', () => {
  let artistToken;
  let artistId;
  let artistProfileId;
  let buyerToken;

  beforeEach(async () => {
    // Create artist user
    const artistResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'artist', 'Test', 'Artist', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed_password']
    );
    artistId = artistResult.rows[0].id;

    // Create artist profile
    const profileResult = await db.query(
      `INSERT INTO artist_profiles (user_id, display_name, bio)
       VALUES ($1, $2, $3) RETURNING *`,
      [artistId, 'Test Artist Studio', 'Contemporary artist']
    );
    artistProfileId = profileResult.rows[0].id;

    // Generate artist token
    artistToken = jwt.sign(
      { id: artistId, role: 'artist', email: artistResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create buyer user
    const buyerResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'buyer', 'Test', 'Buyer', true) RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed_password']
    );

    buyerToken = jwt.sign(
      { id: buyerResult.rows[0].id, role: 'buyer', email: buyerResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/v1/art-pieces', () => {
    it('should create new art piece as artist', async () => {
      const response = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Sunset Dreams',
          description: 'Beautiful acrylic painting',
          price: 450.00,
          medium: 'Acrylic',
          dimensions: '24x36 inches',
          yearCreated: 2024
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Sunset Dreams');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.artist_id).toBe(artistProfileId);
    });

    it('should fail to create art piece as buyer', async () => {
      const response = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Test Art',
          price: 100.00
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Test Art'
          // Missing price
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate price is positive', async () => {
      const response = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Test Art',
          price: -100.00
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/art-pieces', () => {
    beforeEach(async () => {
      // Create approved art pieces
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, status)
         VALUES ($1, $2, $3, $4, 'approved')`,
        [artistProfileId, 'Art Piece 1', 'Description 1', 100.00]
      );
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, status)
         VALUES ($1, $2, $3, $4, 'approved')`,
        [artistProfileId, 'Art Piece 2', 'Description 2', 200.00]
      );
    });

    it('should get approved art pieces feed', async () => {
      const response = await request(app)
        .get('/api/v1/art-pieces')
        .query({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('title');
      expect(response.body.data[0].status).toBe('approved');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/art-pieces')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('GET /api/v1/art-pieces/search', () => {
    it('should search art pieces by title', async () => {
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, status)
         VALUES ($1, 'Abstract Sunset', 'Beautiful art', 150.00, 'approved')`,
        [artistProfileId]
      );

      const response = await request(app)
        .get('/api/v1/art-pieces/search')
        .query({ query: 'sunset' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/art-pieces/search')
        .query({ minPrice: 50, maxPrice: 150 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      response.body.data.forEach(piece => {
        expect(piece.price).toBeGreaterThanOrEqual(50);
        expect(piece.price).toBeLessThanOrEqual(150);
      });
    });

    it('should filter by medium', async () => {
      await db.query(
        `INSERT INTO art_pieces (artist_id, title, price, medium, status)
         VALUES ($1, 'Oil Painting', 300.00, 'Oil', 'approved')`,
        [artistProfileId]
      );

      const response = await request(app)
        .get('/api/v1/art-pieces/search')
        .query({ medium: 'Oil' });

      expect(response.status).toBe(200);
      response.body.data.forEach(piece => {
        expect(piece.medium).toBe('Oil');
      });
    });
  });

  describe('GET /api/v1/art-pieces/:id', () => {
    let artPieceId;

    beforeEach(async () => {
      const result = await db.query(
        `INSERT INTO art_pieces (artist_id, title, description, price, status)
         VALUES ($1, 'Test Art', 'Test Description', 100.00, 'approved') RETURNING id`,
        [artistProfileId]
      );
      artPieceId = result.rows[0].id;
    });

    it('should get art piece by id', async () => {
      const response = await request(app)
        .get(`/api/v1/art-pieces/${artPieceId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(artPieceId);
      expect(response.body.data.title).toBe('Test Art');
    });

    it('should return 404 for non-existent art piece', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/art-pieces/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should increment view count', async () => {
      // First view
      await request(app).get(`/api/v1/art-pieces/${artPieceId}`);
      
      // Second view
      await request(app).get(`/api/v1/art-pieces/${artPieceId}`);

      const result = await db.query(
        'SELECT view_count FROM art_pieces WHERE id = $1',
        [artPieceId]
      );

      expect(result.rows[0].view_count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DELETE /api/v1/art-pieces/:id', () => {
    let artPieceId;

    beforeEach(async () => {
      const result = await db.query(
        `INSERT INTO art_pieces (artist_id, title, price, status)
         VALUES ($1, 'Test Art', 100.00, 'pending') RETURNING id`,
        [artistProfileId]
      );
      artPieceId = result.rows[0].id;
    });

    it('should allow artist to delete own pending art piece', async () => {
      const response = await request(app)
        .delete(`/api/v1/art-pieces/${artPieceId}`)
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow deletion of sold art piece', async () => {
      await db.query(
        'UPDATE art_pieces SET status = $1 WHERE id = $2',
        ['sold', artPieceId]
      );

      const response = await request(app)
        .delete(`/api/v1/art-pieces/${artPieceId}`)
        .set('Authorization', `Bearer ${artistToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow buyer to delete art piece', async () => {
      const response = await request(app)
        .delete(`/api/v1/art-pieces/${artPieceId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});
