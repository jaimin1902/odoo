import express from 'express';
import { pool } from '../server.js';
import { createApprovalWorkflowSchema, validate, paginationSchema, validateQuery } from '../utils/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all approval workflows
router.get('/', requireAdmin, validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  const result = await pool.query(`
    SELECT 
      aw.id, aw.name, aw.min_amount, aw.max_amount, aw.is_active,
      aw.created_at, aw.updated_at,
      COUNT(aws.id) as step_count
    FROM approval_workflows aw
    LEFT JOIN approval_workflow_steps aws ON aw.id = aws.workflow_id
    WHERE aw.company_id = $1
    GROUP BY aw.id, aw.name, aw.min_amount, aw.max_amount, aw.is_active, aw.created_at, aw.updated_at
    ORDER BY aw.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3
  `, [req.user.company_id, limit, offset]);

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM approval_workflows WHERE company_id = $1',
    [req.user.company_id]
  );

  res.json({
    success: true,
    data: {
      workflows: result.rows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        minAmount: parseFloat(workflow.min_amount),
        maxAmount: workflow.max_amount ? parseFloat(workflow.max_amount) : null,
        isActive: workflow.is_active,
        stepCount: parseInt(workflow.step_count),
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at
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

// Get approval workflow by ID with steps
router.get('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const workflowResult = await pool.query(`
    SELECT id, name, min_amount, max_amount, is_active, created_at, updated_at
    FROM approval_workflows
    WHERE id = $1 AND company_id = $2
  `, [id, req.user.company_id]);

  if (workflowResult.rows.length === 0) {
    throw new AppError('Approval workflow not found', 404);
  }

  const workflow = workflowResult.rows[0];

  const stepsResult = await pool.query(`
    SELECT 
      aws.id, aws.step_order, aws.is_required,
      u.id as approver_id, u.first_name, u.last_name, u.role
    FROM approval_workflow_steps aws
    JOIN users u ON aws.approver_id = u.id
    WHERE aws.workflow_id = $1
    ORDER BY aws.step_order
  `, [id]);

  res.json({
    success: true,
    data: {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        minAmount: parseFloat(workflow.min_amount),
        maxAmount: workflow.max_amount ? parseFloat(workflow.max_amount) : null,
        isActive: workflow.is_active,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        steps: stepsResult.rows.map(step => ({
          id: step.id,
          stepOrder: step.step_order,
          isRequired: step.is_required,
          approver: {
            id: step.approver_id,
            firstName: step.first_name,
            lastName: step.last_name,
            role: step.role
          }
        }))
      }
    }
  });
}));

// Create approval workflow
router.post('/', requireAdmin, validate(createApprovalWorkflowSchema), asyncHandler(async (req, res) => {
  const { name, minAmount, maxAmount, steps } = req.body;

  // Validate amount range
  if (maxAmount && minAmount >= maxAmount) {
    throw new AppError('Minimum amount must be less than maximum amount', 400);
  }

  // Validate approvers
  const approverIds = steps.map(step => step.approverId);
  const approversResult = await pool.query(`
    SELECT id, role FROM users 
    WHERE id = ANY($1) AND company_id = $2
  `, [approverIds, req.user.company_id]);

  if (approversResult.rows.length !== approverIds.length) {
    throw new AppError('One or more approvers not found', 404);
  }

  const invalidApprovers = approversResult.rows.filter(approver => 
    !['manager', 'admin'].includes(approver.role)
  );

  if (invalidApprovers.length > 0) {
    throw new AppError('All approvers must be managers or admins', 400);
  }

  // Check for duplicate step orders
  const stepOrders = steps.map(step => step.stepOrder);
  if (new Set(stepOrders).size !== stepOrders.length) {
    throw new AppError('Step orders must be unique', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create workflow
    const workflowResult = await client.query(`
      INSERT INTO approval_workflows (company_id, name, min_amount, max_amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, min_amount, max_amount, is_active, created_at
    `, [req.user.company_id, name, minAmount, maxAmount]);

    const workflow = workflowResult.rows[0];

    // Create workflow steps
    for (const step of steps) {
      await client.query(`
        INSERT INTO approval_workflow_steps (workflow_id, step_order, approver_id, is_required)
        VALUES ($1, $2, $3, $4)
      `, [workflow.id, step.stepOrder, step.approverId, step.isRequired]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Approval workflow created successfully',
      data: {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          minAmount: parseFloat(workflow.min_amount),
          maxAmount: workflow.max_amount ? parseFloat(workflow.max_amount) : null,
          isActive: workflow.is_active,
          createdAt: workflow.created_at,
          stepCount: steps.length
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Update approval workflow
router.put('/:id', requireAdmin, validate(createApprovalWorkflowSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, minAmount, maxAmount, steps } = req.body;

  // Check if workflow exists
  const existingWorkflow = await pool.query(
    'SELECT id FROM approval_workflows WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id]
  );

  if (existingWorkflow.rows.length === 0) {
    throw new AppError('Approval workflow not found', 404);
  }

  // Validate amount range
  if (maxAmount && minAmount >= maxAmount) {
    throw new AppError('Minimum amount must be less than maximum amount', 400);
  }

  // Validate approvers
  const approverIds = steps.map(step => step.approverId);
  const approversResult = await pool.query(`
    SELECT id, role FROM users 
    WHERE id = ANY($1) AND company_id = $2
  `, [approverIds, req.user.company_id]);

  if (approversResult.rows.length !== approverIds.length) {
    throw new AppError('One or more approvers not found', 404);
  }

  const invalidApprovers = approversResult.rows.filter(approver => 
    !['manager', 'admin'].includes(approver.role)
  );

  if (invalidApprovers.length > 0) {
    throw new AppError('All approvers must be managers or admins', 400);
  }

  // Check for duplicate step orders
  const stepOrders = steps.map(step => step.stepOrder);
  if (new Set(stepOrders).size !== stepOrders.length) {
    throw new AppError('Step orders must be unique', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update workflow
    const workflowResult = await client.query(`
      UPDATE approval_workflows 
      SET name = $1, min_amount = $2, max_amount = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND company_id = $5
      RETURNING id, name, min_amount, max_amount, is_active, updated_at
    `, [name, minAmount, maxAmount, id, req.user.company_id]);

    const workflow = workflowResult.rows[0];

    // Delete existing steps
    await client.query('DELETE FROM approval_workflow_steps WHERE workflow_id = $1', [id]);

    // Create new steps
    for (const step of steps) {
      await client.query(`
        INSERT INTO approval_workflow_steps (workflow_id, step_order, approver_id, is_required)
        VALUES ($1, $2, $3, $4)
      `, [id, step.stepOrder, step.approverId, step.isRequired]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Approval workflow updated successfully',
      data: {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          minAmount: parseFloat(workflow.min_amount),
          maxAmount: workflow.max_amount ? parseFloat(workflow.max_amount) : null,
          isActive: workflow.is_active,
          updatedAt: workflow.updated_at,
          stepCount: steps.length
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Toggle approval workflow status
router.put('/:id/toggle', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(`
    UPDATE approval_workflows 
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND company_id = $2
    RETURNING id, name, is_active, updated_at
  `, [id, req.user.company_id]);

  if (result.rows.length === 0) {
    throw new AppError('Approval workflow not found', 404);
  }

  const workflow = result.rows[0];

  res.json({
    success: true,
    message: `Approval workflow ${workflow.is_active ? 'activated' : 'deactivated'} successfully`,
    data: {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        isActive: workflow.is_active,
        updatedAt: workflow.updated_at
      }
    }
  });
}));

// Delete approval workflow
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM approval_workflows WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, req.user.company_id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Approval workflow not found', 404);
  }

  res.json({
    success: true,
    message: 'Approval workflow deleted successfully'
  });
}));

export default router;
