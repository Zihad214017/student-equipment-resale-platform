const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./env');
const logger = require('../utils/logger');

let pool = null;
let pgliteInstance = null;
let isEmbeddedFallback = false;

// Initialize standard pg.Pool
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
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
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    };

pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client pool', { error: err.message });
});

/**
 * Initialize embedded PostgreSQL fallback if live PostgreSQL server is unreachable
 */
async function initEmbeddedFallback() {
  if (pgliteInstance) return pgliteInstance;

  try {
    const { PGlite } = require('@electric-sql/pglite');
    logger.info('Initializing embedded PostgreSQL database engine (PGlite)...');
    pgliteInstance = new PGlite();

    const schemaPath = path.resolve(__dirname, '../db/schema.sql');
    const seedsPath = path.resolve(__dirname, '../db/seeds.sql');

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pgliteInstance.exec(schemaSql);
      logger.info('Embedded PostgreSQL schema loaded successfully.');
    }

    if (fs.existsSync(seedsPath)) {
      const seedsSql = fs.readFileSync(seedsPath, 'utf-8');
      await pgliteInstance.exec(seedsSql);
      logger.info('Embedded PostgreSQL seed data loaded successfully.');
    }

    isEmbeddedFallback = true;
    return pgliteInstance;
  } catch (err) {
    logger.error('Failed to initialize embedded PostgreSQL engine', { error: err.message });
    throw err;
  }
}

/**
 * Execute parameterized SQL query
 * @param {string} text - SQL Query text
 * @param {Array} params - Query parameter values
 * @returns {Promise<{ rows: Array, rowCount: number, fields: Array }>}
 */
const query = async (text, params = []) => {
  const start = Date.now();

  if (isEmbeddedFallback && pgliteInstance) {
    try {
      const res = await pgliteInstance.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed Query (Embedded)', { duration: `${duration}ms`, rows: res.rows.length });
      return {
        rows: res.rows,
        rowCount: res.rows.length,
        fields: res.fields,
      };
    } catch (err) {
      logger.error('Embedded Query Execution Error', { text, error: err.message });
      throw err;
    }
  }

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed Query (Live Pool)', { duration: `${duration}ms`, rows: res.rowCount });
    return res;
  } catch (error) {
    // If connection refused to host postgres, attempt fallback if not already tried
    if ((error.code === 'ECONNREFUSED' || error.message.includes('Connection terminated') || error.code === 'ENOTFOUND') && !isEmbeddedFallback) {
      logger.warn('Live PostgreSQL unreachable. Switching to embedded PostgreSQL engine...', { error: error.message });
      await initEmbeddedFallback();
      return query(text, params);
    }
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
  if (isEmbeddedFallback && pgliteInstance) {
    try {
      await pgliteInstance.exec(sql);
      const duration = Date.now() - start;
      logger.debug('Executed Raw SQL script (Embedded)', { duration: `${duration}ms` });
      return true;
    } catch (err) {
      logger.error('Embedded Exec Error', { error: err.message });
      throw err;
    }
  }

  try {
    await pool.query(sql);
    const duration = Date.now() - start;
    logger.debug('Executed Raw SQL script (Live Pool)', { duration: `${duration}ms` });
    return true;
  } catch (error) {
    if ((error.code === 'ECONNREFUSED' || error.message.includes('Connection terminated') || error.code === 'ENOTFOUND') && !isEmbeddedFallback) {
      logger.warn('Live PostgreSQL unreachable. Switching to embedded PostgreSQL engine...', { error: error.message });
      await initEmbeddedFallback();
      return exec(sql);
    }
    logger.error('Database Exec Error', { error: error.message });
    throw error;
  }
};

/**
 * Dedicated client interface (supports transactions: BEGIN, COMMIT, ROLLBACK)
 */
const getClient = async () => {
  if (isEmbeddedFallback && pgliteInstance) {
    return {
      query: (text, params) => query(text, params),
      release: () => {},
    };
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    if ((error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') && !isEmbeddedFallback) {
      logger.warn('Live PostgreSQL unreachable during getClient. Switching to embedded PostgreSQL...');
      await initEmbeddedFallback();
      return getClient();
    }
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
      mode: isEmbeddedFallback ? 'Embedded PostgreSQL (PGlite)' : 'Live PostgreSQL (pg.Pool)',
    });
    return {
      connected: true,
      mode: isEmbeddedFallback ? 'Embedded PostgreSQL' : 'PostgreSQL Pool',
      serverTime: row.current_time,
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
  initEmbeddedFallback,
};
