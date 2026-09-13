const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');

const runPaymentsMigration = async () => {
  const migrationPath = path.resolve(__dirname, 'migrations/001_add_payments_table.sql');
  logger.info(`[Migration] Reading payments migration from: ${migrationPath}`);

  try {
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    logger.info('[Migration] Applying payments migration to database...');

    if (typeof db.exec === 'function') {
      await db.exec(migrationSql);
    } else {
      await db.query(migrationSql);
    }
    logger.info('[Migration] Payments table migration applied successfully.');
    return true;
  } catch (error) {
    logger.error('[Migration] Payments migration failed:', { error: error.message });
    throw error;
  }
};

if (require.main === module) {
  runPaymentsMigration()
    .then(() => {
      console.log('Payments migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Payments migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = runPaymentsMigration;
