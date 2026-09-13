const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate URL-friendly slug from string
 * @param {string} text 
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * List all categories with active equipment counts
 * @param {object} options 
 */
const getAllCategories = async (options = {}) => {
  const { activeOnly = false } = options;
  const whereClause = activeOnly ? 'WHERE c.is_active = TRUE' : '';

  const query = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.icon,
      c.is_active,
      c.created_at,
      c.updated_at,
      (
        SELECT COUNT(*) 
        FROM equipment_listings e 
        WHERE e.category_id = c.id AND e.status = 'available' AND e.admin_approval_status = 'approved'
      ) AS active_equipment_count,
      (
        SELECT COUNT(*) 
        FROM equipment_listings e 
        WHERE e.category_id = c.id
      ) AS total_equipment_count
    FROM categories c
    ${whereClause}
    ORDER BY c.name ASC
  `;

  const result = await db.query(query);
  return result.rows.map(row => ({
    ...row,
    active_equipment_count: parseInt(row.active_equipment_count || 0, 10),
    total_equipment_count: parseInt(row.total_equipment_count || 0, 10),
  }));
};

/**
 * Get category by ID or slug
 * @param {string} idOrSlug 
 */
const getCategoryByIdOrSlug = async (idOrSlug) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const condition = isUuid ? 'c.id = $1' : 'c.slug = $1';

  const query = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.icon,
      c.is_active,
      c.created_at,
      c.updated_at,
      (
        SELECT COUNT(*) 
        FROM equipment_listings e 
        WHERE e.category_id = c.id AND e.status = 'available' AND e.admin_approval_status = 'approved'
      ) AS active_equipment_count
    FROM categories c
    WHERE ${condition}
  `;

  const result = await db.query(query, [idOrSlug]);
  if (result.rows.length === 0) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const row = result.rows[0];
  row.active_equipment_count = parseInt(row.active_equipment_count || 0, 10);
  return row;
};

/**
 * Admin: Create a new equipment category
 * @param {string} adminId 
 * @param {object} categoryData 
 */
const createCategory = async (adminId, categoryData) => {
  const { name, description, icon, is_active = true } = categoryData;
  const slug = categoryData.slug || slugify(name);

  // Check duplicate name or slug
  const dupCheck = await db.query(
    'SELECT id FROM categories WHERE name ILIKE $1 OR slug = $2',
    [name, slug]
  );

  if (dupCheck.rows.length > 0) {
    const error = new Error('A category with this name or slug already exists.');
    error.statusCode = 409;
    error.isOperational = true;
    throw error;
  }

  const insertQuery = `
    INSERT INTO categories (name, slug, description, icon, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, slug, description, icon, is_active, created_at, updated_at;
  `;

  const result = await db.query(insertQuery, [
    name,
    slug,
    description || null,
    icon || 'cube',
    is_active,
  ]);

  const newCategory = result.rows[0];

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, 'CATEGORY_CREATED', 'category', $2, $3)`,
    [adminId, newCategory.id, JSON.stringify({ name: newCategory.name, slug: newCategory.slug })]
  );

  logger.info('Category created by admin', { adminId, categoryId: newCategory.id });
  return newCategory;
};

/**
 * Admin: Update category details
 * @param {string} adminId 
 * @param {string} categoryId 
 * @param {object} updateData 
 */
const updateCategory = async (adminId, categoryId, updateData) => {
  const { name, description, icon, is_active } = updateData;
  let slug = updateData.slug;
  if (name && !slug) {
    slug = slugify(name);
  }

  // Check if exists
  const existing = await db.query('SELECT id, name FROM categories WHERE id = $1', [categoryId]);
  if (existing.rows.length === 0) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  // Check duplicate conflict with other categories
  if (name || slug) {
    const conflictCheck = await db.query(
      'SELECT id FROM categories WHERE (name ILIKE $1 OR slug = $2) AND id <> $3',
      [name || '', slug || '', categoryId]
    );
    if (conflictCheck.rows.length > 0) {
      const error = new Error('Another category with this name or slug already exists.');
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }
  }

  const updateQuery = `
    UPDATE categories 
    SET 
      name = COALESCE($1, name),
      slug = COALESCE($2, slug),
      description = COALESCE($3, description),
      icon = COALESCE($4, icon),
      is_active = COALESCE($5, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING id, name, slug, description, icon, is_active, created_at, updated_at;
  `;

  const result = await db.query(updateQuery, [
    name !== undefined ? name : null,
    slug !== undefined ? slug : null,
    description !== undefined ? description : null,
    icon !== undefined ? icon : null,
    is_active !== undefined ? is_active : null,
    categoryId,
  ]);

  const updatedCategory = result.rows[0];

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, 'CATEGORY_UPDATED', 'category', $2, $3)`,
    [adminId, categoryId, JSON.stringify({ changes: updateData })]
  );

  logger.info('Category updated by admin', { adminId, categoryId });
  return updatedCategory;
};

/**
 * Admin: Delete or Deactivate Category
 * @param {string} adminId 
 * @param {string} categoryId 
 */
const deleteCategory = async (adminId, categoryId) => {
  // Check if category exists
  const existing = await db.query('SELECT id, name FROM categories WHERE id = $1', [categoryId]);
  if (existing.rows.length === 0) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  // Check if any equipment listings exist for this category
  const countRes = await db.query(
    'SELECT COUNT(*) AS total FROM equipment_listings WHERE category_id = $1',
    [categoryId]
  );
  const totalListings = parseInt(countRes.rows[0].total, 10);

  if (totalListings > 0) {
    // If listings exist, safely deactivate rather than breaking foreign keys
    await db.query(
      'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [categoryId]
    );

    await db.query(
      `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, 'CATEGORY_DEACTIVATED', 'category', $2, $3)`,
      [adminId, categoryId, JSON.stringify({ reason: 'Deactivated due to existing equipment references', listingsCount: totalListings })]
    );

    return {
      deleted: false,
      deactivated: true,
      message: `Category contains ${totalListings} equipment listing(s). It has been deactivated instead of deleted.`,
    };
  }

  // If no listings exist, hard delete
  await db.query('DELETE FROM categories WHERE id = $1', [categoryId]);

  await db.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, 'CATEGORY_DELETED', 'category', $2, $3)`,
    [adminId, categoryId, JSON.stringify({ categoryName: existing.rows[0].name })]
  );

  logger.info('Category deleted by admin', { adminId, categoryId });
  return {
    deleted: true,
    deactivated: false,
    message: 'Category deleted successfully.',
  };
};

module.exports = {
  getAllCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
