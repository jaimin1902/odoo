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

async function checkCompanyIds() {
  try {
    console.log('🏢 Checking Company IDs...\n');

    // Check manager and employee
    const usersResult = await pool.query(`
      SELECT id, first_name, last_name, email, role, company_id
      FROM users 
      WHERE email IN ('prajapati@cognitivecoreai.com', 'jaimin.prajapati@cognitivecoreai.com')
    `);

    console.log('Manager and Employee:');
    usersResult.rows.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Company ID: ${user.company_id}`);
      console.log('');
    });

    // Check expenses
    const expensesResult = await pool.query(`
      SELECT id, description, employee_id, company_id
      FROM expenses
    `);

    console.log('Expenses:');
    expensesResult.rows.forEach(expense => {
      console.log(`- ${expense.description}`);
      console.log(`  Employee ID: ${expense.employee_id}`);
      console.log(`  Company ID: ${expense.company_id}`);
      console.log('');
    });

    // Check if company IDs match
    const manager = usersResult.rows.find(u => u.role === 'manager');
    const employee = usersResult.rows.find(u => u.role === 'employee');
    
    if (manager && employee) {
      console.log(`Manager company_id: ${manager.company_id}`);
      console.log(`Employee company_id: ${employee.company_id}`);
      console.log(`Company IDs match: ${manager.company_id === employee.company_id}`);
    }

    // Test the exact query that should work
    if (manager && expensesResult.rows.length > 0) {
      console.log('\n🧪 Testing Exact Manager Query...');
      const testResult = await pool.query(`
        SELECT 
          e.id, e.amount, e.currency, e.description, e.status,
          u.first_name as employee_first_name, u.last_name as employee_last_name
        FROM expenses e
        JOIN users u ON e.employee_id = u.id
        WHERE e.company_id = $1 
          AND (e.employee_id = $2 OR e.employee_id IN (SELECT id FROM users WHERE manager_id = $3))
        ORDER BY e.submitted_at DESC
      `, [manager.company_id, manager.id, manager.id]);

      console.log(`Found ${testResult.rows.length} expenses`);
      
      if (testResult.rows.length > 0) {
        testResult.rows.forEach((expense, index) => {
          console.log(`${index + 1}. ${expense.description} - ${expense.amount} ${expense.currency}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkCompanyIds();
