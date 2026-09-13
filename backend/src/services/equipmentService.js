const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { EQUIPMENT_STATUS, APPROVAL_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Remove local file from uploads directory if it is a local upload
 * @param {string} imageUrl
 */
const deleteLocalImageFile = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
    const filename = imageUrl.replace(/^\/?uploads\//, '');
    const filepath = path.resolve(__dirname, '../../uploads', filename);
    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
      } catch (err) {
        logger.warn('Failed to unlink local image file', { filepath, error: err.message });
      }
    }
  }
};

/**
 * Helper to process and insert images for an equipment listing
 * @param {string} equipmentId 
 * @param {Array<string>} imageUrls 
 * @param {Array<Express.Multer.File>} uploadedFiles 
 * @param {object} options
 */
const saveEquipmentImages = async (equipmentId, imageUrls = [], uploadedFiles = [], options = {}) => {
  const { replaceAll = false, keepImageIds = null } = options;

  if (replaceAll) {
    const oldImgs = await db.query('SELECT image_url FROM equipment_images WHERE equipment_id = $1', [equipmentId]);
    oldImgs.rows.forEach((r) => deleteLocalImageFile(r.image_url));
    await db.query('DELETE FROM equipment_images WHERE equipment_id = $1', [equipmentId]);
  } else if (Array.isArray(keepImageIds)) {
    if (keepImageIds.length > 0) {
      const oldImgs = await db.query(
        'SELECT image_url FROM equipment_images WHERE equipment_id = $1 AND id != ALL($2::uuid[])',
        [equipmentId, keepImageIds]
      );
      oldImgs.rows.forEach((r) => deleteLocalImageFile(r.image_url));
      await db.query(
        'DELETE FROM equipment_images WHERE equipment_id = $1 AND id != ALL($2::uuid[])',
        [equipmentId, keepImageIds]
      );
    } else {
      const oldImgs = await db.query('SELECT image_url FROM equipment_images WHERE equipment_id = $1', [equipmentId]);
      oldImgs.rows.forEach((r) => deleteLocalImageFile(r.image_url));
      await db.query('DELETE FROM equipment_images WHERE equipment_id = $1', [equipmentId]);
    }
  }

  const imagesToInsert = [];

  // 1. Process uploaded files
  if (uploadedFiles && uploadedFiles.length > 0) {
    uploadedFiles.forEach((file) => {
      imagesToInsert.push(`/uploads/${file.filename}`);
    });
  }

  // 2. Process image URLs
  if (imageUrls) {
    const urlList = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    urlList.forEach((url) => {
      if (url && typeof url === 'string' && url.trim().length > 0) {
        imagesToInsert.push(url.trim());
      }
    });
  }

  // Check if an existing primary image is already present
  const primaryCheck = await db.query(
    'SELECT id FROM equipment_images WHERE equipment_id = $1 AND is_primary = TRUE LIMIT 1',
    [equipmentId]
  );
  const hasExistingPrimary = primaryCheck.rows.length > 0;

  // Insert images into database
  for (let i = 0; i < imagesToInsert.length; i++) {
    const isPrimary = !hasExistingPrimary && i === 0;
    await db.query(
      `INSERT INTO equipment_images (equipment_id, image_url, is_primary)
       VALUES ($1, $2, $3)`,
      [equipmentId, imagesToInsert[i], isPrimary]
    );
  }

  // Ensure at least one image is marked primary if any images exist
  const finalPrimaryCheck = await db.query(
    'SELECT id FROM equipment_images WHERE equipment_id = $1 AND is_primary = TRUE LIMIT 1',
    [equipmentId]
  );
  if (finalPrimaryCheck.rows.length === 0) {
    await db.query(
      `UPDATE equipment_images 
       SET is_primary = TRUE 
       WHERE id = (SELECT id FROM equipment_images WHERE equipment_id = $1 ORDER BY created_at ASC LIMIT 1)`,
      [equipmentId]
    );
  }
};

/**
 * Create a new equipment listing
 * @param {string} sellerId 
 * @param {object} listingData 
 * @param {Array<Express.Multer.File>} files 
 */
const createListing = async (sellerId, listingData, files = []) => {
  const {
    title,
    description,
    category_id,
    condition,
    price,
    original_price,
    brand,
    model_year,
    is_negotiable = false,
    images = [],
  } = listingData;

  // 1. Verify category exists and is active
  const categoryCheck = await db.query('SELECT id, is_active FROM categories WHERE id = $1', [category_id]);
  if (categoryCheck.rows.length === 0) {
    const error = new Error('Selected category does not exist.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  if (!categoryCheck.rows[0].is_active) {
    const error = new Error('Selected category is currently inactive.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 2. Insert equipment listing into PostgreSQL
  const insertQuery = `
    INSERT INTO equipment_listings (
      seller_id,
      category_id,
      title,
      description,
      condition,
      price,
      original_price,
      brand,
      model_year,
      is_negotiable,
      status,
      admin_approval_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available', 'approved')
    RETURNING id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status, created_at, updated_at;
  `;

  const result = await db.query(insertQuery, [
    sellerId,
    category_id,
    title,
    description,
    condition,
    price,
    original_price || null,
    brand || null,
    model_year || null,
    is_negotiable,
  ]);

  const newListing = result.rows[0];

  // 3. Save images
  await saveEquipmentImages(newListing.id, images, files);

  // 4. Return full listing with images and category info
  return getListingDetailsById(newListing.id);
};

/**
 * Search and filter marketplace listings (Public / Buyer catalog)
 * @param {object} filters 
 */
const getMarketplaceListings = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const conditions = ["e.status = 'available'", "e.admin_approval_status = 'approved'"];
  const params = [];
  let paramIdx = 1;

  // 1. Keyword / Text Search (title, description, brand, category name)
  const keyword = filters.keyword || filters.search || filters.q;
  if (keyword && typeof keyword === 'string' && keyword.trim().length > 0) {
    const searchTerm = keyword.trim();
    conditions.push(`(e.title ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx} OR e.brand ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
    params.push(`%${searchTerm}%`);
    paramIdx++;
  }

  // 2. Category Filter (supports UUID, slug, or category name)
  const categoryVal = filters.category || filters.category_id || filters.categoryId || filters.category_slug;
  if (categoryVal && typeof categoryVal === 'string' && categoryVal.trim().length > 0) {
    const catTrimmed = categoryVal.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(catTrimmed);
    if (isUuid) {
      conditions.push(`e.category_id = $${paramIdx}`);
      params.push(catTrimmed);
      paramIdx++;
    } else {
      conditions.push(`(c.slug ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
      params.push(catTrimmed);
      paramIdx++;
    }
  }

  // 3. Condition Filter (supports 'Good', 'good', 'Like New', 'like_new', 'Used', etc.)
  if (filters.condition && typeof filters.condition === 'string' && filters.condition.trim().length > 0) {
    const normalizedCond = filters.condition.trim().toLowerCase().replace(/\s+/g, '_');
    conditions.push(`e.condition = $${paramIdx}`);
    params.push(normalizedCond);
    paramIdx++;
  }

  // 4. Minimum Price Filter (supports minPrice or min_price)
  const minPrice = filters.minPrice !== undefined && filters.minPrice !== '' ? filters.minPrice : filters.min_price;
  if (minPrice !== undefined && minPrice !== '' && !isNaN(parseFloat(minPrice))) {
    conditions.push(`e.price >= $${paramIdx}`);
    params.push(parseFloat(minPrice));
    paramIdx++;
  }

  // 5. Maximum Price Filter (supports maxPrice or max_price)
  const maxPrice = filters.maxPrice !== undefined && filters.maxPrice !== '' ? filters.maxPrice : filters.max_price;
  if (maxPrice !== undefined && maxPrice !== '' && !isNaN(parseFloat(maxPrice))) {
    conditions.push(`e.price <= $${paramIdx}`);
    params.push(parseFloat(maxPrice));
    paramIdx++;
  }

  // 6. Brand Filter
  if (filters.brand && typeof filters.brand === 'string' && filters.brand.trim().length > 0) {
    conditions.push(`e.brand ILIKE $${paramIdx}`);
    params.push(`%${filters.brand.trim()}%`);
    paramIdx++;
  }

  // 7. Seller Filter
  if (filters.seller_id || filters.sellerId) {
    const sellerVal = filters.seller_id || filters.sellerId;
    conditions.push(`e.seller_id = $${paramIdx}`);
    params.push(sellerVal);
    paramIdx++;
  }

  // 8. Sorting
  const sortParam = (filters.sort || filters.sortBy || 'newest').toLowerCase().trim();
  let orderBy = 'e.created_at DESC';

  if (sortParam === 'price_asc' || sortParam === 'price_low_high' || sortParam === 'price_low') {
    orderBy = 'e.price ASC, e.created_at DESC';
  } else if (sortParam === 'price_desc' || sortParam === 'price_high_low' || sortParam === 'price_high') {
    orderBy = 'e.price DESC, e.created_at DESC';
  } else if (sortParam === 'oldest' || sortParam === 'date_asc') {
    orderBy = 'e.created_at ASC';
  } else if (sortParam === 'title_asc' || sortParam === 'alpha') {
    orderBy = 'e.title ASC';
  } else if (sortParam === 'popular' || sortParam === 'rating') {
    orderBy = 'seller_rating DESC NULLS LAST, e.created_at DESC';
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(e.id) AS total
    FROM equipment_listings e
    JOIN categories c ON e.category_id = c.id
    ${whereClause}
  `;
  const countResult = await db.query(countQuery, params);
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  // Get paginated listings with joined Category and Seller summary
  const queryParams = [...params, limit, offset];
  const listingsQuery = `
    SELECT 
      e.id,
      e.title,
      e.description,
      e.condition,
      e.price,
      e.original_price,
      e.brand,
      e.model_year,
      e.is_negotiable,
      e.status,
      e.created_at,
      e.updated_at,
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      c.icon AS category_icon,
      seller.id AS seller_id,
      seller.full_name AS seller_name,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar,
      (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
        FROM reviews 
        WHERE reviewee_id = seller.id
      ) AS seller_rating,
      (
        SELECT COUNT(id)
        FROM reviews 
        WHERE reviewee_id = seller.id
      ) AS seller_reviews_count,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id 
        ORDER BY is_primary DESC, created_at DESC 
        LIMIT 1
      ) AS primary_image,
      (
        SELECT json_agg(
          json_build_object(
            'id', id,
            'image_url', image_url,
            'is_primary', is_primary,
            'created_at', created_at
          ) ORDER BY is_primary DESC, created_at ASC
        )
        FROM equipment_images 
        WHERE equipment_id = e.id
      ) AS images
    FROM equipment_listings e
    JOIN categories c ON e.category_id = c.id
    JOIN users seller ON e.seller_id = seller.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(listingsQuery, queryParams);

  const formattedRows = result.rows.map(row => ({
    ...row,
    price: parseFloat(row.price),
    original_price: row.original_price ? parseFloat(row.original_price) : null,
    seller_rating: parseFloat(row.seller_rating || 0),
    seller_reviews_count: parseInt(row.seller_reviews_count || 0, 10),
    images: row.images || (row.primary_image ? [{ id: 'primary', image_url: row.primary_image, is_primary: true }] : []),
    primary_image: row.primary_image || (row.images?.[0]?.image_url) || null,
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      icon: row.category_icon,
    },
    seller: {
      id: row.seller_id,
      full_name: row.seller_name,
      department: row.seller_department,
      avatar_url: row.seller_avatar,
      rating: parseFloat(row.seller_rating || 0),
      reviews_count: parseInt(row.seller_reviews_count || 0, 10),
    },
  }));

  return {
    equipment: formattedRows,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get complete details of a single equipment item
 * @param {string} equipmentId 
 * @param {object} currentUser 
 */
const getListingDetailsById = async (equipmentId, currentUser = null) => {
  const query = `
    SELECT 
      e.id,
      e.seller_id,
      e.category_id,
      e.title,
      e.description,
      e.condition,
      e.price,
      e.original_price,
      e.brand,
      e.model_year,
      e.is_negotiable,
      e.status,
      e.admin_approval_status,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.slug AS category_slug,
      c.icon AS category_icon,
      seller.full_name AS seller_name,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar,
      seller.created_at AS seller_joined_at,
      (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
        FROM reviews 
        WHERE reviewee_id = seller.id
      ) AS seller_rating,
      (
        SELECT COUNT(id)
        FROM reviews 
        WHERE reviewee_id = seller.id
      ) AS seller_reviews_count
    FROM equipment_listings e
    JOIN categories c ON e.category_id = c.id
    JOIN users seller ON e.seller_id = seller.id
    WHERE e.id = $1
  `;

  const result = await db.query(query, [equipmentId]);
  if (result.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const equipment = result.rows[0];

  // Visibility guard: if listing is archived or not approved, only seller or admin can view
  const isOwner = currentUser && currentUser.id === equipment.seller_id;
  const isAdmin = currentUser && currentUser.role === 'admin';

  if ((equipment.status === 'archived' || equipment.admin_approval_status === 'rejected') && !isOwner && !isAdmin) {
    const error = new Error('Equipment listing is not available.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  // Fetch all images for this equipment
  const imagesResult = await db.query(
    `SELECT id, image_url, is_primary, created_at
     FROM equipment_images 
     WHERE equipment_id = $1 
     ORDER BY is_primary DESC, created_at ASC`,
    [equipmentId]
  );
  equipment.images = imagesResult.rows;
  equipment.primary_image = imagesResult.rows.find(img => img.is_primary)?.image_url || imagesResult.rows[0]?.image_url || null;

  // Format numerical values
  equipment.price = parseFloat(equipment.price);
  equipment.original_price = equipment.original_price ? parseFloat(equipment.original_price) : null;
  equipment.seller_rating = parseFloat(equipment.seller_rating || 0);
  equipment.seller_reviews_count = parseInt(equipment.seller_reviews_count || 0, 10);

  // Fetch recent reviews for this seller
  const reviewsResult = await db.query(
    `SELECT 
       r.id,
       r.rating,
       r.comment,
       r.created_at,
       reviewer.full_name AS reviewer_name,
       reviewer.avatar_url AS reviewer_avatar
     FROM reviews r
     JOIN users reviewer ON r.reviewer_id = reviewer.id
     WHERE r.reviewee_id = $1
     ORDER BY r.created_at DESC
     LIMIT 5`,
    [equipment.seller_id]
  );
  equipment.seller_recent_reviews = reviewsResult.rows;

  equipment.category = {
    id: equipment.category_id,
    name: equipment.category_name,
    slug: equipment.category_slug,
    icon: equipment.category_icon,
  };

  equipment.seller = {
    id: equipment.seller_id,
    full_name: equipment.seller_name,
    department: equipment.seller_department,
    avatar_url: equipment.seller_avatar,
    joined_at: equipment.seller_joined_at,
    rating: equipment.seller_rating,
    reviews_count: equipment.seller_reviews_count,
  };

  return equipment;
};

/**
 * Get current seller's own listings (with all statuses & request count)
 * @param {string} sellerId 
 * @param {object} filters 
 */
const getSellerOwnListings = async (sellerId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const conditions = ['e.seller_id = $1'];
  const params = [sellerId];
  let paramIdx = 2;

  if (filters.status) {
    conditions.push(`e.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total
  const countResult = await db.query(
    `SELECT COUNT(id) AS total FROM equipment_listings e ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  // Query paginated
  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      e.id,
      e.title,
      e.description,
      e.condition,
      e.price,
      e.original_price,
      e.brand,
      e.model_year,
      e.is_negotiable,
      e.status,
      e.admin_approval_status,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.slug AS category_slug,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id 
        ORDER BY is_primary DESC, created_at DESC 
        LIMIT 1
      ) AS primary_image,
      (
        SELECT json_agg(
          json_build_object(
            'id', id,
            'image_url', image_url,
            'is_primary', is_primary,
            'created_at', created_at
          ) ORDER BY is_primary DESC, created_at ASC
        )
        FROM equipment_images 
        WHERE equipment_id = e.id
      ) AS images,
      (
        SELECT COUNT(id) 
        FROM purchase_requests 
        WHERE equipment_id = e.id AND status = 'pending'
      ) AS pending_requests_count,
      (
        SELECT COUNT(id) 
        FROM purchase_requests 
        WHERE equipment_id = e.id
      ) AS total_requests_count
    FROM equipment_listings e
    JOIN categories c ON e.category_id = c.id
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  const formattedRows = result.rows.map(row => ({
    ...row,
    price: parseFloat(row.price),
    original_price: row.original_price ? parseFloat(row.original_price) : null,
    pending_requests_count: parseInt(row.pending_requests_count || 0, 10),
    total_requests_count: parseInt(row.total_requests_count || 0, 10),
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
    },
    images: row.images || (row.primary_image ? [{ id: 'primary', image_url: row.primary_image, is_primary: true }] : []),
    primary_image: row.primary_image || (row.images?.[0]?.image_url) || null,
  }));

  return {
    equipment: formattedRows,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Update an existing equipment listing (Owner or Admin only)
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} equipmentId 
 * @param {object} updateData 
 * @param {Array<Express.Multer.File>} files 
 */
const updateListing = async (userId, userRole, equipmentId, updateData, files = []) => {
  // 1. Fetch existing listing
  const existingRes = await db.query('SELECT * FROM equipment_listings WHERE id = $1', [equipmentId]);
  if (existingRes.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const listing = existingRes.rows[0];

  // 2. Authorization check: must be the seller or admin
  if (listing.seller_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only modify your own equipment listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 3. Category validation if updated
  if (updateData.category_id) {
    const catCheck = await db.query('SELECT id, is_active FROM categories WHERE id = $1', [updateData.category_id]);
    if (catCheck.rows.length === 0 || !catCheck.rows[0].is_active) {
      const error = new Error('Selected category is invalid or inactive.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
  }

  const {
    title,
    description,
    category_id,
    condition,
    price,
    original_price,
    brand,
    model_year,
    is_negotiable,
    status,
    images,
    replace_images,
    keep_image_ids,
    deleted_image_ids,
    primary_image_id,
  } = updateData;

  const updateQuery = `
    UPDATE equipment_listings 
    SET 
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category_id = COALESCE($3, category_id),
      condition = COALESCE($4, condition),
      price = COALESCE($5, price),
      original_price = COALESCE($6, original_price),
      brand = COALESCE($7, brand),
      model_year = COALESCE($8, model_year),
      is_negotiable = COALESCE($9, is_negotiable),
      status = COALESCE($10, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING id;
  `;

  await db.query(updateQuery, [
    title !== undefined ? title : null,
    description !== undefined ? description : null,
    category_id !== undefined ? category_id : null,
    condition !== undefined ? condition : null,
    price !== undefined ? price : null,
    original_price !== undefined ? original_price : null,
    brand !== undefined ? brand : null,
    model_year !== undefined ? model_year : null,
    is_negotiable !== undefined ? is_negotiable : null,
    status !== undefined ? status : null,
    equipmentId,
  ]);

  // Handle explicit image deletions
  if (deleted_image_ids) {
    let delIds = [];
    try {
      delIds = typeof deleted_image_ids === 'string' ? JSON.parse(deleted_image_ids) : deleted_image_ids;
    } catch {
      delIds = Array.isArray(deleted_image_ids) ? deleted_image_ids : [deleted_image_ids];
    }
    if (Array.isArray(delIds) && delIds.length > 0) {
      const oldImgs = await db.query(
        'SELECT image_url FROM equipment_images WHERE equipment_id = $1 AND id = ANY($2::uuid[])',
        [equipmentId, delIds]
      );
      oldImgs.rows.forEach((r) => deleteLocalImageFile(r.image_url));
      await db.query(
        'DELETE FROM equipment_images WHERE equipment_id = $1 AND id = ANY($2::uuid[])',
        [equipmentId, delIds]
      );
    }
  }

  // Parse keep_image_ids
  let parsedKeepIds = null;
  if (keep_image_ids !== undefined) {
    try {
      parsedKeepIds = typeof keep_image_ids === 'string' ? JSON.parse(keep_image_ids) : keep_image_ids;
    } catch {
      parsedKeepIds = Array.isArray(keep_image_ids) ? keep_image_ids : [keep_image_ids];
    }
  }

  const isReplacingAll = replace_images === true || replace_images === 'true';
  const hasNewFiles = files && files.length > 0;
  const hasImagesParam = images !== undefined && (Array.isArray(images) ? images.length > 0 : Boolean(images));

  if (hasNewFiles || hasImagesParam || isReplacingAll || parsedKeepIds !== null) {
    await saveEquipmentImages(equipmentId, images, files, {
      replaceAll: isReplacingAll,
      keepImageIds: parsedKeepIds,
    });
  }

  // Handle primary image update
  if (primary_image_id) {
    await db.query('UPDATE equipment_images SET is_primary = FALSE WHERE equipment_id = $1', [equipmentId]);
    await db.query(
      'UPDATE equipment_images SET is_primary = TRUE WHERE equipment_id = $1 AND id = $2',
      [equipmentId, primary_image_id]
    );
  }

  logger.info('Equipment listing updated', { equipmentId, userId });
  return getListingDetailsById(equipmentId);
};

/**
 * Upload additional images to an existing listing
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} equipmentId 
 * @param {Array<Express.Multer.File>} files 
 * @param {Array<string>} imageUrls 
 */
const uploadListingImages = async (userId, userRole, equipmentId, files = [], imageUrls = []) => {
  const existing = await db.query('SELECT seller_id FROM equipment_listings WHERE id = $1', [equipmentId]);
  if (existing.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  if (existing.rows[0].seller_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only modify your own equipment listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  await saveEquipmentImages(equipmentId, imageUrls, files, { replaceAll: false });
  await db.query('UPDATE equipment_listings SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [equipmentId]);

  logger.info('Additional images uploaded for equipment', { equipmentId, userId });
  return getListingDetailsById(equipmentId);
};

/**
 * Delete a specific image from an equipment listing
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} equipmentId 
 * @param {string} imageId 
 */
const deleteListingImage = async (userId, userRole, equipmentId, imageId) => {
  const existing = await db.query('SELECT seller_id FROM equipment_listings WHERE id = $1', [equipmentId]);
  if (existing.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  if (existing.rows[0].seller_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only modify your own equipment listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  const imgCheck = await db.query(
    'SELECT id, image_url, is_primary FROM equipment_images WHERE id = $1 AND equipment_id = $2',
    [imageId, equipmentId]
  );
  if (imgCheck.rows.length === 0) {
    const error = new Error('Image not found on this listing.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const wasPrimary = imgCheck.rows[0].is_primary;
  deleteLocalImageFile(imgCheck.rows[0].image_url);
  await db.query('DELETE FROM equipment_images WHERE id = $1', [imageId]);

  // If deleted image was primary, assign primary to another image if one exists
  if (wasPrimary) {
    await db.query(
      `UPDATE equipment_images 
       SET is_primary = TRUE 
       WHERE id = (SELECT id FROM equipment_images WHERE equipment_id = $1 ORDER BY created_at ASC LIMIT 1)`,
      [equipmentId]
    );
  }

  await db.query('UPDATE equipment_listings SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [equipmentId]);
  logger.info('Equipment image deleted', { equipmentId, imageId, userId });
  return getListingDetailsById(equipmentId);
};

/**
 * Set a specific image as the primary image
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} equipmentId 
 * @param {string} imageId 
 */
const setListingPrimaryImage = async (userId, userRole, equipmentId, imageId) => {
  const existing = await db.query('SELECT seller_id FROM equipment_listings WHERE id = $1', [equipmentId]);
  if (existing.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  if (existing.rows[0].seller_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only modify your own equipment listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  const imgCheck = await db.query(
    'SELECT id FROM equipment_images WHERE id = $1 AND equipment_id = $2',
    [imageId, equipmentId]
  );
  if (imgCheck.rows.length === 0) {
    const error = new Error('Image not found on this listing.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  await db.query('UPDATE equipment_images SET is_primary = FALSE WHERE equipment_id = $1', [equipmentId]);
  await db.query('UPDATE equipment_images SET is_primary = TRUE WHERE id = $1', [imageId]);
  await db.query('UPDATE equipment_listings SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [equipmentId]);

  logger.info('Primary image updated', { equipmentId, imageId, userId });
  return getListingDetailsById(equipmentId);
};

/**
 * Change listing availability / status
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} equipmentId 
 * @param {string} newStatus 
 */
const updateListingStatus = async (userId, userRole, equipmentId, newStatus) => {
  const existingRes = await db.query('SELECT seller_id FROM equipment_listings WHERE id = $1', [equipmentId]);
  if (existingRes.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  if (existingRes.rows[0].seller_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only change the status of your own listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  const normalizedStatus = (newStatus || '').toLowerCase().trim();

  const result = await db.query(
    `UPDATE equipment_listings 
     SET status = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2
     RETURNING id, title, status, updated_at`,
    [normalizedStatus, equipmentId]
  );

  logger.info('Equipment status updated', { equipmentId, status: normalizedStatus });
  return result.rows[0];
};

/**
 * Delete or Archive listing (Owner or Admin)
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} equipmentId 
 */
const deleteListing = async (userId, userRole, equipmentId) => {
  const existingRes = await db.query(
    'SELECT id, seller_id, title FROM equipment_listings WHERE id = $1',
    [equipmentId]
  );

  if (existingRes.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const listing = existingRes.rows[0];

  if (listing.seller_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only delete your own equipment listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // Check if listing has associated purchase requests or transactions
  const txCheck = await db.query(
    'SELECT COUNT(*) AS total FROM transactions WHERE equipment_id = $1',
    [equipmentId]
  );
  const totalTx = parseInt(txCheck.rows[0].total, 10);

  if (totalTx > 0) {
    // Soft delete / archive to preserve transaction history
    await db.query(
      "UPDATE equipment_listings SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [equipmentId]
    );

    return {
      deleted: false,
      archived: true,
      message: 'Listing contains active transaction records. It has been archived instead of permanently deleted.',
    };
  }

  // Hard delete if no transactions: first delete image files
  const allImgs = await db.query('SELECT image_url FROM equipment_images WHERE equipment_id = $1', [equipmentId]);
  allImgs.rows.forEach((r) => deleteLocalImageFile(r.image_url));

  await db.query('DELETE FROM equipment_listings WHERE id = $1', [equipmentId]);
  logger.info('Equipment listing deleted', { equipmentId, userId });

  return {
    deleted: true,
    archived: false,
    message: 'Equipment listing permanently deleted.',
  };
};

/**
 * Admin: Moderate equipment listing (Approve / Reject)
 * @param {string} adminId 
 * @param {string} equipmentId 
 * @param {object} approvalData 
 */
const adminModerateListing = async (adminId, equipmentId, approvalData) => {
  const { status, reason } = approvalData;

  const existingRes = await db.query(
    'SELECT id, seller_id, title, admin_approval_status FROM equipment_listings WHERE id = $1',
    [equipmentId]
  );

  if (existingRes.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const listing = existingRes.rows[0];

  const updateResult = await db.query(
    `UPDATE equipment_listings 
     SET admin_approval_status = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2
     RETURNING id, title, status, admin_approval_status, updated_at`,
    [status, equipmentId]
  );

  const updatedListing = updateResult.rows[0];

  // 1. Log in audit_logs
  await db.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, $2, 'equipment', $3, $4)`,
    [
      adminId,
      status === APPROVAL_STATUS.APPROVED ? 'EQUIPMENT_APPROVED' : 'EQUIPMENT_REJECTED',
      equipmentId,
      JSON.stringify({ status, reason: reason || 'N/A' }),
    ]
  );

  // 2. Notify Seller
  const notifTitle = status === APPROVAL_STATUS.APPROVED ? 'Listing Approved' : 'Listing Moderation Notice';
  const notifMessage = status === APPROVAL_STATUS.APPROVED
    ? `Your equipment listing "${listing.title}" has been approved and is live on the marketplace.`
    : `Your equipment listing "${listing.title}" was rejected by moderation. Reason: ${reason || 'Does not meet campus standards.'}`;

  await db.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
     VALUES ($1, $2, $3, 'system_alert', FALSE, $4, 'equipment')`,
    [listing.seller_id, notifTitle, notifMessage, equipmentId]
  );

  logger.info('Admin moderated listing', { adminId, equipmentId, status });
  return updatedListing;
};

/**
 * Admin: Get all listings across all approval and availability statuses
 * @param {object} filters 
 */
const adminGetAllListings = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 15));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.search) {
    conditions.push(`(e.title ILIKE $${paramIdx} OR seller.full_name ILIKE $${paramIdx} OR seller.email ILIKE $${paramIdx})`);
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  if (filters.approval_status) {
    conditions.push(`e.admin_approval_status = $${paramIdx}`);
    params.push(filters.approval_status);
    paramIdx++;
  }

  if (filters.status) {
    conditions.push(`e.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  if (filters.category_id) {
    conditions.push(`e.category_id = $${paramIdx}`);
    params.push(filters.category_id);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count
  const countResult = await db.query(
    `SELECT COUNT(e.id) AS total
     FROM equipment_listings e
     JOIN users seller ON e.seller_id = seller.id
     ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  // Paginated data
  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      e.id,
      e.title,
      e.price,
      e.condition,
      e.status,
      e.admin_approval_status,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.slug AS category_slug,
      seller.id AS seller_id,
      seller.full_name AS seller_name,
      seller.email AS seller_email,
      seller.student_id AS seller_student_id,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id 
        ORDER BY is_primary DESC, created_at DESC 
        LIMIT 1
      ) AS primary_image,
      (
        SELECT json_agg(
          json_build_object(
            'id', id,
            'image_url', image_url,
            'is_primary', is_primary,
            'created_at', created_at
          ) ORDER BY is_primary DESC, created_at ASC
        )
        FROM equipment_images 
        WHERE equipment_id = e.id
      ) AS images
    FROM equipment_listings e
    JOIN categories c ON e.category_id = c.id
    JOIN users seller ON e.seller_id = seller.id
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    equipment: result.rows.map(row => ({
      ...row,
      price: parseFloat(row.price),
      images: row.images || (row.primary_image ? [{ id: 'primary', image_url: row.primary_image, is_primary: true }] : []),
      primary_image: row.primary_image || (row.images?.[0]?.image_url) || null,
    })),
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

module.exports = {
  createListing,
  getMarketplaceListings,
  getListingDetailsById,
  getSellerOwnListings,
  updateListing,
  updateListingStatus,
  deleteListing,
  uploadListingImages,
  deleteListingImage,
  setListingPrimaryImage,
  adminModerateListing,
  adminGetAllListings,
};
