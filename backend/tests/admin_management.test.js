const request = require('supertest');
const app = require('../src/app');

async function runAdminManagementTests() {
  console.log('================================================================');
  console.log('Complete Admin Management & Reporting Subsystem Test Suite');
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
    // 1. Setup Admin and Student Accounts
    // --------------------------------------------------------------------------
    console.log('1. Authenticating Admin and Student Accounts...');

    // Admin login
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@university.edu', password: 'Password123!' });
    assert(adminLogin.status === 200, 'Admin login succeeded (200 OK)');
    const adminToken = adminLogin.body.data.token;
    assert(adminLogin.body.data.user.role === 'admin', 'Admin user role is verified as "admin"');

    // Student login (Alex)
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(studentLogin.status === 200, 'Student login succeeded');
    const studentToken = studentLogin.body.data.token;

    // --------------------------------------------------------------------------
    // 2. Strict Authentication & RBAC Access Controls
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Admin RBAC Guards on all Admin Resource Routes...');

    const adminEndpoints = [
      { method: 'get', url: '/api/v1/admin/reports' },
      { method: 'get', url: '/api/v1/admin/dashboard' },
      { method: 'get', url: '/api/v1/admin/users' },
      { method: 'get', url: '/api/v1/admin/equipment' },
      { method: 'get', url: '/api/v1/admin/categories' },
      { method: 'get', url: '/api/v1/admin/transactions' },
    ];

    for (const ep of adminEndpoints) {
      // Unauthenticated -> 401
      const unauthRes = await request(app)[ep.method](ep.url);
      assert(unauthRes.status === 401, `Unauthenticated request to ${ep.url} rejected with 401 Unauthorized`);

      // Student authenticated -> 403
      const studentRes = await request(app)[ep.method](ep.url).set('Authorization', `Bearer ${studentToken}`);
      assert(studentRes.status === 403, `Non-admin student request to ${ep.url} rejected with 403 Forbidden`);
    }

    // --------------------------------------------------------------------------
    // 3. User Management Module
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Admin User Management (List, Search, View, Status Toggle, Update)...');

    // List users
    const listUsersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(listUsersRes.status === 200, 'GET /api/v1/admin/users returns 200 OK');
    assert(Array.isArray(listUsersRes.body.data), 'Users returned as an array');
    assert(listUsersRes.body.meta.totalItems >= 3, 'Meta includes totalItems >= 3');

    // Search users by name
    const searchUsersRes = await request(app)
      .get('/api/v1/admin/users?search=alex')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(searchUsersRes.status === 200, 'GET /api/v1/admin/users?search=alex returns 200 OK');
    assert(searchUsersRes.body.data.some(u => u.full_name.toLowerCase().includes('alex')), 'Search finds matching user');

    // Get single user details (target student user)
    const targetStudent = listUsersRes.body.data.find(u => u.role === 'student') || listUsersRes.body.data[1];
    const targetUserId = targetStudent.id;
    const userDetailRes = await request(app)
      .get(`/api/v1/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(userDetailRes.status === 200, 'GET /api/v1/admin/users/:id returns 200 OK');
    assert(userDetailRes.body.data.id === targetUserId, 'User details ID matches');
    assert(userDetailRes.body.data.activity_stats !== undefined, 'User stats include activity_stats');
    assert(typeof userDetailRes.body.data.activity_stats.total_listings === 'number', 'Activity stats include total_listings');

    // Toggle user status (deactivate / reactivate)
    const toggleDeactivate = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });
    assert(toggleDeactivate.status === 200, 'Admin deactivates user (200 OK)');
    assert(toggleDeactivate.body.data.is_active === false, 'User is_active set to false');

    const toggleReactivate = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: true });
    assert(toggleReactivate.status === 200, 'Admin reactivates user (200 OK)');
    assert(toggleReactivate.body.data.is_active === true, 'User is_active restored to true');

    // Admin update user info
    const updateUserRes = await request(app)
      .put(`/api/v1/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ department: 'Engineering Leadership' });
    assert(updateUserRes.status === 200, 'Admin updates user details (200 OK)');
    assert(updateUserRes.body.data.department === 'Engineering Leadership', 'Department updated successfully');

    // --------------------------------------------------------------------------
    // 4. Equipment Management & Moderation
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Admin Equipment Moderation & Management...');

    // List all equipment
    const allEquipmentRes = await request(app)
      .get('/api/v1/admin/equipment')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(allEquipmentRes.status === 200, 'GET /api/v1/admin/equipment returns 200 OK');
    assert(Array.isArray(allEquipmentRes.body.data), 'Equipment returned as an array');
    assert(allEquipmentRes.body.data.length >= 1, 'Equipment listings present');

    const equipItem = allEquipmentRes.body.data[0];
    const equipId = equipItem.id;

    // View equipment details
    const equipDetailRes = await request(app)
      .get(`/api/v1/admin/equipment/${equipId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(equipDetailRes.status === 200, 'GET /api/v1/admin/equipment/:id returns 200 OK');
    assert(equipDetailRes.body.data.id === equipId, 'Equipment ID matches');

    // Moderate / verify listing
    const moderateRes = await request(app)
      .patch(`/api/v1/admin/equipment/${equipId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        reason: 'Verified student lab equipment.',
      });
    assert(moderateRes.status === 200, 'Admin approves listing (200 OK)');
    assert(moderateRes.body.data.admin_approval_status === 'approved', 'Equipment admin_approval_status is approved');

    // Update equipment status
    const statusUpdateRes = await request(app)
      .patch(`/api/v1/admin/equipment/${equipId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'available' });
    assert(statusUpdateRes.status === 200, 'Admin updates equipment status (200 OK)');

    // --------------------------------------------------------------------------
    // 5. Category Management Module
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Admin Category Management (Create, Update, View, Delete)...');

    // Create category
    const createCatRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Biomedical Sensors - ${timestamp}`,
        description: 'Biomedical engineering sensors and diagnostic equipment.',
        icon: 'heart-pulse',
      });
    assert(createCatRes.status === 201, 'POST /api/v1/admin/categories creates new category (201 Created)');
    const createdCatId = createCatRes.body.data.id;

    // Update category
    const updateCatRes = await request(app)
      .put(`/api/v1/admin/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Biomedical Tech & Sensors - ${timestamp}`,
        description: 'Updated description for biomedical tech.',
      });
    assert(updateCatRes.status === 200, 'PUT /api/v1/admin/categories/:id updates category (200 OK)');
    assert(updateCatRes.body.data.name.includes('Biomedical Tech'), 'Category name updated');

    // View category details
    const getCatRes = await request(app)
      .get(`/api/v1/admin/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(getCatRes.status === 200, 'GET /api/v1/admin/categories/:id returns 200 OK');

    // Delete category
    const deleteCatRes = await request(app)
      .delete(`/api/v1/admin/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(deleteCatRes.status === 200, 'DELETE /api/v1/admin/categories/:id deletes category (200 OK)');

    // --------------------------------------------------------------------------
    // 6. Transaction Monitoring
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Admin Transaction Monitoring...');

    const adminTxListRes = await request(app)
      .get('/api/v1/admin/transactions')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminTxListRes.status === 200, 'GET /api/v1/admin/transactions returns 200 OK');
    assert(Array.isArray(adminTxListRes.body.data), 'Transactions returned in data array');

    // Filter transactions by status
    const filterTxRes = await request(app)
      .get('/api/v1/admin/transactions?status=completed')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(filterTxRes.status === 200, 'GET /api/v1/admin/transactions?status=completed returns 200 OK');
    assert(filterTxRes.body.data.every(t => t.status === 'completed'), 'All returned transactions have status="completed"');

    // --------------------------------------------------------------------------
    // 7. Platform Reporting & Statistics Dashboard
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Platform Statistics & Reporting Dashboards...');

    const reportsRes = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(reportsRes.status === 200, 'GET /api/v1/admin/reports returns 200 OK');

    const stats = reportsRes.body.data;
    assert(stats.users !== undefined, 'Stats contains users section');
    assert(typeof stats.users.total_users === 'number', 'users.total_users is a number');
    assert(typeof stats.users.total_buyers === 'number', 'users.total_buyers is a number');
    assert(typeof stats.users.total_sellers === 'number', 'users.total_sellers is a number');

    assert(stats.equipment !== undefined, 'Stats contains equipment section');
    assert(typeof stats.equipment.total_equipment === 'number', 'equipment.total_equipment is a number');
    assert(typeof stats.equipment.available_equipment === 'number', 'equipment.available_equipment is a number');

    assert(stats.purchase_requests !== undefined, 'Stats contains purchase_requests section');
    assert(typeof stats.purchase_requests.total_purchase_requests === 'number', 'purchase_requests.total_purchase_requests is a number');
    assert(typeof stats.purchase_requests.pending_requests === 'number', 'purchase_requests.pending_requests is a number');

    assert(stats.transactions !== undefined, 'Stats contains transactions section');
    assert(typeof stats.transactions.total_transactions === 'number', 'transactions.total_transactions is a number');
    assert(typeof stats.transactions.completed_transactions === 'number', 'transactions.completed_transactions is a number');
    assert(typeof stats.transactions.total_volume_amount === 'number', 'transactions.total_volume_amount is a number');

    assert(Array.isArray(stats.category_breakdown), 'category_breakdown is an array');
    assert(stats.recent_activity !== undefined, 'recent_activity is present');
    assert(Array.isArray(stats.recent_activity.transactions), 'recent_activity.transactions is an array');
    assert(Array.isArray(stats.recent_activity.registrations), 'recent_activity.registrations is an array');

    // Dashboard alias
    const dashRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(dashRes.status === 200, 'GET /api/v1/admin/dashboard alias returns 200 OK');

    console.log('\n================================================================');
    console.log(`ADMIN MANAGEMENT TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('User management, equipment moderation, categories, transaction monitoring, & reports verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nAdmin Management Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runAdminManagementTests();
}

module.exports = runAdminManagementTests;
