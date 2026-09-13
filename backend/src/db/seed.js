const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const runSeeds = async () => {
  const seedPath = path.resolve(__dirname, 'seeds.sql');
  console.log(`[Seed] Reading seed data from: ${seedPath}`);
  
  try {
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    console.log('[Seed] Seeding sample data into PostgreSQL database...');
    
    await db.query(seedSql);
    console.log('[Seed] Database seeded successfully with sample Admin, Seller, Buyer, Categories, Listings, Requests, Transactions, Reviews, and Notifications.');
    return true;
  } catch (error) {
    console.error('[Seed] Seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  runSeeds()
    .then(() => {
      console.log('[Seed] Finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Exiting with error:', err.message);
      process.exit(1);
    });
}

module.exports = runSeeds;
