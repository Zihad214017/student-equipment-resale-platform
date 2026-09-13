const supertest = require('../../backend/node_modules/supertest');
const app = require('../../backend/src/app');

async function testSellerWorkflow() {
  console.log('================================================================');
  console.log('SELLER INTERFACE & COMPLETE WORKFLOW INTEGRATION TEST');
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

  const timestamp = Date.now().toString().slice(-6);

  try {
    // 1. Seller & Buyer Authentication
    console.log('1. Authenticating Seller and Buyer Accounts...');
    const sellerLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'seller.alex@university.edu',
        password: 'Password123!',
      });
    assert(sellerLoginRes.status === 200, 'Seller login returns 200 OK');
    const sellerToken = sellerLoginRes.body.data.token;
    const sellerId = sellerLoginRes.body.data.user.id;

    const buyerLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'buyer.sarah@university.edu',
        password: 'Password123!',
      });
    assert(buyerLoginRes.status === 200, 'Buyer login returns 200 OK');
    const buyerToken = buyerLoginRes.body.data.token;

    // 2. Fetch Category for Listing Creation
    console.log('\n2. Fetching Equipment Categories...');
    const catRes = await supertest(app).get('/api/v1/categories');
    assert(catRes.status === 200, 'GET /categories returns 200 OK');
    assert(Array.isArray(catRes.body.data) && catRes.body.data.length > 0, 'Categories available');
    const categoryId = catRes.body.data[0].id;

    // 3. Create Equipment Listing
    console.log('\n3. Seller Creates New Equipment Listing...');
    const createRes = await supertest(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Seller Integration Gear ${timestamp}`,
        description: 'High-precision sensor evaluation kit with probes and cables.',
        category_id: categoryId,
        condition: 'Like New',
        price: 180.00,
        original_price: 250.00,
        brand: 'Texas Instruments',
        is_negotiable: true,
      });

    assert(createRes.status === 201, 'POST /equipment creates listing (201 Created)');
    assert(createRes.body.success === true, 'Response success flag is true');
    const equipmentId = createRes.body.data.id;
    assert(typeof equipmentId === 'string', 'Equipment ID returned');

    // 4. View Seller's Own Listings
    console.log('\n4. Seller Queries Own Inventory (My Listings)...');
    const myListingsRes = await supertest(app)
      .get('/api/v1/equipment/user/my-listings')
      .set('Authorization', `Bearer ${sellerToken}`);

    assert(myListingsRes.status === 200, 'GET /equipment/user/my-listings returns 200 OK');
    assert(Array.isArray(myListingsRes.body.data), 'Listings array returned');
    const createdItem = myListingsRes.body.data.find((item) => item.id === equipmentId);
    assert(createdItem !== undefined, 'Created equipment item found in seller inventory');
    assert(createdItem.status === 'available', 'Initial item status is "available"');

    // 5. Update Equipment Listing
    console.log('\n5. Seller Updates Listing Details...');
    const updateRes = await supertest(app)
      .put(`/api/v1/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Seller Integration Gear Updated ${timestamp}`,
        description: 'Updated description: Includes USB debugging bridge and power adapter.',
        category_id: categoryId,
        condition: 'Like New',
        price: 175.00,
        is_negotiable: true,
      });

    assert(updateRes.status === 200, 'PUT /equipment/:id updates listing (200 OK)');
    assert(updateRes.body.data.price == 175.00, 'Price updated to 175.00');

    // 6. Toggle Status (Available -> Unavailable -> Available)
    console.log('\n6. Seller Toggles Equipment Availability Status...');
    const toggleUnavailRes = await supertest(app)
      .patch(`/api/v1/equipment/${equipmentId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'unavailable' });
    assert(toggleUnavailRes.status === 200, 'PATCH /equipment/:id/status marks unavailable');

    const toggleAvailRes = await supertest(app)
      .patch(`/api/v1/equipment/${equipmentId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'available' });
    assert(toggleAvailRes.status === 200, 'PATCH /equipment/:id/status restores available');

    // 7. Buyer Submits Purchase Request
    console.log('\n7. Buyer Submits Purchase Request for Equipment...');
    const reqRes = await supertest(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 165.00,
        message: 'Can meet tomorrow at the university library entrance.',
      });

    assert(reqRes.status === 201, 'POST /purchase-requests creates request (201 Created)');
    const requestId = reqRes.body.data.id;

    // 8. Seller Views Received Purchase Requests
    console.log('\n8. Seller Views Incoming Purchase Requests...');
    const sellerReqsRes = await supertest(app)
      .get('/api/v1/purchase-requests/seller')
      .set('Authorization', `Bearer ${sellerToken}`);

    assert(sellerReqsRes.status === 200, 'GET /purchase-requests/seller returns 200 OK');
    const receivedReq = sellerReqsRes.body.data.find((r) => r.id === requestId);
    assert(receivedReq !== undefined, 'Incoming buyer request found in seller list');
    assert(receivedReq.status === 'pending', 'Request status is pending');

    // 9. Seller Responds to Purchase Request (Accept)
    console.log('\n9. Seller Accepts Buyer Offer...');
    const acceptRes = await supertest(app)
      .patch(`/api/v1/purchase-requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'accepted',
        response_note: 'Deal accepted! See you at the library tomorrow at 3 PM.',
      });

    assert(acceptRes.status === 200, 'PATCH /purchase-requests/:id/respond accepts offer (200 OK)');
    assert(acceptRes.body.data.status === 'accepted', 'Request status transitioned to "accepted"');

    // 10. Seller Views Sales Transactions
    console.log('\n10. Seller Inspects Sales & Transactions History...');
    const txRes = await supertest(app)
      .get('/api/v1/transactions/seller')
      .set('Authorization', `Bearer ${sellerToken}`);

    assert(txRes.status === 200, 'GET /transactions/seller returns 200 OK');
    const txRecord = txRes.body.data.find((t) => t.equipment_id === equipmentId);
    assert(txRecord !== undefined, 'Transaction record automatically generated');
    assert(txRecord.status === 'accepted', 'Transaction initial status is "accepted"');
    const transactionId = txRecord.id;

    // 11. Seller Marks Transaction as Sold (Handover)
    console.log('\n11. Seller Marks Equipment as Sold...');
    const markSoldRes = await supertest(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'sold',
        meeting_location: 'Main University Library Entrance',
        notes: 'Handed over sensor kit with all cables and received cash.',
      });

    assert(markSoldRes.status === 200, 'PATCH /transactions/:id/status marks as sold (200 OK)');
    assert(markSoldRes.body.data.status === 'sold', 'Transaction status is "sold"');

    // 12. Buyer Completes Transaction
    console.log('\n12. Buyer Confirms Handover Receipt...');
    const completeTxRes = await supertest(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        status: 'completed',
        notes: 'Equipment tested and fully functional. Deal complete.',
      });

    assert(completeTxRes.status === 200, 'Buyer marks transaction completed (200 OK)');
    assert(completeTxRes.body.data.status === 'completed', 'Transaction is "completed"');

    // 13. Buyer Submits Review for Seller
    console.log('\n13. Buyer Submits Review and 5-Star Rating...');
    const reviewRes = await supertest(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: transactionId,
        rating: 5,
        comment: 'Outstanding seller! Equipment in pristine condition, very prompt.',
      });

    assert(reviewRes.status === 201, 'POST /reviews submits review (201 Created)');

    // 14. Seller Views Ratings & Reviews
    console.log('\n14. Seller Views Ratings & Feedback...');
    const sellerReviewsRes = await supertest(app)
      .get(`/api/v1/reviews/seller/${sellerId}`);

    assert(sellerReviewsRes.status === 200, 'GET /reviews/seller/:id returns 200 OK');
    assert(sellerReviewsRes.body.meta.rating_summary !== undefined, 'Rating summary returned');
    assert(sellerReviewsRes.body.meta.rating_summary.average_rating > 0, 'Average rating updated');

    console.log('\n================================================================');
    console.log(`SELLER WORKFLOW INTEGRATION SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Complete Seller Lifecycle: Listing CRUD, Request Accept, Handover Sold, Transactions & Reviews Verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nSeller Workflow Test Failed:', err);
    process.exit(1);
  }
}

testSellerWorkflow();
