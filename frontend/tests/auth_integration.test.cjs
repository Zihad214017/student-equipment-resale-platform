const supertest = require('../../backend/node_modules/supertest');
const app = require('../../backend/src/app');

async function testAuthIntegration() {
  console.log('================================================================');
  console.log('FRONTEND AUTHENTICATION INTEGRATION & WORKFLOW VERIFICATION');
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
    // 1. Student Registration
    console.log('1. Testing Student Registration with Frontend Payload...');
    const registerPayload = {
      student_id: `STU-AUTH-${timestamp}`,
      full_name: 'Auth Verification Student',
      email: `auth.student.${timestamp}@university.edu`,
      password: 'Password123!',
      phone: '+1 (555) 333-4444',
      department: 'Electrical Engineering',
    };

    const regRes = await supertest(app)
      .post('/api/v1/auth/register')
      .send(registerPayload);

    assert(regRes.status === 201, 'Student registration returns 201 Created');
    assert(regRes.body.success === true, 'Response success flag is true');
    assert(typeof regRes.body.data.token === 'string', 'JWT token issued in response');
    assert(regRes.body.data.user.email === registerPayload.email, 'User email matches');
    assert(regRes.body.data.user.role === 'student', 'User role is student');

    const studentToken = regRes.body.data.token;
    const studentId = regRes.body.data.user.id;

    // 2. Duplicate Registration Prevention (409 Conflict)
    console.log('\n2. Testing Duplicate Registration Prevention...');
    const dupRes = await supertest(app)
      .post('/api/v1/auth/register')
      .send(registerPayload);

    assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');
    assert(dupRes.body.success === false, 'Duplicate response success flag is false');

    // 3. Validation Error Handling (400 Bad Request)
    console.log('\n3. Testing Registration Validation Errors...');
    const invalidRegRes = await supertest(app)
      .post('/api/v1/auth/register')
      .send({
        student_id: '',
        full_name: '',
        email: 'invalid-email-format',
        password: 'short',
      });

    assert(invalidRegRes.status === 400, 'Invalid registration payload returns 400 Bad Request');
    assert(invalidRegRes.body.success === false, 'Validation error success flag is false');
    assert(Array.isArray(invalidRegRes.body.errors), 'Validation field errors array returned');

    // 4. Student Login
    console.log('\n4. Testing Student Login...');
    const loginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: 'Password123!',
      });

    assert(loginRes.status === 200, 'Student login returns 200 OK');
    assert(loginRes.body.success === true, 'Login success is true');
    assert(typeof loginRes.body.data.token === 'string', 'Login returns signed JWT token');
    assert(loginRes.body.data.user.id === studentId, 'Login user ID matches registered user');

    // 5. Invalid Password Login
    console.log('\n5. Testing Invalid Password Login...');
    const badLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: 'WrongPassword!',
      });

    assert(badLoginRes.status === 401, 'Invalid login returns 401 Unauthorized');
    assert(badLoginRes.body.success === false, 'Bad login success is false');

    // 6. Non-existent User Login
    console.log('\n6. Testing Non-existent User Login...');
    const noUserRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'does.not.exist@university.edu',
        password: 'Password123!',
      });

    assert(noUserRes.status === 401, 'Non-existent user login returns 401 Unauthorized');

    // 7. Session Verification (GET /auth/me)
    console.log('\n7. Testing Session Verification (GET /auth/me)...');
    const meRes = await supertest(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(meRes.status === 200, 'GET /auth/me returns 200 OK');
    assert(meRes.body.data.id === studentId, 'Current user verified via JWT Bearer');
    assert(meRes.body.data.rating_summary !== undefined, 'User object includes rating_summary');
    assert(meRes.body.data.activity_stats !== undefined, 'User object includes activity_stats');

    // 8. Unauthenticated Access Protection
    console.log('\n8. Testing Protected Route Without Token...');
    const noTokenRes = await supertest(app).get('/api/v1/auth/me');
    assert(noTokenRes.status === 401, 'Request without Bearer token returns 401 Unauthorized');

    // 9. Profile Update
    console.log('\n9. Testing Authenticated User Profile Update...');
    const updateRes = await supertest(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        full_name: 'Auth Student Updated Name',
        phone: '+1 (555) 999-8888',
        department: 'Robotics Engineering',
      });

    assert(updateRes.status === 200, 'PUT /users/profile returns 200 OK');
    assert(updateRes.body.data.full_name === 'Auth Student Updated Name', 'Profile name updated');
    assert(updateRes.body.data.department === 'Robotics Engineering', 'Profile department updated');

    // 10. Password Change
    console.log('\n10. Testing Authenticated Password Change...');
    const changePassRes = await supertest(app)
      .put('/api/v1/users/change-password')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        current_password: 'Password123!',
        new_password: 'NewPassword123!',
      });

    assert(changePassRes.status === 200, 'PUT /users/change-password returns 200 OK');

    // Login with new password
    const newLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: 'NewPassword123!',
      });

    assert(newLoginRes.status === 200, 'Login succeeds with new password (200 OK)');

    // 11. Admin Login & Access Protection
    console.log('\n11. Testing Admin Login & Role Authorization...');
    const adminLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@university.edu',
        password: 'Password123!',
      });

    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminLoginRes.body.data.user.role === 'admin', 'Admin role verified');
    const adminToken = adminLoginRes.body.data.token;

    // Student attempting admin route
    const studentBlockedRes = await supertest(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${studentToken}`);
    assert(studentBlockedRes.status === 403, 'Student blocked from admin route (403 Forbidden)');

    // Admin accessing admin route
    const adminAllowedRes = await supertest(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminAllowedRes.status === 200, 'Admin allowed on admin route (200 OK)');
    assert(adminAllowedRes.body.data.users !== undefined, 'Admin reports statistics returned');

    // 12. User Notifications Isolation
    console.log('\n12. Testing Notification Isolation...');
    const notifRes = await supertest(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(notifRes.status === 200, 'GET /notifications returns 200 OK');
    assert(Array.isArray(notifRes.body.data), 'Notifications list returned');

    console.log('\n================================================================');
    console.log(`FRONTEND AUTH INTEGRATION SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Registration, Login, JWT verification, Role guards & RBAC verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nAuth Integration Test Failed:', err);
    process.exit(1);
  }
}

testAuthIntegration();
