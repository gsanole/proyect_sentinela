const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

/**
 * Run database migrations
 */
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running database migrations...');
    
    // Read and execute schema file
    const schemaPath = path.join(__dirname, '001_initial_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await client.query(statement);
    }
    
    console.log('✅ Migrations completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - users');
    console.log('  - artist_profiles');
    console.log('  - invite_codes');
    console.log('  - categories');
    console.log('  - art_pieces');
    console.log('  - art_images');
    console.log('  - promoted_listings');
    console.log('  - favorites');
    console.log('  - follows');
    console.log('  - orders');
    console.log('  - order_items');
    console.log('  - reviews');
    console.log('  - payouts');
    console.log('  - notifications');
    console.log('\nDefault data inserted:');
    console.log('  - 6 art categories');
    console.log('  - Admin user (email: admin@arthubmke.com)');
    console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
