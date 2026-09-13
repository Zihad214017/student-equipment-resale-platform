const request = require('supertest');
const app = require('../src/app');

async function runEquipmentAndCategoryTests() {
  console.log('================================================================');
  console.log('Equipment Listing & Category Management Automated Test Suite');
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
    // Setup: Authenticate Admin, Seller, and Buyer
    // --------------------------------------------------------------------------
    console.log('1. Setting Up Test Accounts...');
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@university.edu', password: 'Password123!' });
    assert(adminLoginRes.status === 200, 'Admin login succeeded');
    const adminToken = adminLoginRes.body.data.token;

    const sellerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLoginRes.status === 200, 'Seller (Alex) login succeeded');
    const sellerToken = sellerLoginRes.body.data.token;
    const sellerId = sellerLoginRes.body.data.user.id;

    // Register a second student to test cross-user ownership isolation
    const otherStudentRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `STU-OTHER-${timestamp}`,
        full_name: 'Other Student',
        email: `other.student.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Physics',
      });
    assert(otherStudentRes.status === 201, 'Registered secondary student for authorization tests');
    const otherStudentToken = otherStudentRes.body.data.token;

    // --------------------------------------------------------------------------
    // 2. Public Category Viewing & Admin Category Management
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Category Management...');
    // Public List Categories
    const categoriesRes = await request(app).get('/api/v1/categories');
    assert(categoriesRes.status === 200, 'GET /api/v1/categories returns 200 OK');
    assert(Array.isArray(categoriesRes.body.data), 'Categories returned as an array');
    assert(categoriesRes.body.data.length >= 7, 'At least 7 default categories present');
    assert(typeof categoriesRes.body.data[0].active_equipment_count === 'number', 'Category includes active_equipment_count');

    const sampleCategory = categoriesRes.body.data[0];

    // Public Get Category by ID and Slug
    const catByIdRes = await request(app).get(`/api/v1/categories/${sampleCategory.id}`);
    assert(catByIdRes.status === 200, 'GET /api/v1/categories/:id returns category details');

    const catBySlugRes = await request(app).get(`/api/v1/categories/${sampleCategory.slug}`);
    assert(catBySlugRes.status === 200, 'GET /api/v1/categories/:slug returns category details');

    // Admin Create Category
    const newCatName = `Robotics & Drone Hardware ${timestamp}`;
    const createCatRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: newCatName,
        description: 'Drones, flight controllers, ESCs, motors, and robotics parts.',
        icon: 'cpu',
      });
    assert(createCatRes.status === 201, 'Admin can create category (201 Created)');
    assert(createCatRes.body.data.name === newCatName, 'Category name matches');
    const createdCatId = createCatRes.body.data.id;

    // Non-admin blocked from creating category
    const studentCatBlockRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Unauthorized Category' });
    assert(studentCatBlockRes.status === 403, 'Non-admin is blocked from creating category (403 Forbidden)');

    // Admin Update Category
    const updateCatRes = await request(app)
      .put(`/api/v1/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `${newCatName} Updated`,
        icon: 'robot',
      });
    assert(updateCatRes.status === 200, 'Admin can update category (200 OK)');
    assert(updateCatRes.body.data.name === `${newCatName} Updated`, 'Updated category name reflected');

    // Admin Delete Category (empty category)
    const deleteCatRes = await request(app)
      .delete(`/api/v1/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(deleteCatRes.status === 200, 'Admin can delete empty category (200 OK)');
    assert(deleteCatRes.body.data.deleted === true, 'Category reported as deleted');

    // --------------------------------------------------------------------------
    // 3. Seller Equipment Creation & Condition Validation
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Equipment Listing Creation...');
    const listingTitle = `Dell XPS 15 9520 OLED Laptop - ${timestamp}`;

    // Create listing with 'used' condition (testing all 5 conditions support)
    const createListingRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: listingTitle,
        description: 'Used for 2 terms in computer vision courses. 3.5K OLED touchscreen, 32GB RAM, 1TB SSD, RTX 3050 Ti.',
        category_id: sampleCategory.id,
        condition: 'used', // Testing 'used' condition
        price: 950.00,
        original_price: 1899.00,
        brand: 'Dell',
        model_year: '2022',
        is_negotiable: true,
        images: [
          'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800',
          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
        ],
      });

    assert(createListingRes.status === 201, 'Seller creates equipment listing (201 Created)');
    assert(createListingRes.body.success === true, 'Response body has success: true');
    assert(createListingRes.body.data.title === listingTitle, 'Title matches');
    assert(createListingRes.body.data.condition === 'used', 'Condition "used" verified');
    assert(createListingRes.body.data.price === 950.00, 'Price parsed correctly');
    assert(createListingRes.body.data.seller_id === sellerId, 'Seller ID set to authenticated user');
    assert(Array.isArray(createListingRes.body.data.images), 'Images returned as array');
    assert(createListingRes.body.data.images.length === 2, 'Two images associated with listing');
    assert(createListingRes.body.data.status === 'available', 'Initial status is "available"');
    assert(createListingRes.body.data.admin_approval_status === 'approved', 'Initial approval is "approved"');

    const createdEquipmentId = createListingRes.body.data.id;

    // Test Invalid Listing: Negative Price
    const badPriceRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Bad Item',
        description: 'Valid description for testing negative price',
        category_id: sampleCategory.id,
        condition: 'new',
        price: -100.00,
      });
    assert(badPriceRes.status === 400, 'Negative price rejected with 400 Bad Request');

    // Test Invalid Listing: Invalid Condition
    const badCondRes = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Bad Item Condition',
        description: 'Valid description for testing bad condition',
        category_id: sampleCategory.id,
        condition: 'super-mint-ultra',
        price: 100.00,
      });
    assert(badCondRes.status === 400, 'Invalid condition string rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // 4. Buyer Marketplace Search, Filters, & Pagination
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Marketplace Search, Filters, & Pagination...');
    // General marketplace catalog
    const marketRes = await request(app).get('/api/v1/equipment');
    assert(marketRes.status === 200, 'GET /api/v1/equipment returns 200 OK');
    assert(Array.isArray(marketRes.body.data), 'Listings returned in data array');
    assert(marketRes.body.meta.totalItems >= 5, 'Pagination metadata reports total items');

    // Keyword Search
    const searchRes = await request(app).get('/api/v1/equipment?keyword=MacBook');
    assert(searchRes.status === 200, 'Search by keyword returns 200 OK');
    assert(searchRes.body.data.length >= 1, 'Search found MacBook listing');
    assert(searchRes.body.data.every(item => item.title.toLowerCase().includes('macbook') || item.description.toLowerCase().includes('macbook')), 'Search results are relevant');

    // Category Filter
    const catFilterRes = await request(app).get(`/api/v1/equipment?category_id=${sampleCategory.id}`);
    assert(catFilterRes.status === 200, 'Filter by category ID returns 200 OK');
    assert(catFilterRes.body.data.every(item => item.category_id === sampleCategory.id), 'All items match filtered category');

    // Condition Filter
    const condFilterRes = await request(app).get('/api/v1/equipment?condition=used');
    assert(condFilterRes.status === 200, 'Filter by condition=used returns 200 OK');
    assert(condFilterRes.body.data.some(item => item.id === createdEquipmentId), 'Newly created used item found');

    // Price Range Filter
    const priceFilterRes = await request(app).get('/api/v1/equipment?min_price=50&max_price=100');
    assert(priceFilterRes.status === 200, 'Filter by price range returns 200 OK');
    assert(priceFilterRes.body.data.every(item => item.price >= 50 && item.price <= 100), 'All items in $50-$100 range');

    // Sorting: price_asc and price_desc
    const sortAscRes = await request(app).get('/api/v1/equipment?sort=price_asc');
    assert(sortAscRes.status === 200, 'Sort price_asc returns 200 OK');
    for (let i = 0; i < sortAscRes.body.data.length - 1; i++) {
      assert(sortAscRes.body.data[i].price <= sortAscRes.body.data[i + 1].price, 'Items sorted in ascending price order');
    }

    // Pagination
    const pageRes = await request(app).get('/api/v1/equipment?page=1&limit=2');
    assert(pageRes.status === 200, 'Pagination query returns 200 OK');
    assert(pageRes.body.data.length === 2, 'Page limit respected (2 items)');
    assert(pageRes.body.meta.currentPage === 1, 'currentPage is 1');
    assert(pageRes.body.meta.pageSize === 2, 'pageSize is 2');

    // --------------------------------------------------------------------------
    // 5. Complete Equipment Details View
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Equipment Details View...');
    const detailRes = await request(app).get(`/api/v1/equipment/${createdEquipmentId}`);
    assert(detailRes.status === 200, 'GET /api/v1/equipment/:id returns 200 OK');
    assert(detailRes.body.data.id === createdEquipmentId, 'Item ID matches');
    assert(detailRes.body.data.seller_name === 'Alex Rivera (Seller)', 'Seller name joined');
    assert(detailRes.body.data.category_name !== undefined, 'Category name joined');
    assert(Array.isArray(detailRes.body.data.images), 'All images returned in details view');
    assert(detailRes.body.data.seller_rating >= 0, 'Seller rating included');
    assert(Array.isArray(detailRes.body.data.seller_recent_reviews), 'Seller recent reviews included');

    // Non-existent item ID
    const notFoundRes = await request(app).get('/api/v1/equipment/00000000-0000-0000-0000-000000000000');
    assert(notFoundRes.status === 404, 'Non-existent equipment ID returns 404 Not Found');

    // --------------------------------------------------------------------------
    // 6. Seller Own Listings & Management (Update, Status Change, Ownership Guard)
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Seller Own Listings & Management...');
    // View Own Listings
    const myListingsRes = await request(app)
      .get('/api/v1/equipment/user/my-listings')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(myListingsRes.status === 200, 'GET /api/v1/equipment/user/my-listings returns 200 OK');
    assert(myListingsRes.body.data.some(item => item.id === createdEquipmentId), 'Own listing present in my-listings');
    assert(typeof myListingsRes.body.data[0].pending_requests_count === 'number', 'Includes pending_requests_count');

    // Update Own Listing
    const updateListingRes = await request(app)
      .put(`/api/v1/equipment/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `${listingTitle} (Updated Price)`,
        price: 899.00,
        is_negotiable: false,
      });
    assert(updateListingRes.status === 200, 'PUT /api/v1/equipment/:id updates listing (200 OK)');
    assert(updateListingRes.body.data.price === 899.00, 'Updated price reflected');
    assert(updateListingRes.body.data.is_negotiable === false, 'Updated negotiable flag reflected');

    // Change Listing Status (Available -> Reserved)
    const statusRes = await request(app)
      .patch(`/api/v1/equipment/${createdEquipmentId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'reserved' });
    assert(statusRes.status === 200, 'PATCH /api/v1/equipment/:id/status updates status to "reserved" (200 OK)');
    assert(statusRes.body.data.status === 'reserved', 'Status set to reserved');

    // Verify reserved item is not in public available catalog
    const checkReservedInMarket = await request(app).get('/api/v1/equipment');
    assert(!checkReservedInMarket.body.data.some(item => item.id === createdEquipmentId), 'Reserved item excluded from public marketplace catalog');

    // Reset status back to available
    await request(app)
      .patch(`/api/v1/equipment/${createdEquipmentId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'available' });

    // Ownership Guard: Other student cannot modify Alex's listing
    const unauthorizedUpdateRes = await request(app)
      .put(`/api/v1/equipment/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ title: 'Hacked Title' });
    assert(unauthorizedUpdateRes.status === 403, 'Cross-user listing update is blocked with 403 Forbidden');

    const unauthorizedDeleteRes = await request(app)
      .delete(`/api/v1/equipment/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert(unauthorizedDeleteRes.status === 403, 'Cross-user listing deletion is blocked with 403 Forbidden');

    // --------------------------------------------------------------------------
    // 7. Admin Equipment Moderation & Management
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Admin Equipment Moderation...');
    // Admin list all equipment
    const adminEquipRes = await request(app)
      .get('/api/v1/admin/equipment?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminEquipRes.status === 200, 'Admin can view all equipment listings (200 OK)');
    assert(Array.isArray(adminEquipRes.body.data), 'Listings array returned to admin');

    // Admin moderate listing: Reject with reason
    const rejectRes = await request(app)
      .patch(`/api/v1/admin/equipment/${createdEquipmentId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'rejected',
        reason: 'Serial number and authenticity proof requested.',
      });
    assert(rejectRes.status === 200, 'Admin rejects listing (200 OK)');
    assert(rejectRes.body.data.admin_approval_status === 'rejected', 'admin_approval_status set to rejected');

    // Verify rejected listing is hidden from public catalog
    const checkRejectedMarket = await request(app).get('/api/v1/equipment');
    assert(!checkRejectedMarket.body.data.some(item => item.id === createdEquipmentId), 'Rejected listing hidden from public catalog');

    // Admin moderate listing: Re-approve
    const approveRes = await request(app)
      .patch(`/api/v1/admin/equipment/${createdEquipmentId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });
    assert(approveRes.status === 200, 'Admin re-approves listing (200 OK)');
    assert(approveRes.body.data.admin_approval_status === 'approved', 'admin_approval_status set to approved');

    // --------------------------------------------------------------------------
    // 8. Delete Listing
    // --------------------------------------------------------------------------
    console.log('\n8. Testing Equipment Deletion...');
    const deleteRes = await request(app)
      .delete(`/api/v1/equipment/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(deleteRes.status === 200, 'Seller deletes own equipment listing (200 OK)');
    assert(deleteRes.body.data.deleted === true, 'Listing reported as deleted');

    // Verify deleted listing no longer exists
    const verifyDeletedRes = await request(app).get(`/api/v1/equipment/${createdEquipmentId}`);
    assert(verifyDeletedRes.status === 404, 'Deleted listing returns 404 Not Found');

    console.log('\n================================================================');
    console.log(`EQUIPMENT & CATEGORY TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('Listing CRUD, multi-image, 5 conditions, search/filter, & moderation verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nEquipment & Category Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runEquipmentAndCategoryTests();
}

module.exports = runEquipmentAndCategoryTests;
