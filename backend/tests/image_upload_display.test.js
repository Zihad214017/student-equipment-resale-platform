const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

async function runImageUploadAndDisplayTests() {
  console.log('================================================================');
  console.log('Equipment Image Upload & Display Bug Fix Automated Test Suite');
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

  // Create a temporary dummy image file for upload testing
  const dummyImgPath = path.resolve(__dirname, 'test_sample_image.png');
  // 1x1 transparent PNG buffer
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(dummyImgPath, pngBuffer);

  const dummyImgPath2 = path.resolve(__dirname, 'test_sample_image2.png');
  fs.writeFileSync(dummyImgPath2, pngBuffer);

  try {
    const timestamp = Date.now().toString().slice(-6);

    // --------------------------------------------------------------------------
    // 1. Setup: Authenticate Seller and get a Category
    // --------------------------------------------------------------------------
    console.log('1. Setting Up Test Accounts and Category...');
    const sellerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.alex@university.edu', password: 'Password123!' });
    assert(sellerLoginRes.status === 200, 'Seller (Alex) login succeeded');
    const sellerToken = sellerLoginRes.body.data.token;
    const sellerId = sellerLoginRes.body.data.user.id;

    // Register a second student for cross-user permission checks
    const otherSellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: `IMG-OTHER-${timestamp}`,
        full_name: 'Other Student Seller',
        email: `other.seller.${timestamp}@university.edu`,
        password: 'Password123!',
        department: 'Biomedical',
      });
    assert(otherSellerRes.status === 201, 'Registered other student seller');
    const otherSellerToken = otherSellerRes.body.data.token;

    // Get an active category ID
    const catRes = await request(app).get('/api/categories');
    assert(catRes.status === 200 && catRes.body.data.length > 0, 'Fetched active categories');
    const categoryId = catRes.body.data[0].id;

    // --------------------------------------------------------------------------
    // 2. Create Equipment with File Upload
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Equipment Creation with Image File Upload...');
    const createRes = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('title', `Oscilloscope Rigol Test ${timestamp}`)
      .field('description', 'High precision 4-channel digital oscilloscope.')
      .field('category_id', categoryId)
      .field('condition', 'like_new')
      .field('price', '299.99')
      .field('original_price', '450.00')
      .field('brand', 'Rigol')
      .field('model_year', '2023')
      .attach('images', dummyImgPath);

    assert(createRes.status === 201, 'Created equipment listing with attached image');
    const equipment = createRes.body.data;
    const equipmentId = equipment.id;
    assert(Array.isArray(equipment.images) && equipment.images.length === 1, 'Listing contains 1 image in images array');
    assert(equipment.images[0].is_primary === true, 'First image is marked as is_primary = true');
    assert(equipment.images[0].image_url.startsWith('/uploads/'), `Image URL is stored as relative upload path: ${equipment.images[0].image_url}`);
    assert(equipment.primary_image === equipment.images[0].image_url, 'Primary image string matches the first image URL');

    const firstImageId = equipment.images[0].id;
    const firstImageUrl = equipment.images[0].image_url;

    // --------------------------------------------------------------------------
    // 3. Static File Serving & Headers Inspection
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Static /uploads Header Configuration...');
    const staticRes = await request(app).get(firstImageUrl);
    assert(staticRes.status === 200, 'Static image successfully served via Express');
    assert(staticRes.headers['etag'] !== undefined, 'Static response includes ETag header for caching');
    assert(
      staticRes.headers['cache-control'] && staticRes.headers['cache-control'].includes('must-revalidate'),
      `Static response has revalidation Cache-Control: ${staticRes.headers['cache-control']}`
    );

    // --------------------------------------------------------------------------
    // 4. Upload Additional Images (POST /api/equipment/:id/images)
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Additional Image Upload Endpoint...');
    const addImgRes = await request(app)
      .post(`/api/equipment/${equipmentId}/images`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('images', dummyImgPath2);

    assert(addImgRes.status === 200, 'Uploaded second image to listing');
    const updatedImages = addImgRes.body.data.images;
    assert(updatedImages.length === 2, `Listing now has 2 images (found: ${updatedImages.length})`);
    const secondImageId = updatedImages.find((img) => img.id !== firstImageId).id;
    const secondImageUrl = updatedImages.find((img) => img.id !== firstImageId).image_url;

    // --------------------------------------------------------------------------
    // 5. Set Second Image as Primary (PATCH /api/equipment/:id/images/:imageId/primary)
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Set Primary Image Endpoint...');
    const setPrimaryRes = await request(app)
      .patch(`/api/equipment/${equipmentId}/images/${secondImageId}/primary`)
      .set('Authorization', `Bearer ${sellerToken}`);

    assert(setPrimaryRes.status === 200, 'Set second image as primary succeeded');
    const primaryListing = setPrimaryRes.body.data;
    const activePrimary = primaryListing.images.find((img) => img.is_primary);
    assert(activePrimary && activePrimary.id === secondImageId, 'Second image is now the primary image');
    assert(primaryListing.primary_image === secondImageUrl, 'Listing primary_image string updated to second image');

    // --------------------------------------------------------------------------
    // 6. Cross-User Authorization Guard
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Seller Ownership Security Guards...');
    const unauthorizedAdd = await request(app)
      .post(`/api/equipment/${equipmentId}/images`)
      .set('Authorization', `Bearer ${otherSellerToken}`)
      .attach('images', dummyImgPath);
    assert(unauthorizedAdd.status === 403, 'Unauthorized seller cannot upload images to another seller listing');

    const unauthorizedDelete = await request(app)
      .delete(`/api/equipment/${equipmentId}/images/${secondImageId}`)
      .set('Authorization', `Bearer ${otherSellerToken}`);
    assert(unauthorizedDelete.status === 403, 'Unauthorized seller cannot delete images from another seller listing');

    const unauthorizedPrimary = await request(app)
      .patch(`/api/equipment/${equipmentId}/images/${secondImageId}/primary`)
      .set('Authorization', `Bearer ${otherSellerToken}`);
    assert(unauthorizedPrimary.status === 403, 'Unauthorized seller cannot change primary image of another seller listing');

    // --------------------------------------------------------------------------
    // 7. Update Listing with Image Replacement (replace_images = true)
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Image Replacement Workflow on Edit...');
    const replaceRes = await request(app)
      .put(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('title', `Oscilloscope Rigol Test Replaced ${timestamp}`)
      .field('replace_images', 'true')
      .attach('images', dummyImgPath);

    assert(replaceRes.status === 200, 'Replaced images on updateListing');
    const replacedListing = replaceRes.body.data;
    assert(replacedListing.images.length === 1, `Replaced images count is 1 (found: ${replacedListing.images.length})`);
    assert(
      replacedListing.images[0].id !== firstImageId && replacedListing.images[0].id !== secondImageId,
      'Old image records were removed and new image record created'
    );
    assert(replacedListing.images[0].is_primary === true, 'New replacement image is automatically primary');

    // --------------------------------------------------------------------------
    // 8. Delete Single Image Endpoint (DELETE /api/equipment/:id/images/:imageId)
    // --------------------------------------------------------------------------
    console.log('\n8. Testing Delete Image Endpoint...');
    // First upload another image so we have 2 images
    await request(app)
      .post(`/api/equipment/${equipmentId}/images`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('images', dummyImgPath2);

    const beforeDelete = await request(app).get(`/api/equipment/${equipmentId}`);
    assert(beforeDelete.body.data.images.length === 2, 'Listing has 2 images before single deletion');

    const imgToDelete = beforeDelete.body.data.images[0].id;
    const remainingImgId = beforeDelete.body.data.images[1].id;

    const delRes = await request(app)
      .delete(`/api/equipment/${equipmentId}/images/${imgToDelete}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    assert(delRes.status === 200, 'Image deleted successfully');
    const afterDelete = delRes.body.data;
    assert(afterDelete.images.length === 1, 'Listing now has 1 image');
    assert(afterDelete.images[0].id === remainingImgId, 'Correct image remained');
    assert(afterDelete.images[0].is_primary === true, 'Remaining image is marked primary');

    // --------------------------------------------------------------------------
    // 9. Marketplace & Admin Query Verification
    // --------------------------------------------------------------------------
    console.log('\n9. Testing Marketplace and Admin List Query Formats...');
    const marketRes = await request(app).get('/api/equipment');
    assert(marketRes.status === 200, 'Marketplace query succeeded');
    const marketItem = marketRes.body.data.find((e) => e.id === equipmentId);
    assert(marketItem !== undefined, 'Created equipment found in marketplace');
    assert(marketItem.primary_image !== null, `Marketplace item contains primary_image: ${marketItem.primary_image}`);
    assert(Array.isArray(marketItem.images), 'Marketplace item contains images array');

    const sellerListRes = await request(app)
      .get('/api/equipment/user/my-listings')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert(sellerListRes.status === 200, 'Seller own listings query succeeded');
    const myItem = sellerListRes.body.data.find((e) => e.id === equipmentId);
    assert(myItem !== undefined, 'Found item in seller own listings');
    assert(myItem.primary_image !== null, `Seller listing contains primary_image: ${myItem.primary_image}`);

    // Clean up test equipment
    await request(app)
      .delete(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    console.log('\n================================================================');
    console.log(`Image Upload & Display Fix Test Results: ${passed}/${total} PASSED`);
    console.log('================================================================\n');
  } finally {
    // Clean up temp test files
    if (fs.existsSync(dummyImgPath)) fs.unlinkSync(dummyImgPath);
    if (fs.existsSync(dummyImgPath2)) fs.unlinkSync(dummyImgPath2);
  }
}

if (require.main === module) {
  runImageUploadAndDisplayTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nTest Suite Failed:', err);
      process.exit(1);
    });
}

module.exports = runImageUploadAndDisplayTests;
