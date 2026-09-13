const supertest = require('../../backend/node_modules/supertest');
const app = require('../../backend/src/app');

async function testAdminWorkflow() {
  console.log('================================================================');
  console.log('ADMIN DASHBOARD & WORKFLOW INTEGRATION TEST');
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
    // 1. Admin Login
    console.log('1. Admin Authentication & Role Verification...');
    const adminLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@university.edu',
        password: 'Password123!',
      });

    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminLoginRes.body.data.user.role === 'admin', 'User has admin role');
    const adminToken = adminLoginRes.body.data.token;

    // Student Login (for RBAC test)
    const studentLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'buyer.sarah@university.edu',
        password: 'Password123!',
      });
    assert(studentLoginRes.status === 200, 'Student login returns 200 OK');
    const studentToken = studentLoginRes.body.data.token;

    // 2. RBAC Enforcement on Admin Endpoints
    console.log('\n2. Testing RBAC Security Guardrails...');
    const forbiddenRes = await supertest(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${studentToken}`);
    assert(forbiddenRes.status === 403, 'Student blocked from admin reports (403 Forbidden)');

    const unauthRes = await supertest(app).get('/api/v1/admin/reports');
    assert(unauthRes.status === 401, 'Unauthenticated request blocked (401 Unauthorized)');

    // 3. Platform Dashboard Statistics (All 8 Core Metrics)
    console.log('\n3. Testing Platform Dashboard Statistics (8 Core Metrics)...');
    const reportRes = await supertest(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    assert(reportRes.status === 200, 'GET /admin/reports returns 200 OK');
    const data = reportRes.body.data;

    assert(data.users && typeof data.users.total_users === 'number', 'Stat 1: Total Users returned');
    assert(data.users && typeof data.users.total_buyers === 'number', 'Stat 2: Buyers count returned');
    assert(data.users && typeof data.users.total_sellers === 'number', 'Stat 3: Sellers count returned');
    assert(data.equipment && typeof data.equipment.total_equipment === 'number', 'Stat 4: Equipment count returned');
    assert(data.purchase_requests && typeof data.purchase_requests.total_purchase_requests === 'number', 'Stat 5: Purchase Requests count returned');
    assert(data.transactions && typeof data.transactions.total_transactions === 'number', 'Stat 6: Transactions count returned');
    assert(data.transactions && typeof data.transactions.completed_transactions === 'number', 'Stat 7: Completed Transactions returned');
    assert(data.purchase_requests && typeof data.purchase_requests.pending_requests === 'number', 'Stat 8: Pending Requests returned');

    // 4. User Management
    console.log('\n4. Testing User Management APIs...');
    const usersListRes = await supertest(app)
      .get('/api/v1/admin/users?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert(usersListRes.status === 200, 'GET /admin/users returns 200 OK');
    assert(Array.isArray(usersListRes.body.data), 'Users array returned');
    assert(usersListRes.body.data.length > 0, 'User records found');

    const sampleUser = usersListRes.body.data[0];

    // Search user
    const searchUserRes = await supertest(app)
      .get(`/api/v1/admin/users?search=${encodeURIComponent(sampleUser.email)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(searchUserRes.status === 200, 'Search users by email returns 200 OK');
    assert(searchUserRes.body.data.length >= 1, 'Search result matches user');

    // View User Details
    const userDetailRes = await supertest(app)
      .get(`/api/v1/admin/users/${sampleUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(userDetailRes.status === 200, 'GET /admin/users/:id returns 200 OK');

    // Update User Profile
    const updateProfileRes = await supertest(app)
      .put(`/api/v1/admin/users/${sampleUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: `${sampleUser.full_name} (Admin Audited)`,
      });
    assert(updateProfileRes.status === 200, 'PUT /admin/users/:id updates profile');

    // 5. Equipment Moderation
    console.log('\n5. Testing Equipment Moderation & Management...');
    const equipListRes = await supertest(app)
      .get('/api/v1/admin/equipment')
      .set('Authorization', `Bearer ${adminToken}`);

    assert(equipListRes.status === 200, 'GET /admin/equipment returns 200 OK');
    assert(Array.isArray(equipListRes.body.data), 'Equipment array returned');

    if (equipListRes.body.data.length > 0) {
      const sampleItem = equipListRes.body.data[0];
      const modRes = await supertest(app)
        .patch(`/api/v1/admin/equipment/${sampleItem.id}/approval`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          reason: 'Verified university equipment specification.',
        });
      assert(modRes.status === 200, 'PATCH /admin/equipment/:id/approval moderates listing');
    }

    // 6. Category Management CRUD
    console.log('\n6. Testing Category Management CRUD...');
    // Create
    const createCatRes = await supertest(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Automated Test Category ${timestamp}`,
        description: 'Temporary testing category for admin verification',
        icon: 'wrench',
      });

    assert(createCatRes.status === 201, 'POST /admin/categories creates category (201 Created)');
    const createdCatId = createCatRes.body.data.id;

    // List categories
    const getCatsRes = await supertest(app).get('/api/v1/categories');
    assert(getCatsRes.status === 200, 'GET /categories returns 200 OK');

    // Update category
    const updateCatRes = await supertest(app)
      .put(`/api/v1/admin/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Updated Test Category ${timestamp}`,
        description: 'Updated category description',
      });
    assert(updateCatRes.status === 200, 'PUT /admin/categories/:id updates category (200 OK)');

    // Delete category
    const deleteCatRes = await supertest(app)
      .delete(`/api/v1/admin/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(deleteCatRes.status === 200, 'DELETE /admin/categories/:id deletes category (200 OK)');

    // 7. Transaction Monitoring
    console.log('\n7. Testing Transaction Monitoring...');
    const txListRes = await supertest(app)
      .get('/api/v1/admin/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    assert(txListRes.status === 200, 'GET /admin/transactions returns 200 OK');
    assert(Array.isArray(txListRes.body.data), 'Transactions array returned');

    if (txListRes.body.data.length > 0) {
      const sampleTx = txListRes.body.data[0];
      const overrideRes = await supertest(app)
        .patch(`/api/v1/admin/transactions/${sampleTx.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: sampleTx.status,
          notes: '[Admin Verified]: Record integrity verified by audit',
        });
      assert(overrideRes.status === 200, 'PATCH /admin/transactions/:id/status overrides status');
    }

    console.log('\n================================================================');
    console.log(`ADMIN WORKFLOW INTEGRATION SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('All 8 KPI Statistics, Users, Equipment, Categories, Transactions & Reports verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nAdmin Workflow Test Failed:', err);
    process.exit(1);
  }
}

testAdminWorkflow();
