const { pool } = require('../../../src/config/database');

// Mock pg Pool
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    on: jest.fn()
  };
  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('Database Configuration', () => {
  it('should create a database pool with environment variables', () => {
    const { Pool } = require('pg');
    
    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }));
  });

  it('should export query function', () => {
    const db = require('../../../src/config/database');
    
    expect(typeof db.query).toBe('function');
  });

  it('should export pool', () => {
    const db = require('../../../src/config/database');
    
    expect(db.pool).toBeDefined();
  });
});
