const TwoFactorService = require('../../../src/services/twoFactor.service');
const pool = require('../../../src/config/database');
const { sendEmail } = require('../../../src/utils/email');
const bcrypt = require('bcryptjs');

jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/email');
jest.mock('bcryptjs');

describe('TwoFactorService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect = jest.fn().mockResolvedValue(mockClient);
    pool.query = jest.fn();
    sendEmail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  describe('generateSecret', () => {
    it('should generate a random 40-character hex secret', () => {
      const secret1 = TwoFactorService.generateSecret();
      const secret2 = TwoFactorService.generateSecret();

      expect(secret1).toHaveLength(40);
      expect(secret2).toHaveLength(40);
      expect(secret1).not.toBe(secret2);
      expect(secret1).toMatch(/^[0-9a-f]{40}$/);
    });
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP code', () => {
      const otp = TwoFactorService.generateOTP();

      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    it('should generate different codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(TwoFactorService.generateOTP());
      }
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA and generate backup codes', async () => {
      bcrypt.hash.mockResolvedValue('hashed-code');
      pool.query.mockResolvedValue({ rows: [] });

      const result = await TwoFactorService.enable2FA('user123');

      expect(result.secret).toBeDefined();
      expect(result.secret).toHaveLength(40);
      expect(result.backupCodes).toHaveLength(8);

      // Check user was updated
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([result.secret, 'user123'])
      );

      // Check backup codes were stored
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO two_factor_backup_codes'),
        expect.anything()
      );

      // Should be called 9 times: 1 UPDATE + 8 INSERT
      expect(pool.query).toHaveBeenCalledTimes(9);
    });

    it('should generate unique backup codes', async () => {
      bcrypt.hash.mockResolvedValue('hashed-code');
      pool.query.mockResolvedValue({ rows: [] });

      const result = await TwoFactorService.enable2FA('user123');
      const uniqueCodes = new Set(result.backupCodes);

      expect(uniqueCodes.size).toBe(8);
    });

    it('should hash backup codes before storing', async () => {
      bcrypt.hash.mockResolvedValue('hashed-code');
      pool.query.mockResolvedValue({ rows: [] });

      await TwoFactorService.enable2FA('user123');

      expect(bcrypt.hash).toHaveBeenCalledTimes(8);
      expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA and remove backup codes', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await TwoFactorService.disable2FA('user123');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Check user was updated
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['user123']
      );

      // Check backup codes were deleted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM two_factor_backup_codes'),
        ['user123']
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(TwoFactorService.disable2FA('user123'))
        .rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('sendOTPCode', () => {
    it('should generate and send OTP code via email', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await TwoFactorService.sendOTPCode(
        'user123',
        'test@example.com',
        'John'
      );

      expect(result.expiresAt).toBeInstanceOf(Date);

      // Check code was stored
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO two_factor_codes'),
        expect.arrayContaining(['user123', expect.any(String)])
      );

      // Check email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('2FA Verification Code'),
        expect.stringContaining('Hi John')
      );

      const emailHtml = sendEmail.mock.calls[0][2];
      expect(emailHtml).toMatch(/\d{6}/);
    });

    it('should set expiration to 10 minutes from now', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const beforeTime = Date.now() + 10 * 60 * 1000;
      const result = await TwoFactorService.sendOTPCode(
        'user123',
        'test@example.com',
        'John'
      );
      const afterTime = Date.now() + 10 * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(afterTime + 1000);
    });

    it('should upsert on conflict (replace existing code)', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await TwoFactorService.sendOTPCode('user123', 'test@example.com', 'John');

      const query = pool.query.mock.calls[0][0];
      expect(query).toContain('ON CONFLICT');
      expect(query).toContain('DO UPDATE');
    });
  });

  describe('verifyOTPCode', () => {
    it('should verify correct OTP code', async () => {
      const correctCode = '123456';
      pool.query
        .mockResolvedValueOnce({ rows: [{ code: correctCode, expires_at: new Date(Date.now() + 60000) }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await TwoFactorService.verifyOTPCode('user123', correctCode);

      expect(result).toBe(true);

      // Code should be deleted after use
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM two_factor_codes'),
        ['user123']
      );
    });

    it('should reject incorrect OTP code', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ code: '123456', expires_at: new Date(Date.now() + 60000) }] });

      await expect(TwoFactorService.verifyOTPCode('user123', '654321'))
        .rejects.toThrow('Invalid verification code');
    });

    it('should reject expired OTP code', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(TwoFactorService.verifyOTPCode('user123', '123456'))
        .rejects.toThrow('Invalid or expired verification code');
    });

    it('should reject when no code exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(TwoFactorService.verifyOTPCode('user123', '123456'))
        .rejects.toThrow('Invalid or expired verification code');
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify correct backup code and mark as used', async () => {
      const backupCode = 'ABCD1234';
      bcrypt.compare.mockResolvedValue(true);
      pool.query
        .mockResolvedValueOnce({ rows: [
          { id: 'code1', code_hash: 'hash1' },
          { id: 'code2', code_hash: 'hash2' }
        ] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await TwoFactorService.verifyBackupCode('user123', backupCode);

      expect(result).toBe(true);

      // Code should be marked as used
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE two_factor_backup_codes SET used_at = NOW()'),
        ['code1']
      );
    });

    it('should try all unused backup codes', async () => {
      const backupCode = 'CORRECT1';
      bcrypt.compare
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      pool.query
        .mockResolvedValueOnce({ rows: [
          { id: 'code1', code_hash: 'hash1' },
          { id: 'code2', code_hash: 'hash2' },
          { id: 'code3', code_hash: 'hash3' }
        ] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await TwoFactorService.verifyBackupCode('user123', backupCode);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledTimes(3);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE two_factor_backup_codes SET used_at = NOW()'),
        ['code3']
      );
    });

    it('should reject invalid backup code', async () => {
      bcrypt.compare.mockResolvedValue(false);
      pool.query.mockResolvedValueOnce({ rows: [
        { id: 'code1', code_hash: 'hash1' }
      ] });

      await expect(TwoFactorService.verifyBackupCode('user123', 'INVALID'))
        .rejects.toThrow('Invalid backup code');
    });

    it('should reject when no unused backup codes exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(TwoFactorService.verifyBackupCode('user123', 'CODE'))
        .rejects.toThrow('Invalid backup code');
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ two_factor_enabled: true }] });

      const result = await TwoFactorService.is2FAEnabled('user123');

      expect(result).toBe(true);
    });

    it('should return false when 2FA is disabled', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ two_factor_enabled: false }] });

      const result = await TwoFactorService.is2FAEnabled('user123');

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await TwoFactorService.is2FAEnabled('nonexistent');

      expect(result).toBe(false);
    });
  });
});
