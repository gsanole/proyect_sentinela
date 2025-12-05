const AuthService = require('../../../src/services/auth.service');
const pool = require('../../../src/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../../src/utils/email');
const twoFactorService = require('../../../src/services/twoFactor.service');
const emailVerificationService = require('../../../src/services/emailVerification.service');

jest.mock('../../../src/config/database');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../src/utils/email');
jest.mock('../../../src/services/twoFactor.service');
jest.mock('../../../src/services/emailVerification.service');

describe('AuthService', () => {
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
    
    // Setup service mocks
    emailVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue({});
    twoFactorService.sendOTPCode = jest.fn().mockResolvedValue({});
    twoFactorService.verifyOTPCode = jest.fn();
    twoFactorService.verifyBackupCode = jest.fn();
  });

  describe('registerBuyer', () => {
    const buyerData = {
      email: 'buyer@test.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '4141234567'
    };

    it('should register a new buyer successfully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [{ // Create user
          id: 'user123',
          email: 'buyer@test.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '4141234567',
          role: 'buyer',
          created_at: new Date()
        }] });

      bcrypt.hash.mockResolvedValue('hashed-password');

      const result = await AuthService.registerBuyer(buyerData);

      expect(result.user.email).toBe('buyer@test.com');
      expect(result.user.role).toBe('buyer');
      expect(result.user.email_verified).toBe(false);
      expect(result.requiresEmailVerification).toBe(true);
      expect(result.message).toContain('Please check your email');
    });

    it('should hash password before storing', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'user123', email: 'buyer@test.com', role: 'buyer' }] });

      bcrypt.hash.mockResolvedValue('hashed-password');

      await AuthService.registerBuyer(buyerData);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(pool.query.mock.calls[1][1]).toContain('hashed-password');
    });

    it('should reject duplicate email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

      await expect(AuthService.registerBuyer(buyerData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should trigger email verification (non-blocking)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'user123', email: 'buyer@test.com', first_name: 'John', role: 'buyer' }] });

      bcrypt.hash.mockResolvedValue('hashed-password');

      const emailVerificationService = require('../../../src/services/emailVerification.service');

      await AuthService.registerBuyer(buyerData);

      // Give a small delay for non-blocking call
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(emailVerificationService.sendVerificationEmail).toHaveBeenCalledWith(
        'user123',
        'buyer@test.com',
        'John'
      );
    });

    it('should reject duplicate buyer email (line 88)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] }); // Existing user found

      await expect(AuthService.registerBuyer(buyerData))
        .rejects.toThrow('User with this email already exists');
    });
  });

  describe('registerArtist', () => {
    const artistData = {
      email: 'artist@test.com',
      password: 'Password123',
      firstName: 'Jane',
      lastName: 'Artist',
      phone: '4141234567',
      inviteCode: 'VALID123',
      bio: 'Artist bio that is long enough to meet requirements',
      portfolioUrl: 'https://portfolio.com'
    };

    it('should register artist with valid invite code', async () => {
      let callCount = 0;
      mockClient.query = jest.fn((query) => {
        if (query === 'BEGIN') return Promise.resolve({ rows: [] });
        if (query === 'COMMIT') return Promise.resolve({ rows: [] });
        if (query === 'ROLLBACK') return Promise.resolve({ rows: [] });
        
        callCount++;
        if (callCount === 1) { // Get invite code
          return Promise.resolve({ rows: [{
            id: 'invite123',
            used_by: null,
            expires_at: new Date(Date.now() + 86400000)
          }] });
        }
        if (callCount === 2) { // Check existing user
          return Promise.resolve({ rows: [] });
        }
        if (callCount === 3) { // Create user
          return Promise.resolve({ rows: [{
            id: 'user456',
            email: 'artist@test.com',
            first_name: 'Jane',
            last_name: 'Artist',
            phone: '4141234567',
            role: 'artist',
            created_at: new Date()
          }] });
        }
        if (callCount === 4) { // Create artist profile
          return Promise.resolve({ rows: [{
            id: 'profile123',
            bio: artistData.bio,
            portfolio_url: artistData.portfolioUrl,
            approval_status: 'pending',
            created_at: new Date()
          }] });
        }
        return Promise.resolve({ rows: [] }); // Mark invite as used
      });

      bcrypt.hash.mockResolvedValue('hashed-password');

      const result = await AuthService.registerArtist(artistData);

      expect(result.user.role).toBe('artist');
      expect(result.user.artistProfile).toBeDefined();
      expect(result.user.artistProfile.approval_status).toBe('pending');
      expect(result.requiresEmailVerification).toBe(true);
    });

    it('should reject invalid invite code', async () => {
      mockClient.query = jest.fn((query) => {
        if (query === 'BEGIN') return Promise.resolve({ rows: [] });
        if (query === 'ROLLBACK') return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] }); // No invite code found
      });

      await expect(AuthService.registerArtist(artistData))
        .rejects.toThrow('Invalid invite code');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject used invite code', async () => {
      mockClient.query = jest.fn((query) => {
        if (query === 'BEGIN') return Promise.resolve({ rows: [] });
        if (query === 'ROLLBACK') return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [{
          id: 'invite123',
          used_by: 'other-user',
          expires_at: new Date(Date.now() + 86400000)
        }] });
      });

      await expect(AuthService.registerArtist(artistData))
        .rejects.toThrow('Invite code has already been used');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject expired invite code', async () => {
      mockClient.query = jest.fn((query) => {
        if (query === 'BEGIN') return Promise.resolve({ rows: [] });
        if (query === 'ROLLBACK') return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [{
          id: 'invite123',
          used_by: null,
          expires_at: new Date(Date.now() - 86400000)
        }] });
      });

      await expect(AuthService.registerArtist(artistData))
        .rejects.toThrow('Invite code has expired');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{
          id: 'invite123',
          used_by: null,
          expires_at: new Date(Date.now() + 86400000)
        }] })
        .mockRejectedValueOnce(new Error('DB error'));

      await expect(AuthService.registerArtist(artistData))
        .rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const userRow = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'John',
        last_name: 'Doe',
        phone: '4141234567',
        role: 'buyer',
        is_active: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date()
      };

      pool.query
        .mockResolvedValueOnce({ rows: [userRow] })
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('jwt-token');

      const result = await AuthService.login('test@example.com', 'password');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('jwt-token');
      expect(result.user.password_hash).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(AuthService.login('wrong@example.com', 'password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true,
        email_verified: true,
        two_factor_enabled: false,
        role: 'buyer'
      }] });

      bcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.login('test@example.com', 'wrong-password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject inactive account', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{
        id: 'user123',
        email: 'test@example.com',
        is_active: false
      }] });

      await expect(AuthService.login('test@example.com', 'password'))
        .rejects.toThrow('Account has been deactivated');
    });

    it('should reject unverified email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true,
        email_verified: false,
        role: 'buyer'
      }] });

      bcrypt.compare.mockResolvedValue(true);

      await expect(AuthService.login('test@example.com', 'password'))
        .rejects.toThrow('Please verify your email');
    });

    it('should handle 2FA enabled accounts', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'John',
        is_active: true,
        email_verified: true,
        two_factor_enabled: true,
        role: 'buyer'
      }] });

      bcrypt.compare.mockResolvedValue(true);

      const twoFactorService = require('../../../src/services/twoFactor.service');

      const result = await AuthService.login('test@example.com', 'password');

      expect(result.requires2FA).toBe(true);
      expect(result.userId).toBe('user123');
      expect(result.message).toContain('verification code');
      expect(twoFactorService.sendOTPCode).toHaveBeenCalled();
    });

    it('should include artist profile for artists', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{
          id: 'user123',
          email: 'artist@example.com',
          password_hash: 'hashed-password',
          first_name: 'Jane',
          last_name: 'Artist',
          role: 'artist',
          is_active: true,
          email_verified: true,
          two_factor_enabled: false,
          artist_profile_id: 'profile123',
          bio: 'Artist bio',
          portfolio_url: 'https://portfolio.com',
          approval_status: 'approved',
          stripe_account_id: 'stripe123'
        }] })
        .mockResolvedValueOnce({ rows: [] });

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('jwt-token');

      const result = await AuthService.login('artist@example.com', 'password');

      expect(result.user.artistProfile).toBeDefined();
      expect(result.user.artistProfile.bio).toBe('Artist bio');
      expect(result.user.artistProfile.approvalStatus).toBe('approved');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT with user data', () => {
      jwt.sign.mockReturnValue('generated-token');
      process.env.JWT_SECRET = 'test-secret';

      const user = { id: 'user123', email: 'test@example.com', role: 'buyer' };
      const token = AuthService.generateToken(user);

      expect(token).toBe('generated-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user123', email: 'test@example.com', role: 'buyer' },
        'test-secret',
        { expiresIn: '7d' }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const decoded = { id: 'user123', email: 'test@example.com', role: 'buyer' };
      jwt.verify.mockReturnValue(decoded);

      const result = AuthService.verifyToken('valid-token');

      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => AuthService.verifyToken('invalid-token'))
        .toThrow('Invalid or expired token');
    });
  });

  describe('requestPasswordReset', () => {
    it('should send reset email for existing user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{
        id: 'user123',
        first_name: 'John'
      }] });

      jwt.sign.mockReturnValue('reset-token');

      const result = await AuthService.requestPasswordReset('test@example.com');

      expect(result.message).toContain('If an account exists');
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not reveal non-existent user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await AuthService.requestPasswordReset('nonexistent@example.com');

      expect(result.message).toContain('If an account exists');
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      jwt.verify.mockReturnValue({ userId: 'user123', type: 'password_reset' });
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'user123' }] });

      const result = await AuthService.resetPassword('valid-reset-token', 'NewPassword123');

      expect(result.message).toBe('Password successfully reset');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
    });

    it('should reject invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.resetPassword('invalid-token', 'NewPassword123'))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should reject wrong token type', async () => {
      jwt.verify.mockReturnValue({ userId: 'user123', type: 'email_verification' });

      await expect(AuthService.resetPassword('wrong-type-token', 'NewPassword123'))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error if user not found during reset (line 309)', async () => {
      jwt.verify.mockReturnValue({ userId: 'user123', type: 'password_reset' });
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      pool.query.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(AuthService.resetPassword('valid-token', 'NewPassword123'))
        .rejects.toThrow('User not found or inactive');
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ password_hash: 'old-hashed' }] })
        .mockResolvedValueOnce({ rows: [] });

      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new-hashed');

      const result = await AuthService.changePassword('user123', 'OldPassword123', 'NewPassword123');

      expect(result.message).toBe('Password successfully changed');
    });

    it('should reject incorrect current password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ password_hash: 'hashed' }] });
      bcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.changePassword('user123', 'WrongPassword', 'NewPassword123'))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should reject non-existent user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(AuthService.changePassword('nonexistent', 'OldPassword', 'NewPassword'))
        .rejects.toThrow('User not found');
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA and complete login', async () => {
      twoFactorService.verifyOTPCode.mockResolvedValue(true);

      pool.query
        .mockResolvedValueOnce({ rows: [{
          id: 'user123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'buyer'
        }] })
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      jwt.sign.mockReturnValue('jwt-token');

      const result = await AuthService.verify2FA('user123', '123456', false);

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('jwt-token');
      expect(twoFactorService.verifyOTPCode).toHaveBeenCalledWith('user123', '123456');
    });

    it('should verify backup code when requested', async () => {
      twoFactorService.verifyBackupCode.mockResolvedValue(true);

      pool.query
        .mockResolvedValueOnce({ rows: [{
          id: 'user123',
          email: 'test@example.com',
          role: 'buyer'
        }] })
        .mockResolvedValueOnce({ rows: [] });

      jwt.sign.mockReturnValue('jwt-token');

      await AuthService.verify2FA('user123', 'BACKUP123', true);

      expect(twoFactorService.verifyBackupCode).toHaveBeenCalledWith('user123', 'BACKUP123');
    });

    it('should throw error if user not found during 2FA (line 341)', async () => {
      twoFactorService.verifyOTPCode.mockResolvedValue(true);

      pool.query.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(AuthService.verify2FA('nonexistent-user', '123456', false))
        .rejects.toThrow('User not found');
    });

    it('should format artist profile during 2FA login (lines 349-360)', async () => {
      twoFactorService.verifyOTPCode.mockResolvedValue(true);

      pool.query
        .mockResolvedValueOnce({ rows: [{
          id: 'artist123',
          email: 'artist@example.com',
          first_name: 'Jane',
          last_name: 'Artist',
          role: 'artist',
          artist_profile_id: 'profile123',
          bio: 'Artist bio',
          portfolio_url: 'https://portfolio.com',
          approval_status: 'approved',
          stripe_account_id: 'acct_123'
        }] })
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      jwt.sign.mockReturnValue('jwt-token');

      const result = await AuthService.verify2FA('artist123', '123456', false);

      expect(result.user.role).toBe('artist');
      expect(result.user.artistProfile).toEqual({
        id: 'profile123',
        bio: 'Artist bio',
        portfolioUrl: 'https://portfolio.com',
        approvalStatus: 'approved',
        stripeAccountId: 'acct_123'
      });
      expect(result.user.artist_profile_id).toBeUndefined();
      expect(result.user.bio).toBeUndefined();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email to buyer (lines 414-425)', async () => {
      await AuthService.sendWelcomeEmail('buyer@test.com', 'John');

      expect(sendEmail).toHaveBeenCalledWith(
        'buyer@test.com',
        'Welcome to Art Hub Milwaukee!',
        expect.stringContaining('Welcome, John!')
      );
      expect(sendEmail).toHaveBeenCalledWith(
        'buyer@test.com',
        expect.any(String),
        expect.stringContaining('Thank you for joining Art Hub Milwaukee')
      );
    });
  });

  describe('sendArtistWelcomeEmail', () => {
    it('should send artist welcome email (lines 427-438)', async () => {
      await AuthService.sendArtistWelcomeEmail('artist@test.com', 'Jane');

      expect(sendEmail).toHaveBeenCalledWith(
        'artist@test.com',
        'Welcome to Art Hub Milwaukee - Artist Application Received',
        expect.stringContaining('Welcome, Jane!')
      );
      expect(sendEmail).toHaveBeenCalledWith(
        'artist@test.com',
        expect.any(String),
        expect.stringContaining('currently under review')
      );
    });
  });
});
