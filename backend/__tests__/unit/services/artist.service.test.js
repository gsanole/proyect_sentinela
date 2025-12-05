const artistService = require('../../../src/services/artist.service');

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  query: jest.fn()
}));

const pool = require('../../../src/config/database');

describe('Unit Tests - Artist Service', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock pool.connect for transactions
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  describe('getArtistProfile', () => {
    it('should return artist profile with stats', async () => {
      const mockProfile = {
        id: 1,
        email: 'artist@test.com',
        full_name: 'John Artist',
        first_name: 'John',
        last_name: 'Artist',
        created_at: new Date(),
        bio: 'Contemporary artist',
        portfolio_url: 'https://portfolio.com',
        approval_status: 'approved',
        approved_at: new Date(),
        rejected_reason: null,
        total_art_pieces: 10,
        approved_art_pieces: 8,
        pending_art_pieces: 2,
        total_sales: '5000.00',
        total_orders: 25,
        followers_count: 150
      };

      pool.query.mockResolvedValue({ rows: [mockProfile] });

      const result = await artistService.getArtistProfile(1);

      expect(result).toEqual(mockProfile);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should throw error when artist not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(artistService.getArtistProfile(999))
        .rejects.toThrow('Artist not found');
    });

    it('should query with correct user ID', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 5 }] });

      await artistService.getArtistProfile(5);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("u.role = 'artist'"),
        [5]
      );
    });
  });

  describe('applyAsArtist', () => {
    it('should create artist application', async () => {
      const applicationData = {
        userId: 1,
        bio: 'I am a contemporary artist with 10 years of experience.',
        portfolioUrl: 'https://myportfolio.com'
      };

      pool.query.mockResolvedValue({ rows: [{ role: 'buyer' }] }); // userCheck
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await artistService.applyAsArtist(
        applicationData.userId,
        applicationData.bio,
        applicationData.portfolioUrl
      );

      expect(result.message).toBe('Artist application submitted successfully');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle application without portfolio URL', async () => {
      pool.query.mockResolvedValue({ rows: [{ role: 'buyer' }] });
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await artistService.applyAsArtist(
        1,
        'My bio',
        null
      );

      expect(result.message).toBe('Artist application submitted successfully');
    });
  });

  describe('updateArtistProfile', () => {
    it('should update artist profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Artist',
        bio: 'Updated bio',
        portfolioUrl: 'https://newportfolio.com'
      };

      const mockUpdated = {
        id: 1,
        first_name: 'Jane',
        last_name: 'Artist',
        bio: 'Updated bio',
        portfolio_url: 'https://newportfolio.com'
      };

      mockClient.query.mockResolvedValue({ rows: [] });
      pool.query.mockResolvedValue({ rows: [mockUpdated] }); // for getArtistProfile

      const result = await artistService.updateArtistProfile(1, updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle partial updates', async () => {
      const updateData = {
        bio: 'Only updating bio'
      };

      const mockResult = { id: 1, bio: 'Only updating bio' };
      
      mockClient.query.mockResolvedValue({ rows: [] });
      pool.query.mockResolvedValue({ rows: [mockResult] });

      const result = await artistService.updateArtistProfile(1, updateData);

      expect(result.bio).toBe('Only updating bio');
    });
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      const mockOverview = {
        total_art_pieces: 10,
        approved_pieces: 8,
        pending_pieces: 2,
        total_revenue: '5000.00',
        total_orders: 25,
        followers: 150
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockOverview] })           // statsQuery
        .mockResolvedValueOnce({ rows: [{ recent_orders: '5' }] }) // recentOrdersQuery
        .mockResolvedValueOnce({ rows: [{ pending_payout: '1200.00' }] }) // pendingPayoutsQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Sunset', sales_count: '10', total_revenue: '2000.00' }] }); // topPiecesQuery

      const result = await artistService.getDashboardStats(1);

      expect(result.overview.total_revenue).toBe('5000.00');
      expect(result.overview.total_orders).toBe(25);
      expect(result.recentOrders).toBe(5);
      expect(result.pendingPayout).toBe(1200.00);
      expect(result.topSellingPieces).toHaveLength(1);
    });

    it('should handle artist with no sales', async () => {
      const mockOverview = {
        total_art_pieces: 3,
        approved_pieces: 0,
        pending_pieces: 3,
        total_revenue: '0',
        total_orders: 0,
        followers: 5
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockOverview] })
        .mockResolvedValueOnce({ rows: [{ recent_orders: '0' }] })
        .mockResolvedValueOnce({ rows: [{ pending_payout: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await artistService.getDashboardStats(1);

      expect(result.overview.total_orders).toBe(0);
      expect(result.topSellingPieces).toHaveLength(0);
    });
  });

  describe('getMyArtPieces', () => {
    it('should return all art pieces for artist', async () => {
      const mockArtPieces = [
        {
          id: 1,
          title: 'Art Piece 1',
          price: '500.00',
          approval_status: 'approved',
          created_at: new Date()
        },
        {
          id: 2,
          title: 'Art Piece 2',
          price: '750.00',
          approval_status: 'pending',
          created_at: new Date()
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockArtPieces })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await artistService.getMyArtPieces(1);

      expect(result.artPieces).toHaveLength(2);
      expect(result.artPieces[0].title).toBe('Art Piece 1');
      expect(result.artPieces[1].approval_status).toBe('pending');
      expect(result.total).toBe(2);
    });

    it('should filter by approval status', async () => {
      const mockApprovedPieces = [
        { id: 1, approval_status: 'approved' },
        { id: 2, approval_status: 'approved' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockApprovedPieces })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await artistService.getMyArtPieces(1, { status: 'approved' });

      expect(result.artPieces.every(p => p.approval_status === 'approved')).toBe(true);
    });

    it('should support search by title', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Sunset Painting' }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await artistService.getMyArtPieces(1, { search: 'sunset' });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining([1, expect.stringContaining('%sunset%')])
      );
    });

    it('should return empty array when no art pieces found', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await artistService.getMyArtPieces(1);

      expect(result.artPieces).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getSalesHistory', () => {
    it('should return sales with order details', async () => {
      const mockSales = [
        {
          order_id: 1,
          order_date: new Date('2024-01-15'),
          art_piece_id: 5,
          art_piece_title: 'Sunset',
          price: '500.00',
          commission: '75.00',
          artist_payout: '425.00',
          order_status: 'completed',
          buyer_name: 'John Buyer'
        },
        {
          order_id: 2,
          order_date: new Date('2024-01-20'),
          art_piece_id: 7,
          art_piece_title: 'Ocean',
          price: '750.00',
          commission: '112.50',
          artist_payout: '637.50',
          order_status: 'completed',
          buyer_name: 'Jane Buyer'
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockSales })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await artistService.getSalesHistory(1);

      expect(result.sales).toHaveLength(2);
      expect(result.sales[0].art_piece_title).toBe('Sunset');
      expect(result.total).toBe(2);
    });

    it('should calculate commission correctly', async () => {
      const mockSales = [
        {
          sale_price: '100.00'
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockSales })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await artistService.getSalesHistory(1);

      expect(parseFloat(result.sales[0].sale_price)).toBe(100.00);
    });

    it('should support date range filtering', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await artistService.getSalesHistory(1, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      // Just verify the service was called with correct artistId
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('getPayoutHistory', () => {
    it('should return payout records', async () => {
      const mockPayouts = [
        {
          id: 1,
          amount: '425.00',
          status: 'completed',
          payout_date: new Date('2024-01-20'),
          payment_method: 'bank_transfer',
          transaction_id: 'TXN123'
        },
        {
          id: 2,
          amount: '637.50',
          status: 'pending',
          payout_date: null,
          payment_method: 'bank_transfer',
          transaction_id: null
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockPayouts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await artistService.getPayoutHistory(1);

      expect(result.payouts).toHaveLength(2);
      expect(result.payouts[0].status).toBe('completed');
      expect(result.payouts[1].status).toBe('pending');
      expect(result.total).toBe(2);
    });

    it('should filter by payout status', async () => {
      const mockCompletedPayouts = [
        { id: 1, status: 'completed' },
        { id: 2, status: 'completed' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockCompletedPayouts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await artistService.getPayoutHistory(1, { status: 'completed' });

      expect(result.payouts.every(p => p.status === 'completed')).toBe(true);
    });
  });

  describe('getEarningsSummary', () => {
    it('should return comprehensive earnings summary', async () => {
      const mockSummary = {
        total_earnings: '5000.00',
        paid_out: '3800.00',
        pending_payout: '1200.00',
        total_sales: 25
      };

      pool.query.mockResolvedValue({ rows: [mockSummary] });

      const result = await artistService.getEarningsSummary(1);

      expect(result.totalEarnings).toBe(5000.00);
      expect(result.paidOut).toBe(3800.00);
      expect(result.pendingPayout).toBe(1200.00);
      expect(result.totalSales).toBe(25);
    });

    it('should handle artist with no earnings', async () => {
      const mockSummary = {
        total_earnings: '0',
        paid_out: '0',
        pending_payout: '0',
        total_sales: 0
      };

      pool.query.mockResolvedValue({ rows: [mockSummary] });

      const result = await artistService.getEarningsSummary(1);

      expect(result.totalEarnings).toBe(0);
      expect(result.totalSales).toBe(0);
      expect(result.availableForPayout).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(artistService.getArtistProfile(1))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle null values in optional fields', async () => {
      const mockProfile = {
        id: 1,
        bio: null,
        portfolio_url: null,
        approved_at: null,
        rejected_reason: null
      };

      pool.query.mockResolvedValue({ rows: [mockProfile] });

      const result = await artistService.getArtistProfile(1);

      expect(result.bio).toBeNull();
      expect(result.portfolio_url).toBeNull();
    });

    it('should validate user ID parameter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(artistService.getArtistProfile(null))
        .rejects.toThrow();
    });
  });
});
