const { z } = require('zod');
const { EQUIPMENT_CONDITIONS, EQUIPMENT_STATUS, APPROVAL_STATUS } = require('../config/constants');

const conditionsArray = Object.values(EQUIPMENT_CONDITIONS);
const statusArray = Object.values(EQUIPMENT_STATUS);
const approvalArray = Object.values(APPROVAL_STATUS);

/**
 * Normalizes input condition string to canonical database enum
 * Supports: 'New', 'Like New', 'Good', 'Fair', 'Used' and lowercase/snake_case variants
 */
const normalizeCondition = (val) => {
  if (typeof val !== 'string') return null;
  const key = val.trim().toLowerCase().replace(/[-_]/g, ' ');
  if (key === 'new') return 'new';
  if (key === 'like new') return 'like_new';
  if (key === 'good') return 'good';
  if (key === 'fair') return 'fair';
  if (key === 'used') return 'used';
  return null;
};

const conditionSchema = z
  .string({ required_error: 'Condition is required' })
  .trim()
  .refine((val) => normalizeCondition(val) !== null, {
    message: 'Condition must be one of: [New, Like New, Good, Fair, Used]',
  })
  .transform((val) => normalizeCondition(val));

const optionalConditionSchema = z
  .string()
  .trim()
  .refine((val) => normalizeCondition(val) !== null, {
    message: 'Condition must be one of: [New, Like New, Good, Fair, Used]',
  })
  .transform((val) => normalizeCondition(val))
  .optional();

/**
 * Normalizes input status string to lowercase canonical enum
 */
const normalizeStatus = (val) => {
  if (typeof val !== 'string') return null;
  const lower = val.trim().toLowerCase();
  if (statusArray.includes(lower)) return lower;
  return null;
};

const statusSchema = z
  .string({ required_error: 'Status is required' })
  .trim()
  .refine((val) => normalizeStatus(val) !== null, {
    message: `Status must be one of: [${statusArray.join(', ')}]`,
  })
  .transform((val) => normalizeStatus(val));

const optionalStatusSchema = z
  .string()
  .trim()
  .refine((val) => normalizeStatus(val) !== null, {
    message: `Status must be one of: [${statusArray.join(', ')}]`,
  })
  .transform((val) => normalizeStatus(val))
  .optional();

const imagesSchema = z
  .union([
    z.array(z.string().trim().min(1)),
    z.string().trim().min(1).transform((val) => [val]),
  ])
  .optional()
  .default([]);

const createEquipmentSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters'),
  category_id: z
    .string({ required_error: 'Category ID is required' })
    .uuid('Category ID must be a valid UUID'),
  condition: conditionSchema,
  price: z.coerce
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a valid number' })
    .min(0, 'Price must be a non-negative amount'),
  original_price: z.coerce
    .number({ invalid_type_error: 'Original price must be a valid number' })
    .min(0, 'Original price must be positive')
    .optional()
    .nullable(),
  brand: z.string().trim().max(100).optional().nullable(),
  model_year: z.string().trim().max(20).optional().nullable(),
  is_negotiable: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional()
    .default(false),
  images: imagesSchema,
});

const updateEquipmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .optional(),
  category_id: z.string().uuid('Category ID must be a valid UUID').optional(),
  condition: optionalConditionSchema,
  price: z.coerce
    .number({ invalid_type_error: 'Price must be a valid number' })
    .min(0, 'Price must be positive')
    .optional(),
  original_price: z.coerce
    .number({ invalid_type_error: 'Original price must be a valid number' })
    .min(0)
    .optional()
    .nullable(),
  brand: z.string().trim().max(100).optional().nullable(),
  model_year: z.string().trim().max(20).optional().nullable(),
  is_negotiable: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
  status: optionalStatusSchema,
  images: imagesSchema,
  replace_images: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
  keep_image_ids: z
    .union([z.array(z.string().uuid()), z.string()])
    .optional(),
  deleted_image_ids: z
    .union([z.array(z.string().uuid()), z.string()])
    .optional(),
  primary_image_id: z.string().uuid('primary_image_id must be a valid UUID').optional().nullable(),
});

const updateEquipmentStatusSchema = z.object({
  status: statusSchema,
});

const adminApprovalSchema = z.object({
  status: z.enum([APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED], {
    errorMap: () => ({ message: 'Approval status must be either approved or rejected' }),
  }),
  reason: z.string().trim().max(500).optional(),
});

module.exports = {
  createEquipmentSchema,
  updateEquipmentSchema,
  updateEquipmentStatusSchema,
  adminApprovalSchema,
  normalizeCondition,
  normalizeStatus,
};
