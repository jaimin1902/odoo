import express from 'express';
import { pool } from '../server.js';
import { updateCompanySchema, validate } from '../utils/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get company information
router.get('/info', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT id, name, currency, country, created_at, updated_at
    FROM companies 
    WHERE id = $1
  `, [req.user.company_id]);

  if (result.rows.length === 0) {
    throw new AppError('Company not found', 404);
  }

  const company = result.rows[0];

  res.json({
    success: true,
    data: {
      company: {
        id: company.id,
        name: company.name,
        currency: company.currency,
        country: company.country,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      }
    }
  });
}));

// Update company information (Admin only)
router.put('/info', requireAdmin, validate(updateCompanySchema), asyncHandler(async (req, res) => {
  const { name, currency, country } = req.body;

  // Build dynamic update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramCount++}`);
    updateValues.push(name);
  }
  if (currency !== undefined) {
    updateFields.push(`currency = $${paramCount++}`);
    updateValues.push(currency);
  }
  if (country !== undefined) {
    updateFields.push(`country = $${paramCount++}`);
    updateValues.push(country);
  }

  if (updateFields.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(req.user.company_id);

  const result = await pool.query(`
    UPDATE companies 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, name, currency, country, created_at, updated_at
  `, [...updateValues]);

  const company = result.rows[0];

  res.json({
    success: true,
    message: 'Company information updated successfully',
    data: {
      company: {
        id: company.id,
        name: company.name,
        currency: company.currency,
        country: company.country,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      }
    }
  });
}));

// Get company statistics
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
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

  // Get expense statistics
  const expenseStats = await pool.query(`
    SELECT 
      COUNT(*) as total_expenses,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_expenses,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_expenses,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_in_company_currency END), 0) as total_approved_amount,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_in_company_currency END), 0) as total_pending_amount,
      COALESCE(AVG(CASE WHEN status = 'approved' THEN amount_in_company_currency END), 0) as avg_approved_amount
    FROM expenses e
    ${whereClause}
  `, queryParams);

  // Get user statistics
  const userStats = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
      COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_users,
      COUNT(CASE WHEN role = 'employee' THEN 1 END) as employee_users,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
    FROM users
    WHERE company_id = $1
  `, [req.user.company_id]);

  // Get approval statistics
  const approvalStats = await pool.query(`
    SELECT 
      COUNT(*) as total_approvals,
      COUNT(CASE WHEN ea.status = 'approved' THEN 1 END) as approved_approvals,
      COUNT(CASE WHEN ea.status = 'rejected' THEN 1 END) as rejected_approvals,
      COUNT(CASE WHEN ea.status = 'pending' THEN 1 END) as pending_approvals
    FROM expense_approvals ea
    JOIN expenses e ON ea.expense_id = e.id
    ${whereClause}
  `, queryParams);

  const expenseData = expenseStats.rows[0];
  const userData = userStats.rows[0];
  const approvalData = approvalStats.rows[0];

  res.json({
    success: true,
    data: {
      expenses: {
        total: parseInt(expenseData.total_expenses),
        pending: parseInt(expenseData.pending_expenses),
        approved: parseInt(expenseData.approved_expenses),
        rejected: parseInt(expenseData.rejected_expenses),
        totalApprovedAmount: parseFloat(expenseData.total_approved_amount),
        totalPendingAmount: parseFloat(expenseData.total_pending_amount),
        averageApprovedAmount: parseFloat(expenseData.avg_approved_amount)
      },
      users: {
        total: parseInt(userData.total_users),
        admins: parseInt(userData.admin_users),
        managers: parseInt(userData.manager_users),
        employees: parseInt(userData.employee_users),
        active: parseInt(userData.active_users)
      },
      approvals: {
        total: parseInt(approvalData.total_approvals),
        approved: parseInt(approvalData.approved_approvals),
        rejected: parseInt(approvalData.rejected_approvals),
        pending: parseInt(approvalData.pending_approvals)
      }
    }
  });
}));

// Get company dashboard data
router.get('/dashboard', requireAdmin, asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Get recent expenses
  const recentExpenses = await pool.query(`
    SELECT 
      e.id, e.amount, e.currency, e.amount_in_company_currency, e.description,
      e.expense_date, e.status, e.submitted_at,
      u.first_name, u.last_name, u.role,
      ec.name as category_name
    FROM expenses e
    JOIN users u ON e.employee_id = u.id
    JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.company_id = $1 AND e.submitted_at >= $2
    ORDER BY e.submitted_at DESC
    LIMIT 10
  `, [req.user.company_id, startDate]);

  // Get pending approvals
  const pendingApprovals = await pool.query(`
    SELECT 
      e.id, e.amount, e.currency, e.amount_in_company_currency, e.description,
      e.expense_date, e.submitted_at,
      u.first_name, u.last_name,
      ec.name as category_name
    FROM expenses e
    JOIN users u ON e.employee_id = u.id
    JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.company_id = $1 AND e.status = 'pending'
    ORDER BY e.submitted_at ASC
    LIMIT 5
  `, [req.user.company_id]);

  // Get monthly expense trends
  const monthlyTrends = await pool.query(`
    SELECT 
      DATE_TRUNC('month', expense_date) as month,
      COUNT(*) as expense_count,
      SUM(amount_in_company_currency) as total_amount
    FROM expenses
    WHERE company_id = $1 AND expense_date >= $2
    GROUP BY DATE_TRUNC('month', expense_date)
    ORDER BY month DESC
    LIMIT 6
  `, [req.user.company_id, startDate]);

  // Get category breakdown
  const categoryBreakdown = await pool.query(`
    SELECT 
      ec.name as category_name,
      COUNT(*) as expense_count,
      SUM(e.amount_in_company_currency) as total_amount
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.company_id = $1 AND e.expense_date >= $2 AND e.status = 'approved'
    GROUP BY ec.name
    ORDER BY total_amount DESC
    LIMIT 10
  `, [req.user.company_id, startDate]);

  res.json({
    success: true,
    data: {
      recentExpenses: recentExpenses.rows.map(expense => ({
        id: expense.id,
        amount: parseFloat(expense.amount),
        currency: expense.currency,
        amountInCompanyCurrency: parseFloat(expense.amount_in_company_currency),
        description: expense.description,
        expenseDate: expense.expense_date,
        status: expense.status,
        submittedAt: expense.submitted_at,
        employee: {
          firstName: expense.first_name,
          lastName: expense.last_name,
          role: expense.role
        },
        category: {
          name: expense.category_name
        }
      })),
      pendingApprovals: pendingApprovals.rows.map(expense => ({
        id: expense.id,
        amount: parseFloat(expense.amount),
        currency: expense.currency,
        amountInCompanyCurrency: parseFloat(expense.amount_in_company_currency),
        description: expense.description,
        expenseDate: expense.expense_date,
        submittedAt: expense.submitted_at,
        employee: {
          firstName: expense.first_name,
          lastName: expense.last_name
        },
        category: {
          name: expense.category_name
        }
      })),
      monthlyTrends: monthlyTrends.rows.map(trend => ({
        month: trend.month,
        expenseCount: parseInt(trend.expense_count),
        totalAmount: parseFloat(trend.total_amount)
      })),
      categoryBreakdown: categoryBreakdown.rows.map(category => ({
        categoryName: category.category_name,
        expenseCount: parseInt(category.expense_count),
        totalAmount: parseFloat(category.total_amount)
      }))
    }
  });
}));

export default router;
