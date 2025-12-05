const {
  isValidEmail,
  isStrongPassword,
  isValidPhone,
  sanitizeInput,
  isValidPrice,
  isValidUUID,
  validatePagination,
  isValidDateRange,
  isValidImageFile
} = require('../../../src/utils/validation');

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('test+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user name@domain.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should accept strong passwords', () => {
      const result = isStrongPassword('Password123');
      expect(result.valid).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = isStrongPassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject passwords without uppercase', () => {
      const result = isStrongPassword('password123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase letter');
    });

    it('should reject passwords without lowercase', () => {
      const result = isStrongPassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = isStrongPassword('Password');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should accept passwords with special characters', () => {
      const result = isStrongPassword('Password123!@#');
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidPhone', () => {
    it('should accept valid 10-digit US phone numbers', () => {
      expect(isValidPhone('4141234567')).toBe(true);
      expect(isValidPhone('414-123-4567')).toBe(true);
      expect(isValidPhone('(414) 123-4567')).toBe(true);
      expect(isValidPhone('414.123.4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('12345678901')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
    });

    it('should allow empty/null phone (optional field)', () => {
      expect(isValidPhone('')).toBe(true);
      expect(isValidPhone(null)).toBe(true);
      expect(isValidPhone(undefined)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeInput('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape quotes', () => {
      expect(sanitizeInput('He said "Hello"')).toContain('&quot;');
      expect(sanitizeInput("It's a test")).toContain('&#x27;');
    });

    it('should escape forward slashes', () => {
      expect(sanitizeInput('path/to/file')).toContain('&#x2F;');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('isValidPrice', () => {
    it('should accept valid prices', () => {
      expect(isValidPrice(10).valid).toBe(true);
      expect(isValidPrice(99.99).valid).toBe(true);
      expect(isValidPrice('500').valid).toBe(true);
      expect(isValidPrice('1000.50').valid).toBe(true);
    });

    it('should reject non-numeric prices', () => {
      const result = isValidPrice('abc');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be a number');
    });

    it('should reject prices less than $1', () => {
      const result = isValidPrice(0.99);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least $1');
    });

    it('should reject prices over $1,000,000', () => {
      const result = isValidPrice(1000001);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot exceed $1,000,000');
    });

    it('should reject prices with more than 2 decimal places', () => {
      const result = isValidPrice('99.999');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at most 2 decimal places');
    });

    it('should accept prices with 1 decimal place', () => {
      expect(isValidPrice('99.9').valid).toBe(true);
    });

    it('should accept prices with no decimal places', () => {
      expect(isValidPrice('100').valid).toBe(true);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // Wrong version
      expect(isValidUUID('550e8400-e29b-41d4-c716-446655440000')).toBe(false); // Wrong variant
      expect(isValidUUID('123')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
  });

  describe('validatePagination', () => {
    it('should return valid pagination with defaults', () => {
      const result = validatePagination();
      expect(result.valid).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should calculate offset correctly', () => {
      const result = validatePagination(3, 10);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should handle page of 0 by using default of 1', () => {
      const result = validatePagination(0, 20);
      expect(result.valid).toBe(true);
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should handle limit of 0 by using default of 20', () => {
      const result = validatePagination(1, 0);
      expect(result.valid).toBe(true);
      expect(result.limit).toBe(20);
    });

    it('should reject limit greater than 100', () => {
      const result = validatePagination(1, 101);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Limit must be between 1 and 100');
    });

    it('should handle string inputs', () => {
      const result = validatePagination('5', '25');
      expect(result.valid).toBe(true);
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });
  });

  describe('isValidDateRange', () => {
    it('should accept valid date ranges', () => {
      const result = isValidDateRange('2025-01-01', '2025-12-31');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid start date', () => {
      const result = isValidDateRange('invalid', '2025-12-31');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid start date');
    });

    it('should reject invalid end date', () => {
      const result = isValidDateRange('2025-01-01', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid end date');
    });

    it('should reject when start date is after end date', () => {
      const result = isValidDateRange('2025-12-31', '2025-01-01');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Start date must be before end date');
    });

    it('should accept same start and end date', () => {
      const result = isValidDateRange('2025-01-01', '2025-01-01');
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidImageFile', () => {
    it('should accept valid JPEG image', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 // 5MB
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid PNG image', () => {
      const file = {
        mimetype: 'image/png',
        size: 3 * 1024 * 1024
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid WebP image', () => {
      const file = {
        mimetype: 'image/webp',
        size: 2 * 1024 * 1024
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept JPG mimetype', () => {
      const file = {
        mimetype: 'image/jpg',
        size: 1024 * 1024
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject missing file', () => {
      const result = isValidImageFile(null);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('No file provided');
    });

    it('should reject invalid file types', () => {
      const file = {
        mimetype: 'application/pdf',
        size: 1024 * 1024
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Only JPEG, PNG, and WebP');
    });

    it('should reject files over 10MB', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024 // 11MB
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot exceed 10MB');
    });

    it('should accept file exactly at 10MB limit', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024
      };
      const result = isValidImageFile(file);
      expect(result.valid).toBe(true);
    });
  });
});
