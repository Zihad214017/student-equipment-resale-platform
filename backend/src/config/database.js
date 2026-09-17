const { Pool } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * Configure SSL for PostgreSQL connection
 * Neon PostgreSQL and remote cloud providers require SSL (rejectUnauthorized: false for Node pg)
 */
const getSSLConfig = () => {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };

  const dbUrl = process.env.DATABASE_URL || config.db?.url || '';
  const isLocal = !dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

  if (dbUrl) {
    if (isLocal) return false;
    // Neon, Render, Supabase, AWS RDS, or production deployments
    if (
      dbUrl.includes('sslmode=require') ||
      dbUrl.includes('neon.tech') ||
      dbUrl.includes('render.com') ||
      dbUrl.includes('amazonaws.com') ||
      config.env === 'production'
    ) {
      return { rejectUnauthorized: false };
    }
    return { rejectUnauthorized: false };
  }

  if (config.env === 'production' && (config.db.host !== 'localhost' && config.db.host !== '127.0.0.1')) {
    return { rejectUnauthorized: false };
  }

  return false;
};

const databaseUrl = process.env.DATABASE_URL || config.db?.url;
const sslConfig = getSSLConfig();

// Initialize standard pg.Pool using DATABASE_URL or individual parameters
const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: sslConfig,
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client pool', { error: err.message });
});

/**
 * Execute parameterized SQL query
 * @param {string} text - SQL Query text
 * @param {Array} params - Query parameter values
 * @returns {Promise<{ rows: Array, rowCount: number, fields: Array }>}
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed Query', { duration: `${duration}ms`, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database Query Error', { text, error: error.message });
    throw error;
  }
};

/**
 * Execute raw multi-statement SQL script (e.g. migrations)
 * @param {string} sql - Multi-command SQL string
 */
const exec = async (sql) => {
  const start = Date.now();
  try {
    await pool.query(sql);
    const duration = Date.now() - start;
    logger.debug('Executed Raw SQL script', { duration: `${duration}ms` });
    return true;
  } catch (error) {
    logger.error('Database Exec Error', { error: error.message });
    throw error;
  }
};

/**
 * Dedicated client interface (supports transactions: BEGIN, COMMIT, ROLLBACK)
 */
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    logger.error('Failed to acquire client from pool', { error: error.message });
    throw error;
  }
};

/**
 * Probe connection status
 */
const testConnection = async () => {
  try {
    const res = await query('SELECT NOW() as current_time, version() as version');
    const row = res.rows[0];
    logger.info('Database connection established', {
      time: row.current_time,
      mode: 'PostgreSQL Pool (Live)',
      ssl: !!sslConfig,
    });
    return {
      connected: true,
      mode: 'PostgreSQL Pool (Live)',
      ssl: !!sslConfig,
      serverTime: row.current_time,
      version: row.version,
    };
  } catch (err) {
    logger.error('Database connection probe failed', { error: err.message });
    return {
      connected: false,
      error: err.message,
    };
  }
};

module.exports = {
  pool,
  query,
  exec,
  getClient,
  testConnection,
};
