import { Pool } from 'pg';
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

const testDatabase = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test companies
    const companiesResult = await pool.query('SELECT * FROM companies');
    console.log('Companies:', companiesResult.rows.length);
    
    // Test users
    const usersResult = await pool.query('SELECT * FROM users');
    console.log('Users:', usersResult.rows.length);
    usersResult.rows.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    // Test expense categories
    const categoriesResult = await pool.query('SELECT * FROM expense_categories');
    console.log('Categories:', categoriesResult.rows.length);
    
    // Test expenses
    const expensesResult = await pool.query('SELECT * FROM expenses');
    console.log('Expenses:', expensesResult.rows.length);
    expensesResult.rows.forEach(expense => {
      console.log(`- ${expense.description} (${expense.status}) - $${expense.amount_in_company_currency}`);
    });
    
    // Test expenses with joins
    const expensesWithDetails = await pool.query(`
      SELECT 
        e.id, e.description, e.status, e.amount_in_company_currency,
        u.first_name, u.last_name, u.email,
        ec.name as category_name
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      JOIN expense_categories ec ON e.category_id = ec.id
      LIMIT 5
    `);
    
    console.log('\nExpenses with details:');
    expensesWithDetails.rows.forEach(expense => {
      console.log(`- ${expense.description} by ${expense.first_name} ${expense.last_name} (${expense.category_name}) - $${expense.amount_in_company_currency}`);
    });
    
  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    await pool.end();
  }
};

testDatabase();
