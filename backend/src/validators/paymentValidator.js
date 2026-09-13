const { z } = require('zod');

const initiatePaymentSchema = z.object({
  transaction_id: z.string({ required_error: 'transaction_id is required' }).uuid('transaction_id must be a valid UUID'),
  payment_method: z.enum(['BKASH', 'NAGAD', 'bkash', 'nagad'], {
    errorMap: () => ({ message: 'payment_method must be either BKASH or NAGAD' }),
  }),
  customer_phone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  callback_url: z.string().url().optional().nullable().or(z.literal('')),
});

const verifyPaymentSchema = z.object({
  provider_transaction_id: z.string().trim().max(150).optional().nullable().or(z.literal('')),
  provider_reference: z.string().trim().max(150).optional().nullable().or(z.literal('')),
  paymentID: z.string().trim().optional(),
  trxID: z.string().trim().optional(),
  order_id: z.string().trim().optional(),
  payment_ref_id: z.string().trim().optional(),
  status: z.string().trim().optional(),
}).passthrough();

module.exports = {
  initiatePaymentSchema,
  verifyPaymentSchema,
};
