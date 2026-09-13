const { z } = require('zod');
const { PURCHASE_REQUEST_STATUS } = require('../config/constants');

const createPurchaseRequestSchema = z.object({
  equipment_id: z
    .string({ required_error: 'Equipment ID is required' })
    .uuid('Equipment ID must be a valid UUID'),
  proposed_price: z.coerce
    .number()
    .min(0, 'Proposed price must be positive')
    .optional(),
  offered_price: z.coerce
    .number()
    .min(0, 'Offered price must be positive')
    .optional(),
  message: z.string().trim().max(1000).optional().nullable(),
});

const respondPurchaseRequestSchema = z.object({
  status: z.enum([PURCHASE_REQUEST_STATUS.ACCEPTED, PURCHASE_REQUEST_STATUS.REJECTED], {
    errorMap: () => ({ message: 'Status must be either accepted or rejected' }),
  }),
  response_note: z.string().trim().max(500).optional().nullable(),
});

const purchaseRequestQuerySchema = z.object({
  status: z
    .enum(['pending', 'accepted', 'rejected', 'cancelled', 'all'])
    .optional(),
  equipment_id: z.string().uuid().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

module.exports = {
  createPurchaseRequestSchema,
  respondPurchaseRequestSchema,
  purchaseRequestQuerySchema,
};
