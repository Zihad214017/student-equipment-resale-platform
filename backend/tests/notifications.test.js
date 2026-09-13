const request = require('supertest');
const app = require('../src/app');

async function runNotificationTests() {
  console.log('================================================================');
  console.log('Notification Subsystem & Event Integration Automated Test Suite');
  console.log('Smart Student Old Equipment Tracking and Resale Platform');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} - ${details}`);
      throw new Error(`Test failed: ${name} - ${details}`);
    }
  }

  try {
    const timestamp = Date.now().toString().slice(-6);

    // --------------------------------------------------------------------------
    // 1. Setup Fresh Test Accounts & Equipment Listing
    // --------------------------------------------------------------------------
    console.log('1. Setting Up Test Accounts (Seller Alex, Buyer Sarah, Student Bob)...');

    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLogin.status === 200, 'Seller login succeeded');
    const sellerToken = sellerLogin.body.data.token;
    const sellerId = sellerLogin.body.data.user.id;

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer.sarah@university.edu', password: 'Password123!' });
    assert(buyerLogin.status === 200, 'Buyer login succeeded');
    const buyerToken = buyerLogin.body.data.token;
    const buyerId = buyerLogin.body.data.user.id;

    // Register second student for notification isolation test
    const bobRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-BOB-${timestamp}`,
        full_name: 'Bob Marley',
        email: `bob.marley.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Music & Arts',
      });
    const bobToken = bobRes.body.data.token;

    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data[0].id;

    // Seller creates equipment
    const listingRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Digital Multimeter Fluke 87V - ${timestamp}`,
        description: 'True-RMS industrial multimeter with temperature probe.',
        category_id: categoryId,
        condition: 'like_new',
        price: 195.00,
      });
    assert(listingRes.status === 201, 'Seller created equipment listing');
    const equipmentId = listingRes.body.data.id;

    // --------------------------------------------------------------------------
    // 2. Event-Driven Notification: New Purchase Request
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Event-Driven Notification: Purchase Request Creation...');

    // Buyer submits request
    const submitReqRes = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 190.00,
        message: 'Interested in purchasing today.',
      });
    assert(submitReqRes.status === 201, 'Buyer submitted purchase request');
    const requestId = submitReqRes.body.data.id;

    // Check Seller notifications: Seller should have received a notification
    const sellerNotifsRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(sellerNotifsRes.status === 200, 'GET /api/v1/notifications returns 200 OK for seller');
    assert(Array.isArray(sellerNotifsRes.body.data), 'Notifications returned in data array');
    const requestReceivedNotif = sellerNotifsRes.body.data.find(
      n => n.type === 'request_received' && n.reference_id === requestId
    );
    assert(requestReceivedNotif !== undefined, 'Seller received "request_received" notification for submitted request');
    assert(requestReceivedNotif.is_read === false, 'Notification is initially unread (is_read = false)');
    const notifId = requestReceivedNotif.id;

    // --------------------------------------------------------------------------
    // 3. Unread Count & Filter Queries
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Unread Count & Notification Filtering...');

    const unreadCountRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(unreadCountRes.status === 200, 'GET /api/v1/notifications/unread-count returns 200 OK');
    assert(unreadCountRes.body.data.unread_count >= 1, 'Seller has unread notifications');

    // Filter unread notifications
    const unreadListRes = await request(app)
      .get('/api/v1/notifications?is_read=false')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(unreadListRes.status === 200, 'Filter ?is_read=false returns 200 OK');
    assert(unreadListRes.body.data.every(n => n.is_read === false), 'All returned notifications are unread');

    // --------------------------------------------------------------------------
    // 4. Mark Single Notification as Read & Ownership Guard
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Mark Notification as Read & Authorization Guard...');

    // Bob cannot mark Alex's notification as read
    const unauthorizedMarkRead = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert(unauthorizedMarkRead.status === 403, 'Unrelated student blocked from modifying another user notification (403 Forbidden)');

    // Seller marks notification as read
    const markReadRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(markReadRes.status === 200, 'Seller marks single notification as read (200 OK)');
    assert(markReadRes.body.data.is_read === true, 'Notification is_read is now true');

    // --------------------------------------------------------------------------
    // 5. Event-Driven Notification: Request Acceptance & Transaction Lifecycle
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Event-Driven Notification: Request Acceptance & Transactions...');

    // Seller accepts request
    await request(app)
      .patch(`/api/v1/purchase-requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    // Buyer Sarah should have received acceptance notification
    const buyerNotifsRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(buyerNotifsRes.status === 200, 'Buyer can retrieve notifications');
    const acceptNotif = buyerNotifsRes.body.data.find(n => n.title.includes('Accepted'));
    assert(acceptNotif !== undefined, 'Buyer received notification that request was accepted');

    // Find transaction
    const buyerTxList = await request(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyerToken}`);
    const tx = buyerTxList.body.data.find(t => t.equipment_id === equipmentId);
    assert(tx !== undefined, 'Transaction exists for equipment');
    const txId = tx.id;

    // Seller marks item as sold
    await request(app)
      .patch(`/api/v1/transactions/${txId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'sold' });

    // Buyer receives "sold" notification
    const buyerSoldNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(buyerSoldNotifs.body.data.some(n => n.title.includes('Sold')), 'Buyer received "Item Marked as Sold" notification');

    // Buyer completes transaction
    await request(app)
      .patch(`/api/v1/transactions/${txId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ status: 'completed' });

    // Seller receives "completed" notification
    const sellerCompletedNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(sellerCompletedNotifs.body.data.some(n => n.title.includes('Completed')), 'Seller received "Transaction Completed" notification');

    // --------------------------------------------------------------------------
    // 6. Bulk Mark All as Read & Deletion
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Mark All as Read & Notification Deletion...');

    // Buyer marks all as read
    const markAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(markAllRes.status === 200, 'PATCH /api/v1/notifications/read-all returns 200 OK');
    assert(typeof markAllRes.body.data.updated_count === 'number', 'Reports updated_count');

    // Verify Buyer unread count is now 0
    const buyerUnreadZero = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(buyerUnreadZero.body.data.unread_count === 0, 'Buyer unread count is now 0');

    // Delete a notification
    const deleteNotifRes = await request(app)
      .delete(`/api/v1/notifications/${notifId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(deleteNotifRes.status === 200, 'Seller deletes notification (200 OK)');

    console.log('\n================================================================');
    console.log(`NOTIFICATION TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Event integration, unread count, read single/all, & authorization verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nNotification Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runNotificationTests();
}

module.exports = runNotificationTests;
