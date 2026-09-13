const request = require('supertest');
const app = require('../src/app');

async function runTransactionTrackingTests() {
  console.log('================================================================');
  console.log('Transaction Tracking & Lifecycle Workflow Automated Test Suite');
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
    // 1. Setup Test Accounts & Initial Listing
    // --------------------------------------------------------------------------
    console.log('1. Setting Up Accounts: Admin, Seller, Buyer 1, and Buyer 2...');

    // Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@university.edu', password: 'Password123!' });
    assert(adminLogin.status === 200, 'Admin login succeeded');
    const adminToken = adminLogin.body.data.token;

    // Seller (Alex)
    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLogin.status === 200, 'Seller (Alex) login succeeded');
    const sellerToken = sellerLogin.body.data.token;
    const sellerId = sellerLogin.body.data.user.id;

    // Buyer 1 (Sarah)
    const buyer1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer.sarah@university.edu', password: 'Password123!' });
    assert(buyer1Login.status === 200, 'Buyer 1 (Sarah) login succeeded');
    const buyer1Token = buyer1Login.body.data.token;
    const buyer1Id = buyer1Login.body.data.user.id;

    // Buyer 2 (Registered for concurrency testing)
    const buyer2Res = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-B2-${timestamp}`,
        full_name: 'David Miller',
        email: `david.miller.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Mechanical Engineering',
      });
    assert(buyer2Res.status === 201, 'Registered Buyer 2 for concurrency testing');
    const buyer2Token = buyer2Res.body.data.token;
    const buyer2Id = buyer2Res.body.data.user.id;

    // Unrelated 3rd Party Student
    const thirdPartyRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-TP-${timestamp}`,
        full_name: 'Grace Hopper',
        email: `grace.hopper.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Computer Science',
      });
    const thirdPartyToken = thirdPartyRes.body.data.token;

    // Fetch category
    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data[0].id;

    // Seller creates equipment listing
    const listingRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `3D Printer Prusa i3 MK3S+ - ${timestamp}`,
        description: 'Original Prusa i3 MK3S+ in pristine condition with textured PEI sheet and extra nozzles.',
        category_id: categoryId,
        condition: 'like_new',
        price: 550.00,
        original_price: 799.00,
        brand: 'Prusa Research',
      });
    assert(listingRes.status === 201, 'Seller created equipment listing for transaction testing');
    const equipmentId = listingRes.body.data.id;

    // --------------------------------------------------------------------------
    // 2. Concurrency & Transaction Auto-Creation on Acceptance
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Concurrent Requests & Auto-Transaction Creation...');

    // Buyer 1 submits purchase request
    const req1Res = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ equipment_id: equipmentId, proposed_price: 525.00, message: 'Ready to pay cash today!' });
    assert(req1Res.status === 201, 'Buyer 1 submitted purchase request');
    const req1Id = req1Res.body.data.id;

    // Buyer 2 submits competing purchase request for the same equipment
    const req2Res = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ equipment_id: equipmentId, proposed_price: 550.00, message: 'I will offer full price.' });
    assert(req2Res.status === 201, 'Buyer 2 submitted competing purchase request');
    const req2Id = req2Res.body.data.id;

    // Seller accepts Buyer 1's request
    const acceptRes = await request(app)
      .patch(`/api/v1/purchase-requests/${req1Id}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });
    assert(acceptRes.status === 200, 'Seller accepts Buyer 1 request (200 OK)');
    assert(acceptRes.body.data.status === 'accepted', 'Request status is "accepted"');

    // Verify Buyer 2's competing request was automatically closed/rejected
    const req2Check = await request(app)
      .get(`/api/v1/purchase-requests/${req2Id}`)
      .set('Authorization', `Bearer ${buyer2Token}`);
    assert(req2Check.body.data.status === 'rejected', 'Competing request was automatically closed/rejected upon acceptance');

    // Verify equipment listing is now 'reserved'
    const equipCheck = await request(app).get(`/api/v1/equipment/${equipmentId}`);
    assert(equipCheck.body.data.status === 'reserved', 'Equipment status updated to "reserved"');

    // --------------------------------------------------------------------------
    // 3. View Transactions (Buyer, Seller, Admin Views & Authorization Isolation)
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Transaction Retrieval & Authorization Guard...');

    // Buyer 1 views purchases
    const buyerPurchases = await request(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyer1Token}`);
    assert(buyerPurchases.status === 200, 'GET /api/v1/transactions/buyer returns 200 OK');
    assert(buyerPurchases.body.data.length >= 1, 'Buyer 1 has purchase transactions');
    const transaction = buyerPurchases.body.data.find(t => t.equipment_id === equipmentId);
    assert(transaction !== undefined, 'Transaction found in Buyer 1 purchases');
    assert(transaction.status === 'accepted', 'Initial transaction status is "accepted"');
    assert(transaction.agreed_price === 525.00, 'Agreed price matches proposed price ($525.00)');
    const transactionId = transaction.id;

    // Seller views sales
    const sellerSales = await request(app)
      .get('/api/v1/transactions/seller')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(sellerSales.status === 200, 'GET /api/v1/transactions/seller returns 200 OK');
    assert(sellerSales.body.data.some(t => t.id === transactionId), 'Transaction found in Seller sales history');

    // Single transaction details
    const txDetail = await request(app)
      .get(`/api/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);
    assert(txDetail.status === 200, 'GET /api/v1/transactions/:id returns 200 OK');
    assert(txDetail.body.data.id === transactionId, 'Returned transaction ID matches');
    assert(txDetail.body.data.seller_name.includes('Alex'), 'Seller name populated');
    assert(txDetail.body.data.buyer_name.includes('Sarah'), 'Buyer name populated');

    // Authorization Guard: Unrelated student cannot view Buyer 1's transaction
    const unauthorizedTxView = await request(app)
      .get(`/api/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${thirdPartyToken}`);
    assert(unauthorizedTxView.status === 403, 'Unrelated student blocked from viewing transaction (403 Forbidden)');

    // Admin views all transactions
    const adminTxRes = await request(app)
      .get('/api/v1/admin/transactions')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminTxRes.status === 200, 'Admin can view all platform transactions (200 OK)');
    assert(adminTxRes.body.data.some(t => t.id === transactionId), 'Transaction visible in admin monitoring view');

    // --------------------------------------------------------------------------
    // 4. Status Transition Lifecycle: Accepted -> Sold -> Completed
    // --------------------------------------------------------------------------
    console.log('\n4. Testing State Transition Rules & Role Permissions...');

    // 4.1 Invalid transition: Buyer cannot mark 'sold'
    const buyerMarkSold = await request(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ status: 'sold' });
    assert(buyerMarkSold.status === 403, 'Buyer blocked from marking item as sold (403 Forbidden)');

    // 4.2 Invalid transition: Skip directly from 'accepted' to 'completed' without 'sold'
    const skipToCompleted = await request(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ status: 'completed' });
    assert(skipToCompleted.status === 400, 'Skipping from "accepted" directly to "completed" rejected with 400 Bad Request');

    // 4.3 Seller marks transaction as 'sold' with meeting location
    const markSoldRes = await request(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'sold',
        meeting_location: 'Student Union Building, Room 204',
        notes: 'Item handed over in original packaging.',
      });
    assert(markSoldRes.status === 200, 'Seller marks item as sold (200 OK)');
    assert(markSoldRes.body.data.status === 'sold', 'Transaction status updated to "sold"');
    assert(markSoldRes.body.data.meeting_location === 'Student Union Building, Room 204', 'Meeting location updated');

    // Verify equipment status is now 'sold'
    const equipSoldCheck = await request(app).get(`/api/v1/equipment/${equipmentId}`);
    assert(equipSoldCheck.body.data.status === 'sold', 'Equipment status synchronized to "sold"');

    // 4.4 Seller attempting to mark 'completed' is blocked (only Buyer or Admin can confirm delivery)
    const sellerMarkCompleted = await request(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'completed' });
    assert(sellerMarkCompleted.status === 403, 'Seller blocked from marking completed (403 Forbidden)');

    // 4.5 Buyer marks transaction as 'completed'
    const markCompletedRes = await request(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ status: 'completed' });
    assert(markCompletedRes.status === 200, 'Buyer completes transaction (200 OK)');
    assert(markCompletedRes.body.data.status === 'completed', 'Transaction status updated to "completed"');
    assert(markCompletedRes.body.data.completed_at !== null, 'completed_at timestamp populated');

    // 4.6 Terminal state guard: Cannot modify a completed transaction
    const terminalCheck = await request(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ status: 'rejected' });
    assert(terminalCheck.status === 400, 'Modifying completed terminal transaction rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // 5. Rejection & Availability Reset Workflow
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Transaction Rejection & Equipment Reset Workflow...');

    // Create another listing for rejection test
    const cancelListingRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `TI-Nspire CX II CAS Calculator - ${timestamp}`,
        description: 'Graphing calculator for advanced engineering math.',
        category_id: categoryId,
        condition: 'good',
        price: 110.00,
      });
    const cancelEquipId = cancelListingRes.body.data.id;

    // Buyer 1 requests and seller accepts
    const cancelReq = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ equipment_id: cancelEquipId, proposed_price: 100.00 });
    const cancelReqId = cancelReq.body.data.id;

    await request(app)
      .patch(`/api/v1/purchase-requests/${cancelReqId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    // Find new transaction
    const newTxList = await request(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyer1Token}`);
    const cancelTx = newTxList.body.data.find(t => t.equipment_id === cancelEquipId);
    assert(cancelTx !== undefined, 'New transaction created on acceptance');
    const cancelTxId = cancelTx.id;

    // Seller rejects transaction (e.g. buyer did not show up)
    const rejectTxRes = await request(app)
      .patch(`/api/v1/transactions/${cancelTxId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'rejected',
        notes: 'Buyer cancelled meetup.',
      });
    assert(rejectTxRes.status === 200, 'Transaction rejected (200 OK)');
    assert(rejectTxRes.body.data.status === 'rejected', 'Transaction status is "rejected"');

    // Verify equipment listing is restored to 'available'
    const resetEquipCheck = await request(app).get(`/api/v1/equipment/${cancelEquipId}`);
    assert(resetEquipCheck.body.data.status === 'available', 'Equipment listing status automatically restored to "available" in marketplace');

    console.log('\n================================================================');
    console.log(`TRANSACTION TRACKING TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Accepted->Sold->Completed lifecycle, concurrency, role guards, & availability sync verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nTransaction Tracking Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runTransactionTrackingTests();
}

module.exports = runTransactionTrackingTests;
