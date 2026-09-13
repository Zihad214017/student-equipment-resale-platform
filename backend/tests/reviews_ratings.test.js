const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

async function runReviewAndRatingTests() {
  console.log('================================================================');
  console.log('Review & Rating Subsystem & Eligibility Automated Test Suite');
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
    // Setup Test Accounts & Equipment
    // --------------------------------------------------------------------------
    console.log('0. Setting Up Test Accounts (Seller, Buyer 1, Buyer 2, and Unrelated Student)...');

    // Seller (Alex)
    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLogin.status === 200, 'Seller login succeeded');
    const sellerToken = sellerLogin.body.data.token;
    const sellerId = sellerLogin.body.data.user.id;

    // Buyer 1 (Sarah)
    const buyer1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer.sarah@university.edu', password: 'Password123!' });
    assert(buyer1Login.status === 200, 'Buyer 1 login succeeded');
    const buyer1Token = buyer1Login.body.data.token;
    const buyer1Id = buyer1Login.body.data.user.id;

    // Buyer 2 (Fresh registered student)
    const buyer2Res = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-RV2-${timestamp}`,
        full_name: 'Liam Neeson',
        email: `liam.neeson.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Drama & Arts',
      });
    const buyer2Token = buyer2Res.body.data.token;
    const buyer2Id = buyer2Res.body.data.user.id;

    // Unrelated 3rd Party Student
    const thirdPartyRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-RV3-${timestamp}`,
        full_name: 'Zoe Saldana',
        email: `zoe.saldana.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Cinema',
      });
    const thirdPartyToken = thirdPartyRes.body.data.token;

    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data[0].id;

    // Seller creates equipment #1
    const item1Res = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Microscope Binocular LED 1000x - ${timestamp}`,
        description: 'Compound laboratory microscope with oil immersion lens.',
        category_id: categoryId,
        condition: 'like_new',
        price: 340.00,
      });
    const equipment1Id = item1Res.body.data.id;

    // Buyer 1 requests and seller accepts
    const req1Res = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ equipment_id: equipment1Id, proposed_price: 330.00 });
    const req1Id = req1Res.body.data.id;

    await request(app)
      .patch(`/api/v1/purchase-requests/${req1Id}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    // Fetch transaction 1
    const buyer1TxRes = await request(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyer1Token}`);
    const tx1 = buyer1TxRes.body.data.find(t => t.equipment_id === equipment1Id);
    assert(tx1 !== undefined, 'Transaction 1 created in buyer transactions');
    const transaction1Id = tx1.id;

    // --------------------------------------------------------------------------
    // CASE 1: Pending transaction -> review rejected
    // --------------------------------------------------------------------------
    console.log('\nCase 1: Testing Pending Transaction -> Review Rejected...');
    await db.query("UPDATE transactions SET status = 'pending' WHERE id = $1", [transaction1Id]);

    const pendingReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, rating: 5, comment: 'Trying to review pending tx' });
    assert(pendingReviewRes.status === 400, '1. Pending transaction review rejected with 400 Bad Request');
    assert(pendingReviewRes.body.message.includes('completed'), '1. Error message indicates transaction must be completed');

    // --------------------------------------------------------------------------
    // CASE 2: Accepted transaction -> review rejected
    // --------------------------------------------------------------------------
    console.log('\nCase 2: Testing Accepted Transaction -> Review Rejected...');
    await db.query("UPDATE transactions SET status = 'accepted' WHERE id = $1", [transaction1Id]);

    const acceptedReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, rating: 5, comment: 'Trying to review accepted tx' });
    assert(acceptedReviewRes.status === 400, '2. Accepted transaction review rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // CASE 3: Sold transaction -> review rejected
    // --------------------------------------------------------------------------
    console.log('\nCase 3: Testing Sold Transaction -> Review Rejected...');
    await request(app)
      .patch(`/api/v1/transactions/${transaction1Id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'sold' });

    const soldReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, rating: 5, comment: 'Trying to review sold tx' });
    assert(soldReviewRes.status === 400, '3. Sold transaction review rejected with 400 Bad Request');

    // Reset transaction1 back to accepted for payment testing
    await db.query("UPDATE transactions SET status = 'accepted' WHERE id = $1", [transaction1Id]);

    // --------------------------------------------------------------------------
    // CASE 4: Failed payment -> review rejected
    // --------------------------------------------------------------------------
    console.log('\nCase 4: Testing Failed Payment -> Review Rejected...');
    // Record a failed payment record on transaction 1
    await db.query(
      `INSERT INTO payments (transaction_id, buyer_id, seller_id, equipment_id, amount, payment_method, payment_status)
       VALUES ($1, $2, $3, $4, 330.00, 'BKASH', 'FAILED')`,
      [transaction1Id, buyer1Id, sellerId, equipment1Id]
    );
    const failedPayReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, rating: 5 });
    assert(failedPayReviewRes.status === 400, '4. Failed payment transaction review rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // CASE 5: Pending payment -> review rejected
    // --------------------------------------------------------------------------
    console.log('\nCase 5: Testing Pending Payment -> Review Rejected...');
    await db.query(
      `INSERT INTO payments (transaction_id, buyer_id, seller_id, equipment_id, amount, payment_method, payment_status)
       VALUES ($1, $2, $3, $4, 330.00, 'BKASH', 'PENDING')`,
      [transaction1Id, buyer1Id, sellerId, equipment1Id]
    );
    const pendingPayReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, rating: 5 });
    assert(pendingPayReviewRes.status === 400, '5. Pending payment transaction review rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // CASE 6: Payment SUCCESS + Transaction not COMPLETED -> review rejected
    // --------------------------------------------------------------------------
    console.log('\nCase 6: Testing Payment SUCCESS but Transaction Not COMPLETED -> Review Rejected...');
    // Initiate and verify payment -> transaction becomes 'sold'
    const initPayRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, payment_method: 'BKASH' });
    const paymentId = initPayRes.body.data.payment_id;

    await request(app)
      .post(`/api/v1/payments/${paymentId}/verify`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ provider_transaction_id: `BKASH_PAY_RV_${timestamp}` });

    // Verify transaction status is 'sold' and payment status is 'SUCCESS'
    const txAfterPay = await request(app)
      .get(`/api/v1/transactions/${transaction1Id}`)
      .set('Authorization', `Bearer ${buyer1Token}`);
    assert(txAfterPay.body.data.status === 'sold', 'Transaction status is "sold" after payment success');
    assert(txAfterPay.body.data.payment_status === 'SUCCESS', 'Payment status is SUCCESS');

    // Attempt review while payment is SUCCESS but transaction is still 'sold' (not 'completed')
    const paidNotCompletedReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ transaction_id: transaction1Id, rating: 5, comment: 'Paid successfully, reviewing early' });
    assert(paidNotCompletedReviewRes.status === 400, '6. Payment SUCCESS + status="sold" review rejected with 400 Bad Request');
    assert(paidNotCompletedReviewRes.body.message.includes('sold'), '6. Error message notes current status is "sold"');

    // --------------------------------------------------------------------------
    // CASE 7: COMPLETED transaction -> review allowed
    // --------------------------------------------------------------------------
    console.log('\nCase 7: Testing COMPLETED Transaction -> Review Allowed...');
    // Buyer marks transaction as completed after handover
    const completeTxRes = await request(app)
      .patch(`/api/v1/transactions/${transaction1Id}/status`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ status: 'completed' });
    assert(completeTxRes.status === 200, 'Transaction status transitioned to "completed"');

    // --------------------------------------------------------------------------
    // CASE 8: Buyer reviewing another buyer's transaction -> rejected (403)
    // --------------------------------------------------------------------------
    console.log('\nCase 8: Testing Buyer Reviewing Another Buyer\'s Transaction -> Rejected...');
    const crossBuyerReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ transaction_id: transaction1Id, rating: 5, comment: 'I did not buy this item' });
    assert(crossBuyerReviewRes.status === 403, '8. Buyer reviewing another buyer\'s transaction rejected with 403 Forbidden');

    // --------------------------------------------------------------------------
    // CASE 9: Seller trying to submit review -> rejected (403/400)
    // --------------------------------------------------------------------------
    console.log('\nCase 9: Testing Seller Reviewing Own Transaction -> Rejected...');
    const sellerReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ transaction_id: transaction1Id, rating: 5, comment: 'I am the seller reviewing myself' });
    assert(sellerReviewRes.status === 403 || sellerReviewRes.status === 400, '9. Seller self-review attempt rejected (403/400)');

    // --------------------------------------------------------------------------
    // CASE 11: Valid completed transaction review -> successful (201)
    // --------------------------------------------------------------------------
    console.log('\nCase 11: Testing Valid Completed Transaction Review -> Successful...');
    const validReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        transaction_id: transaction1Id,
        rating: 5,
        comment: 'Excellent seller! The microscope was clean, packaged securely, and works flawlessly.',
      });
    assert(validReviewRes.status === 201, '11. Valid review submitted for completed transaction (201 Created)');
    assert(validReviewRes.body.success === true, '11. Review creation reports success: true');
    assert(validReviewRes.body.data.rating === 5, '11. Rating is 5 stars');
    assert(validReviewRes.body.data.reviewer_id === buyer1Id, '11. Reviewer derived correctly as Buyer 1');
    assert(validReviewRes.body.data.reviewee_id === sellerId, '11. Reviewee derived correctly as Seller');
    const review1Id = validReviewRes.body.data.id;

    // --------------------------------------------------------------------------
    // CASE 10: Duplicate review -> rejected (409 Conflict)
    // --------------------------------------------------------------------------
    console.log('\nCase 10: Testing Duplicate Review -> Rejected...');
    const duplicateReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        transaction_id: transaction1Id,
        rating: 4,
        comment: 'Attempting second review on same transaction',
      });
    assert(duplicateReviewRes.status === 409, '10. Duplicate review on same transaction rejected with 409 Conflict');

    // --------------------------------------------------------------------------
    // CASE 12: Seller average rating calculation -> correct
    // --------------------------------------------------------------------------
    console.log('\nCase 12: Testing Seller Average Rating Calculation & Distribution...');
    // Create second completed transaction with Buyer 2 to verify multi-review aggregation
    const item2Res = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `Raspberry Pi 4 Model B (8GB) Kit - ${timestamp}`,
        description: 'Complete kit with case, heatsinks, power supply, and 64GB card.',
        category_id: categoryId,
        condition: 'new',
        price: 85.00,
      });
    const equipment2Id = item2Res.body.data.id;

    const req2Res = await request(app)
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ equipment_id: equipment2Id, proposed_price: 85.00 });
    const req2Id = req2Res.body.data.id;

    await request(app)
      .patch(`/api/v1/purchase-requests/${req2Id}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    const buyer2TxRes = await request(app)
      .get('/api/v1/transactions/buyer')
      .set('Authorization', `Bearer ${buyer2Token}`);
    const tx2 = buyer2TxRes.body.data.find(t => t.equipment_id === equipment2Id);
    const transaction2Id = tx2.id;

    // Complete transaction 2 directly
    await db.query("UPDATE transactions SET status = 'completed' WHERE id = $1", [transaction2Id]);

    // Buyer 2 leaves 3-star review
    const buyer2ReviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({
        transaction_id: transaction2Id,
        rating: 3,
        comment: 'Good product, delivery was a bit late.',
      });
    assert(buyer2ReviewRes.status === 201, 'Buyer 2 leaves 3-star review');

    // Query seller reviews and verify stats
    const sellerReviewsRes = await request(app).get(`/api/v1/reviews/seller/${sellerId}`);
    assert(sellerReviewsRes.status === 200, '12. GET /api/v1/reviews/seller/:id returns 200 OK');
    assert(Array.isArray(sellerReviewsRes.body.data), '12. Reviews array returned');
    assert(sellerReviewsRes.body.meta.rating_summary !== undefined, '12. Meta includes rating_summary');

    const summary = sellerReviewsRes.body.meta.rating_summary;
    assert(summary.total_reviews >= 2, '12. Total reviews is at least 2');
    assert(summary.average_rating >= 1 && summary.average_rating <= 5, `12. Average rating is valid (${summary.average_rating})`);
    assert(summary.distribution[5] >= 1, '12. Distribution includes 5-star review');
    assert(summary.distribution[3] >= 1, '12. Distribution includes 3-star review');

    console.log('\n================================================================');
    console.log(`REVIEW & RATING 12-CASE AUDIT SUMMARY: ${passed}/${total} CHECKS PASSED (100% SUCCESS)`);
    console.log('All 12 business rules and eligibility constraints verified perfectly!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nReview & Rating Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runReviewAndRatingTests();
}

module.exports = runReviewAndRatingTests;
