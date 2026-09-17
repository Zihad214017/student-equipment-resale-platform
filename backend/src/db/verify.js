const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment configuration (.env from backend or root)
const backendEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

/**
 * Configure PostgreSQL Client for Neon / Cloud PostgreSQL
 */
const getClientConfig = () => {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const isNeonOrCloud =
      connectionString.includes('neon.tech') ||
      connectionString.includes('sslmode=require') ||
      connectionString.includes('render.com') ||
      connectionString.includes('amazonaws.com') ||
      process.env.NODE_ENV === 'production';

    const ssl = (isNeonOrCloud && !isLocal) || process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false;

    return {
      connectionString,
      ssl,
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10) || 15000,
    };
  }

  // Fallback to discrete environment variables
  const host = process.env.DB_HOST || 'localhost';
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const ssl = (!isLocal || process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : false;

  return {
    host,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'student_equipment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl,
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10) || 15000,
  };
};

async function runDatabaseVerification() {
  const clientConfig = getClientConfig();
  const targetHost = clientConfig.connectionString
    ? clientConfig.connectionString.replace(/:[^:@]+@/, ':***@')
    : `${clientConfig.user}@${clientConfig.host}:${clientConfig.port}/${clientConfig.database}`;

  console.log('================================================================');
  console.log('Neon / PostgreSQL Database Verification Test Suite');
  console.log('Smart Student Old Equipment Tracking and Resale Platform');
  console.log('================================================================');
  console.log(`[Verify] Target Database: ${targetHost}`);
  console.log(`[Verify] SSL Mode: ${clientConfig.ssl ? 'Enabled (rejectUnauthorized: false)' : 'Disabled'}\n`);

  const client = new Client(clientConfig);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${testName} - ${details}`);
      throw new Error(`Test failed: ${testName} - ${details}`);
    }
  }

  try {
    console.log('1. Connecting directly to PostgreSQL database via pg package...');
    await client.connect();
    console.log('✓ Connected to PostgreSQL server.\n');

    // 1. Table Verification
    console.log('1. Verifying Application Tables in PostgreSQL...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = tablesResult.rows.map(r => r.table_name);
    const expectedTables = [
      'audit_logs', 'categories', 'equipment_images', 'equipment_listings',
      'notifications', 'payments', 'purchase_requests', 'reviews', 'transactions', 'users'
    ];

    expectedTables.forEach(table => {
      assert(tableNames.includes(table), `Table '${table}' exists in PostgreSQL`);
    });

    // 2. Data Integrity & Seed Verification
    console.log('\n2. Verifying User Accounts & Seed Dataset...');
    const usersResult = await client.query(`SELECT id, student_id, email, role, full_name FROM users ORDER BY created_at;`);
    assert(usersResult.rows.length >= 4, `Total users verified: ${usersResult.rows.length} (Expected >= 4)`);

    const admin = usersResult.rows.find(u => u.role === 'admin');
    assert(admin && admin.email === 'admin@university.edu', `Admin verified: ${admin?.full_name} (${admin?.email})`);

    const seller = usersResult.rows.find(u => u.student_id === 'STU-2023-0101');
    assert(seller && seller.email === 'seller.alex@university.edu', `Seller verified: ${seller?.full_name} (${seller?.email})`);

    const buyer = usersResult.rows.find(u => u.student_id === 'STU-2023-0202');
    assert(buyer && buyer.email === 'buyer.sarah@university.edu', `Buyer verified: ${buyer?.full_name} (${buyer?.email})`);

    // Verify categories
    const categoriesResult = await client.query(`SELECT id, name, slug FROM categories;`);
    assert(categoriesResult.rows.length >= 7, `Total academic categories verified: ${categoriesResult.rows.length} (Expected >= 7)`);

    // Verify equipment listings
    const listingsResult = await client.query(`SELECT id, title, condition, price, status FROM equipment_listings;`);
    assert(listingsResult.rows.length >= 1, `Equipment listings exist in database: ${listingsResult.rows.length}`);

    // Verify equipment images
    const imagesResult = await client.query(`SELECT id, equipment_id, is_primary FROM equipment_images;`);
    assert(imagesResult.rows.length >= 1, `Equipment images exist in database: ${imagesResult.rows.length}`);

    // Verify purchase requests
    const requestsResult = await client.query(`SELECT id, proposed_price, status FROM purchase_requests;`);
    assert(requestsResult.rows.length >= 1, `Purchase requests exist in database: ${requestsResult.rows.length}`);

    // Verify transactions
    const txResult = await client.query(`SELECT id, agreed_price, status FROM transactions;`);
    assert(txResult.rows.length >= 1, `Transactions exist in database: ${txResult.rows.length}`);

    // Verify payments
    const paymentsResult = await client.query(`SELECT id, amount, payment_method, payment_status FROM payments;`);
    assert(paymentsResult.rows.length >= 1, `Payments exist in database: ${paymentsResult.rows.length}`);

    // 3. Relational Queries & Joins
    console.log('\n3. Verifying Relational Queries, Indexes & Full-Text Search...');
    const marketplaceQuery = await client.query(`
      SELECT 
        e.id,
        e.title,
        e.price,
        e.condition,
        e.status,
        c.name AS category_name,
        u.full_name AS seller_name,
        u.department AS seller_department,
        (SELECT image_url FROM equipment_images WHERE equipment_id = e.id AND is_primary = TRUE LIMIT 1) AS primary_image
      FROM equipment_listings e
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.seller_id = u.id
      WHERE e.status = 'available'
      ORDER BY e.created_at DESC;
    `);
    assert(marketplaceQuery.rows.length > 0, `Marketplace query returned ${marketplaceQuery.rows.length} items with joined seller & category data`);

    // Full-text search
    const searchResult = await client.query(`
      SELECT id, title, description 
      FROM equipment_listings 
      WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'MacBook | Laptop | Lab');
    `);
    assert(searchResult.rows.length >= 1, `Full-text search index verified: Found ${searchResult.rows.length} matches`);

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
    console.log('Neon / PostgreSQL database tables, relationships, and data verified!');
    console.log('================================================================\n');

    return true;
  } catch (error) {
    console.error('\n✗ [Verification Error]:', error.message);
    if (error.code) console.error(`  Error Code: ${error.code}`);
    if (error.detail) console.error(`  Detail: ${error.detail}`);
    if (error.hint) console.error(`  Hint: ${error.hint}`);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

if (require.main === module) {
  runDatabaseVerification()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runDatabaseVerification;
