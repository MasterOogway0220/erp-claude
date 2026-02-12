/**
 * Emergency Admin User Creation Script
 * Run this locally to create admin user in production database
 *
 * Usage: node create-admin.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Your production database URL
const DATABASE_URL = 'postgresql://erp_user:WkuRJfCBZmQw6V9midS2Acqh5bxxOIBA@dpg-d66dqgmsb7us73e7kn20-a/erp_claude';

async function createAdmin() {
  console.log('🔧 Connecting to production database...');

  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Check current users
    console.log('\n📋 Checking existing users...');
    const checkResult = await pool.query('SELECT email, role, "isActive" FROM "User"');
    console.log(`Found ${checkResult.rows.length} existing user(s):`);
    checkResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    // Delete existing admin if any
    console.log('\n🗑️  Removing old admin user (if exists)...');
    await pool.query('DELETE FROM "User" WHERE email = $1', ['admin@erp.com']);

    // Create password hash
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    const insertResult = await pool.query(`
      INSERT INTO "User" (
        id,
        name,
        email,
        "passwordHash",
        role,
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW(),
        NOW()
      )
      RETURNING id, email, role
    `, [
      'System Administrator',
      'admin@erp.com',
      passwordHash,
      'ADMIN',
      true
    ]);

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', insertResult.rows[0].email);
    console.log('🔑 Password: Admin@123');
    console.log('👤 Role:', insertResult.rows[0].role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verify
    console.log('\n🔍 Verifying admin user...');
    const verifyResult = await pool.query(
      'SELECT email, role, "isActive" FROM "User" WHERE email = $1',
      ['admin@erp.com']
    );

    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful!');
      console.log('   Email:', verifyResult.rows[0].email);
      console.log('   Role:', verifyResult.rows[0].role);
      console.log('   Active:', verifyResult.rows[0].isActive);
    }

    console.log('\n🎉 Done! You can now login at:');
    console.log('   https://erp-claude.onrender.com/login');
    console.log('   Email: admin@erp.com');
    console.log('   Password: Admin@123');
    console.log('\n⚠️  IMPORTANT: Change password after first login!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run it
createAdmin()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
