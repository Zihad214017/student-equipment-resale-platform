const request = require('supertest');
const app = require('../src/app');

async function runHealthAndConfigTests() {
  console.log('================================================================');
  console.log('Backend Health Endpoints & Cloud Deployment Test Suite');
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
    // 1. Test GET /health
    console.log('1. Testing Root Health Check (GET /health)...');
    const healthRes = await request(app).get('/health');
    assert(healthRes.status === 200, 'GET /health returns 200 OK');
    assert(healthRes.body.success === true, 'Response contains success: true');
    assert(healthRes.body.data.status === 'healthy', 'Service status is healthy');
    assert(healthRes.body.data.database !== undefined, 'Database health section is included');

    // 2. Test GET /api/health
    console.log('\n2. Testing API Health Check (GET /api/health)...');
    const apiHealthRes = await request(app).get('/api/health');
    assert(apiHealthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(apiHealthRes.body.data.service.includes('Student'), 'Service name is verified');
    assert(typeof apiHealthRes.body.data.uptimeSeconds === 'number', 'Uptime is tracked in seconds');

    // 3. Test GET /api/v1/health
    console.log('\n3. Testing Versioned Health Check (GET /api/v1/health)...');
    const v1HealthRes = await request(app).get('/api/v1/health');
    assert(v1HealthRes.status === 200, 'GET /api/v1/health returns 200 OK');

    // 4. Test CORS Options & Headers
    console.log('\n4. Testing Dynamic CORS Configuration...');
    const corsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    assert(corsRes.status === 204 || corsRes.status === 200, 'OPTIONS preflight request succeeded');
    assert(
      corsRes.headers['access-control-allow-origin'] === 'http://localhost:3000' ||
      corsRes.headers['access-control-allow-origin'] === '*',
      'CORS header correctly reflects allowed origin'
    );

    // 5. Test Vercel Preview Domain Support in CORS
    const vercelCorsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'https://student-equipment-frontend-preview.vercel.app')
      .set('Access-Control-Request-Method', 'GET');

    assert(
      vercelCorsRes.headers['access-control-allow-origin'] === 'https://student-equipment-frontend-preview.vercel.app' ||
      corsRes.headers['access-control-allow-origin'] === '*',
      'CORS supports Vercel production/preview frontend origins'
    );

    console.log('\n================================================================');
    console.log(`Test Suite Completed: ${passed}/${total} assertions passed.`);
    console.log('Health Endpoints, CORS & Deployment Compatibility: 100% VERIFIED');
    console.log('================================================================\n');

    return true;
  } catch (error) {
    console.error('Test Suite Failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runHealthAndConfigTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runHealthAndConfigTests;
