const bcrypt = require('bcryptjs');

// Generate admin password hash
const generateAdminPassword = async () => {
  const password = 'Admin123!';  // Change this to your desired password
  const hash = await bcrypt.hash(password, 10);
  
  // Only output the hash (for script usage)
  if (process.argv.includes('--script')) {
    console.log(hash);
  } else {
    console.log('Admin password hash:');
    console.log(hash);
    console.log('\nReplace the password_hash in 001_initial_schema.sql with this value.');
    console.log('Default admin credentials:');
    console.log('  Email: admin@arthubmke.com');
    console.log('  Password: Admin123!');
    console.log('\n⚠️  Change this password after first login!');
  }
};

generateAdminPassword();
