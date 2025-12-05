const EmailVerificationService = require('../../../src/services/emailVerification.service');
const pool = require('../../../src/config/database');
const { sendEmail } = require('../../../src/utils/email');

jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/email');

describe('EmailVerificationService', () => {
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

  describe('generateToken', () => {
    it('should generate a random 64-character hex token', () => {
      const token1 = EmailVerificationService.generateToken();
      const token2 = EmailVerificationService.generateToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should generate token, store it, and send email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await EmailVerificationService.sendVerificationEmail(
        'user123',
        'test@example.com',
        'John'
      );

      expect(result.token).toBeDefined();
      expect(result.token).toHaveLength(64);
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Check token was stored
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_verification_tokens'),
        expect.arrayContaining(['user123', result.token])
      );

      // Check email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('Verify Your Email'),
        expect.stringContaining('Welcome to Art Hub Milwaukee, John!')
      );
    });

    it('should include verification URL in email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      process.env.FRONTEND_URL = 'http://localhost:3000';

      await EmailVerificationService.sendVerificationEmail(
        'user123',
        'test@example.com',
        'Jane'
      );

      const emailHtml = sendEmail.mock.calls[0][2];
      expect(emailHtml).toContain('verify-email?token=');
      expect(emailHtml).toContain('http://localhost:3000');
    });

    it('should set expiration to 24 hours from now', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const beforeTime = Date.now() + 24 * 60 * 60 * 1000;
      const result = await EmailVerificationService.sendVerificationEmail(
        'user123',
        'test@example.com',
        'John'
      );
      const afterTime = Date.now() + 24 * 60 * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(afterTime + 1000);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and mark token as used', async () => {
      const token = 'valid-token-123';
      const userId = 'user123';

      pool.query
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
        .mockResolvedValueOnce({ rows: [{ 
          id: userId, 
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'buyer',
          email_verified: true 
        }] });

      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await EmailVerificationService.verifyEmail(token);

      expect(result.id).toBe(userId);
      expect(result.email_verified).toBe(true);

      // Verify transaction
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify user was updated
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET email_verified = true'),
        [userId]
      );

      // Verify token was marked as used
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE email_verification_tokens SET used_at = NOW()'),
        [token]
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(EmailVerificationService.verifyEmail('expired-token'))
        .rejects.toThrow('Invalid or expired verification token');
    });

    it('should reject invalid token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(EmailVerificationService.verifyEmail('invalid-token'))
        .rejects.toThrow('Invalid or expired verification token');
    });

    it('should rollback on error', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ user_id: 'user123' }] });
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(EmailVerificationService.verifyEmail('token'))
        .rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    it('should send new verification email for unverified user', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ 
          id: 'user123', 
          first_name: 'John',
          email_verified: false 
        }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await EmailVerificationService.resendVerificationEmail('test@example.com');

      expect(result.message).toBe('Verification email sent');

      // Old tokens should be deleted
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM email_verification_tokens'),
        ['user123']
      );

      // New email should be sent
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should reject already verified email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ 
        id: 'user123',
        first_name: 'John',
        email_verified: true 
      }] });

      await expect(EmailVerificationService.resendVerificationEmail('test@example.com'))
        .rejects.toThrow('Email is already verified');
    });

    it('should not reveal if user does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await EmailVerificationService.resendVerificationEmail('nonexistent@example.com');

      expect(result.message).toBe('If an account exists, a verification email will be sent');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should not reveal if user is inactive', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await EmailVerificationService.resendVerificationEmail('inactive@example.com');

      expect(result.message).toBe('If an account exists, a verification email will be sent');
    });
  });

  describe('isEmailVerified', () => {
    it('should return true for verified email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ email_verified: true }] });

      const result = await EmailVerificationService.isEmailVerified('user123');

      expect(result).toBe(true);
    });

    it('should return false for unverified email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ email_verified: false }] });

      const result = await EmailVerificationService.isEmailVerified('user123');

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await EmailVerificationService.isEmailVerified('nonexistent');

      expect(result).toBe(false);
    });
  });
});
