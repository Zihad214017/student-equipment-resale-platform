const { z } = require('zod');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationTypes = Object.values(NOTIFICATION_TYPES);

const createNotificationSchema = z.object({
  user_id: z
    .string({ required_error: 'User ID is required' })
    .uuid('User ID must be a valid UUID'),
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message is required'),
  type: z.enum(notificationTypes, {
    errorMap: () => ({ message: `Type must be one of: [${notificationTypes.join(', ')}]` }),
  }),
  reference_id: z.string().uuid().optional().nullable(),
  reference_type: z.string().trim().max(50).optional().nullable(),
});

const notificationQuerySchema = z.object({
  is_read: z
    .union([z.enum(['true', 'false', 'all']), z.boolean()])
    .optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(15),
});

module.exports = {
  createNotificationSchema,
  notificationQuerySchema,
};
