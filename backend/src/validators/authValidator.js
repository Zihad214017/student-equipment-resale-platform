const { z } = require('zod');
const { USER_ROLES } = require('../config/constants');

// University email regex pattern (supports .edu, .ac.*, .edu.*, and standard university domains)
const emailSchema = z
  .string({ required_error: 'Email address is required' })
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address')
  .refine(
    (email) => {
      // Must be a valid email format
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    },
    { message: 'Invalid institutional or university email format' }
  );

const studentIdSchema = z
  .string({ required_error: 'Student/University ID is required' })
  .trim()
  .min(3, 'Student ID must be at least 3 characters')
  .max(30, 'Student ID cannot exceed 30 characters')
  .regex(/^[A-Za-z0-9-_]+$/, 'Student ID can only contain letters, numbers, hyphens, and underscores');

const registerSchema = z.object({
  student_id: studentIdSchema,
  full_name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters'),
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable(),
  department: z
    .string()
    .trim()
    .max(100, 'Department name cannot exceed 100 characters')
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .url('Avatar must be a valid URL')
    .optional()
    .nullable()
    .or(z.literal('')),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable(),
  department: z
    .string()
    .trim()
    .max(100, 'Department name cannot exceed 100 characters')
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .url('Avatar must be a valid URL')
    .optional()
    .nullable()
    .or(z.literal('')),
});

const changePasswordSchema = z.object({
  current_password: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  new_password: z
    .string({ required_error: 'New password is required' })
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password cannot exceed 100 characters'),
}).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password'],
  }
);

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};
