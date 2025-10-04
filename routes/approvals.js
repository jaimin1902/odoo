import express from 'express';
import { pool } from '../server.js';
import { approvalDecisionSchema, validate, paginationSchema, validateQuery } from '../utils/validation.js';
import { requireManagerOrAdmin } from '../middleware/auth.js';
import { processApprovalDecision, getExpenseApprovalStatus } from '../utils/approval.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get expenses pending approval (Manager/Admin only)
router.get('/pending', requireManagerOrAdmin, validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit, sortBy = 'submitted_at', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  let whereConditions = ['e.status = $1', 'e.company_id = $2'];
  let queryParams = ['pending', req.user.company_id];

  if (req.user.role === 'manager') {
    // Manager can see expenses from their team or where they are an approver
    whereConditions.push(`(e.employee_id IN (SELECT id FROM users WHERE manager_id = $3) OR e.id IN (SELECT expense_id FROM expense_approvals WHERE approver_id = $3 AND status = 'pending'))`);
    queryParams.push(req.user.id);
  }
  // Admin can see all pending expenses

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await pool.query(`
    SELECT 
      e.id, e.amount, e.currency, e.amount_in_company_currency, e.exchange_rate,
      e.description, e.expense_date, e.submitted_at, e.receipt_url, e.notes,
      ec.name as category_name,
      u.first_name as employee_first_name, u.last_name as employee_last_name,
      u.email as employee_email,
      ea.id as approval_id, ea.status as approval_status, ea.comments as approval_comments,
      ea.created_at as approval_created_at
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    JOIN users u ON e.employee_id = u.id
    LEFT JOIN expense_approvals ea ON e.id = ea.expense_id AND ea.approver_id = $${req.user.role === 'manager' ? '3' : '1'}
    ${whereClause}
    ORDER BY e.${sortBy} ${sortOrder}
    LIMIT $${req.user.role === 'manager' ? '4' : '2'} OFFSET $${req.user.role === 'manager' ? '5' : '3'}
  `, [...queryParams, limit, offset]);

  const countResult = await pool.query(`
    SELECT COUNT(DISTINCT e.id)
    FROM expenses e
    ${whereClause}
  `, queryParams);

  res.json({
    success: true,
    data: {
      expenses: result.rows.map(expense => ({
        id: expense.id,
        amount: parseFloat(expense.amount),
        currency: expense.currency,
        amountInCompanyCurrency: parseFloat(expense.amount_in_company_currency),
        exchangeRate: parseFloat(expense.exchange_rate),
        description: expense.description,
        expenseDate: expense.expense_date,
        submittedAt: expense.submitted_at,
        receiptUrl: expense.receipt_url,
        notes: expense.notes,
        category: {
          name: expense.category_name
        },
        employee: {
          firstName: expense.employee_first_name,
          lastName: expense.employee_last_name,
          email: expense.employee_email
        },
        approval: expense.approval_id ? {
          id: expense.approval_id,
          status: expense.approval_status,
          comments: expense.approval_comments,
          createdAt: expense.approval_created_at
        } : null
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

// Get approval history for an expense
router.get('/expense/:expenseId/history', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { expenseId } = req.params;

  // Check if user has access to this expense
  const expenseResult = await pool.query(`
    SELECT e.id, e.employee_id, e.status
    FROM expenses e
    WHERE e.id = $1 AND e.company_id = $2
  `, [expenseId, req.user.company_id]);

  if (expenseResult.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const expense = expenseResult.rows[0];

  // Check access permissions
  if (req.user.role === 'manager') {
    const hasAccess = expense.employee_id === req.user.id || 
                     await pool.query('SELECT id FROM users WHERE id = $1 AND manager_id = $2', [expense.employee_id, req.user.id]);
    
    if (!hasAccess.rows.length) {
      throw new AppError('Access denied', 403);
    }
  }

  // Get approval history
  const approvalHistory = await getExpenseApprovalStatus(expenseId);

  res.json({
    success: true,
    data: {
      expenseId,
      status: expense.status,
      approvalHistory: approvalHistory.map(approval => ({
        status: approval.status,
        comments: approval.comments,
        approvedAt: approval.approved_at,
        approver: {
          firstName: approval.first_name,
          lastName: approval.last_name,
          role: approval.role
        }
      }))
    }
  });
}));

// Approve or reject expense
router.post('/:expenseId/decision', requireManagerOrAdmin, validate(approvalDecisionSchema), asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  const { status, comments } = req.body;
  
  console.log('Approval decision request:', { expenseId, status, comments, userId: req.user.id });

  // Check if expense exists and user has permission to approve
  const expenseResult = await pool.query(`
    SELECT e.id, e.status, e.employee_id
    FROM expenses e
    WHERE e.id = $1 AND e.company_id = $2
  `, [expenseId, req.user.company_id]);

  if (expenseResult.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const expense = expenseResult.rows[0];

  if (expense.status !== 'pending') {
    throw new AppError('Expense is not pending approval', 400);
  }

  // Check if user is an approver for this expense
  const approvalResult = await pool.query(`
    SELECT id, status FROM expense_approvals 
    WHERE expense_id = $1 AND approver_id = $2
  `, [expenseId, req.user.id]);

  if (approvalResult.rows.length === 0) {
    throw new AppError('You are not authorized to approve this expense', 403);
  }

  if (approvalResult.rows[0].status !== 'pending') {
    throw new AppError('You have already made a decision on this expense', 400);
  }

  // Process the approval decision
  const result = await processApprovalDecision(expenseId, req.user.id, status, comments);

  res.json({
    success: true,
    message: result.message,
    data: {
      expenseId,
      decision: status,
      comments,
      result: result.status
    }
  });
}));

// Get notifications for current user
router.get('/notifications', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const result = await pool.query(`
    SELECT 
      an.id, an.notification_type, an.is_read, an.created_at,
      e.id as expense_id, e.amount, e.currency, e.amount_in_company_currency,
      e.description, e.expense_date,
      u.first_name as employee_first_name, u.last_name as employee_last_name
    FROM approval_notifications an
    JOIN expenses e ON an.expense_id = e.id
    JOIN users u ON e.employee_id = u.id
    WHERE an.approver_id = $1
    ORDER BY an.created_at DESC
    LIMIT $2 OFFSET $3
  `, [req.user.id, limit, offset]);

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM approval_notifications WHERE approver_id = $1',
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      notifications: result.rows.map(notification => ({
        id: notification.id,
        type: notification.notification_type,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        expense: {
          id: notification.expense_id,
          amount: parseFloat(notification.amount),
          currency: notification.currency,
          amountInCompanyCurrency: parseFloat(notification.amount_in_company_currency),
          description: notification.description,
          expenseDate: notification.expense_date,
          employee: {
            firstName: notification.employee_first_name,
            lastName: notification.employee_last_name
          }
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    }
  });
}));

// Mark notification as read
router.put('/notifications/:notificationId/read', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const result = await pool.query(`
    UPDATE approval_notifications 
    SET is_read = true 
    WHERE id = $1 AND approver_id = $2
    RETURNING id
  `, [notificationId, req.user.id]);

  if (result.rows.length === 0) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

// Get approval statistics
router.get('/stats/summary', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let whereConditions = ['e.company_id = $1'];
  let queryParams = [req.user.company_id];
  let paramCount = 1;

  if (startDate) {
    whereConditions.push(`e.expense_date >= $${++paramCount}`);
    queryParams.push(startDate);
  }
  if (endDate) {
    whereConditions.push(`e.expense_date <= $${++paramCount}`);
    queryParams.push(endDate);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT e.id) as total_expenses,
      COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) as pending_expenses,
      COUNT(DISTINCT CASE WHEN e.status = 'approved' THEN e.id END) as approved_expenses,
      COUNT(DISTINCT CASE WHEN e.status = 'rejected' THEN e.id END) as rejected_expenses,
      COUNT(DISTINCT ea.id) as total_approvals,
      COUNT(DISTINCT CASE WHEN ea.status = 'approved' THEN ea.id END) as approved_approvals,
      COUNT(DISTINCT CASE WHEN ea.status = 'rejected' THEN ea.id END) as rejected_approvals,
      COUNT(DISTINCT CASE WHEN ea.status = 'pending' THEN ea.id END) as pending_approvals
    FROM expenses e
    LEFT JOIN expense_approvals ea ON e.id = ea.expense_id
    ${whereClause}
  `, queryParams);

  const stats = result.rows[0];

  res.json({
    success: true,
    data: {
      summary: {
        totalExpenses: parseInt(stats.total_expenses),
        pendingExpenses: parseInt(stats.pending_expenses),
        approvedExpenses: parseInt(stats.approved_expenses),
        rejectedExpenses: parseInt(stats.rejected_expenses),
        totalApprovals: parseInt(stats.total_approvals),
        approvedApprovals: parseInt(stats.approved_approvals),
        rejectedApprovals: parseInt(stats.rejected_approvals),
        pendingApprovals: parseInt(stats.pending_approvals)
      }
    }
  });
}));

// Override approval (Admin only)
router.post('/:expenseId/override', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  const { action, reason } = req.body;

  if (req.user.role !== 'admin') {
    throw new AppError('Only admins can override approvals', 403);
  }

  if (!['approve', 'reject'].includes(action)) {
    throw new AppError('Invalid action. Must be "approve" or "reject"', 400);
  }

  // Check if expense exists
  const expenseResult = await pool.query(`
    SELECT id, status FROM expenses 
    WHERE id = $1 AND company_id = $2
  `, [expenseId, req.user.company_id]);

  if (expenseResult.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const expense = expenseResult.rows[0];

  if (expense.status === 'approved' || expense.status === 'rejected') {
    throw new AppError('Expense is already finalized', 400);
  }

  // Update expense status
  await pool.query(`
    UPDATE expenses 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [action === 'approve' ? 'approved' : 'rejected', expenseId]);

  // Create admin override record
  await pool.query(`
    INSERT INTO expense_approvals (expense_id, approver_id, status, comments)
    VALUES ($1, $2, $3, $4)
  `, [expenseId, req.user.id, action === 'approve' ? 'approved' : 'rejected', `Admin override: ${reason || 'No reason provided'}`]);

  res.json({
    success: true,
    message: `Expense ${action}d by admin override`,
    data: {
      expenseId,
      action,
      reason
    }
  });
}));

export default router;
