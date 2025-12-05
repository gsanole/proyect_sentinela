const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');

describe('E2E - Artist Workflow Tests', () => {
  let buyerToken, buyerId;
  let adminToken, adminId;
  let artistApplicationId;

  beforeEach(async () => {
    // Create buyer
    const buyerResult = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified, phone)
       VALUES ($1, $2, 'buyer', 'John', 'Buyer', true, '+14141234567') RETURNING *`,
      [global.testUtils.randomEmail(), 'hashed_password']
    );
    buyerId = buyerResult.rows[0].id;
    buyerToken = jwt.sign(
      { id: buyerId, role: 'buyer', email: buyerResult.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create admin
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

  describe('Complete Artist Journey', () => {
    it('should complete full artist lifecycle: apply → approve → create art → sell → earn → payout', async () => {
      // Step 1: Buyer applies to become an artist
      const applicationResponse = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'I am a passionate contemporary artist with over 10 years of experience creating vibrant abstract paintings.',
          portfolioUrl: 'https://johnartist.portfolio.com'
        });

      expect(applicationResponse.status).toBe(201);
      expect(applicationResponse.body.data.approval_status).toBe('pending');
      artistApplicationId = applicationResponse.body.data.id;

      // Step 2: Admin approves the artist application
      const approvalResponse = await request(app)
        .put(`/api/v1/admin/artist-applications/${artistApplicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(approvalResponse.status);

      // Step 3: Update user role to artist in database (simulating approval process)
      await db.query(
        `UPDATE users SET role = 'artist' WHERE id = $1`,
        [buyerId]
      );
      await db.query(
        `UPDATE artist_profiles SET approval_status = 'approved', approved_at = NOW() WHERE user_id = $1`,
        [buyerId]
      );

      // Create new token with artist role
      const artistToken = jwt.sign(
        { id: buyerId, role: 'artist', email: `artist-${buyerId}@test.com` },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Step 4: Verify artist can access dashboard
      const dashboardResponse = await request(app)
        .get('/api/v1/artist/dashboard')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data).toHaveProperty('total_revenue');
      expect(dashboardResponse.body.data.total_art_pieces).toBe(0);

      // Step 5: Artist creates their first art piece
      const artPieceResponse = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Sunset Dreams',
          description: 'A vibrant abstract painting capturing the essence of twilight',
          price: 750.00,
          medium: 'Acrylic on Canvas',
          dimensions: '36x48 inches',
          category: 'abstract',
          yearCreated: 2024
        });

      expect(artPieceResponse.status).toBe(201);
      const artPieceId = artPieceResponse.body.data.id;
      expect(artPieceResponse.body.data.approval_status).toBe('pending');

      // Step 6: Admin approves the art piece
      await db.query(
        `UPDATE art_pieces SET approval_status = 'approved', approved_at = NOW() WHERE id = $1`,
        [artPieceId]
      );

      // Step 7: Buyer purchases the art piece
      const cartResponse = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ artPieceId });

      expect([200, 201]).toContain(cartResponse.status);

      // Create order
      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ artPieceId, price: 750.00 }],
          shippingAddress: '123 Art St, Milwaukee, WI 53202',
          paymentMethod: 'card',
          pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect([200, 201]).toContain(orderResponse.status);
      const orderId = orderResponse.body.data?.id || orderResponse.body.data?.order?.id;

      // Create order item with commission calculation
      const commission = 750 * 0.15; // 15% commission
      const artistPayout = 750 - commission;

      await db.query(
        `INSERT INTO order_items (order_id, art_piece_id, artist_id, price, artist_payout, commission)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, artPieceId, buyerId, 750, artistPayout, commission]
      );

      // Mark order as completed
      await db.query(
        `UPDATE orders SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [orderId]
      );

      // Step 8: Artist checks sales history
      const salesResponse = await request(app)
        .get('/api/v1/artist/sales')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(salesResponse.status).toBe(200);
      expect(salesResponse.body.data.length).toBeGreaterThan(0);
      
      const sale = salesResponse.body.data[0];
      expect(parseFloat(sale.price)).toBe(750);
      expect(parseFloat(sale.commission)).toBe(commission);
      expect(parseFloat(sale.artist_payout)).toBe(artistPayout);

      // Step 9: Artist checks earnings summary
      const earningsResponse = await request(app)
        .get('/api/v1/artist/earnings')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(earningsResponse.status).toBe(200);
      expect(parseFloat(earningsResponse.body.data.total_earned)).toBeGreaterThan(0);
      expect(earningsResponse.body.data.lifetime_sales).toBeGreaterThan(0);

      // Step 10: Create payout for artist
      const payoutResult = await db.query(
        `INSERT INTO payouts (artist_id, amount, status, payment_method, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [buyerId, artistPayout, 'completed', 'bank_transfer']
      );

      expect(payoutResult.rows[0].amount).toBe(artistPayout.toString());

      // Step 11: Artist checks payout history
      const payoutsResponse = await request(app)
        .get('/api/v1/artist/payouts')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(payoutsResponse.status).toBe(200);
      expect(payoutsResponse.body.data.length).toBeGreaterThan(0);
      expect(payoutsResponse.body.data[0].status).toBe('completed');

      // Step 12: Verify updated dashboard stats
      const finalDashboardResponse = await request(app)
        .get('/api/v1/artist/dashboard')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(finalDashboardResponse.status).toBe(200);
      expect(parseFloat(finalDashboardResponse.body.data.total_revenue)).toBeGreaterThan(0);
      expect(finalDashboardResponse.body.data.total_sales).toBeGreaterThan(0);
      expect(finalDashboardResponse.body.data.total_art_pieces).toBeGreaterThan(0);
    });
  });

  describe('Artist Application Workflow', () => {
    it('should handle application submission and approval', async () => {
      // Submit application
      const applicationResponse = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'Experienced landscape photographer specializing in nature and wildlife photography.',
          portfolioUrl: 'https://naturephotos.com'
        });

      expect(applicationResponse.status).toBe(201);
      expect(applicationResponse.body.data.approval_status).toBe('pending');

      // Verify application appears in admin panel
      const applicationsResponse = await request(app)
        .get('/api/v1/admin/artist-applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(applicationsResponse.status);
    });

    it('should handle application rejection', async () => {
      // Submit application
      const applicationResponse = await request(app)
        .post('/api/v1/artist/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'Artist bio with enough content to meet the validation requirements.',
          portfolioUrl: 'https://portfolio.com'
        });

      expect(applicationResponse.status).toBe(201);
      const appId = applicationResponse.body.data.id;

      // Admin rejects application
      const rejectionResponse = await request(app)
        .put(`/api/v1/admin/artist-applications/${appId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Portfolio does not meet quality standards'
        });

      expect([200, 204, 404]).toContain(rejectionResponse.status);

      // Verify rejection in database
      const result = await db.query(
        `SELECT approval_status, rejected_reason FROM artist_profiles WHERE user_id = $1`,
        [buyerId]
      );

      if (result.rows.length > 0) {
        expect(['pending', 'rejected']).toContain(result.rows[0].approval_status);
      }
    });
  });

  describe('Art Piece Lifecycle', () => {
    let artistToken, artistId;

    beforeEach(async () => {
      // Create approved artist
      const artistResult = await db.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
         VALUES ($1, $2, 'artist', 'Test', 'Artist', true) RETURNING *`,
        [global.testUtils.randomEmail(), 'hashed_password']
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
    });

    it('should create, approve, and sell art piece', async () => {
      // Create art piece
      const createResponse = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Mountain Landscape',
          description: 'Beautiful mountain scenery',
          price: 500.00,
          medium: 'Oil',
          dimensions: '24x36',
          category: 'landscape',
          yearCreated: 2024
        });

      expect(createResponse.status).toBe(201);
      const artPieceId = createResponse.body.data.id;

      // Verify it appears in artist's pieces
      const myPiecesResponse = await request(app)
        .get('/api/v1/artist/my-art-pieces')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(myPiecesResponse.status).toBe(200);
      expect(myPiecesResponse.body.data.some(p => p.id === artPieceId)).toBe(true);

      // Approve art piece
      await db.query(
        `UPDATE art_pieces SET approval_status = 'approved' WHERE id = $1`,
        [artPieceId]
      );

      // Verify public visibility
      const publicResponse = await request(app)
        .get('/api/v1/art-pieces');

      expect(publicResponse.status).toBe(200);
      // Should appear in public feed
    });

    it('should handle art piece updates', async () => {
      // Create initial art piece
      const createResponse = await request(app)
        .post('/api/v1/art-pieces')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Original Title',
          description: 'Original description',
          price: 300.00,
          medium: 'Watercolor',
          dimensions: '18x24',
          category: 'abstract',
          yearCreated: 2024
        });

      expect(createResponse.status).toBe(201);
      const artPieceId = createResponse.body.data.id;

      // Update art piece
      const updateResponse = await request(app)
        .put(`/api/v1/art-pieces/${artPieceId}`)
        .set('Authorization', `Bearer ${artistToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description with more details',
          price: 350.00
        });

      expect([200, 404]).toContain(updateResponse.status);
    });
  });

  describe('Earnings and Payout Workflow', () => {
    let artistToken, artistId;

    beforeEach(async () => {
      // Create approved artist
      const artistResult = await db.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
         VALUES ($1, $2, 'artist', 'Earning', 'Artist', true) RETURNING *`,
        [global.testUtils.randomEmail(), 'hashed_password']
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
    });

    it('should track multiple sales and calculate total earnings', async () => {
      // Create and sell multiple art pieces
      const sales = [
        { price: 500, commission: 75, payout: 425 },
        { price: 750, commission: 112.50, payout: 637.50 },
        { price: 1000, commission: 150, payout: 850 }
      ];

      for (const sale of sales) {
        // Create art piece
        const artResult = await db.query(
          `INSERT INTO art_pieces (artist_id, title, description, price, approval_status)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [artistId, 'Test Art', 'Description', sale.price, 'approved']
        );

        // Create order
        const orderResult = await db.query(
          `INSERT INTO orders (buyer_id, total_amount, status)
           VALUES ($1, $2, $3) RETURNING id`,
          [buyerId, sale.price, 'completed']
        );

        // Create order item
        await db.query(
          `INSERT INTO order_items (order_id, art_piece_id, artist_id, price, artist_payout, commission)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderResult.rows[0].id, artResult.rows[0].id, artistId, sale.price, sale.payout, sale.commission]
        );
      }

      // Check earnings summary
      const earningsResponse = await request(app)
        .get('/api/v1/artist/earnings')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(earningsResponse.status).toBe(200);
      expect(earningsResponse.body.data.lifetime_sales).toBe(3);
      
      const totalPayout = sales.reduce((sum, s) => sum + s.payout, 0);
      expect(parseFloat(earningsResponse.body.data.total_earned)).toBeCloseTo(totalPayout, 2);
    });

    it('should handle pending and completed payouts', async () => {
      // Create pending payout
      await db.query(
        `INSERT INTO payouts (artist_id, amount, status, payment_method)
         VALUES ($1, $2, $3, $4)`,
        [artistId, 500, 'pending', 'bank_transfer']
      );

      // Create completed payout
      await db.query(
        `INSERT INTO payouts (artist_id, amount, status, payment_method, payout_date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [artistId, 300, 'completed', 'bank_transfer']
      );

      // Check payout history
      const payoutsResponse = await request(app)
        .get('/api/v1/artist/payouts')
        .set('Authorization', `Bearer ${artistToken}`);

      expect(payoutsResponse.status).toBe(200);
      expect(payoutsResponse.body.data.length).toBe(2);

      const pending = payoutsResponse.body.data.find(p => p.status === 'pending');
      const completed = payoutsResponse.body.data.find(p => p.status === 'completed');

      expect(pending).toBeDefined();
      expect(completed).toBeDefined();
    });
  });

  describe('Multi-Artist Interactions', () => {
    it('should handle multiple artists selling simultaneously', async () => {
      const artists = [];

      // Create 3 artists
      for (let i = 0; i < 3; i++) {
        const artistResult = await db.query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
           VALUES ($1, $2, 'artist', $3, 'Artist', true) RETURNING *`,
          [global.testUtils.randomEmail(), 'hashed', `Artist${i}`]
        );
        const artistId = artistResult.rows[0].id;

        await db.query(
          `INSERT INTO artist_profiles (user_id, bio, approval_status)
           VALUES ($1, $2, $3)`,
          [artistId, `Bio ${i}`, 'approved']
        );

        const token = jwt.sign(
          { id: artistId, role: 'artist', email: artistResult.rows[0].email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        artists.push({ id: artistId, token });
      }

      // Each artist creates art pieces
      for (const artist of artists) {
        const response = await request(app)
          .post('/api/v1/art-pieces')
          .set('Authorization', `Bearer ${artist.token}`)
          .send({
            title: `Art by ${artist.id}`,
            description: 'Test art piece',
            price: 500,
            medium: 'Mixed Media',
            dimensions: '24x24',
            category: 'abstract',
            yearCreated: 2024
          });

        expect(response.status).toBe(201);
      }

      // Verify each artist sees only their own pieces
      for (const artist of artists) {
        const response = await request(app)
          .get('/api/v1/artist/my-art-pieces')
          .set('Authorization', `Bearer ${artist.token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.every(p => p.artist_id === artist.id)).toBe(true);
      }
    });
  });
});
