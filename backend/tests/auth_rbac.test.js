const request = require('supertest');
const app = require('../src/app');

async function runAuthAndRBACTests() {
  console.log('================================================================');
  console.log('Authentication & Role-Based Authorization (RBAC) Test Suite');
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
    // 1. Buyer Registration
    // --------------------------------------------------------------------------
    console.log('1. Testing Buyer Registration...');
    const buyerEmail = `buyer.claire.${timestamp}@university.edu`;
    const buyerStudentId = `BUYER-${timestamp}`;
    const buyerPassword = 'Password123!';

    const buyerRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: buyerStudentId,
        full_name: 'Claire Beauchamp (Buyer)',
        email: buyerEmail,
        password: buyerPassword,
        department: 'Chemistry & Chemical Biology',
        phone: '+1 (555) 234-5678',
        role: 'student',
      });

    assert(buyerRegRes.status === 201, 'POST /api/auth/register creates Buyer account (201 Created)');
    assert(buyerRegRes.body.success === true, 'Buyer registration response has success: true');
    assert(typeof buyerRegRes.body.data.token === 'string', 'Buyer registration returns signed JWT token');
    assert(buyerRegRes.body.data.user.email === buyerEmail, 'Buyer email verified in response');
    assert(buyerRegRes.body.data.user.role === 'student', 'Buyer role set to "student"');
    assert(buyerRegRes.body.data.user.password_hash === undefined, 'Password hash is omitted from response');

    const buyerToken = buyerRegRes.body.data.token;

    // --------------------------------------------------------------------------
    // 2. Seller Registration
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Seller Registration...');
    const sellerEmail = `seller.marcus.${timestamp}@university.edu`;
    const sellerStudentId = `SELLER-${timestamp}`;
    const sellerPassword = 'Password123!';

    const sellerRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: sellerStudentId,
        full_name: 'Marcus Brody (Seller)',
        email: sellerEmail,
        password: sellerPassword,
        department: 'Robotics & Automation',
        phone: '+1 (555) 876-5432',
        role: 'student',
      });

    assert(sellerRegRes.status === 201, 'POST /api/auth/register creates Seller account (201 Created)');
    assert(sellerRegRes.body.success === true, 'Seller registration response has success: true');
    assert(typeof sellerRegRes.body.data.token === 'string', 'Seller registration returns signed JWT token');
    assert(sellerRegRes.body.data.user.email === sellerEmail, 'Seller email verified in response');

    const sellerToken = sellerRegRes.body.data.token;

    // --------------------------------------------------------------------------
    // 3. Login (Buyer, Seller, Admin)
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Successful Logins...');
    // Buyer Login
    const buyerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: buyerPassword });
    assert(buyerLoginRes.status === 200, 'Buyer login returns 200 OK');
    assert(buyerLoginRes.body.data.user.student_id === buyerStudentId, 'Buyer login returns correct user');

    // Admin Login (Seed Admin)
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@university.edu', password: 'Password123!' });
    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminLoginRes.body.data.user.role === 'admin', 'Admin login returns role "admin"');
    const adminToken = adminLoginRes.body.data.token;

    // --------------------------------------------------------------------------
    // 4. Invalid Login Scenarios
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Invalid Login & Validation...');
    // Wrong Password
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'IncorrectPassword999!' });
    assert(wrongPassRes.status === 401, 'Invalid password returns 401 Unauthorized');
    assert(wrongPassRes.body.success === false, 'Error envelope has success: false');

    // Non-existent User
    const nonExistentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost.user@university.edu', password: 'Password123!' });
    assert(nonExistentRes.status === 401, 'Non-existent email returns 401 Unauthorized');

    // Invalid Email Format
    const badEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Password123!' });
    assert(badEmailRes.status === 400, 'Malformed email returns 400 Bad Request with validation details');

    // --------------------------------------------------------------------------
    // 5. Get Current User (/api/auth/me)
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Get Current User Profile...');
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${buyerToken}`);

    assert(meRes.status === 200, 'GET /api/auth/me returns 200 OK with Bearer token');
    assert(meRes.body.data.email === buyerEmail, 'Profile email matches authenticated user');
    assert(meRes.body.data.rating_summary !== undefined, 'Profile contains seller rating summary');
    assert(meRes.body.data.activity_stats !== undefined, 'Profile contains user activity statistics');

    // Also test versioned endpoint /api/v1/auth/me
    const v1MeRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(v1MeRes.status === 200, 'GET /api/v1/auth/me versioned endpoint returns 200 OK');

    // --------------------------------------------------------------------------
    // 6. Unauthorized Requests
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Unauthorized Access & Token Validation...');
    // Missing Token
    const noTokenRes = await request(app).get('/api/auth/me');
    assert(noTokenRes.status === 401, 'Missing Authorization header returns 401 Unauthorized');

    // Malformed / Invalid Token
    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token.here');
    assert(badTokenRes.status === 401, 'Invalid/Corrupted JWT returns 401 Unauthorized');

    // --------------------------------------------------------------------------
    // 7. Admin Authorization (RBAC)
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Admin Role-Based Authorization...');
    // Admin user accessing admin-only endpoint
    const adminAllowedRes = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminAllowedRes.status === 200, 'Admin can access /api/auth/admin-only (200 OK)');
    assert(adminAllowedRes.body.data.role === 'admin', 'Admin response contains admin confirmation');

    // Student/Buyer attempting to access admin-only endpoint (Forbidden)
    const studentBlockedRes = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(studentBlockedRes.status === 403, 'Student/Buyer is blocked from /api/auth/admin-only (403 Forbidden)');

    // --------------------------------------------------------------------------
    // 8. Student/Buyer/Seller Role Restrictions & Profile Updates
    // --------------------------------------------------------------------------
    console.log('\n8. Testing Student Role Endpoints & Profile Updates...');
    // Student accessing student-only endpoint
    const studentAllowedRes = await request(app)
      .get('/api/auth/student-only')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert(studentAllowedRes.status === 200, 'Student can access /api/auth/student-only (200 OK)');

    // Admin accessing student-only endpoint (should be blocked if role is strictly student)
    const adminBlockedFromStudentRes = await request(app)
      .get('/api/auth/student-only')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminBlockedFromStudentRes.status === 403, 'Admin is blocked from student-only route (403 Forbidden)');

    // Profile Update Test
    console.log('\n9. Testing Profile Update & Password Change...');
    const updateProfileRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        full_name: 'Claire Beauchamp Updated',
        department: 'Biochemistry & Molecular Genetics',
        phone: '+1 (555) 999-1111',
      });
    assert(updateProfileRes.status === 200, 'PUT /api/auth/profile updates profile (200 OK)');
    assert(updateProfileRes.body.data.full_name === 'Claire Beauchamp Updated', 'Updated full name reflected in DB');

    // Password Change Test
    const newPassword = 'NewSecretPassword456!';
    const changePassRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        current_password: buyerPassword,
        new_password: newPassword,
      });
    assert(changePassRes.status === 200, 'PUT /api/auth/change-password succeeds (200 OK)');

    // Verify login with new password works
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: newPassword });
    assert(newLoginRes.status === 200, 'Login with updated password succeeds (200 OK)');

    // Verify login with old password fails
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: buyerPassword });
    assert(oldLoginRes.status === 401, 'Login with previous password rejected with 401 Unauthorized');

    console.log('\n================================================================');
    console.log(`AUTH & RBAC TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('All 8 required scenarios verified with full PostgreSQL integration!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nAuth & RBAC Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runAuthAndRBACTests();
}

module.exports = runAuthAndRBACTests;
