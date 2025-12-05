const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Unit Tests - Authentication Utils', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct passwords', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT tokens', () => {
      const payload = { id: 'test-id', email: 'test@test.com', role: 'buyer' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should decode JWT tokens correctly', () => {
      const payload = { id: 'test-id', email: 'test@test.com', role: 'buyer' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject tokens with wrong secret', () => {
      const payload = { id: 'test-id', email: 'test@test.com' };
      const token = jwt.sign(payload, 'wrong-secret');

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow();
    });

    it('should reject expired tokens', () => {
      const payload = { id: 'test-id', email: 'test@test.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow();
    });
  });

  describe('Email Validation', () => {
    const isValidEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Password Strength Validation', () => {
    const isStrongPassword = (password) => {
      // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return regex.test(password);
    };

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'C0mplex!Pass',
        'Str0ng&Safe'
      ];

      strongPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'PASSWORD',
        'Pass123',  // Missing special char
        'pass!',    // Too short
        'PASSWORD123!' // Missing lowercase
      ];

      weakPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(false);
      });
    });
  });
});
