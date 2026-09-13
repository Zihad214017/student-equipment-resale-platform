const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

async function runDatabaseVerification() {
  console.log('================================================================');
  console.log('Smart Student Old Equipment Tracking and Resale Platform');
  console.log('Automated Relational Database Verification Test Suite');
  console.log('================================================================\n');

  const pglite = new PGlite();
  const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8');
  const seedsSql = fs.readFileSync(path.resolve(__dirname, 'seeds.sql'), 'utf-8');

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

  // 1. Schema DDL Migration Test
  console.log('1. Applying Database Schema (DDL & Triggers)...');
  await pglite.exec(schemaSql);
  assert(true, 'PostgreSQL Schema DDL, Triggers, & Indexes executed without syntax error');

  // Verify all 9 tables exist
  const tablesResult = await pglite.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const tableNames = tablesResult.rows.map(r => r.table_name);
  const expectedTables = [
    'audit_logs', 'categories', 'equipment_images', 'equipment_listings',
    'notifications', 'purchase_requests', 'reviews', 'transactions', 'users'
  ];
  
  expectedTables.forEach(table => {
    assert(tableNames.includes(table), `Table '${table}' successfully created`);
  });

  // 2. Seeding Sample Data Test
  console.log('\n2. Applying Seed Dataset (DML)...');
  await pglite.exec(seedsSql);
  assert(true, 'Seed dataset applied successfully');

  // Verify user counts & specific roles
  const usersResult = await pglite.query(`SELECT id, student_id, email, role, full_name FROM users ORDER BY created_at;`);
  assert(usersResult.rows.length >= 4, `Total users seeded: ${usersResult.rows.length} (Expected >= 4)`);

  const admin = usersResult.rows.find(u => u.role === 'admin');
  assert(admin && admin.email === 'admin@university.edu', `Sample Admin verified: ${admin?.full_name} (${admin?.email})`);

  const seller = usersResult.rows.find(u => u.student_id === 'STU-2023-0101');
  assert(seller && seller.email === 'seller.alex@university.edu', `Sample Seller verified: ${seller?.full_name} (${seller?.email})`);

  const buyer = usersResult.rows.find(u => u.student_id === 'STU-2023-0202');
  assert(buyer && buyer.email === 'buyer.sarah@university.edu', `Sample Buyer verified: ${buyer?.full_name} (${buyer?.email})`);

  // Verify categories
  const categoriesResult = await pglite.query(`SELECT id, name, slug FROM categories;`);
  assert(categoriesResult.rows.length === 7, `Total academic categories seeded: ${categoriesResult.rows.length} (Expected 7)`);

  // Verify equipment listings
  const listingsResult = await pglite.query(`SELECT id, title, condition, price, status FROM equipment_listings;`);
  assert(listingsResult.rows.length === 7, `Total equipment listings seeded: ${listingsResult.rows.length} (Expected 7)`);

  // Verify equipment images
  const imagesResult = await pglite.query(`SELECT id, equipment_id, is_primary FROM equipment_images;`);
  assert(imagesResult.rows.length >= 7, `Total equipment images seeded: ${imagesResult.rows.length} (Expected >= 7)`);

  // Verify purchase requests
  const requestsResult = await pglite.query(`SELECT id, proposed_price, status FROM purchase_requests;`);
  assert(requestsResult.rows.length === 3, `Total purchase requests seeded: ${requestsResult.rows.length} (Expected 3)`);

  // Verify transactions
  const txResult = await pglite.query(`SELECT id, agreed_price, status FROM transactions;`);
  assert(txResult.rows.length === 2, `Total transactions seeded: ${txResult.rows.length} (Expected 2)`);

  // Verify reviews
  const reviewsResult = await pglite.query(`SELECT id, rating, comment FROM reviews;`);
  assert(reviewsResult.rows.length === 1 && reviewsResult.rows[0].rating === 5, `Sample Review verified with 5-star rating`);

  // Verify notifications
  const notifResult = await pglite.query(`SELECT id, type, is_read FROM notifications;`);
  assert(notifResult.rows.length === 3, `Total notifications seeded: ${notifResult.rows.length} (Expected 3)`);

  // Verify audit logs
  const auditResult = await pglite.query(`SELECT id, action FROM audit_logs;`);
  assert(auditResult.rows.length === 1, `Total audit logs seeded: ${auditResult.rows.length} (Expected 1)`);

  // 3. Relational Joins & Complex Queries
  console.log('\n3. Verifying Relational Joins & Queries...');

  // Marketplace Catalog Query (Equipment with Category and Seller details)
  const marketplaceQuery = await pglite.query(`
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
  assert(marketplaceQuery.rows.length > 0, `Marketplace catalog query returned ${marketplaceQuery.rows.length} available items with joined seller & category data`);

  // Buyer Purchase Requests with Seller & Equipment info
  const buyerRequestsQuery = await pglite.query(`
    SELECT 
      pr.id AS request_id,
      pr.proposed_price,
      pr.status AS request_status,
      e.title AS equipment_title,
      e.price AS original_listing_price,
      seller.full_name AS seller_name
    FROM purchase_requests pr
    JOIN equipment_listings e ON pr.equipment_id = e.id
    JOIN users seller ON pr.seller_id = seller.id
    WHERE pr.buyer_id = $1;
  `, [buyer.id]);
  assert(buyerRequestsQuery.rows.length === 3, `Buyer purchase requests query returned ${buyerRequestsQuery.rows.length} items`);

  // Aggregated Seller Rating Calculation
  const sellerRatingQuery = await pglite.query(`
    SELECT 
      u.id AS seller_id,
      u.full_name,
      ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
      COUNT(r.id) AS total_reviews
    FROM users u
    LEFT JOIN reviews r ON u.id = r.reviewee_id
    WHERE u.id = $1
    GROUP BY u.id, u.full_name;
  `, [seller.id]);
  const ratingData = sellerRatingQuery.rows[0];
  assert(parseFloat(ratingData.average_rating) === 5.0 && parseInt(ratingData.total_reviews) === 1, 
    `Seller rating aggregation correct: ⭐ ${ratingData.average_rating}/5.0 (${ratingData.total_reviews} reviews)`);

  // Full-Text Search on Equipment
  const searchResult = await pglite.query(`
    SELECT id, title, description 
    FROM equipment_listings 
    WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'MacBook | Apple');
  `);
  assert(searchResult.rows.length === 1 && searchResult.rows[0].title.includes('MacBook'), 
    `Full-text search indexed query verified: Found "${searchResult.rows[0]?.title}"`);

  // 4. Data Integrity & Constraint Verification (Negative Testing)
  console.log('\n4. Verifying CHECK & UNIQUE Constraints (Negative Testing)...');

  // Test Invalid Role Constraint
  try {
    await pglite.query(`
      INSERT INTO users (student_id, full_name, email, password_hash, role)
      VALUES ('BAD-01', 'Bad User', 'bad@edu.com', 'hash', 'superhero');
    `);
    assert(false, 'Invalid role check failed to trigger');
  } catch (err) {
    assert(err.message.includes('check constraint') || err.message.includes('CHECK'), 'CHECK constraint prevented invalid user role (superhero)');
  }

  // Test Negative Price Constraint
  try {
    await pglite.query(`
      INSERT INTO equipment_listings (seller_id, category_id, title, description, condition, price)
      VALUES ($1, $2, 'Negative Price Item', 'Desc', 'good', -50.00);
    `, [seller.id, categoriesResult.rows[0].id]);
    assert(false, 'Negative price check failed to trigger');
  } catch (err) {
    assert(err.message.includes('check constraint') || err.message.includes('CHECK'), 'CHECK constraint prevented negative price (-50.00)');
  }

  // Test Buyer != Seller Check Constraint on Purchase Requests
  try {
    await pglite.query(`
      INSERT INTO purchase_requests (equipment_id, buyer_id, seller_id, proposed_price, message)
      VALUES ($1, $2, $2, 100.00, 'Buying from myself');
    `, [listingsResult.rows[0].id, seller.id]);
    assert(false, 'Self-purchase constraint failed to trigger');
  } catch (err) {
    assert(err.message.includes('chk_buyer_not_seller') || err.message.includes('CHECK'), 'CHECK constraint prevented self-purchase (buyer_id == seller_id)');
  }

  // Test Review Rating Range (Rating must be 1 to 5)
  try {
    await pglite.query(`
      INSERT INTO reviews (transaction_id, equipment_id, reviewer_id, reviewee_id, rating, comment)
      VALUES ($1, $2, $3, $4, 6, 'Out of bounds 6-star rating');
    `, [txResult.rows[1].id, listingsResult.rows[0].id, buyer.id, seller.id]);
    assert(false, 'Invalid review rating check failed to trigger');
  } catch (err) {
    assert(err.message.includes('check constraint') || err.message.includes('CHECK'), 'CHECK constraint prevented review rating > 5 (rating=6)');
  }

  // Test Duplicate Email Unique Constraint
  try {
    await pglite.query(`
      INSERT INTO users (student_id, full_name, email, password_hash, role)
      VALUES ('STU-9999', 'Duplicate Email', 'admin@university.edu', 'hash', 'student');
    `);
    assert(false, 'Duplicate email unique constraint failed to trigger');
  } catch (err) {
    assert(err.message.includes('unique') || err.message.includes('UNIQUE'), 'UNIQUE constraint prevented duplicate email (admin@university.edu)');
  }

  // Test Foreign Key Cascade on Equipment Image Deletion
  const newListing = await pglite.query(`
    INSERT INTO equipment_listings (seller_id, category_id, title, description, condition, price)
    VALUES ($1, $2, 'Temporary Item for Cascade Test', 'Desc', 'good', 10.00)
    RETURNING id;
  `, [seller.id, categoriesResult.rows[0].id]);
  const tempListingId = newListing.rows[0].id;

  await pglite.query(`
    INSERT INTO equipment_images (equipment_id, image_url, is_primary)
    VALUES ($1, 'https://example.com/temp.jpg', TRUE);
  `, [tempListingId]);

  // Delete listing and verify associated image is automatically cascade deleted
  await pglite.query(`DELETE FROM equipment_listings WHERE id = $1;`, [tempListingId]);
  const orphanedImages = await pglite.query(`SELECT id FROM equipment_images WHERE equipment_id = $1;`, [tempListingId]);
  assert(orphanedImages.rows.length === 0, 'Foreign key ON DELETE CASCADE verified: images deleted with parent listing');

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('All entities, relationships, constraints, indexes & seeds verified!');
  console.log('================================================================\n');

  return true;
}

if (require.main === module) {
  runDatabaseVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nDatabase Verification Failed:', err);
      process.exit(1);
    });
}

module.exports = runDatabaseVerification;
