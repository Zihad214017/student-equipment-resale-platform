const request = require('supertest');
const app = require('../src/app');

async function runAdminAuthSecurityTests() {
  console.log('================================================================');
  console.log('Admin Authentication & Security Verification Test Suite');
  console.log('Student Equipment Resale Platform');
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
    // 1. Admin Login with Valid Credentials
    // --------------------------------------------------------------------------
    console.log('1. Testing Admin Authentication with Valid Credentials...');
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@university.edu',
        password: 'Password123!',
      });

    assert(adminLoginRes.status === 200, 'POST /api/v1/auth/login returns 200 OK for valid admin credentials');
    assert(adminLoginRes.body.success === true, 'Admin login response has success: true');
    assert(typeof adminLoginRes.body.data.token === 'string', 'Admin login returns a valid JWT token');
    assert(adminLoginRes.body.data.user.role === 'admin', 'Admin user profile returns role="admin"');
    assert(adminLoginRes.body.data.user.password_hash === undefined, 'Password hash is strictly omitted');

    const adminToken = adminLoginRes.body.data.token;
    const adminId = adminLoginRes.body.data.user.id;

    // --------------------------------------------------------------------------
    // 2. Admin Login with Invalid Credentials
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Admin Login with Invalid Credentials...');
    const badPasswordRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@university.edu',
        password: 'WrongPassword999!',
      });

    assert(badPasswordRes.status === 401, 'POST /api/v1/auth/login rejects wrong password with 401 Unauthorized');
    assert(badPasswordRes.body.success === false, 'Error response has success: false');

    const unknownUserRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `nonexistent.${timestamp}@university.edu`,
        password: 'Password123!',
      });

    assert(unknownUserRes.status === 401, 'POST /api/v1/auth/login rejects unknown email with 401 Unauthorized');

    // --------------------------------------------------------------------------
    // 3. Public Registration Privilege Escalation Prevention
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Public Registration Privilege Escalation Protection...');
    const rogueStudentEmail = `rogue.student.${timestamp}@university.edu`;
    const rogueStudentId = `ROGUE-${timestamp}`;

    // Attempt to register with role="admin"
    const publicRegRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        student_id: rogueStudentId,
        full_name: 'Privilege Escalation Attempt',
        email: rogueStudentEmail,
        password: 'Password123!',
        department: 'Security Studies',
        role: 'admin', // Should be ignored or stripped
      });

    assert(publicRegRes.status === 201, 'Public registration returns 201 Created');
    assert(publicRegRes.body.data.user.role === 'student', 'Public registration strictly forces role="student"');
    assert(publicRegRes.body.data.user.role !== 'admin', 'Public registration cannot create an admin account');

    const studentToken = publicRegRes.body.data.token;
    const studentUserId = publicRegRes.body.data.user.id;

    // --------------------------------------------------------------------------
    // 4. Role-Based Access Control (RBAC) on Protected Admin Routes
    // --------------------------------------------------------------------------
    console.log('\n4. Testing RBAC Isolation: Student Token Accessing Admin APIs...');

    // Student trying to fetch admin reports
    const studentReportRes = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(studentReportRes.status === 403, 'GET /api/v1/admin/reports returns 403 Forbidden for student token');

    // Student trying to list all users via admin API
    const studentUsersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(studentUsersRes.status === 403, 'GET /api/v1/admin/users returns 403 Forbidden for student token');

    // Student trying to create an admin user
    const studentCreateUserRes = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        student_id: `ADMIN-FAKE-${timestamp}`,
        full_name: 'Fake Admin',
        email: `fake.admin.${timestamp}@university.edu`,
        password: 'Password123!',
        role: 'admin',
      });

    assert(studentCreateUserRes.status === 403, 'POST /api/v1/admin/users returns 403 Forbidden for student token');

    // Student trying to toggle user status
    const studentToggleRes = await request(app)
      .patch(`/api/v1/admin/users/${studentUserId}/toggle-status`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ is_active: false });

    assert(studentToggleRes.status === 403, 'PATCH /api/v1/admin/users/:id/toggle-status returns 403 Forbidden for student');

    // --------------------------------------------------------------------------
    // 5. Unauthenticated Access Protection on Admin APIs
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Unauthenticated Access Rejection on Admin APIs...');
    const noAuthReportsRes = await request(app).get('/api/v1/admin/reports');
    assert(noAuthReportsRes.status === 401, 'Unauthenticated GET /api/v1/admin/reports returns 401 Unauthorized');

    const noAuthUsersRes = await request(app).get('/api/v1/admin/users');
    assert(noAuthUsersRes.status === 401, 'Unauthenticated GET /api/v1/admin/users returns 401 Unauthorized');

    // --------------------------------------------------------------------------
    // 6. Profile Update Privilege Escalation Prevention
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Profile Update Privilege Escalation Protection...');
    const escalateProfileRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        full_name: 'Updated Name',
        role: 'admin', // Malicious attempt to change role
        is_active: true,
      });

    assert(escalateProfileRes.status === 200, 'PUT /api/v1/users/profile succeeds for allowed fields');
    assert(escalateProfileRes.body.data.role === 'student', 'User role remains "student" after profile update');

    // --------------------------------------------------------------------------
    // 7. Admin Creates New User (Student & Admin) via Protected Route
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Protected Admin User Creation (POST /api/v1/admin/users)...');
    const newAdminEmail = `co.admin.${timestamp}@university.edu`;
    const newAdminStudentId = `ADMIN-SEC-${timestamp}`;

    const createAdminRes = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: newAdminStudentId,
        full_name: 'Co-Administrator',
        email: newAdminEmail,
        password: 'SecureAdminPass123!',
        department: 'Information Security',
        phone: '+1 (555) 987-6543',
        role: 'admin',
        is_active: true,
      });

    assert(createAdminRes.status === 201, 'POST /api/v1/admin/users creates new admin account (201 Created)');
    assert(createAdminRes.body.data.email === newAdminEmail, 'Created admin email verified');
    assert(createAdminRes.body.data.role === 'admin', 'Created admin role verified as "admin"');
    assert(createAdminRes.body.data.password_hash === undefined, 'Password hash omitted');

    // Authenticate with newly created Admin credentials
    const newAdminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: newAdminEmail,
        password: 'SecureAdminPass123!',
      });

    assert(newAdminLoginRes.status === 200, 'Newly created Admin can authenticate via /api/v1/auth/login');
    assert(newAdminLoginRes.body.data.user.role === 'admin', 'Authenticated session confirms role="admin"');
    const newAdminToken = newAdminLoginRes.body.data.token;

    // Verify new admin can access admin reports
    const newAdminReportRes = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${newAdminToken}`);

    assert(newAdminReportRes.status === 200, 'Newly created Admin can access /api/v1/admin/reports');

    // Duplicate email creation should fail with 409 Conflict
    const duplicateAdminRes = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: `DIFF-${timestamp}`,
        full_name: 'Duplicate Admin',
        email: newAdminEmail, // duplicate
        password: 'Password123!',
        role: 'admin',
      });

    assert(duplicateAdminRes.status === 409, 'Creating user with duplicate email returns 409 Conflict');

    // --------------------------------------------------------------------------
    // 8. User Account Suspension and Instant Token Invalidation
    // --------------------------------------------------------------------------
    console.log('\n8. Testing User Deactivation & Real-Time Token Enforcement...');

    // Admin deactivates student account
    const deactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${studentUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });

    assert(deactivateRes.status === 200, 'Admin can toggle user is_active to false (200 OK)');
    assert(deactivateRes.body.data.is_active === false, 'User status verified as deactivated');

    // Deactivated user tries to log in
    const deactLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: rogueStudentEmail,
        password: 'Password123!',
      });

    assert(deactLoginRes.status === 403, 'Deactivated user login rejected with 403 Forbidden');

    // Existing token of deactivated user is immediately rejected by JWT DB check
    const deactTokenRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(deactTokenRes.status === 403, 'Existing JWT token for deactivated user rejected with 403 Forbidden');

    // Admin reactivates student account
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${studentUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: true });

    assert(reactivateRes.status === 200, 'Admin can reactivate user account (200 OK)');
    assert(reactivateRes.body.data.is_active === true, 'User status restored to active');

    // --------------------------------------------------------------------------
    // 9. Admin Self-Deactivation Protection
    // --------------------------------------------------------------------------
    console.log('\n9. Testing Admin Self-Deactivation Protection...');
    const selfDeactRes = await request(app)
      .patch(`/api/v1/admin/users/${adminId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });

    assert(selfDeactRes.status === 400, 'Admin cannot deactivate their own administrative account (400 Bad Request)');

    // --------------------------------------------------------------------------
    // Summary
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`Test Suite Completed: ${passed}/${total} assertions passed.`);
    console.log('Admin Authentication & Security Subsystem: 100% VERIFIED');
    console.log('================================================================\n');

    return { passed, total, success: true };
  } catch (error) {
    console.error('\n❌ Test Suite Aborted due to error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runAdminAuthSecurityTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runAdminAuthSecurityTests;
