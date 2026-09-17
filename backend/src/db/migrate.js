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

const runMigration = async () => {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const clientConfig = getClientConfig();
  
  const targetHost = clientConfig.connectionString
    ? clientConfig.connectionString.replace(/:[^:@]+@/, ':***@')
    : `${clientConfig.user}@${clientConfig.host}:${clientConfig.port}/${clientConfig.database}`;

  console.log('================================================================');
  console.log('Neon / PostgreSQL Database Migration Runner');
  console.log('Smart Student Old Equipment Tracking and Resale Platform');
  console.log('================================================================');
  console.log(`[Migration] Target Database: ${targetHost}`);
  console.log(`[Migration] SSL Mode: ${clientConfig.ssl ? 'Enabled (rejectUnauthorized: false)' : 'Disabled'}`);
  console.log(`[Migration] Reading schema DDL from: ${schemaPath}`);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const client = new Client(clientConfig);

  try {
    console.log('[Migration] Connecting directly to PostgreSQL server via pg package...');
    await client.connect();
    console.log('✓ [Migration] Connected successfully.');

    console.log('[Migration] Executing schema DDL, triggers, and index definitions in PostgreSQL...');
    await client.query(schemaSql);
    console.log('✓ [Migration] Schema SQL executed successfully.');

    // Query information_schema to verify all created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map(r => r.table_name);
    console.log('\n[Migration] Verified tables in PostgreSQL database:');
    tableNames.forEach((name, idx) => {
      console.log(`  ${idx + 1}. ${name}`);
    });

    const expectedTables = [
      'audit_logs', 'categories', 'equipment_images', 'equipment_listings',
      'notifications', 'payments', 'purchase_requests', 'reviews', 'transactions', 'users'
    ];

    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    if (missingTables.length > 0) {
      throw new Error(`Migration incomplete. Missing tables: ${missingTables.join(', ')}`);
    }

    console.log('\n================================================================');
    console.log(`✓ Migration Complete: All ${tableNames.length} platform tables successfully created in PostgreSQL.`);
    console.log('================================================================\n');
    return true;
  } catch (error) {
    console.error('\n✗ [Migration Error]:', error.message);
    if (error.code) console.error(`  Error Code: ${error.code}`);
    if (error.detail) console.error(`  Detail: ${error.detail}`);
    if (error.hint) console.error(`  Hint: ${error.hint}`);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
};

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
