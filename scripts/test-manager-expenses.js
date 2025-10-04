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

async function testManagerExpenses() {
  try {
    console.log('🧪 Testing Manager Expenses Query...\n');

    // Get manager user
    const managerResult = await pool.query(`
      SELECT id, first_name, last_name, email, role, manager_id, company_id
      FROM users 
      WHERE role = 'manager' 
      LIMIT 1
    `);
    
    if (managerResult.rows.length === 0) {
      console.log('❌ No manager found');
      return;
    }
    
    const manager = managerResult.rows[0];
    console.log(`Manager: ${manager.first_name} ${manager.last_name} (${manager.email})`);
    console.log(`Manager ID: ${manager.id}`);
    console.log(`Manager's Manager ID: ${manager.manager_id}`);
    console.log(`Company ID: ${manager.company_id}\n`);

    // Test the manager expenses query
    const expensesResult = await pool.query(`
      SELECT 
        e.id, e.amount, e.currency, e.amount_in_company_currency, e.exchange_rate,
        e.description, e.expense_date, e.status, e.submitted_at, e.receipt_url, e.notes,
        ec.name as category_name,
        u.first_name as employee_first_name, u.last_name as employee_last_name,
        u.email as employee_email
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      JOIN users u ON e.employee_id = u.id
      WHERE e.company_id = $1 
        AND (e.employee_id = $2 OR e.employee_id IN (SELECT id FROM users WHERE manager_id = $3))
      ORDER BY e.submitted_at DESC
    `, [manager.company_id, manager.id, manager.id]);

    console.log(`Found ${expensesResult.rows.length} expenses for manager`);
    
    if (expensesResult.rows.length > 0) {
      console.log('\nExpenses:');
      expensesResult.rows.forEach((expense, index) => {
        console.log(`${index + 1}. ${expense.description} - ${expense.amount} ${expense.currency} (${expense.status})`);
        console.log(`   Employee: ${expense.employee_first_name} ${expense.employee_last_name}`);
        console.log(`   Category: ${expense.category_name}`);
        console.log(`   Submitted: ${expense.submitted_at}`);
        console.log('');
      });
    } else {
      console.log('No expenses found for this manager');
    }

    // Check if there are any employees under this manager
    const teamResult = await pool.query(`
      SELECT id, first_name, last_name, email, role
      FROM users 
      WHERE manager_id = $1
    `, [manager.id]);

    console.log(`Team members under this manager: ${teamResult.rows.length}`);
    teamResult.rows.forEach(member => {
      console.log(`- ${member.first_name} ${member.last_name} (${member.email}) - ${member.role}`);
    });

    // Check all expenses in the company
    const allExpensesResult = await pool.query(`
      SELECT 
        e.id, e.description, e.status, e.amount,
        u.first_name, u.last_name, u.manager_id
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      WHERE e.company_id = $1
    `, [manager.company_id]);

    console.log(`\nAll expenses in company: ${allExpensesResult.rows.length}`);
    allExpensesResult.rows.forEach(expense => {
      console.log(`- ${expense.description} by ${expense.first_name} ${expense.last_name} (manager_id: ${expense.manager_id})`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testManagerExpenses();
