const { z } = require('zod');

const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(120, 'Slug cannot exceed 120 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().optional().nullable(),
  icon: z.string().trim().max(100).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .optional(),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(120, 'Slug cannot exceed 120 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().optional().nullable(),
  icon: z.string().trim().max(100).optional().nullable(),
  is_active: z.boolean().optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
