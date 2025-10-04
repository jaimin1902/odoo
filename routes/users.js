import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../server.js';
import { createUserSchema, updateUserSchema, validate, paginationSchema, validateQuery } from '../utils/validation.js';
import { requireAdmin, requireManagerOrAdmin } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all users in company (Admin/Manager only)
router.get('/', requireManagerOrAdmin, validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  const result = await pool.query(`
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
      u.is_manager_approver, u.created_at,
      m.first_name as manager_first_name, m.last_name as manager_last_name
    FROM users u
    LEFT JOIN users m ON u.manager_id = m.id
    WHERE u.company_id = $1
    ORDER BY u.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3
  `, [req.user.company_id, limit, offset]);

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM users WHERE company_id = $1',
    [req.user.company_id]
  );

  res.json({
    success: true,
    data: {
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        isManagerApprover: user.is_manager_approver,
        manager: user.manager_first_name ? {
          firstName: user.manager_first_name,
          lastName: user.manager_last_name
        } : null,
        createdAt: user.created_at
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

// Get user by ID
router.get('/:id', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(`
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
      u.is_manager_approver, u.created_at, u.updated_at,
      m.first_name as manager_first_name, m.last_name as manager_last_name
    FROM users u
    LEFT JOIN users m ON u.manager_id = m.id
    WHERE u.id = $1 AND u.company_id = $2
  `, [id, req.user.company_id]);

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        isManagerApprover: user.is_manager_approver,
        manager: user.manager_first_name ? {
          firstName: user.manager_first_name,
          lastName: user.manager_last_name
        } : null,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    }
  });
}));

// Create new user (Admin only)
router.post('/', requireAdmin, validate(createUserSchema), asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role, managerId, isManagerApprover } = req.body;

  // Check if user already exists
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new AppError('User already exists with this email', 409);
  }

  // Validate manager if provided
  if (managerId) {
    const managerResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [managerId, req.user.company_id]
    );
    
    if (managerResult.rows.length === 0) {
      throw new AppError('Manager not found', 404);
    }
    
    if (managerResult.rows[0].role !== 'manager' && managerResult.rows[0].role !== 'admin') {
      throw new AppError('Manager must have manager or admin role', 400);
    }
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await pool.query(`
    INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, manager_id, is_manager_approver)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, email, first_name, last_name, role, is_active, is_manager_approver, created_at
  `, [req.user.company_id, email, passwordHash, firstName, lastName, role, managerId, isManagerApprover]);

  const user = result.rows[0];

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        isManagerApprover: user.is_manager_approver,
        createdAt: user.created_at
      }
    }
  });
}));

// Update user (Admin only)
router.put('/:id', requireAdmin, validate(updateUserSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, role, managerId, isManagerApprover, isActive } = req.body;

  // Check if user exists and belongs to company
  const existingUser = await pool.query(
    'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id]
  );

  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  // Validate manager if provided
  if (managerId) {
    const managerResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [managerId, req.user.company_id]
    );
    
    if (managerResult.rows.length === 0) {
      throw new AppError('Manager not found', 404);
    }
    
    if (managerResult.rows[0].role !== 'manager' && managerResult.rows[0].role !== 'admin') {
      throw new AppError('Manager must have manager or admin role', 400);
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (firstName !== undefined) {
    updateFields.push(`first_name = $${paramCount++}`);
    updateValues.push(firstName);
  }
  if (lastName !== undefined) {
    updateFields.push(`last_name = $${paramCount++}`);
    updateValues.push(lastName);
  }
  if (role !== undefined) {
    updateFields.push(`role = $${paramCount++}`);
    updateValues.push(role);
  }
  if (managerId !== undefined) {
    updateFields.push(`manager_id = $${paramCount++}`);
    updateValues.push(managerId);
  }
  if (isManagerApprover !== undefined) {
    updateFields.push(`is_manager_approver = $${paramCount++}`);
    updateValues.push(isManagerApprover);
  }
  if (isActive !== undefined) {
    updateFields.push(`is_active = $${paramCount++}`);
    updateValues.push(isActive);
  }

  if (updateFields.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(id);

  const result = await pool.query(`
    UPDATE users 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, email, first_name, last_name, role, is_active, is_manager_approver, updated_at
  `, [...updateValues]);

  const user = result.rows[0];

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        isManagerApprover: user.is_manager_approver,
        updatedAt: user.updated_at
      }
    }
  });
}));

// Delete user (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists and belongs to company
  const existingUser = await pool.query(
    'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id]
  );

  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  // Prevent deleting admin users
  if (existingUser.rows[0].role === 'admin') {
    throw new AppError('Cannot delete admin users', 400);
  }

  // Check if user has any pending expenses
  const pendingExpenses = await pool.query(
    'SELECT COUNT(*) FROM expenses WHERE employee_id = $1 AND status = $2',
    [id, 'pending']
  );

  if (parseInt(pendingExpenses.rows[0].count) > 0) {
    throw new AppError('Cannot delete user with pending expenses', 400);
  }

  // Soft delete by deactivating user
  await pool.query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
}));

// Get team members (Manager only)
router.get('/team/members', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  let query, params;

  if (req.user.role === 'admin') {
    // Admin can see all users in company
    query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active
      FROM users u
      WHERE u.company_id = $1 AND u.role IN ('employee', 'manager')
      ORDER BY u.first_name, u.last_name
    `;
    params = [req.user.company_id];
  } else {
    // Manager can see their direct reports
    query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active
      FROM users u
      WHERE u.manager_id = $1 AND u.is_active = true
      ORDER BY u.first_name, u.last_name
    `;
    params = [req.user.id];
  }

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      teamMembers: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active
      }))
    }
  });
}));

// Get managers list (for assigning managers to employees)
router.get('/managers/list', requireAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.first_name, u.last_name, u.role, u.is_manager_approver
    FROM users u
    WHERE u.company_id = $1 AND u.role IN ('manager', 'admin') AND u.is_active = true
    ORDER BY u.first_name, u.last_name
  `, [req.user.company_id]);

  res.json({
    success: true,
    data: {
      managers: result.rows.map(manager => ({
        id: manager.id,
        firstName: manager.first_name,
        lastName: manager.last_name,
        role: manager.role,
        isManagerApprover: manager.is_manager_approver
      }))
    }
  });
}));

export default router;
