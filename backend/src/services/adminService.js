const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate platform-wide metrics and dashboard reports
 */
const getPlatformStatistics = async () => {
  // 1. User Metrics
  const userStatsQuery = `
    SELECT 
      COUNT(id) AS total_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) AS total_admins,
      COUNT(CASE WHEN role = 'student' THEN 1 END) AS total_students,
      COUNT(CASE WHEN is_active = TRUE THEN 1 END) AS total_active_users,
      COUNT(CASE WHEN is_active = FALSE THEN 1 END) AS total_deactivated_users
    FROM users;
  `;
  const userStatsRes = await db.query(userStatsQuery);
  const uStats = userStatsRes.rows[0];

  // Distinct buyers count
  const buyersCountRes = await db.query(`
    SELECT COUNT(DISTINCT buyer_id) AS total_buyers 
    FROM (
      SELECT buyer_id FROM purchase_requests
      UNION
      SELECT buyer_id FROM transactions
    ) b;
  `);
  const totalBuyers = parseInt(buyersCountRes.rows[0].total_buyers, 10);

  // Distinct sellers count
  const sellersCountRes = await db.query(`
    SELECT COUNT(DISTINCT seller_id) AS total_sellers FROM equipment_listings;
  `);
  const totalSellers = parseInt(sellersCountRes.rows[0].total_sellers, 10);

  // 2. Equipment Metrics
  const equipmentStatsQuery = `
    SELECT 
      COUNT(id) AS total_equipment,
      COUNT(CASE WHEN status = 'available' THEN 1 END) AS available_equipment,
      COUNT(CASE WHEN status = 'reserved' THEN 1 END) AS reserved_equipment,
      COUNT(CASE WHEN status = 'sold' THEN 1 END) AS sold_equipment,
      COUNT(CASE WHEN status = 'archived' THEN 1 END) AS archived_equipment,
      COUNT(CASE WHEN admin_approval_status = 'pending' THEN 1 END) AS pending_approval_equipment,
      COUNT(CASE WHEN admin_approval_status = 'approved' THEN 1 END) AS approved_equipment
    FROM equipment_listings;
  `;
  const eqStatsRes = await db.query(equipmentStatsQuery);
  const eqStats = eqStatsRes.rows[0];

  // 3. Purchase Request Metrics
  const reqStatsQuery = `
    SELECT 
      COUNT(id) AS total_purchase_requests,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_requests,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted_requests,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_requests,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_requests
    FROM purchase_requests;
  `;
  const reqStatsRes = await db.query(reqStatsQuery);
  const reqStats = reqStatsRes.rows[0];

  // 4. Transaction Metrics
  const txStatsQuery = `
    SELECT 
      COUNT(id) AS total_transactions,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_transactions,
      COUNT(CASE WHEN status = 'sold' THEN 1 END) AS sold_transactions,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted_transactions,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_transactions,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_transactions,
      COALESCE(SUM(CASE WHEN status IN ('sold', 'completed') THEN agreed_price ELSE 0 END), 0) AS total_volume_amount
    FROM transactions;
  `;
  const txStatsRes = await db.query(txStatsQuery);
  const txStats = txStatsRes.rows[0];

  // 5. Review Metrics
  const reviewStatsQuery = `
    SELECT 
      COUNT(id) AS total_reviews,
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS platform_average_rating
    FROM reviews;
  `;
  const revStatsRes = await db.query(reviewStatsQuery);
  const revStats = revStatsRes.rows[0];

  // 6. Category Breakdown
  const catStatsQuery = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      COUNT(e.id) AS equipment_count
    FROM categories c
    LEFT JOIN equipment_listings e ON c.id = e.category_id
    GROUP BY c.id, c.name, c.slug
    ORDER BY equipment_count DESC;
  `;
  const catStatsRes = await db.query(catStatsQuery);

  // 7. Recent Transactions (last 5)
  const recentTxQuery = `
    SELECT 
      t.id,
      t.agreed_price,
      t.status,
      t.created_at,
      e.title AS equipment_title,
      b.full_name AS buyer_name,
      s.full_name AS seller_name
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN users b ON t.buyer_id = b.id
    JOIN users s ON t.seller_id = s.id
    ORDER BY t.created_at DESC
    LIMIT 5;
  `;
  const recentTxRes = await db.query(recentTxQuery);

  // 8. Recent User Registrations (last 5)
  const recentUsersQuery = `
    SELECT id, student_id, full_name, email, department, role, is_active, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 5;
  `;
  const recentUsersRes = await db.query(recentUsersQuery);

  return {
    users: {
      total_users: parseInt(uStats.total_users, 10),
      total_admins: parseInt(uStats.total_admins, 10),
      total_students: parseInt(uStats.total_students, 10),
      total_active_users: parseInt(uStats.total_active_users, 10),
      total_deactivated_users: parseInt(uStats.total_deactivated_users, 10),
      total_buyers: totalBuyers,
      total_sellers: totalSellers,
    },
    equipment: {
      total_equipment: parseInt(eqStats.total_equipment, 10),
      available_equipment: parseInt(eqStats.available_equipment, 10),
      reserved_equipment: parseInt(eqStats.reserved_equipment, 10),
      sold_equipment: parseInt(eqStats.sold_equipment, 10),
      archived_equipment: parseInt(eqStats.archived_equipment, 10),
      pending_approval_equipment: parseInt(eqStats.pending_approval_equipment, 10),
      approved_equipment: parseInt(eqStats.approved_equipment, 10),
    },
    purchase_requests: {
      total_purchase_requests: parseInt(reqStats.total_purchase_requests, 10),
      pending_requests: parseInt(reqStats.pending_requests, 10),
      accepted_requests: parseInt(reqStats.accepted_requests, 10),
      rejected_requests: parseInt(reqStats.rejected_requests, 10),
      cancelled_requests: parseInt(reqStats.cancelled_requests, 10),
    },
    transactions: {
      total_transactions: parseInt(txStats.total_transactions, 10),
      completed_transactions: parseInt(txStats.completed_transactions, 10),
      sold_transactions: parseInt(txStats.sold_transactions, 10),
      accepted_transactions: parseInt(txStats.accepted_transactions, 10),
      pending_transactions: parseInt(txStats.pending_transactions, 10),
      rejected_transactions: parseInt(txStats.rejected_transactions, 10),
      total_volume_amount: parseFloat(txStats.total_volume_amount),
    },
    reviews: {
      total_reviews: parseInt(revStats.total_reviews, 10),
      platform_average_rating: parseFloat(revStats.platform_average_rating),
    },
    category_breakdown: catStatsRes.rows.map(row => ({
      ...row,
      equipment_count: parseInt(row.equipment_count, 10),
    })),
    recent_activity: {
      transactions: recentTxRes.rows.map(row => ({
        ...row,
        agreed_price: parseFloat(row.agreed_price),
      })),
      registrations: recentUsersRes.rows,
    },
  };
};

module.exports = {
  getPlatformStatistics,
};
