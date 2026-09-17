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

const runSeeds = async () => {
  const seedsPath = path.resolve(__dirname, 'seeds.sql');
  const clientConfig = getClientConfig();

  const targetHost = clientConfig.connectionString
    ? clientConfig.connectionString.replace(/:[^:@]+@/, ':***@')
    : `${clientConfig.user}@${clientConfig.host}:${clientConfig.port}/${clientConfig.database}`;

  console.log('================================================================');
  console.log('Neon / PostgreSQL Seed Data Runner');
  console.log('Smart Student Old Equipment Tracking and Resale Platform');
  console.log('================================================================');
  console.log(`[Seed] Target Database: ${targetHost}`);
  console.log(`[Seed] SSL Mode: ${clientConfig.ssl ? 'Enabled (rejectUnauthorized: false)' : 'Disabled'}`);
  console.log(`[Seed] Reading seed SQL from: ${seedsPath}`);

  if (!fs.existsSync(seedsPath)) {
    throw new Error(`Seed SQL file not found at: ${seedsPath}`);
  }

  const seedSql = fs.readFileSync(seedsPath, 'utf-8');
  const client = new Client(clientConfig);

  try {
    console.log('[Seed] Connecting directly to PostgreSQL server via pg package...');
    await client.connect();
    console.log('✓ [Seed] Connected successfully.');

    console.log('[Seed] Executing seed SQL dataset in PostgreSQL...');
    await client.query(seedSql);
    console.log('✓ [Seed] Seed SQL executed successfully.');

    // Query seeded counts from PostgreSQL
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM users;'),
      client.query('SELECT COUNT(*) FROM categories;'),
      client.query('SELECT COUNT(*) FROM equipment_listings;'),
      client.query('SELECT COUNT(*) FROM equipment_images;'),
      client.query('SELECT COUNT(*) FROM purchase_requests;'),
      client.query('SELECT COUNT(*) FROM transactions;'),
      client.query('SELECT COUNT(*) FROM payments;'),
      client.query('SELECT COUNT(*) FROM reviews;'),
      client.query('SELECT COUNT(*) FROM notifications;'),
      client.query('SELECT COUNT(*) FROM audit_logs;'),
    ]);

    console.log('\n[Seed] Verified Record Counts in PostgreSQL:');
    console.log(`  - Users: ${counts[0].rows[0].count} (Includes Admin: admin@university.edu)`);
    console.log(`  - Categories: ${counts[1].rows[0].count}`);
    console.log(`  - Equipment Listings: ${counts[2].rows[0].count}`);
    console.log(`  - Equipment Images: ${counts[3].rows[0].count}`);
    console.log(`  - Purchase Requests: ${counts[4].rows[0].count}`);
    console.log(`  - Transactions: ${counts[5].rows[0].count}`);
    console.log(`  - Payments: ${counts[6].rows[0].count}`);
    console.log(`  - Reviews: ${counts[7].rows[0].count}`);
    console.log(`  - Notifications: ${counts[8].rows[0].count}`);
    console.log(`  - Audit Logs: ${counts[9].rows[0].count}`);

    console.log('\n================================================================');
    console.log('✓ Database Seeding Complete: All sample data successfully inserted into PostgreSQL.');
    console.log('================================================================\n');
    return true;
  } catch (error) {
    console.error('\n✗ [Seed Error]:', error.message);
    if (error.code) console.error(`  Error Code: ${error.code}`);
    if (error.detail) console.error(`  Detail: ${error.detail}`);
    if (error.hint) console.error(`  Hint: ${error.hint}`);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
};

if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runSeeds;
