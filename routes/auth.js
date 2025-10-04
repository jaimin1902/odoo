import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../server.js';
import { userSignupSchema, userLoginSchema, validate } from '../utils/validation.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// User signup (creates company and admin user)
router.post('/signup', validate(userSignupSchema), asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, country } = req.body;
  console.log("🚀 ~ req.body:", req.body)

  // Check if user already exists
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  console.log("🚀 ~ existingUser:", existingUser)
  if (existingUser.rows.length > 0) {
    throw new AppError('User already exists with this email', 409);
  }

  // Start transaction
  const client = await pool.connect();
  console.log("🚀 ~ client:", client)
  try {
    await client.query('BEGIN');

    // Create company
    const companyResult = await client.query(`
      INSERT INTO companies (name, currency, country)
      VALUES ($1, $2, $3)
      RETURNING id, currency
    `, [`${firstName} ${lastName}'s Company`, getDefaultCurrency(country), country]);
    console.log("🚀 ~ companyResult:", companyResult)

    const companyId = companyResult.rows[0].id;
    const companyCurrency = companyResult.rows[0].currency;

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log("🚀 ~ passwordHash:", passwordHash)

    // Create admin user
    const userResult = await client.query(`
      INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, 'admin')
      RETURNING id, email, first_name, last_name, role, company_id
    `, [companyId, email, passwordHash, firstName, lastName]);

    const user = userResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Company and admin user created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          companyId: user.company_id
        },
        company: {
          id: companyId,
          currency: companyCurrency
        },
        token
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// User login
router.post('/login', validate(userLoginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Get user with company details
  const userResult = await pool.query(`
    SELECT 
      u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, 
      u.is_active, u.company_id, c.currency as company_currency, c.name as company_name
    FROM users u
    JOIN companies c ON u.company_id = c.id
    WHERE u.email = $1
  `, [email]);

  if (userResult.rows.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new AppError('Account is deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, companyId: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        companyId: user.company_id
      },
      company: {
        id: user.company_id,
        name: user.company_name,
        currency: user.company_currency
      },
      token
    }
  });
}));

// Get current user profile
router.get('/profile', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  const userResult = await pool.query(`
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
      u.company_id, c.name as company_name, c.currency as company_currency
    FROM users u
    JOIN companies c ON u.company_id = c.id
    WHERE u.id = $1
  `, [decoded.userId]);

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

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
        companyId: user.company_id
      },
      company: {
        id: user.company_id,
        name: user.company_name,
        currency: user.company_currency
      }
    }
  });
}));

// Helper function to get default currency based on country
function getDefaultCurrency(country) {
  const countryCurrencyMap = {
    'US': 'USD',
    'GB': 'GBP',
    'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR',
    'IN': 'INR',
    'JP': 'JPY',
    'CA': 'CAD',
    'AU': 'AUD',
    'CH': 'CHF',
    'CN': 'CNY',
    'SE': 'SEK',
    'NO': 'NOK',
    'DK': 'DKK',
    'PL': 'PLN',
    'CZ': 'CZK',
    'HU': 'HUF',
    'RO': 'RON',
    'BG': 'BGN',
    'HR': 'HRK',
    'RS': 'RSD',
    'MK': 'MKD',
    'AL': 'ALL',
    'BA': 'BAM',
    'MN': 'MNT',
    'UA': 'UAH',
    'RU': 'RUB',
    'KZ': 'KZT',
    'UZ': 'UZS',
    'KG': 'KGS',
    'TJ': 'TJS',
    'TM': 'TMT',
    'AZ': 'AZN',
    'GE': 'GEL',
    'AM': 'AMD',
    'BY': 'BYN',
    'MD': 'MDL'
  };

  return countryCurrencyMap[country.toUpperCase()] || 'USD';
}

export default router;
