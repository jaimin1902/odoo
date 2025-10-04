import express from 'express';
import { pool } from '../server.js';
import { createApprovalRuleSchema, validate, paginationSchema, validateQuery } from '../utils/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all approval rules
router.get('/', requireAdmin, validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  const result = await pool.query(`
    SELECT 
      ar.id, ar.name, ar.rule_type, ar.percentage_threshold,
      ar.specific_approver_id, ar.min_amount, ar.max_amount, ar.is_active,
      ar.created_at, ar.updated_at,
      u.first_name as approver_first_name, u.last_name as approver_last_name
    FROM approval_rules ar
    LEFT JOIN users u ON ar.specific_approver_id = u.id
    WHERE ar.company_id = $1
    ORDER BY ar.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3
  `, [req.user.company_id, limit, offset]);

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM approval_rules WHERE company_id = $1',
    [req.user.company_id]
  );

  res.json({
    success: true,
    data: {
      rules: result.rows.map(rule => ({
        id: rule.id,
        name: rule.name,
        ruleType: rule.rule_type,
        percentageThreshold: rule.percentage_threshold,
        specificApprover: rule.specific_approver_id ? {
          id: rule.specific_approver_id,
          firstName: rule.approver_first_name,
          lastName: rule.approver_last_name
        } : null,
        minAmount: parseFloat(rule.min_amount),
        maxAmount: rule.max_amount ? parseFloat(rule.max_amount) : null,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at
      })),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    }
  });
}));

// Get approval rule by ID
router.get('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(`
    SELECT 
      ar.id, ar.name, ar.rule_type, ar.percentage_threshold,
      ar.specific_approver_id, ar.min_amount, ar.max_amount, ar.is_active,
      ar.created_at, ar.updated_at,
      u.first_name as approver_first_name, u.last_name as approver_last_name
    FROM approval_rules ar
    LEFT JOIN users u ON ar.specific_approver_id = u.id
    WHERE ar.id = $1 AND ar.company_id = $2
  `, [id, req.user.company_id]);

  if (result.rows.length === 0) {
    throw new AppError('Approval rule not found', 404);
  }

  const rule = result.rows[0];

  res.json({
    success: true,
    data: {
      rule: {
        id: rule.id,
        name: rule.name,
        ruleType: rule.rule_type,
        percentageThreshold: rule.percentage_threshold,
        specificApprover: rule.specific_approver_id ? {
          id: rule.specific_approver_id,
          firstName: rule.approver_first_name,
          lastName: rule.approver_last_name
        } : null,
        minAmount: parseFloat(rule.min_amount),
        maxAmount: rule.max_amount ? parseFloat(rule.max_amount) : null,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at
      }
    }
  });
}));

// Create approval rule
router.post('/', requireAdmin, validate(createApprovalRuleSchema), asyncHandler(async (req, res) => {
  const { name, ruleType, percentageThreshold, specificApproverId, minAmount, maxAmount } = req.body;

  // Validate specific approver if provided
  if (specificApproverId) {
    const approverResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [specificApproverId, req.user.company_id]
    );

    if (approverResult.rows.length === 0) {
      throw new AppError('Specific approver not found', 404);
    }

    if (!['manager', 'admin'].includes(approverResult.rows[0].role)) {
      throw new AppError('Specific approver must be a manager or admin', 400);
    }
  }

  // Validate amount range
  if (maxAmount && minAmount >= maxAmount) {
    throw new AppError('Minimum amount must be less than maximum amount', 400);
  }

  const result = await pool.query(`
    INSERT INTO approval_rules (
      company_id, name, rule_type, percentage_threshold, 
      specific_approver_id, min_amount, max_amount
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, rule_type, percentage_threshold, 
              specific_approver_id, min_amount, max_amount, is_active, created_at
  `, [req.user.company_id, name, ruleType, percentageThreshold, specificApproverId, minAmount, maxAmount]);

  const rule = result.rows[0];

  res.status(201).json({
    success: true,
    message: 'Approval rule created successfully',
    data: {
      rule: {
        id: rule.id,
        name: rule.name,
        ruleType: rule.rule_type,
        percentageThreshold: rule.percentage_threshold,
        specificApproverId: rule.specific_approver_id,
        minAmount: parseFloat(rule.min_amount),
        maxAmount: rule.max_amount ? parseFloat(rule.max_amount) : null,
        isActive: rule.is_active,
        createdAt: rule.created_at
      }
    }
  });
}));

// Update approval rule
router.put('/:id', requireAdmin, validate(createApprovalRuleSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, ruleType, percentageThreshold, specificApproverId, minAmount, maxAmount } = req.body;

  // Check if rule exists
  const existingRule = await pool.query(
    'SELECT id FROM approval_rules WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id]
  );

  if (existingRule.rows.length === 0) {
    throw new AppError('Approval rule not found', 404);
  }

  // Validate specific approver if provided
  if (specificApproverId) {
    const approverResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [specificApproverId, req.user.company_id]
    );

    if (approverResult.rows.length === 0) {
      throw new AppError('Specific approver not found', 404);
    }

    if (!['manager', 'admin'].includes(approverResult.rows[0].role)) {
      throw new AppError('Specific approver must be a manager or admin', 400);
    }
  }

  // Validate amount range
  if (maxAmount && minAmount >= maxAmount) {
    throw new AppError('Minimum amount must be less than maximum amount', 400);
  }

  const result = await pool.query(`
    UPDATE approval_rules 
    SET name = $1, rule_type = $2, percentage_threshold = $3, 
        specific_approver_id = $4, min_amount = $5, max_amount = $6,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $7 AND company_id = $8
    RETURNING id, name, rule_type, percentage_threshold, 
              specific_approver_id, min_amount, max_amount, is_active, updated_at
  `, [name, ruleType, percentageThreshold, specificApproverId, minAmount, maxAmount, id, req.user.company_id]);

  const rule = result.rows[0];

  res.json({
    success: true,
    message: 'Approval rule updated successfully',
    data: {
      rule: {
        id: rule.id,
        name: rule.name,
        ruleType: rule.rule_type,
        percentageThreshold: rule.percentage_threshold,
        specificApproverId: rule.specific_approver_id,
        minAmount: parseFloat(rule.min_amount),
        maxAmount: rule.max_amount ? parseFloat(rule.max_amount) : null,
        isActive: rule.is_active,
        updatedAt: rule.updated_at
      }
    }
  });
}));

// Toggle approval rule status
router.put('/:id/toggle', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(`
    UPDATE approval_rules 
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND company_id = $2
    RETURNING id, name, is_active, updated_at
  `, [id, req.user.company_id]);

  if (result.rows.length === 0) {
    throw new AppError('Approval rule not found', 404);
  }

  const rule = result.rows[0];

  res.json({
    success: true,
    message: `Approval rule ${rule.is_active ? 'activated' : 'deactivated'} successfully`,
    data: {
      rule: {
        id: rule.id,
        name: rule.name,
        isActive: rule.is_active,
        updatedAt: rule.updated_at
      }
    }
  });
}));

// Delete approval rule
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM approval_rules WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, req.user.company_id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Approval rule not found', 404);
  }

  res.json({
    success: true,
    message: 'Approval rule deleted successfully'
  });
}));

export default router;
