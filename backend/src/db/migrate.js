const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const runMigration = async () => {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  console.log(`[Migration] Reading schema from: ${schemaPath}`);
  
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('[Migration] Applying schema to PostgreSQL database...');
    
    await db.query(schemaSql);
    console.log('[Migration] Database schema migrated successfully.');
    return true;
  } catch (error) {
    console.error('[Migration] Migration failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('[Migration] Finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Exiting with error:', err.message);
      process.exit(1);
    });
}

module.exports = runMigration;
