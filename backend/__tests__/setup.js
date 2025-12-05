const { Pool } = require('pg');

// Only setup database pool for integration/e2e tests
// Unit tests should mock all database interactions
const isIntegrationTest = process.argv.some(arg => 
  arg.includes('integration') || 
  arg.includes('e2e') || 
  arg.includes('security') ||
  arg.includes('smoke') ||
  arg.includes('performance')
);

let testPool;

if (isIntegrationTest) {
  // Test database configuration
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'art_hub_test_db',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    max: 5, // Limit concurrent connections to avoid "too many clients" error
  });

  // Setup before all tests
  beforeAll(async () => {
    // Clean database before tests
    await testPool.query('DELETE FROM reviews');
    await testPool.query('DELETE FROM favorites');
    await testPool.query('DELETE FROM follows');
    await testPool.query('DELETE FROM order_items');
    await testPool.query('DELETE FROM orders');
    await testPool.query('DELETE FROM promoted_listings');
    await testPool.query('DELETE FROM art_tags');
    await testPool.query('DELETE FROM art_categories');
    await testPool.query('DELETE FROM art_images');
    await testPool.query('DELETE FROM art_pieces');
    await testPool.query('DELETE FROM artist_profiles');
    await testPool.query('DELETE FROM invite_codes');
    await testPool.query('DELETE FROM notifications');
    await testPool.query('DELETE FROM payouts');
    await testPool.query('DELETE FROM users');
  });

  // Cleanup after all tests
  afterAll(async () => {
    await testPool.end();
  });

  // Export pool for use in tests
  global.db = testPool;
}

// Global test utilities
global.testUtils = {
  // Generate random email
  randomEmail: () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
  
  // Generate random string
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.AWS_ACCESS_KEY_ID = 'mock_aws_key';
process.env.AWS_SECRET_ACCESS_KEY = 'mock_aws_secret';
process.env.S3_BUCKET_NAME = 'test-bucket';
