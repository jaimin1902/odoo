import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'expense_reimbursement',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const seedData = async () => {
  try {
    console.log('Starting data seeding...');

    // Get the first company
    const companyResult = await pool.query('SELECT * FROM companies LIMIT 1');
    if (companyResult.rows.length === 0) {
      console.log('No company found. Please run migration first.');
      return;
    }
    
    const company = companyResult.rows[0];
    console.log('Using company:', company.name);

    // Get expense categories
    const categoriesResult = await pool.query('SELECT * FROM expense_categories');
    const categories = categoriesResult.rows;
    
    if (categories.length === 0) {
      console.log('No expense categories found. Please run migration first.');
      return;
    }

    // Create sample users if they don't exist
    const adminEmail = 'admin@company.com';
    const managerEmail = 'manager@company.com';
    const employeeEmail = 'employee@company.com';

    // Check if users exist
    const existingUsers = await pool.query(
      'SELECT email FROM users WHERE email IN ($1, $2, $3)',
      [adminEmail, managerEmail, employeeEmail]
    );
    
    const existingEmails = existingUsers.rows.map(row => row.email);
    
    let adminId, managerId, employeeId;

    // Create admin user
    if (!existingEmails.includes(adminEmail)) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const adminResult = await pool.query(
        'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [uuidv4(), company.id, adminEmail, hashedPassword, 'Admin', 'User', 'admin', true]
      );
      adminId = adminResult.rows[0].id;
      console.log('Created admin user');
    } else {
      const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
      adminId = adminResult.rows[0].id;
    }

    // Create manager user
    if (!existingEmails.includes(managerEmail)) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const managerResult = await pool.query(
        'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_manager_approver, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [uuidv4(), company.id, managerEmail, hashedPassword, 'Manager', 'User', 'manager', true, true]
      );
      managerId = managerResult.rows[0].id;
      console.log('Created manager user');
    } else {
      const managerResult = await pool.query('SELECT id FROM users WHERE email = $1', [managerEmail]);
      managerId = managerResult.rows[0].id;
    }

    // Create employee user
    if (!existingEmails.includes(employeeEmail)) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const employeeResult = await pool.query(
        'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, manager_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [uuidv4(), company.id, employeeEmail, hashedPassword, 'Employee', 'User', 'employee', managerId, true]
      );
      employeeId = employeeResult.rows[0].id;
      console.log('Created employee user');
    } else {
      const employeeResult = await pool.query('SELECT id FROM users WHERE email = $1', [employeeEmail]);
      employeeId = employeeResult.rows[0].id;
    }

    // Check if expenses already exist
    const existingExpenses = await pool.query('SELECT COUNT(*) FROM expenses');
    if (existingExpenses.rows[0].count > 0) {
      console.log('Expenses already exist, skipping...');
      return;
    }

    // Create sample expenses
    const sampleExpenses = [
      {
        employee_id: employeeId,
        amount: 150.00,
        currency: 'USD',
        amount_in_company_currency: 150.00,
        exchange_rate: 1.0,
        category_id: categories.find(c => c.name === 'Travel')?.id,
        description: 'Business trip to New York',
        expense_date: '2024-01-15',
        status: 'pending',
        receipt_url: 'https://example.com/receipt1.pdf',
        notes: 'Flight and hotel expenses'
      },
      {
        employee_id: employeeId,
        amount: 75.50,
        currency: 'USD',
        amount_in_company_currency: 75.50,
        exchange_rate: 1.0,
        category_id: categories.find(c => c.name === 'Meals')?.id,
        description: 'Client dinner meeting',
        expense_date: '2024-01-16',
        status: 'approved',
        receipt_url: 'https://example.com/receipt2.pdf',
        notes: 'Dinner with potential client'
      },
      {
        employee_id: employeeId,
        amount: 25.00,
        currency: 'USD',
        amount_in_company_currency: 25.00,
        exchange_rate: 1.0,
        category_id: categories.find(c => c.name === 'Office Supplies')?.id,
        description: 'Office supplies purchase',
        expense_date: '2024-01-17',
        status: 'rejected',
        receipt_url: 'https://example.com/receipt3.pdf',
        notes: 'Pens and notebooks'
      },
      {
        employee_id: employeeId,
        amount: 200.00,
        currency: 'EUR',
        amount_in_company_currency: 220.00,
        exchange_rate: 1.1,
        category_id: categories.find(c => c.name === 'Accommodation')?.id,
        description: 'Hotel stay in Paris',
        expense_date: '2024-01-18',
        status: 'pending',
        receipt_url: 'https://example.com/receipt4.pdf',
        notes: 'Conference accommodation'
      },
      {
        employee_id: employeeId,
        amount: 50.00,
        currency: 'USD',
        amount_in_company_currency: 50.00,
        exchange_rate: 1.0,
        category_id: categories.find(c => c.name === 'Transportation')?.id,
        description: 'Taxi to airport',
        expense_date: '2024-01-19',
        status: 'approved',
        receipt_url: 'https://example.com/receipt5.pdf',
        notes: 'Airport transfer'
      }
    ];

    // Insert sample expenses
    for (const expense of sampleExpenses) {
      await pool.query(
        `INSERT INTO expenses (
          id, employee_id, company_id, amount, currency, amount_in_company_currency,
          exchange_rate, category_id, description, expense_date, status,
          receipt_url, notes, submitted_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          uuidv4(),
          expense.employee_id,
          company.id,
          expense.amount,
          expense.currency,
          expense.amount_in_company_currency,
          expense.exchange_rate,
          expense.category_id,
          expense.description,
          expense.expense_date,
          expense.status,
          expense.receipt_url,
          expense.notes,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
    }

    console.log('Sample expenses created successfully');
    console.log('Sample data seeding completed!');
    console.log('\nDemo credentials:');
    console.log('Admin: admin@company.com / password123');
    console.log('Manager: manager@company.com / password123');
    console.log('Employee: employee@company.com / password123');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await pool.end();
  }
};

seedData();
