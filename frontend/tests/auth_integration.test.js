const http = require('http');
const express = require('express');
const supertest = require('supertest');
const app = require('../../backend/src/app');

async function testAuthIntegration() {
  console.log('================================================================');
  console.log('FRONTEND AUTHENTICATION INTEGRATION & E2E TEST');
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

    // 2. Student Login
    console.log('\n2. Testing Student Login...');
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

    // 3. Invalid Login
    console.log('\n3. Testing Invalid Password Login...');
    const badLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: 'WrongPassword!',
      });

    assert(badLoginRes.status === 401, 'Invalid login returns 401 Unauthorized');
    assert(badLoginRes.body.success === false, 'Bad login success is false');

    // 4. Session Verification (GET /auth/me)
    console.log('\n4. Testing Session Verification (GET /auth/me)...');
    const meRes = await supertest(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(meRes.status === 200, 'GET /auth/me returns 200 OK');
    assert(meRes.body.data.id === studentId, 'Current user verified via JWT Bearer');
    assert(meRes.body.data.seller_stats !== undefined, 'User object includes seller_stats');
    assert(meRes.body.data.activity_stats !== undefined, 'User object includes activity_stats');

    // 5. Unauthenticated Access Protection
    console.log('\n5. Testing Protected Route Without Token...');
    const noTokenRes = await supertest(app).get('/api/v1/auth/me');
    assert(noTokenRes.status === 401, 'Request without Bearer token returns 401 Unauthorized');

    // 6. Admin Login & Access Protection
    console.log('\n6. Testing Admin Login & Role Authorization...');
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
