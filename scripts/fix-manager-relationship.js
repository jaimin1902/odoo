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

async function fixManagerRelationship() {
  try {
    console.log('🔧 Fixing Manager-Employee Relationship...\n');

    // Get the manager ID
    const managerResult = await pool.query(`
      SELECT id, first_name, last_name, email
      FROM users 
      WHERE role = 'manager' AND email = 'prajapati@cognitivecoreai.com'
    `);

    if (managerResult.rows.length === 0) {
      console.log('❌ Manager not found');
      return;
    }

    const manager = managerResult.rows[0];
    console.log(`Manager: ${manager.first_name} ${manager.last_name} (${manager.id})`);

    // Update the employee's manager_id
    const updateResult = await pool.query(`
      UPDATE users 
      SET manager_id = $1 
      WHERE email = 'jaimin.prajapati@cognitivecoreai.com'
    `, [manager.id]);

    console.log(`Updated ${updateResult.rowCount} employee(s)`);

    // Verify the relationship
    const verifyResult = await pool.query(`
      SELECT id, first_name, last_name, email, manager_id
      FROM users 
      WHERE email = 'jaimin.prajapati@cognitivecoreai.com'
    `);

    const employee = verifyResult.rows[0];
    console.log(`Employee: ${employee.first_name} ${employee.last_name}`);
    console.log(`Manager ID: ${employee.manager_id}`);

    // Test the manager expenses query
    console.log('\n🧪 Testing Manager Expenses Query...');
    const expensesResult = await pool.query(`
      SELECT 
        e.id, e.amount, e.currency, e.description, e.status,
        u.first_name as employee_first_name, u.last_name as employee_last_name
      FROM expenses e
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
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixManagerRelationship();
