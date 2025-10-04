import { z } from 'zod';

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  country: z.string().min(2, 'Please select a country'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User validations
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['employee', 'manager'], {
    required_error: 'Please select a role',
  }),
  managerId: z.string().optional(),
  isManagerApprover: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  role: z.enum(['employee', 'manager']).optional(),
  managerId: z.string().optional(),
  isManagerApprover: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Expense validations
export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  categoryId: z.string().uuid('Invalid category'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500, 'Description must be less than 500 characters'),
  expenseDate: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    return selectedDate <= today;
  }, 'Expense date cannot be in the future'),
  receiptUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const updateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  categoryId: z.string().uuid('Invalid category').optional(),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500, 'Description must be less than 500 characters').optional(),
  expenseDate: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    return selectedDate <= today;
  }, 'Expense date cannot be in the future').optional(),
  receiptUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Approval validations
export const approvalDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: 'Please select a decision',
  }),
  comments: z.string().max(1000, 'Comments must be less than 1000 characters').optional(),
});

// Approval Rule validations
export const createApprovalRuleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255, 'Name must be less than 255 characters'),
  ruleType: z.enum(['percentage', 'specific_approver', 'hybrid'], {
    required_error: 'Please select a rule type',
  }),
  percentageThreshold: z.number().min(1).max(100).optional(),
  specificApproverId: z.string().uuid('Invalid approver').optional(),
  minAmount: z.number().min(0, 'Minimum amount must be 0 or greater').default(0),
  maxAmount: z.number().min(0, 'Maximum amount must be 0 or greater').optional(),
}).refine((data) => {
  if (data.ruleType === 'percentage' && !data.percentageThreshold) {
    return false;
  }
  if (data.ruleType === 'specific_approver' && !data.specificApproverId) {
    return false;
  }
  if (data.ruleType === 'hybrid' && (!data.percentageThreshold || !data.specificApproverId)) {
    return false;
  }
  return true;
}, {
  message: 'Rule type requirements not met',
  path: ['ruleType'],
});

// Approval Workflow validations
export const createApprovalWorkflowSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255, 'Name must be less than 255 characters'),
  minAmount: z.number().min(0, 'Minimum amount must be 0 or greater').default(0),
  maxAmount: z.number().min(0, 'Maximum amount must be 0 or greater').optional(),
  steps: z.array(z.object({
    stepOrder: z.number().int().min(1, 'Step order must be at least 1'),
    approverId: z.string().uuid('Invalid approver'),
    isRequired: z.boolean().default(true),
  })).min(1, 'At least one step is required'),
}).refine((data) => {
  if (data.maxAmount && data.minAmount >= data.maxAmount) {
    return false;
  }
  return true;
}, {
  message: 'Minimum amount must be less than maximum amount',
  path: ['maxAmount'],
});

// Company validations
export const updateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(255, 'Company name must be less than 255 characters').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  country: z.string().length(2, 'Country must be 2 characters').optional(),
});

// Filter validations
export const expenseFilterSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'partially_approved']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Utility functions
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string[]> } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    throw error;
  }
};
