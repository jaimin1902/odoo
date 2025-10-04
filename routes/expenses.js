import express from 'express';
import { pool } from '../server.js';
import { createExpenseSchema, updateExpenseSchema, validate, paginationSchema, validateQuery, expenseFilterSchema, expensesQuerySchema } from '../utils/validation.js';
import { requireEmployeeOrAbove, requireManagerOrAdmin } from '../middleware/auth.js';
import { convertCurrency } from '../utils/currency.js';
import { createApprovalWorkflow } from '../utils/approval.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all expenses (with filters)
router.get('/', requireEmployeeOrAbove, validateQuery(expensesQuerySchema), asyncHandler(async (req, res) => {
  console.log('GET /api/expenses - Query params:', req.query);
  console.log('GET /api/expenses - User:', req.user);
  
  const { page, limit, sortBy = 'submitted_at', sortOrder = 'desc' } = req.query;
  const { status, categoryId, startDate, endDate, minAmount, maxAmount } = req.query;
  const offset = (page - 1) * limit;

  let whereConditions = ['e.company_id = $1'];
  let queryParams = [req.user.company_id];
  let paramCount = 1;

  // Role-based filtering
  if (req.user.role === 'employee') {
    whereConditions.push(`e.employee_id = $${++paramCount}`);
    queryParams.push(req.user.id);
  } else if (req.user.role === 'manager') {
    // Manager can see their team's expenses
    whereConditions.push(`(e.employee_id = $${++paramCount} OR e.employee_id IN (SELECT id FROM users WHERE manager_id = $${++paramCount}))`);
    queryParams.push(req.user.id);
    queryParams.push(req.user.id);
  }
  // Admin can see all expenses (no additional filtering)

  // Apply filters
  if (status) {
    whereConditions.push(`e.status = $${++paramCount}`);
    queryParams.push(status);
  }
  if (categoryId) {
    whereConditions.push(`e.category_id = $${++paramCount}`);
    queryParams.push(categoryId);
  }
  if (startDate) {
    whereConditions.push(`e.expense_date >= $${++paramCount}`);
    queryParams.push(startDate);
  }
  if (endDate) {
    whereConditions.push(`e.expense_date <= $${++paramCount}`);
    queryParams.push(endDate);
  }
  if (minAmount) {
    whereConditions.push(`e.amount_in_company_currency >= $${++paramCount}`);
    queryParams.push(minAmount);
  }
  if (maxAmount) {
    whereConditions.push(`e.amount_in_company_currency <= $${++paramCount}`);
    queryParams.push(maxAmount);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await pool.query(`
    SELECT 
      e.id, e.amount, e.currency, e.amount_in_company_currency, e.exchange_rate,
      e.description, e.expense_date, e.status, e.submitted_at, e.receipt_url, e.notes,
      ec.name as category_name,
      u.first_name as employee_first_name, u.last_name as employee_last_name,
      u.email as employee_email
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    JOIN users u ON e.employee_id = u.id
    ${whereClause}
    ORDER BY e.${sortBy} ${sortOrder}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, [...queryParams, limit, offset]);

  const countResult = await pool.query(`
    SELECT COUNT(*)
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
        status: expense.status,
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
        }
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

// Get expense by ID
router.get('/:id', requireEmployeeOrAbove, asyncHandler(async (req, res) => {
  const { id } = req.params;

  let whereConditions = ['e.id = $1', 'e.company_id = $2'];
  let queryParams = [id, req.user.company_id];

  // Role-based access control
  if (req.user.role === 'employee') {
    whereConditions.push('e.employee_id = $3');
    queryParams.push(req.user.id);
  } else if (req.user.role === 'manager') {
    whereConditions.push('(e.employee_id = $3 OR e.employee_id IN (SELECT id FROM users WHERE manager_id = $3))');
    queryParams.push(req.user.id);
  }

  const result = await pool.query(`
    SELECT 
      e.id, e.amount, e.currency, e.amount_in_company_currency, e.exchange_rate,
      e.description, e.expense_date, e.status, e.submitted_at, e.updated_at,
      e.receipt_url, e.notes,
      ec.id as category_id, ec.name as category_name,
      u.first_name as employee_first_name, u.last_name as employee_last_name,
      u.email as employee_email, u.id as employee_id
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    JOIN users u ON e.employee_id = u.id
    WHERE ${whereConditions.join(' AND ')}
  `, queryParams);

  if (result.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const expense = result.rows[0];

  res.json({
    success: true,
    data: {
      expense: {
        id: expense.id,
        amount: parseFloat(expense.amount),
        currency: expense.currency,
        amountInCompanyCurrency: parseFloat(expense.amount_in_company_currency),
        exchangeRate: parseFloat(expense.exchange_rate),
        description: expense.description,
        expenseDate: expense.expense_date,
        status: expense.status,
        submittedAt: expense.submitted_at,
        updatedAt: expense.updated_at,
        receiptUrl: expense.receipt_url,
        notes: expense.notes,
        category: {
          id: expense.category_id,
          name: expense.category_name
        },
        employee: {
          id: expense.employee_id,
          firstName: expense.employee_first_name,
          lastName: expense.employee_last_name,
          email: expense.employee_email
        }
      }
    }
  });
}));

// Create new expense (Employee only)
router.post('/', requireEmployeeOrAbove, validate(createExpenseSchema), asyncHandler(async (req, res) => {
  console.log('Create expense request:', req.body);
  console.log('User:', req.user);
  
  const { amount, currency, categoryId, description, expenseDate, receiptUrl, notes } = req.body;

  // Validate category exists
  const categoryResult = await pool.query(
    'SELECT id FROM expense_categories WHERE id = $1',
    [categoryId]
  );

  if (categoryResult.rows.length === 0) {
    throw new AppError('Invalid expense category', 400);
  }

  // Convert currency to company currency
  const companyCurrency = req.user.company_currency;
  const conversion = await convertCurrency(amount, currency, companyCurrency);

  // Create expense
  const result = await pool.query(`
    INSERT INTO expenses (
      employee_id, company_id, amount, currency, amount_in_company_currency,
      exchange_rate, category_id, description, expense_date, receipt_url, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, amount, currency, amount_in_company_currency, exchange_rate,
              description, expense_date, status, submitted_at, receipt_url, notes
  `, [
    req.user.id, req.user.company_id, amount, currency, conversion.amount,
    conversion.exchangeRate, categoryId, description, expenseDate, receiptUrl, notes
  ]);

  const expense = result.rows[0];

  // Create approval workflow
  try {
    await createApprovalWorkflow(expense.id, req.user.company_id, conversion.amount);
  } catch (error) {
    console.error('Error creating approval workflow:', error);
    // Don't fail the expense creation if approval workflow fails
  }

  res.status(201).json({
    success: true,
    message: 'Expense submitted successfully',
    data: {
      expense: {
        id: expense.id,
        amount: parseFloat(expense.amount),
        currency: expense.currency,
        amountInCompanyCurrency: parseFloat(expense.amount_in_company_currency),
        exchangeRate: parseFloat(expense.exchange_rate),
        description: expense.description,
        expenseDate: expense.expense_date,
        status: expense.status,
        submittedAt: expense.submitted_at,
        receiptUrl: expense.receipt_url,
        notes: expense.notes
      }
    }
  });
}));

// Update expense (Employee only, if not approved)
router.put('/:id', requireEmployeeOrAbove, validate(updateExpenseSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, currency, categoryId, description, expenseDate, receiptUrl, notes } = req.body;

  // Check if expense exists and belongs to user
  const existingExpense = await pool.query(`
    SELECT id, status, employee_id FROM expenses 
    WHERE id = $1 AND employee_id = $2
  `, [id, req.user.id]);

  if (existingExpense.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  if (existingExpense.rows[0].status !== 'pending') {
    throw new AppError('Cannot update approved or rejected expenses', 400);
  }

  // Validate category if provided
  if (categoryId) {
    const categoryResult = await pool.query(
      'SELECT id FROM expense_categories WHERE id = $1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      throw new AppError('Invalid expense category', 400);
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (amount !== undefined) {
    updateFields.push(`amount = $${paramCount++}`);
    updateValues.push(amount);
  }
  if (currency !== undefined) {
    updateFields.push(`currency = $${paramCount++}`);
    updateValues.push(currency);
  }
  if (categoryId !== undefined) {
    updateFields.push(`category_id = $${paramCount++}`);
    updateValues.push(categoryId);
  }
  if (description !== undefined) {
    updateFields.push(`description = $${paramCount++}`);
    updateValues.push(description);
  }
  if (expenseDate !== undefined) {
    updateFields.push(`expense_date = $${paramCount++}`);
    updateValues.push(expenseDate);
  }
  if (receiptUrl !== undefined) {
    updateFields.push(`receipt_url = $${paramCount++}`);
    updateValues.push(receiptUrl);
  }
  if (notes !== undefined) {
    updateFields.push(`notes = $${paramCount++}`);
    updateValues.push(notes);
  }

  if (updateFields.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  // If amount or currency changed, recalculate company currency amount
  if (amount !== undefined || currency !== undefined) {
    const finalAmount = amount !== undefined ? amount : existingExpense.rows[0].amount;
    const finalCurrency = currency !== undefined ? currency : existingExpense.rows[0].currency;
    
    const conversion = await convertCurrency(finalAmount, finalCurrency, req.user.company_currency);
    updateFields.push(`amount_in_company_currency = $${paramCount++}`);
    updateValues.push(conversion.amount);
    updateFields.push(`exchange_rate = $${paramCount++}`);
    updateValues.push(conversion.exchangeRate);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(id);

  const result = await pool.query(`
    UPDATE expenses 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, amount, currency, amount_in_company_currency, exchange_rate,
              description, expense_date, status, updated_at, receipt_url, notes
  `, [...updateValues]);

  const expense = result.rows[0];

  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: {
      expense: {
        id: expense.id,
        amount: parseFloat(expense.amount),
        currency: expense.currency,
        amountInCompanyCurrency: parseFloat(expense.amount_in_company_currency),
        exchangeRate: parseFloat(expense.exchange_rate),
        description: expense.description,
        expenseDate: expense.expense_date,
        status: expense.status,
        updatedAt: expense.updated_at,
        receiptUrl: expense.receipt_url,
        notes: expense.notes
      }
    }
  });
}));

// Delete expense (Employee only, if not approved)
router.delete('/:id', requireEmployeeOrAbove, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if expense exists and belongs to user
  const existingExpense = await pool.query(`
    SELECT id, status FROM expenses 
    WHERE id = $1 AND employee_id = $2
  `, [id, req.user.id]);

  if (existingExpense.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  if (existingExpense.rows[0].status !== 'pending') {
    throw new AppError('Cannot delete approved or rejected expenses', 400);
  }

  // Delete related records first
  await pool.query('DELETE FROM expense_approvals WHERE expense_id = $1', [id]);
  await pool.query('DELETE FROM approval_notifications WHERE expense_id = $1', [id]);
  
  // Delete expense
  await pool.query('DELETE FROM expenses WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
}));

// Get expense categories
router.get('/categories/list', requireEmployeeOrAbove, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT id, name FROM expense_categories 
    ORDER BY name
  `);

  res.json({
    success: true,
    data: {
      categories: result.rows.map(category => ({
        id: category.id,
        name: category.name
      }))
    }
  });
}));

// Get expense statistics
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
      COUNT(*) as total_expenses,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_expenses,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_expenses,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_in_company_currency END), 0) as total_approved_amount,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_in_company_currency END), 0) as total_pending_amount
    FROM expenses e
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
        totalApprovedAmount: parseFloat(stats.total_approved_amount),
        totalPendingAmount: parseFloat(stats.total_pending_amount)
      }
    }
  });
}));

export default router;
