const { z } = require('zod');

const createReviewSchema = z.object({
  transaction_id: z
    .string({ required_error: 'Transaction ID is required' })
    .uuid('Transaction ID must be a valid UUID'),
  rating: z.coerce
    .number({ required_error: 'Rating is required' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comment: z.string().trim().max(1000, 'Comment cannot exceed 1000 characters').optional().nullable(),
});

const reviewQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

module.exports = {
  createReviewSchema,
  reviewQuerySchema,
};
