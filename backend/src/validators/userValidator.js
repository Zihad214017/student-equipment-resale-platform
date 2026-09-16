const { z } = require('zod');
const { USER_ROLES } = require('../config/constants');

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

const changePasswordSchema = z
  .object({
    current_password: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    new_password: z
      .string({ required_error: 'New password is required' })
      .min(6, 'New password must be at least 6 characters')
      .max(100, 'New password cannot exceed 100 characters'),
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: 'New password must be different from current password',
    path: ['new_password'],
  });

const toggleUserStatusSchema = z.object({
  is_active: z.boolean({ required_error: 'is_active boolean flag is required' }),
});

const adminUpdateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters')
    .optional(),
  department: z
    .string()
    .trim()
    .max(100, 'Department name cannot exceed 100 characters')
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable(),
});

const adminCreateUserSchema = z.object({
  student_id: z
    .string({ required_error: 'Student/University ID is required' })
    .trim()
    .min(3, 'Student ID must be at least 3 characters')
    .max(50, 'Student ID cannot exceed 50 characters'),
  full_name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name cannot exceed 150 characters'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
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
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.ADMIN]).optional().default(USER_ROLES.STUDENT),
  is_active: z.boolean().optional().default(true),
  avatar_url: z
    .string()
    .url('Avatar must be a valid URL')
    .optional()
    .nullable()
    .or(z.literal('')),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  toggleUserStatusSchema,
  adminUpdateUserSchema,
  adminCreateUserSchema,
};
