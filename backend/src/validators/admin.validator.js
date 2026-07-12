const { z } = require('zod');
const { validate } = require('./auth.validator');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'], {
    errorMap: () => ({ message: 'Invalid user role selected' })
  })
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: z.string().email('Invalid email address format').toLowerCase().trim().optional(),
  role: z.enum(['ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']).optional()
});

const lockUserSchema = z.object({
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(10080, 'Duration cannot exceed 1 week')
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

const updateSettingSchema = z.object({
  value: z.any({ required_error: 'Value configuration is required' })
});

module.exports = {
  validate,
  createUserSchema,
  updateUserSchema,
  lockUserSchema,
  resetPasswordSchema,
  updateSettingSchema
};
