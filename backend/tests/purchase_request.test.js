const request = require('supertest');
const app = require('../src/app');

async function runPurchaseRequestTests() {
  console.log('================================================================');
  console.log('Purchase Request Management Workflow Automated Test Suite');
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
    // 1. Setup Test Accounts & Available Equipment
    // --------------------------------------------------------------------------
    console.log('1. Authenticating Seller, Buyer, and Unrelated Student...');

    // Seller (Alex)
    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLogin.status === 200, 'Seller login succeeded');
    const sellerToken = sellerLogin.body.data.token;
    const sellerId = sellerLogin.body.data.user.id;

    // Buyer (Sarah)
    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer.sarah@university.edu', password: 'Password123!' });
    assert(buyerLogin.status === 200, 'Buyer login succeeded');
    const buyerToken = buyerLogin.body.data.token;
    const buyerId = buyerLogin.body.data.user.id;

    // Third-party student (Emma) for isolation testing
    const thirdPartyRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-THRD-${timestamp}`,
        full_name: 'Emma Watson',
        email: `emma.watson.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Biochemistry',
      });
    assert(thirdPartyRes.status === 201, 'Registered third-party student for authorization testing');
    const thirdPartyToken = thirdPartyRes.body.data.token;

    // Get categories to create fresh listings
    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data[0].id;

    // Seller creates an equipment listing
    const listingRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Digital Storage Oscilloscope 100MHz - ${timestamp}`,
        description: 'Rigol DS1054Z 4-channel digital oscilloscope with 4 probes. Barely used.',
        category_id: categoryId,
        condition: 'like_new',
        price: 280.00,
        original_price: 399.00,
        brand: 'Rigol',
        is_negotiable: true,
      });
    assert(listingRes.status === 201, 'Seller created equipment listing for purchase request tests');
    const equipmentId = listingRes.body.data.id;

    // --------------------------------------------------------------------------
    // 2. Buyer Submits Purchase Request
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Purchase Request Submission & Validation...');

    // 2.1 Buyer submits valid purchase request
    const submitReqRes = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 260.00,
        message: 'Hello! I need this oscilloscope for my senior capstone project. Can we meet at the Engineering Hall?',
      });

    assert(submitReqRes.status === 201, 'Buyer submits purchase request (201 Created)');
    assert(submitReqRes.body.success === true, 'Response success is true');
    assert(submitReqRes.body.data.status === 'pending', 'Initial request status is "pending"');
    assert(submitReqRes.body.data.proposed_price === 260.00, 'Proposed price matches ($260.00)');
    assert(submitReqRes.body.data.buyer_id === buyerId, 'buyer_id matches authenticated buyer');
    assert(submitReqRes.body.data.seller_id === sellerId, 'seller_id matches listing owner');
    const requestId = submitReqRes.body.data.id;

    // 2.2 Rule: Buyer cannot purchase their own listing
    const selfPurchaseRes = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 280.00,
        message: 'Trying to buy my own item',
      });
    assert(selfPurchaseRes.status === 400, 'Self-purchase attempt is blocked with 400 Bad Request');

    // 2.3 Rule: Prevent duplicate pending requests from same buyer
    const duplicateReqRes = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 270.00,
      });
    assert(duplicateReqRes.status === 409, 'Duplicate active request is blocked with 409 Conflict');

    // --------------------------------------------------------------------------
    // 3. View Purchase Requests (Buyer & Seller Lists)
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Buyer and Seller Request Queries...');

    // 3.1 Buyer views sent requests
    const buyerRequestsRes = await request(app)
      .get('/api/v1/purchase-requests/buyer')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(buyerRequestsRes.status === 200, 'GET /api/v1/purchase-requests/buyer returns 200 OK');
    assert(buyerRequestsRes.body.data.some(r => r.id === requestId), 'Sent request found in buyer list');
    assert(buyerRequestsRes.body.data[0].seller_name !== undefined, 'Seller name included in buyer request list');

    // 3.2 Seller views received requests
    const sellerRequestsRes = await request(app)
      .get('/api/v1/purchase-requests/seller')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(sellerRequestsRes.status === 200, 'GET /api/v1/purchase-requests/seller returns 200 OK');
    assert(sellerRequestsRes.body.data.some(r => r.id === requestId), 'Received request found in seller list');
    assert(sellerRequestsRes.body.data[0].buyer_name !== undefined, 'Buyer name included in seller request list');

    // 3.3 Get Request By ID
    const singleReqRes = await request(app)
      .get(`/api/v1/purchase-requests/${requestId}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(singleReqRes.status === 200, 'GET /api/v1/purchase-requests/:id returns request details');
    assert(singleReqRes.body.data.id === requestId, 'Retrieved request ID matches');

    // 3.4 Authorization Isolation: Third-party cannot view request
    const unauthorizedView = await request(app)
      .get(`/api/v1/purchase-requests/${requestId}`)
      .set('Authorization', `Bearer ${thirdPartyToken}`);
    assert(unauthorizedView.status === 403, 'Third-party blocked from viewing request (403 Forbidden)');

    // --------------------------------------------------------------------------
    // 4. Seller Responds: Reject Workflow
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Seller Reject Workflow...');

    // 4.1 Third-party attempting to respond to seller's request
    const unauthorizedRespond = await request(app)
      .patch(`/api/v1/purchase-requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${thirdPartyToken}`)
      .send({ status: 'rejected' });
    assert(unauthorizedRespond.status === 403, 'Non-owner blocked from responding to request (403 Forbidden)');

    // 4.2 Seller rejects request with reason note
    const rejectRes = await request(app)
      .patch(`/api/v1/purchase-requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'rejected',
        response_note: 'Offer too low, price is firm at $280.',
      });
    assert(rejectRes.status === 200, 'Seller rejects request (200 OK)');
    assert(rejectRes.body.data.status === 'rejected', 'Request status updated to "rejected"');

    // 4.3 Responding again to an already resolved request is blocked
    const repeatRespondRes = await request(app)
      .patch(`/api/v1/purchase-requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });
    assert(repeatRespondRes.status === 400, 'Responding to already resolved request is blocked with 400 Bad Request');

    // --------------------------------------------------------------------------
    // 5. Seller Responds: Accept Workflow & Item Reservation
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Seller Accept Workflow & Equipment Reservation...');

    // Buyer submits a second request (since previous is now rejected, not pending)
    const secondReqRes = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 280.00,
        message: 'Understood. I will take it for the full asking price of $280.',
      });
    assert(secondReqRes.status === 201, 'Buyer submits new purchase request at asking price');
    const secondRequestId = secondReqRes.body.data.id;

    // Seller accepts second request
    const acceptRes = await request(app)
      .patch(`/api/v1/purchase-requests/${secondRequestId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });
    assert(acceptRes.status === 200, 'Seller accepts purchase request (200 OK)');
    assert(acceptRes.body.data.status === 'accepted', 'Request status updated to "accepted"');

    // Verify equipment listing automatically becomes 'reserved'
    const checkEquipRes = await request(app).get(`/api/v1/equipment/${equipmentId}`);
    assert(checkEquipRes.body.data.status === 'reserved', 'Equipment listing status automatically updated to "reserved"');

    // Rule: Reserved item cannot receive new purchase requests
    const blockedNewReq = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${thirdPartyToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 290.00,
      });
    assert(blockedNewReq.status === 400, 'New requests on reserved equipment are blocked with 400 Bad Request');

    // --------------------------------------------------------------------------
    // 6. Buyer Cancel Pending Request Workflow
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Buyer Cancel Request Workflow...');

    // Create another listing and request to test cancellation
    const cancelListingRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Logic Analyzer 16 Channel - ${timestamp}`,
        description: 'Saleae logic analyzer compatible USB module.',
        category_id: categoryId,
        condition: 'good',
        price: 45.00,
      });
    const cancelEquipId = cancelListingRes.body.data.id;

    const cancelReqRes = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ equipment_id: cancelEquipId, proposed_price: 45.00 });
    const cancelReqId = cancelReqRes.body.data.id;

    // Third-party cannot cancel Sarah's request
    const unauthorizedCancel = await request(app)
      .patch(`/api/v1/purchase-requests/${cancelReqId}/cancel`)
      .set('Authorization', `Bearer ${thirdPartyToken}`);
    assert(unauthorizedCancel.status === 403, 'Unauthorized user cannot cancel another buyer request (403 Forbidden)');

    // Buyer cancels own request
    const buyerCancelRes = await request(app)
      .patch(`/api/v1/purchase-requests/${cancelReqId}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(buyerCancelRes.status === 200, 'Buyer cancels own pending request (200 OK)');
    assert(buyerCancelRes.body.data.status === 'cancelled', 'Request status updated to "cancelled"');

    console.log('\n================================================================');
    console.log(`PURCHASE REQUEST TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Submission, duplicate prevention, self-purchase guard, accept/reject, reservation & cancellation verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nPurchase Request Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runPurchaseRequestTests();
}

module.exports = runPurchaseRequestTests;
