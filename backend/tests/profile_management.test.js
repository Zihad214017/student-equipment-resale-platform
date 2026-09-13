const request = require('supertest');
const app = require('../src/app');

async function runProfileManagementTests() {
  console.log('================================================================');
  console.log('Profile Management & Admin User Control Test Suite');
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

    // Setup: Login Admin and Seed Seller
    console.log('1. Authenticating Seed Accounts...');
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@university.edu', password: 'Password123!' });
    assert(adminLoginRes.status === 200, 'Admin login succeeded');
    const adminToken = adminLoginRes.body.data.token;
    const adminId = adminLoginRes.body.data.user.id;

    const sellerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLoginRes.status === 200, 'Seller login succeeded');
    const sellerToken = sellerLoginRes.body.data.token;
    const sellerId = sellerLoginRes.body.data.user.id;

    // Register a fresh Student User
    const studentEmail = `student.test.${timestamp}@university.edu`;
    const studentPass = 'InitialPass123!';
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-PROF-${timestamp}`,
        full_name: 'David Attenborough',
        email: studentEmail,
        password: studentPass,
        department: 'Ecology & Evolutionary Biology',
        phone: '+1 (555) 777-8888',
      });
    assert(regRes.status === 201, 'Registered test student for profile tests');
    const studentToken = regRes.body.data.token;
    const studentId = regRes.body.data.user.id;

    // --------------------------------------------------------------------------
    // 2. View Own Profile
    // --------------------------------------------------------------------------
    console.log('\n2. Testing View Own Profile...');
    const profileRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    assert(profileRes.status === 200, 'GET /api/v1/users/profile returns 200 OK');
    assert(profileRes.body.data.email === studentEmail, 'Profile email matches authenticated user');
    assert(profileRes.body.data.department === 'Ecology & Evolutionary Biology', 'Department matches');
    assert(profileRes.body.data.rating_summary !== undefined, 'Profile contains rating summary');
    assert(profileRes.body.data.activity_stats !== undefined, 'Profile contains activity stats');
    assert(profileRes.body.data.password_hash === undefined, 'Password hash is omitted');

    // --------------------------------------------------------------------------
    // 3. Update Own Profile
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Update Own Profile...');
    const updateRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        full_name: 'Sir David Attenborough',
        phone: '+1 (555) 123-9999',
        department: 'Biological Sciences & Conservation',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      });

    assert(updateRes.status === 200, 'PUT /api/v1/users/profile updates user profile (200 OK)');
    assert(updateRes.body.data.full_name === 'Sir David Attenborough', 'Full name updated');
    assert(updateRes.body.data.department === 'Biological Sciences & Conservation', 'Department updated');
    assert(updateRes.body.data.phone === '+1 (555) 123-9999', 'Phone updated');

    // Test Invalid Profile Update (Malformed URL)
    const badUpdateRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ avatar_url: 'invalid-url-format' });
    assert(badUpdateRes.status === 400, 'Invalid avatar URL rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // 4. Change Password & Security
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Change Password...');
    const newPass = 'BrandNewSecretPass456!';
    
    // Wrong current password
    const wrongCurrentRes = await request(app)
      .put('/api/v1/users/change-password')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        current_password: 'WrongCurrentPassword!',
        new_password: newPass,
      });
    assert(wrongCurrentRes.status === 400, 'Wrong current password rejected with 400 Bad Request');

    // Valid change password
    const changeRes = await request(app)
      .put('/api/v1/users/change-password')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        current_password: studentPass,
        new_password: newPass,
      });
    assert(changeRes.status === 200, 'PUT /api/v1/users/change-password succeeds with 200 OK');

    // Verify login with new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: newPass });
    assert(newLoginRes.status === 200, 'Login with new password succeeded');

    // --------------------------------------------------------------------------
    // 5. View Relevant Seller Information (Public / Authenticated)
    // --------------------------------------------------------------------------
    console.log('\n5. Testing View Seller Information...');
    const sellerInfoRes = await request(app)
      .get(`/api/v1/users/sellers/${sellerId}`);

    assert(sellerInfoRes.status === 200, 'GET /api/v1/users/sellers/:id returns 200 OK');
    assert(sellerInfoRes.body.data.full_name === 'Alex Rivera (Seller)', 'Seller name returned');
    assert(sellerInfoRes.body.data.department === 'Computer Science & Engineering', 'Seller department returned');
    assert(sellerInfoRes.body.data.rating_summary.average_rating >= 0, 'Seller average rating returned');
    assert(Array.isArray(sellerInfoRes.body.data.active_listings), 'Seller active equipment listings returned');
    assert(sellerInfoRes.body.data.active_listings.length > 0, 'Seller has active listings in catalog');
    assert(Array.isArray(sellerInfoRes.body.data.recent_reviews), 'Seller recent reviews returned');
    assert(sellerInfoRes.body.data.email === undefined, 'Seller private email is not leaked in public seller view');

    // Non-existent seller
    const nonExistentSeller = await request(app).get('/api/v1/users/sellers/00000000-0000-0000-0000-000000000000');
    assert(nonExistentSeller.status === 404, 'Non-existent seller ID returns 404 Not Found');

    // --------------------------------------------------------------------------
    // 6. Admin User Management (SRS Compliance)
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Admin User Management...');
    // Admin list all users
    const adminUsersRes = await request(app)
      .get('/api/v1/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert(adminUsersRes.status === 200, 'Admin can list all users (200 OK)');
    assert(Array.isArray(adminUsersRes.body.data), 'User list returned in data');
    assert(adminUsersRes.body.meta.totalItems >= 4, 'Meta pagination reports total users');

    // Non-admin blocked from admin users list
    const studentBlockedFromAdmin = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);
    assert(studentBlockedFromAdmin.status === 403, 'Regular student blocked from /api/v1/admin/users (403 Forbidden)');

    // Admin view specific user detail & audit history
    const adminViewUserRes = await request(app)
      .get(`/api/v1/admin/users/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminViewUserRes.status === 200, 'Admin can view specific user details (200 OK)');
    assert(adminViewUserRes.body.data.id === studentId, 'Returned user matches ID');

    // --------------------------------------------------------------------------
    // 7. Admin Toggle User Status (Deactivation & Reactivation)
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Admin User Status Toggle...');
    // Deactivate student account
    const deactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${studentId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });

    assert(deactivateRes.status === 200, 'Admin deactivates student account (200 OK)');
    assert(deactivateRes.body.data.is_active === false, 'is_active set to false');

    // Deactivated user tries to log in
    const deactLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: newPass });
    assert(deactLoginRes.status === 403, 'Deactivated account login is rejected with 403 Forbidden');

    // Reactivate student account
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${studentId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: true });

    assert(reactivateRes.status === 200, 'Admin reactivates student account (200 OK)');
    assert(reactivateRes.body.data.is_active === true, 'is_active set to true');

    // Reactivated user can log in again
    const reactLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: newPass });
    assert(reactLoginRes.status === 200, 'Reactivated user can log in successfully');

    // Admin self-deactivation prevention test
    const selfDeactRes = await request(app)
      .patch(`/api/v1/admin/users/${adminId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });
    assert(selfDeactRes.status === 400, 'Admin self-deactivation is blocked with 400 Bad Request');

    // Admin update user details
    const adminUpdateUserRes = await request(app)
      .put(`/api/v1/admin/users/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        department: 'School of Biological Sciences',
        phone: '+1 (555) 333-2222',
      });
    assert(adminUpdateUserRes.status === 200, 'Admin updates user info (200 OK)');
    assert(adminUpdateUserRes.body.data.department === 'School of Biological Sciences', 'Admin update applied');

    console.log('\n================================================================');
    console.log(`PROFILE MANAGEMENT TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Profile viewing, updating, password change, seller info, & admin user control verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nProfile Management Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runProfileManagementTests();
}

module.exports = runProfileManagementTests;
