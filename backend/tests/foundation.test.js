const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

async function runFoundationTests() {
  console.log('================================================================');
  console.log('Backend Foundation & Health API Automated Test Suite');
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
    // 1. Test GET /api/health
    console.log('1. Testing Health Endpoints...');
    const healthRes = await request(app).get('/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200 OK');
    assert(healthRes.body.success === true, 'Response body has success: true');
    assert(healthRes.body.data.status === 'healthy', 'Health status is "healthy"');
    assert(healthRes.body.data.database.status === 'connected', 'Database status is "connected"');
    assert(typeof healthRes.body.data.uptimeSeconds === 'number', 'Uptime is reported');

    // Test root alias GET /health
    const rootHealthRes = await request(app).get('/health');
    assert(rootHealthRes.status === 200, 'GET /health alias returns HTTP 200 OK');

    // 2. Test Public Auth - Login
    console.log('\n2. Testing Authentication Endpoints...');
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'seller.alex@university.edu',
        password: 'Password123!',
      });
    
    assert(loginRes.status === 200, 'POST /api/v1/auth/login succeeds for seed seller');
    assert(loginRes.body.success === true, 'Login response has success: true');
    assert(typeof loginRes.body.data.token === 'string', 'Login returns valid signed JWT token');
    assert(loginRes.body.data.user.email === 'seller.alex@university.edu', 'User profile returned in login');
    assert(loginRes.body.data.user.password_hash === undefined, 'Password hash is excluded from response');

    const sellerToken = loginRes.body.data.token;

    // Test Invalid Login
    const badLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'seller.alex@university.edu',
        password: 'WrongPassword!',
      });
    assert(badLoginRes.status === 401, 'POST /api/v1/auth/login rejects incorrect password with 401');

    // 3. Test Registration
    console.log('\n3. Testing Student Registration...');
    const uniqueId = Date.now().toString().slice(-6);
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        student_id: `STU-TEST-${uniqueId}`,
        full_name: 'Emily Watson',
        email: `emily.${uniqueId}@university.edu`,
        password: 'Password123!',
        department: 'Biomedical Engineering',
        phone: '+1 (555) 987-6543',
      });

    assert(registerRes.status === 201, 'POST /api/v1/auth/register creates new student (HTTP 201)');
    assert(registerRes.body.success === true, 'Register response has success: true');
    assert(registerRes.body.data.user.email === `emily.${uniqueId}@university.edu`, 'New user email matches');
    assert(typeof registerRes.body.data.token === 'string', 'Register returns active JWT token');

    // Test Duplicate Registration (Conflict)
    const dupRegisterRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        student_id: `STU-DUP-${uniqueId}`,
        full_name: 'Duplicate Email Test',
        email: `emily.${uniqueId}@university.edu`, // Duplicate email
        password: 'Password123!',
      });
    assert(dupRegisterRes.status === 409, 'Duplicate email registration returns 409 Conflict');

    // 4. Test Authenticated Route - GET /api/v1/auth/me
    console.log('\n4. Testing Protected Profile Endpoint...');
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sellerToken}`);

    assert(meRes.status === 200, 'GET /api/v1/auth/me succeeds with valid Bearer token');
    assert(meRes.body.data.student_id === 'STU-2023-0101', 'Profile matches authenticated user');
    assert(meRes.body.data.rating_summary !== undefined, 'Profile includes seller rating summary');

    // Test Unauthorized Access (No Token)
    const noTokenRes = await request(app).get('/api/v1/auth/me');
    assert(noTokenRes.status === 401, 'GET /api/v1/auth/me without token returns 401 Unauthorized');

    // Test 404 Route Not Found
    console.log('\n5. Testing 404 & Middleware Handlers...');
    const notFoundRes = await request(app).get('/api/v1/non-existent-route');
    assert(notFoundRes.status === 404, 'Non-existent route returns standard 404 Not Found');

    console.log('\n================================================================');
    console.log(`BACKEND FOUNDATION TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Express Server, Health Check, Auth, JWT, Security, & Error Handlers Verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nBackend Foundation Tests Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runFoundationTests();
}

module.exports = runFoundationTests;
