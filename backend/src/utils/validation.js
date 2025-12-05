/**
 * Validation utilities
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
const isStrongPassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
};

/**
 * Validate phone number (US format)
 */
const isValidPhone = (phone) => {
  if (!phone) return true; // Phone is optional
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Must be 10 digits (US format)
  return digits.length === 10;
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate price
 */
const isValidPrice = (price) => {
  const numPrice = Number(price);
  
  if (isNaN(numPrice)) {
    return { valid: false, message: 'Price must be a number' };
  }

  if (numPrice < 1) {
    return { valid: false, message: 'Price must be at least $1' };
  }

  if (numPrice > 1000000) {
    return { valid: false, message: 'Price cannot exceed $1,000,000' };
  }

  // Check max 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(price.toString())) {
    return { valid: false, message: 'Price can have at most 2 decimal places' };
  }

  return { valid: true };
};

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate pagination parameters
 */
const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  if (pageNum < 1) {
    return { valid: false, message: 'Page must be at least 1' };
  }

  if (limitNum < 1 || limitNum > 100) {
    return { valid: false, message: 'Limit must be between 1 and 100' };
  }

  return { 
    valid: true, 
    page: pageNum, 
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };
};

/**
 * Validate date range
 */
const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { valid: false, message: 'Invalid start date' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, message: 'Invalid end date' };
  }

  if (start > end) {
    return { valid: false, message: 'Start date must be before end date' };
  }

  return { valid: true };
};

/**
 * Validate image file
 */
const isValidImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, message: 'No file provided' };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, message: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, message: 'File size cannot exceed 10MB' };
  }

  return { valid: true };
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidPhone,
  sanitizeInput,
  isValidPrice,
  isValidUUID,
  validatePagination,
  isValidDateRange,
  isValidImageFile
};
