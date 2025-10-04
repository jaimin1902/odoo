import Joi from 'joi';

// User validation schemas
export const userSignupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  country: Joi.string().length(2).required()
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('employee', 'manager').required(),
  managerId: Joi.string().uuid().optional(),
  isManagerApprover: Joi.boolean().default(false)
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  role: Joi.string().valid('employee', 'manager').optional(),
  managerId: Joi.string().uuid().optional(),
  isManagerApprover: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

// Expense validation schemas
export const createExpenseSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  categoryId: Joi.string().uuid().required(),
  description: Joi.string().min(5).max(500).required(),
  expenseDate: Joi.date().max('now').required(),
  receiptUrl: Joi.string().uri().allow('').optional(),
  notes: Joi.string().max(1000).allow('').optional()
}).options({ convert: true });

export const updateExpenseSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  categoryId: Joi.string().uuid().optional(),
  description: Joi.string().min(5).max(500).optional(),
  expenseDate: Joi.date().max('now').optional(),
  receiptUrl: Joi.string().uri().allow('').optional(),
  notes: Joi.string().max(1000).allow('').optional()
}).options({ convert: true });

// Approval validation schemas
export const approvalDecisionSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  comments: Joi.string().max(1000).optional()
});

// Approval rule validation schemas
export const createApprovalRuleSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  ruleType: Joi.string().valid('percentage', 'specific_approver', 'hybrid').required(),
  percentageThreshold: Joi.number().integer().min(1).max(100).when('ruleType', {
    is: 'percentage',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  specificApproverId: Joi.string().uuid().when('ruleType', {
    is: 'specific_approver',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  minAmount: Joi.number().min(0).default(0),
  maxAmount: Joi.number().min(0).optional()
});

// Approval workflow validation schemas
export const createApprovalWorkflowSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  minAmount: Joi.number().min(0).default(0),
  maxAmount: Joi.number().min(0).optional(),
  steps: Joi.array().items(
    Joi.object({
      stepOrder: Joi.number().integer().min(1).required(),
      approverId: Joi.string().uuid().required(),
      isRequired: Joi.boolean().default(true)
    })
  ).min(1).required()
});

// Company validation schemas
export const updateCompanySchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  currency: Joi.string().length(3).optional(),
  country: Joi.string().length(2).optional()
});

// Query parameter validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}).options({ convert: true });

export const expenseFilterSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'partially_approved').optional(),
  categoryId: Joi.string().uuid().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional()
}).options({ convert: true });

// Combined schema for expenses GET route
export const expensesQuerySchema = paginationSchema.concat(expenseFilterSchema);

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }
    
    req.body = value;
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: errorMessage
      });
    }
    
    req.query = value;
    next();
  };
};
