const AnalyticsService = require('../../../src/services/analytics.service');
const { pool } = require('../../../src/config/database');

// Mock the database
jest.mock('../../../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      // Mock all the queries in sequence
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '150' }] }) // total users
        .mockResolvedValueOnce({ rows: [{ total: '25' }] })  // total artists
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })   // pending artists
        .mockResolvedValueOnce({ rows: [{ total: '100' }] }) // total art pieces
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })  // pending art
        .mockResolvedValueOnce({ rows: [{ total: '15000.50' }] }) // revenue
        .mockResolvedValueOnce({ rows: [{ total: '45' }] })  // total orders
        .mockResolvedValueOnce({ rows: [{ total: '20' }] })  // recent users
        .mockResolvedValueOnce({ rows: [{ total: '12' }] })  // recent orders
        .mockResolvedValueOnce({ rows: [ // top categories
          { name: 'Painting', sales_count: '30' },
          { name: 'Sculpture', sales_count: '15' }
        ] });

      const result = await AnalyticsService.getDashboardStats();

      expect(result).toEqual({
        overview: {
          totalUsers: 150,
          totalArtists: 25,
          totalArtPieces: 100,
          totalOrders: 45,
          totalRevenue: 15000.50
        },
        pending: {
          artists: 5,
          artPieces: 10
        },
        recentActivity: {
          usersLast30Days: 20,
          ordersLast30Days: 12
        },
        topCategories: [
          { name: 'Painting', sales_count: 30 },
          { name: 'Sculpture', sales_count: 15 }
        ]
      });

      expect(pool.query).toHaveBeenCalledTimes(10);
    });

    it('should handle zero values correctly', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await AnalyticsService.getDashboardStats();

      expect(result.overview.totalUsers).toBe(0);
      expect(result.overview.totalRevenue).toBe(0);
      expect(result.topCategories).toEqual([]);
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(AnalyticsService.getDashboardStats()).rejects.toThrow('Database connection failed');
    });

    it('should query only active users', async () => {
      pool.query.mockResolvedValue({ rows: [{ total: '0' }] });

      await AnalyticsService.getDashboardStats();

      expect(pool.query.mock.calls[0][0]).toContain('is_active = true');
    });

    it('should filter orders by completed statuses', async () => {
      pool.query.mockResolvedValue({ rows: [{ total: '0' }] });

      await AnalyticsService.getDashboardStats();

      const revenueQuery = pool.query.mock.calls[5][0];
      expect(revenueQuery).toContain("status IN ('paid', 'ready_for_pickup', 'completed')");
    });
  });

  describe('getRevenueChart', () => {
    it('should return revenue data for specified days', async () => {
      const mockData = [
        { date: '2025-11-01', revenue: '500.00', orders: '5' },
        { date: '2025-11-02', revenue: '750.50', orders: '8' },
        { date: '2025-11-03', revenue: '1200.00', orders: '12' }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await AnalyticsService.getRevenueChart(7);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2025-11-01',
        revenue: 500.00,
        orders: 5
      });
      expect(result[1]).toEqual({
        date: '2025-11-02',
        revenue: 750.50,
        orders: 8
      });
      expect(result[2]).toEqual({
        date: '2025-11-03',
        revenue: 1200.00,
        orders: 12
      });
    });

    it('should default to 30 days', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRevenueChart();

      expect(pool.query.mock.calls[0][0]).toContain("'30 days'");
    });

    it('should use custom day range', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRevenueChart(90);

      expect(pool.query.mock.calls[0][0]).toContain("'90 days'");
    });

    it('should handle empty result', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await AnalyticsService.getRevenueChart(7);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(AnalyticsService.getRevenueChart(7)).rejects.toThrow('Query failed');
    });

    it('should order by date ascending', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRevenueChart(7);

      expect(pool.query.mock.calls[0][0]).toContain('ORDER BY date ASC');
    });
  });

  describe('getTopArtists', () => {
    it('should return top artists by sales', async () => {
      const mockArtists = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          pieces_count: '15',
          total_sales: '5000.00',
          approval_status: 'approved'
        },
        {
          id: '2',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@test.com',
          pieces_count: '10',
          total_sales: '3500.00',
          approval_status: 'approved'
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockArtists });

      const result = await AnalyticsService.getTopArtists(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@test.com',
        piecesCount: 15,
        totalSales: 5000.00,
        status: 'approved'
      });
      expect(result[1]).toEqual({
        id: '2',
        name: 'Jane Smith',
        email: 'jane@test.com',
        piecesCount: 10,
        totalSales: 3500.00,
        status: 'approved'
      });
    });

    it('should default to 10 artists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getTopArtists();

      expect(pool.query.mock.calls[0][1]).toEqual([10]);
    });

    it('should use custom limit', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getTopArtists(5);

      expect(pool.query.mock.calls[0][1]).toEqual([5]);
    });

    it('should handle artists with no sales', async () => {
      const mockArtists = [
        {
          id: '1',
          first_name: 'New',
          last_name: 'Artist',
          email: 'new@test.com',
          pieces_count: '5',
          total_sales: '0',
          approval_status: 'approved'
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockArtists });

      const result = await AnalyticsService.getTopArtists(10);

      expect(result[0].totalSales).toBe(0);
    });

    it('should order by total sales descending', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getTopArtists(10);

      expect(pool.query.mock.calls[0][0]).toContain('ORDER BY total_sales DESC');
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(AnalyticsService.getTopArtists(10)).rejects.toThrow('Query failed');
    });
  });

  describe('getRecentOrders', () => {
    it('should return recent orders with buyer info', async () => {
      const mockOrders = [
        {
          id: '1',
          total_amount: '500.00',
          status: 'paid',
          created_at: new Date('2025-11-18'),
          first_name: 'John',
          last_name: 'Buyer',
          email: 'buyer@test.com',
          items_count: '3'
        },
        {
          id: '2',
          total_amount: '250.00',
          status: 'ready_for_pickup',
          created_at: new Date('2025-11-17'),
          first_name: 'Jane',
          last_name: 'Customer',
          email: 'customer@test.com',
          items_count: '1'
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockOrders });

      const result = await AnalyticsService.getRecentOrders(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        totalAmount: 500.00,
        status: 'paid',
        createdAt: new Date('2025-11-18'),
        buyer: {
          name: 'John Buyer',
          email: 'buyer@test.com'
        },
        itemsCount: 3
      });
    });

    it('should default to 10 orders', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRecentOrders();

      expect(pool.query.mock.calls[0][1]).toEqual([10]);
    });

    it('should use custom limit', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRecentOrders(25);

      expect(pool.query.mock.calls[0][1]).toEqual([25]);
    });

    it('should order by created_at descending', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRecentOrders(10);

      expect(pool.query.mock.calls[0][0]).toContain('ORDER BY o.created_at DESC');
    });

    it('should handle empty result', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await AnalyticsService.getRecentOrders(10);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(AnalyticsService.getRecentOrders(10)).rejects.toThrow('Connection lost');
    });

    it('should group by all order fields', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AnalyticsService.getRecentOrders(10);

      const query = pool.query.mock.calls[0][0];
      expect(query).toContain('GROUP BY');
      expect(query).toContain('o.id');
      expect(query).toContain('u.first_name');
      expect(query).toContain('u.last_name');
    });
  });
});
