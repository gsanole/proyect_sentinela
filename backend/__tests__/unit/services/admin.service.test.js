const AdminService = require('../../../src/services/admin.service');
const pool = require('../../../src/config/database');

// Mock the database
jest.mock('../../../src/config/database');

describe('AdminService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock client for transactions
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  describe('getArtists', () => {
    it('should return paginated artists list', async () => {
      const mockArtists = [
        {
          id: '1',
          email: 'artist@test.com',
          full_name: 'Test Artist',
          created_at: new Date(),
          bio: 'Artist bio',
          portfolio_url: 'https://portfolio.com',
          approval_status: 'approved',
          approved_at: new Date(),
          rejected_reason: null,
          art_pieces_count: '5',
          total_sales: '1500'
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockArtists }) // Main query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Count query

      const result = await AdminService.getArtists({ limit: 50, offset: 0 });

      expect(result.artists).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by approval status', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtists({ status: 'pending' });

      expect(pool.query.mock.calls[0][0]).toContain('approval_status = $1');
      expect(pool.query.mock.calls[0][1]).toContain('pending');
    });

    it('should filter by search term', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtists({ search: 'John' });

      expect(pool.query.mock.calls[0][0]).toContain('ILIKE');
      expect(pool.query.mock.calls[0][1]).toContain('%John%');
    });

    it('should handle multiple filters', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtists({ status: 'approved', search: 'Artist', limit: 10, offset: 20 });

      expect(pool.query.mock.calls[0][1]).toContain('approved');
      expect(pool.query.mock.calls[0][1]).toContain('%Artist%');
    });
  });

  describe('approveArtist', () => {
    it('should approve artist and log activity', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.approveArtist('user123', 'admin456');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE artist_profiles'),
        expect.arrayContaining(['admin456', 'user123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_activity_logs'),
        expect.arrayContaining(['admin456', 'user123'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(AdminService.approveArtist('user123', 'admin456')).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('rejectArtist', () => {
    it('should reject artist with reason and log activity', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.rejectArtist('user123', 'admin456', 'Incomplete portfolio');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE artist_profiles'),
        expect.arrayContaining(['Incomplete portfolio', 'user123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_activity_logs'),
        expect.arrayContaining(['admin456', 'user123'])
      );
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(AdminService.rejectArtist('user123', 'admin456', 'reason')).rejects.toThrow();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getArtPieces', () => {
    it('should return paginated art pieces', async () => {
      const mockArtPieces = [
        {
          id: '1',
          title: 'Test Art',
          description: 'Description',
          price: '500',
          approval_status: 'pending'
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockArtPieces })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await AdminService.getArtPieces({ limit: 50, offset: 0 });

      expect(result.artPieces).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtPieces({ status: 'approved' });

      expect(pool.query.mock.calls[0][0]).toContain('approval_status = $1');
    });

    it('should filter by artistId', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtPieces({ artistId: 'artist123' });

      expect(pool.query.mock.calls[0][1]).toContain('artist123');
    });

    it('should filter by categoryId', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtPieces({ categoryId: 'cat123' });

      expect(pool.query.mock.calls[0][1]).toContain('cat123');
    });

    it('should search by title/description/artist', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getArtPieces({ search: 'painting' });

      expect(pool.query.mock.calls[0][0]).toContain('ILIKE');
      expect(pool.query.mock.calls[0][1]).toContain('%painting%');
    });
  });

  describe('approveArtPiece', () => {
    it('should approve art piece and log activity', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.approveArtPiece('art123', 'admin456');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE art_pieces'),
        expect.arrayContaining(['admin456', 'art123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('admin_activity_logs'),
        expect.arrayContaining(['admin456', 'art123'])
      );
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(AdminService.approveArtPiece('art123', 'admin456')).rejects.toThrow();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('rejectArtPiece', () => {
    it('should reject art piece with reason', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.rejectArtPiece('art123', 'admin456', 'Low quality');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE art_pieces'),
        expect.arrayContaining(['Low quality', 'art123'])
      );
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        {
          id: '1',
          order_number: '1',
          status: 'paid',
          total_amount: '100',
          buyer_name: 'John Doe',
          buyer_email: 'john@test.com',
          items_count: '2',
          items: []
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await AdminService.getOrders({});

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getOrders({ status: 'paid' });

      expect(pool.query.mock.calls[0][0]).toContain('o.status = $1');
    });

    it('should filter by buyerId', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getOrders({ buyerId: 'buyer123' });

      expect(pool.query.mock.calls[0][1]).toContain('buyer123');
    });

    it('should search orders', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getOrders({ search: 'john' });

      expect(pool.query.mock.calls[0][0]).toContain('ILIKE');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status to ready_for_pickup', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.updateOrderStatus('order123', 'ready_for_pickup', 'admin456');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining(['ready_for_pickup', 'order123'])
      );
    });

    it('should handle picked_up status with completed_at', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await AdminService.updateOrderStatus('order123', 'picked_up', 'admin456');

      const updateCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('UPDATE orders')
      );
      expect(updateCall[0]).toContain('completed_at = NOW()');
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(AdminService.updateOrderStatus('order123', 'paid', 'admin456')).rejects.toThrow();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getPayouts', () => {
    it('should return paginated payouts', async () => {
      const mockPayouts = [
        {
          id: '1',
          amount: '500',
          status: 'pending',
          created_at: new Date(),
          artist_name: 'Artist Name',
          artist_email: 'artist@test.com'
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockPayouts })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await AdminService.getPayouts({});

      expect(result.payouts).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getPayouts({ status: 'processed' });

      expect(pool.query.mock.calls[0][0]).toContain('p.status = $1');
    });

    it('should filter by artistId', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getPayouts({ artistId: 'artist123' });

      expect(pool.query.mock.calls[0][1]).toContain('artist123');
    });
  });

  describe('processPayout', () => {
    it('should mark payout as processed', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.processPayout('payout123', 'admin456');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payouts'),
        expect.arrayContaining(['payout123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('admin_activity_logs'),
        expect.arrayContaining(['admin456', 'payout123'])
      );
    });
  });

  describe('getInviteCodes', () => {
    it('should return all invite codes', async () => {
      const mockCodes = [
        {
          id: '1',
          code: 'ABC123',
          is_active: true,
          max_uses: 1,
          uses_count: 0,
          created_at: new Date()
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockCodes })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await AdminService.getInviteCodes({});

      expect(result.inviteCodes).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter active codes', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getInviteCodes({ status: 'active' });

      expect(pool.query.mock.calls[0][0]).toContain('used_by IS NULL');
      expect(pool.query.mock.calls[0][0]).toContain('expires_at > NOW()');
    });

    it('should filter inactive codes', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.getInviteCodes({ status: 'inactive' });

      expect(pool.query.mock.calls[0][0]).toContain('used_by IS NOT NULL');
    });
  });

  describe('generateInviteCode', () => {
    it('should generate new invite code without expiration', async () => {
      const mockCode = {
        id: '1',
        code: 'ABC123',
        created_by: 'admin456',
        expires_at: null
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockCode] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await AdminService.generateInviteCode('admin456');

      expect(result.code).toBeDefined();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invite_codes'),
        expect.arrayContaining(['admin456'])
      );
    });

    it('should generate code with expiration', async () => {
      const mockCode = {
        id: '1',
        code: 'ABC123',
        created_by: 'admin456',
        expires_at: new Date()
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockCode] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await AdminService.generateInviteCode('admin456', { expiresInDays: 7 });

      expect(result).toBeDefined();
      expect(pool.query.mock.calls[0][1][2]).toBeInstanceOf(Date);
    });
  });

  describe('deactivateInviteCode', () => {
    it('should deactivate invite code', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await AdminService.deactivateInviteCode('code123', 'admin456');

      expect(result.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invite_codes'),
        expect.arrayContaining(['code123'])
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('admin_activity_logs'),
        expect.arrayContaining(['admin456', 'code123'])
      );
    });
  });
});
