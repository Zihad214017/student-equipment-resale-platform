const request = require('supertest');
const app = require('../src/app');

async function runSearchAndFilterTests() {
  console.log('================================================================');
  console.log('Equipment Search, Multi-Filtering & Sorting Test Suite');
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
    // --------------------------------------------------------------------------
    // 1. Test Single Filters
    // --------------------------------------------------------------------------
    console.log('1. Testing Individual Search & Filter Parameters...');

    // 1.1 Keyword Filter: e.g. "TI-84"
    const kwRes = await request(app).get('/api/equipment?keyword=TI-84');
    assert(kwRes.status === 200, 'GET /api/equipment?keyword=TI-84 returns 200 OK');
    assert(kwRes.body.data.length >= 1, 'Found at least 1 item matching "TI-84"');
    assert(kwRes.body.data[0].title.includes('TI-84'), 'Item title contains TI-84');

    // 1.2 Category Slug Filter: e.g. "scientific-calculators-math"
    const catSlugRes = await request(app).get('/api/equipment?category=scientific-calculators-math');
    assert(catSlugRes.status === 200, 'GET /api/equipment?category=scientific-calculators-math returns 200 OK');
    assert(catSlugRes.body.data.every(i => i.category_slug === 'scientific-calculators-math'), 'All items match category slug');

    // 1.3 Condition Filter (Case-Insensitive & Title Case): e.g. "Good"
    const condRes = await request(app).get('/api/equipment?condition=Good');
    assert(condRes.status === 200, 'GET /api/equipment?condition=Good returns 200 OK');
    assert(condRes.body.data.every(i => i.condition === 'good'), 'All items have condition "good"');

    // 1.4 Multi-word Condition: e.g. "Like New"
    const likeNewRes = await request(app).get('/api/equipment?condition=Like New');
    assert(likeNewRes.status === 200, 'GET /api/equipment?condition=Like New returns 200 OK');
    assert(likeNewRes.body.data.every(i => i.condition === 'like_new'), 'All items have condition "like_new"');

    // 1.5 Price Range: minPrice and maxPrice (camelCase)
    const priceRes = await request(app).get('/api/equipment?minPrice=40&maxPrice=100');
    assert(priceRes.status === 200, 'GET /api/equipment?minPrice=40&maxPrice=100 returns 200 OK');
    assert(priceRes.body.data.every(i => i.price >= 40 && i.price <= 100), 'All items within $40 - $100 range');

    // 1.6 Price Range: min_price and max_price (snake_case)
    const snakePriceRes = await request(app).get('/api/equipment?min_price=40&max_price=100');
    assert(snakePriceRes.status === 200, 'GET /api/equipment?min_price=40&max_price=100 returns 200 OK');
    assert(snakePriceRes.body.data.length === priceRes.body.data.length, 'camelCase and snake_case price filters produce identical count');

    // --------------------------------------------------------------------------
    // 2. Test Combined Filter Combinations
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Filter Combinations...');

    // 2.1 Keyword + Category
    console.log('  -> Testing: Keyword + Category');
    const kwCatRes = await request(app).get('/api/equipment?keyword=MacBook&category=laptops-computing');
    assert(kwCatRes.status === 200, 'GET /api/equipment?keyword=MacBook&category=laptops-computing returns 200 OK');
    assert(kwCatRes.body.data.length >= 1, 'Found matching item for keyword + category');
    assert(kwCatRes.body.data[0].category_slug === 'laptops-computing', 'Category matches laptops-computing');
    assert(kwCatRes.body.data[0].title.includes('MacBook'), 'Title matches MacBook');

    // 2.2 Category + Price Range
    console.log('  -> Testing: Category + Price Range');
    const catPriceRes = await request(app).get('/api/equipment?category=electronics-microcontrollers&minPrice=30&maxPrice=150');
    assert(catPriceRes.status === 200, 'GET /api/equipment?category=electronics-microcontrollers&minPrice=30&maxPrice=150 returns 200 OK');
    assert(catPriceRes.body.data.every(i => i.category_slug === 'electronics-microcontrollers' && i.price >= 30 && i.price <= 150), 'All items match electronics category and price boundaries');

    // 2.3 Condition + Price Range
    console.log('  -> Testing: Condition + Price Range');
    const condPriceRes = await request(app).get('/api/equipment?condition=good&min_price=40&max_price=80');
    assert(condPriceRes.status === 200, 'GET /api/equipment?condition=good&min_price=40&max_price=80 returns 200 OK');
    assert(condPriceRes.body.data.every(i => i.condition === 'good' && i.price >= 40 && i.price <= 80), 'All items match condition "good" and $40-$80 range');

    // 2.4 All Filters Combined Together
    console.log('  -> Testing: All Filters Together (Keyword + Category + Condition + Min/Max Price + Sort + Pagination)');
    const allFiltersRes = await request(app).get(
      '/api/equipment?keyword=Arduino&category=electronics-microcontrollers&condition=good&minPrice=20&maxPrice=100&sortBy=price_asc&page=1&limit=5'
    );
    assert(allFiltersRes.status === 200, 'All combined filters query returns 200 OK');
    assert(allFiltersRes.body.data.length >= 1, 'Item found matching all criteria simultaneously');
    const foundItem = allFiltersRes.body.data[0];
    assert(foundItem.title.includes('Arduino'), 'Item title contains Arduino');
    assert(foundItem.category_slug === 'electronics-microcontrollers', 'Item in electronics category');
    assert(foundItem.condition === 'good', 'Item in good condition');
    assert(foundItem.price >= 20 && foundItem.price <= 100, 'Item price in $20-$100 range');
    assert(allFiltersRes.body.meta.currentPage === 1, 'Pagination currentPage is 1');
    assert(allFiltersRes.body.meta.pageSize === 5, 'Pagination pageSize is 5');

    // --------------------------------------------------------------------------
    // 3. Test Sorting Options
    // --------------------------------------------------------------------------
    console.log('\n3. Testing All Sorting Modes...');

    // 3.1 Price Ascending (Lowest First)
    const sortPriceAsc = await request(app).get('/api/equipment?sort=price_asc');
    assert(sortPriceAsc.status === 200, 'GET ?sort=price_asc returns 200 OK');
    for (let i = 0; i < sortPriceAsc.body.data.length - 1; i++) {
      assert(sortPriceAsc.body.data[i].price <= sortPriceAsc.body.data[i + 1].price, `Price ascending verified: $${sortPriceAsc.body.data[i].price} <= $${sortPriceAsc.body.data[i + 1].price}`);
    }

    // 3.2 Price Descending (Highest First)
    const sortPriceDesc = await request(app).get('/api/equipment?sort=price_desc');
    assert(sortPriceDesc.status === 200, 'GET ?sort=price_desc returns 200 OK');
    for (let i = 0; i < sortPriceDesc.body.data.length - 1; i++) {
      assert(sortPriceDesc.body.data[i].price >= sortPriceDesc.body.data[i + 1].price, `Price descending verified: $${sortPriceDesc.body.data[i].price} >= $${sortPriceDesc.body.data[i + 1].price}`);
    }

    // 3.3 Title Alphabetical
    const sortTitleAsc = await request(app).get('/api/equipment?sort=title_asc');
    assert(sortTitleAsc.status === 200, 'GET ?sort=title_asc returns 200 OK');
    for (let i = 0; i < sortTitleAsc.body.data.length - 1; i++) {
      assert(
        sortTitleAsc.body.data[i].title.localeCompare(sortTitleAsc.body.data[i + 1].title) <= 0,
        'Alphabetical title sorting verified'
      );
    }

    // 3.4 Newest / Oldest
    const sortNewest = await request(app).get('/api/equipment?sort=newest');
    assert(sortNewest.status === 200, 'GET ?sort=newest returns 200 OK');

    const sortOldest = await request(app).get('/api/equipment?sort=oldest');
    assert(sortOldest.status === 200, 'GET ?sort=oldest returns 200 OK');

    // --------------------------------------------------------------------------
    // 4. Test Pagination Engine
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Pagination Engine...');

    const page1Res = await request(app).get('/api/equipment?page=1&limit=2');
    assert(page1Res.status === 200, 'GET ?page=1&limit=2 returns 200 OK');
    assert(page1Res.body.data.length === 2, 'Page 1 contains exactly 2 items');
    assert(page1Res.body.meta.currentPage === 1, 'Page 1 currentPage metadata is 1');
    assert(page1Res.body.meta.hasNextPage === true, 'Page 1 hasNextPage is true');
    assert(page1Res.body.meta.hasPrevPage === false, 'Page 1 hasPrevPage is false');

    const page2Res = await request(app).get('/api/equipment?page=2&limit=2');
    assert(page2Res.status === 200, 'GET ?page=2&limit=2 returns 200 OK');
    assert(page2Res.body.data.length >= 1, 'Page 2 contains items');
    assert(page2Res.body.meta.currentPage === 2, 'Page 2 currentPage metadata is 2');
    assert(page2Res.body.meta.hasPrevPage === true, 'Page 2 hasPrevPage is true');

    // Verify items on Page 1 and Page 2 are disjoint (no duplicates)
    const page1Ids = page1Res.body.data.map(i => i.id);
    const page2Ids = page2Res.body.data.map(i => i.id);
    const hasOverlap = page1Ids.some(id => page2Ids.includes(id));
    assert(!hasOverlap, 'Pagination offset ensures disjoint items between pages');

    // --------------------------------------------------------------------------
    // 5. Test Non-Matching Filter Handling (Empty Results)
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Zero-Match / Non-Existent Filters...');
    const noMatchRes = await request(app).get('/api/equipment?keyword=NonExistentSuperUnicorn9999');
    assert(noMatchRes.status === 200, 'Zero-match query returns 200 OK with empty array');
    assert(Array.isArray(noMatchRes.body.data) && noMatchRes.body.data.length === 0, 'Data array is empty []');
    assert(noMatchRes.body.meta.totalItems === 0, 'totalItems is 0');
    assert(noMatchRes.body.meta.totalPages === 0, 'totalPages is 0');

    console.log('\n================================================================');
    console.log(`SEARCH & FILTER TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log('All filter combinations, keyword, conditions, prices, sorting, & pagination verified!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nSearch & Filter Test Suite Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runSearchAndFilterTests();
}

module.exports = runSearchAndFilterTests;
