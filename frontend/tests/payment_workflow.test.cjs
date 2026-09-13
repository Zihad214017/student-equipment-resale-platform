const supertest = require('../../backend/node_modules/supertest');
const app = require('../../backend/src/app');

async function testPaymentWorkflow() {
  console.log('================================================================');
  console.log('PAYMENT SYSTEM & COMPLETE WORKFLOW INTEGRATION TEST');
  console.log('bKash & Nagad Gateways, Security, Idempotency & Lifecycle');
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
    // 1. Authenticate Buyer, Seller, and Admin
    console.log('1. Authenticating Buyer, Seller, and Admin Accounts...');
    const buyerLogin = await supertest(app).post('/api/v1/auth/login').send({
      email: 'buyer.sarah@university.edu',
      password: 'Password123!',
    });
    assert(buyerLogin.status === 200, 'Buyer login returns 200 OK');
    const buyerToken = buyerLogin.body.data.token;
    const buyerId = buyerLogin.body.data.user.id;

    const sellerLogin = await supertest(app).post('/api/v1/auth/login').send({
      email: 'seller.alex@university.edu',
      password: 'Password123!',
    });
    assert(sellerLogin.status === 200, 'Seller login returns 200 OK');
    const sellerToken = sellerLogin.body.data.token;
    const sellerId = sellerLogin.body.data.user.id;

    const adminLogin = await supertest(app).post('/api/v1/auth/login').send({
      email: 'admin@university.edu',
      password: 'Password123!',
    });
    assert(adminLogin.status === 200, 'Admin login returns 200 OK');
    const adminToken = adminLogin.body.data.token;

    // Create another buyer to test cross-buyer authorization guards
    const otherBuyerEmail = `other.buyer.${timestamp}@university.edu`;
    const otherBuyerReg = await supertest(app).post('/api/v1/auth/register').send({
      student_id: `STU-OB-${timestamp}`,
      full_name: 'Other Student Buyer',
      email: otherBuyerEmail,
      password: 'Password123!',
    });
    assert(otherBuyerReg.status === 201, 'Other Buyer registration returns 201 Created');
    const otherBuyerToken = otherBuyerReg.body.data.token;
    const otherBuyerId = otherBuyerReg.body.data.user.id;

    // 2. Fetch Category & Create Equipment Listing
    console.log('\n2. Setting up Equipment for Sale...');
    const catRes = await supertest(app).get('/api/v1/categories');
    assert(catRes.status === 200, 'GET /categories returns 200 OK');
    const categoryId = catRes.body.data[0].id;

    const createEquipRes = await supertest(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Digital Multimeter Fluke ${timestamp}`,
        description: 'Excellent condition digital multimeter for electrical lab tests.',
        category_id: categoryId,
        condition: 'like_new',
        price: 180.00,
        is_negotiable: true,
      });
    assert(createEquipRes.status === 201, 'Seller creates equipment listing (201 Created)');
    const equipmentId = createEquipRes.body.data.id;

    // 3. Buyer Submits Purchase Request
    console.log('\n3. Buyer Submits Purchase Request...');
    const reqRes = await supertest(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        equipment_id: equipmentId,
        proposed_price: 165.00,
        message: 'Can meet at engineering quad tomorrow!',
      });
    assert(reqRes.status === 201, 'Purchase request created (201 Created)');
    const requestId = reqRes.body.data.id;

    // 4. Seller Accepts Purchase Request -> Transaction Created (status: accepted)
    console.log('\n4. Seller Accepts Request (Transaction created in accepted status)...');
    const acceptRes = await supertest(app)
      .patch(`/api/v1/purchase-requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'accepted',
        response_note: 'Offer accepted! Please complete mobile payment.',
      });
    assert(acceptRes.status === 200, 'Seller accepts purchase request');

    // Retrieve buyer transaction
    const txListRes = await supertest(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(txListRes.status === 200, 'Buyer fetches transaction history');
    const activeTx = txListRes.body.data.find((t) => t.equipment_id === equipmentId);
    assert(activeTx !== undefined, 'Transaction record exists for accepted item');
    assert(activeTx.status === 'accepted', 'Transaction is in accepted status');
    assert(activeTx.agreed_price === 165.00, 'Agreed price matches offer ($165.00)');
    const transactionId = activeTx.id;

    // 5. Test Security: Unauthorized Buyer cannot initiate payment
    console.log('\n5. Testing Payment Authorization & Security Guards...');
    const unauthorizedPayRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .send({
        transaction_id: transactionId,
        payment_method: 'BKASH',
      });
    assert(unauthorizedPayRes.status === 403, 'Cross-buyer cannot initiate payment (403 Forbidden)');

    // 6. Test Security: Unauthenticated request rejected
    const unauthPayRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .send({
        transaction_id: transactionId,
        payment_method: 'BKASH',
      });
    assert(unauthPayRes.status === 401, 'Unauthenticated payment rejected (401 Unauthorized)');

    // 7. Test Validation: Invalid payment method rejected
    const invalidMethodRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: transactionId,
        payment_method: 'BITCOIN_INVALID',
      });
    assert(invalidMethodRes.status === 400, 'Invalid payment method rejected (400 Bad Request)');

    // 8. Test Validation: Invalid transaction UUID rejected
    const invalidTxRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: '00000000-0000-0000-0000-000000000000',
        payment_method: 'BKASH',
      });
    assert(invalidTxRes.status === 404, 'Non-existent transaction rejected (404 Not Found)');

    // 9. Test bKash Payment Initiation & Amount Derivation
    console.log('\n6. Testing bKash Payment Initiation...');
    const bkashInitRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: transactionId,
        payment_method: 'BKASH',
        customer_phone: '01711223344',
        amount: 1.00, // Tampered client amount attempt!
      });
    assert(bkashInitRes.status === 201, 'bKash payment initiated successfully (201 Created)');
    assert(bkashInitRes.body.data.payment_method === 'BKASH', 'Payment method is BKASH');
    assert(bkashInitRes.body.data.amount === 165.00, 'Trusted DB price ($165.00) used instead of tampered amount');
    assert(Boolean(bkashInitRes.body.data.payment_id), 'Payment UUID returned');
    assert(Boolean(bkashInitRes.body.data.provider_reference), 'Provider reference generated');
    const bkashPaymentId = bkashInitRes.body.data.payment_id;

    // 10. Test Nagad Payment Initiation on a second item
    console.log('\n7. Testing Nagad Payment Initiation...');
    const nagadEquipRes = await supertest(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `TI-84 Plus CE Calculator ${timestamp}`,
        description: 'Color screen graphing calculator with charger.',
        category_id: categoryId,
        condition: 'good',
        price: 95.00,
      });
    const nagadEquipId = nagadEquipRes.body.data.id;

    const nagadReqRes = await supertest(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ equipment_id: nagadEquipId, proposed_price: 90.00 });
    const nagadReqId = nagadReqRes.body.data.id;

    await supertest(app)
      .patch(`/api/v1/purchase-requests/${nagadReqId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    const buyerTxList2 = await supertest(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyerToken}`);
    const nagadTx = buyerTxList2.body.data.find((t) => t.equipment_id === nagadEquipId);
    assert(Boolean(nagadTx), 'Nagad transaction found');

    const nagadInitRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: nagadTx.id,
        payment_method: 'NAGAD',
      });
    assert(nagadInitRes.status === 201, 'Nagad payment initiated successfully (201 Created)');
    assert(nagadInitRes.body.data.payment_method === 'NAGAD', 'Payment method is NAGAD');
    assert(nagadInitRes.body.data.amount === 90.00, 'Nagad trusted price ($90.00) verified');
    const nagadPaymentId = nagadInitRes.body.data.payment_id;

    // 11. Test Payment Verification (bKash)
    console.log('\n8. Testing Server-Side Payment Verification (bKash)...');
    const bkashVerifyRes = await supertest(app)
      .post(`/api/v1/payments/${bkashPaymentId}/verify`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        provider_transaction_id: `BKASH_TEST_TRX_${timestamp}`,
      });
    assert(bkashVerifyRes.status === 200, 'Payment verified successfully (200 OK)');
    assert(bkashVerifyRes.body.data.payment_status === 'SUCCESS', 'Payment status is SUCCESS');
    assert(Boolean(bkashVerifyRes.body.data.paid_at), 'paid_at timestamp recorded');
    assert(Boolean(bkashVerifyRes.body.data.provider_transaction_id), 'provider_transaction_id recorded');

    // 12. Test Idempotency: Duplicate verification call
    console.log('\n9. Testing Verification Idempotency...');
    const duplicateVerifyRes = await supertest(app)
      .post(`/api/v1/payments/${bkashPaymentId}/verify`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        provider_transaction_id: `BKASH_TEST_TRX_${timestamp}`,
      });
    assert(duplicateVerifyRes.status === 200, 'Duplicate verification call succeeds idempotently (200 OK)');
    assert(duplicateVerifyRes.body.data.payment_status === 'SUCCESS', 'Status remains SUCCESS');

    // 13. Test Duplicate Payment Protection: Cannot initiate payment for already paid transaction
    console.log('\n10. Testing Duplicate Payment Prevention...');
    const duplicateInitRes = await supertest(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: transactionId,
        payment_method: 'BKASH',
      });
    assert(duplicateInitRes.status === 409, 'Duplicate payment initiation rejected (409 Conflict)');

    // 14. Verify Transaction & Equipment Statuses Updated
    console.log('\n11. Verifying Transaction & Equipment Synchronization...');
    const txDetailRes = await supertest(app)
      .get(`/api/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(txDetailRes.status === 200, 'GET /transactions/:id returns 200 OK');
    assert(txDetailRes.body.data.status === 'sold', 'Transaction status updated to sold');
    assert(txDetailRes.body.data.payment_status === 'SUCCESS', 'Transaction reflects payment_status SUCCESS');

    const equipDetailRes = await supertest(app).get(`/api/v1/equipment/${equipmentId}`);
    assert(equipDetailRes.status === 200, 'GET /equipment/:id returns 200 OK');
    assert(equipDetailRes.body.data.status === 'sold', 'Equipment status updated to sold');

    // 15. Verify Notifications Dispatched
    console.log('\n12. Verifying Notification Delivery for Payment...');
    const buyerNotifs = await supertest(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(buyerNotifs.status === 200, 'Buyer notifications retrieved');
    const paymentSuccessNotif = buyerNotifs.body.data.find(
      (n) => n.title.includes('Payment Successful') || n.type === 'payment_update'
    );
    assert(Boolean(paymentSuccessNotif), 'Buyer received payment success notification');

    const sellerNotifs = await supertest(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(sellerNotifs.status === 200, 'Seller notifications retrieved');
    const sellerPaymentNotif = sellerNotifs.body.data.find(
      (n) => n.title.includes('Payment Received') || n.type === 'payment_update'
    );
    assert(Boolean(sellerPaymentNotif), 'Seller received payment notification');

    // 16. Verify Review Rules: Buyer cannot review before transaction completed
    console.log('\n13. Verifying Review Eligibility Rules...');
    const prematureReviewRes = await supertest(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: transactionId,
        rating: 5,
        comment: 'Great multimeter!',
      });
    assert(prematureReviewRes.status === 400, 'Review rejected when transaction is sold but not completed (400 Bad Request)');

    // Buyer confirms physical delivery -> status becomes completed
    const completeTxRes = await supertest(app)
      .patch(`/api/v1/transactions/${transactionId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ status: 'completed' });
    assert(completeTxRes.status === 200, 'Buyer confirms delivery -> transaction status becomes completed');

    // Now review should be permitted
    const validReviewRes = await supertest(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        transaction_id: transactionId,
        rating: 5,
        comment: 'Item received in pristine condition. Highly recommended seller!',
      });
    assert(validReviewRes.status === 201, 'Review accepted after transaction completion (201 Created)');

    // 17. Test Buyer Payment History API
    console.log('\n14. Testing Buyer Payment History API...');
    const myPaymentsRes = await supertest(app)
      .get('/api/v1/payments/my-payments')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(myPaymentsRes.status === 200, 'GET /payments/my-payments returns 200 OK');
    assert(Array.isArray(myPaymentsRes.body.data), 'Payments array returned');
    assert(myPaymentsRes.body.data.length >= 1, 'Payment records found in history');

    // 18. Test Admin Payment Monitoring & Statistics APIs
    console.log('\n15. Testing Admin Payment Monitoring & Analytics...');
    const adminPaymentsRes = await supertest(app)
      .get('/api/v1/payments/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminPaymentsRes.status === 200, 'Admin GET /payments/admin returns 200 OK');
    assert(Array.isArray(adminPaymentsRes.body.data), 'Admin payments array returned');

    const adminStatsRes = await supertest(app)
      .get('/api/v1/payments/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminStatsRes.status === 200, 'Admin GET /payments/admin/stats returns 200 OK');
    assert(adminStatsRes.body.data.total_payments >= 1, 'Total payments metric verified');
    assert(adminStatsRes.body.data.successful_payments >= 1, 'Successful payments metric verified');
    assert(typeof adminStatsRes.body.data.total_volume === 'number', 'Total volume metric verified');
    assert(Boolean(adminStatsRes.body.data.breakdown?.bkash), 'bKash breakdown present');
    assert(Boolean(adminStatsRes.body.data.breakdown?.nagad), 'Nagad breakdown present');

    // 19. Verify Public Webhook Callback Endpoint
    console.log('\n16. Testing Webhook Callback Endpoint...');
    const callbackRes = await supertest(app)
      .post('/api/v1/payments/callback/bkash')
      .send({
        paymentID: 'BKASH_CB_123',
        status: 'success',
      });
    assert(callbackRes.status === 200, 'Callback webhook endpoint returns 200 OK');

    // 20. Verify No Secrets or Private Keys in API Responses
    console.log('\n17. Security Audit: Verifying Zero Secrets in Responses...');
    const responseString = JSON.stringify(bkashVerifyRes.body) + JSON.stringify(adminStatsRes.body);
    assert(!responseString.includes('app_secret') && !responseString.includes('privateKey') && !responseString.includes('password_hash'), 'No secrets or private keys exposed');

    console.log('\n================================================================');
    console.log(`PAYMENT WORKFLOW INTEGRATION SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('bKash & Nagad Gateways, Security, Idempotency & Review Guards Verified!');
    console.log('================================================================\n');
  } catch (err) {
    console.error(`\nTest suite aborted with error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  testPaymentWorkflow()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = testPaymentWorkflow;
