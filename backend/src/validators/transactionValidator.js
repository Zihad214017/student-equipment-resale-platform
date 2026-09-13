const { z } = require('zod');
const { TRANSACTION_STATUS } = require('../config/constants');

const transactionStatuses = Object.values(TRANSACTION_STATUS);

const updateTransactionStatusSchema = z.object({
  status: z.enum(transactionStatuses, {
    errorMap: () => ({
      message: `Status must be one of: [${transactionStatuses.join(', ')}]`,
    }),
  }),
  meeting_location: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const createTransactionSchema = z.object({
  purchase_request_id: z
    .string({ required_error: 'Purchase request ID is required' })
    .uuid('Purchase request ID must be a valid UUID'),
  meeting_location: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const transactionQuerySchema = z.object({
  status: z.enum([...transactionStatuses, 'all']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

module.exports = {
  updateTransactionStatusSchema,
  createTransactionSchema,
  transactionQuerySchema,
};
