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

async function checkApprovals() {
  try {
    console.log('🔍 Checking Approval Records...\n');

    // Check all expenses
    const expensesResult = await pool.query(`
      SELECT id, description, status, employee_id, company_id
      FROM expenses
      ORDER BY submitted_at DESC
    `);

    console.log('All Expenses:');
    expensesResult.rows.forEach(expense => {
      console.log(`- ${expense.description} (${expense.status}) - Employee: ${expense.employee_id}`);
    });

    // Check all approval records
    const approvalsResult = await pool.query(`
      SELECT 
        ea.id, ea.expense_id, ea.approver_id, ea.status, ea.comments, ea.created_at,
        e.description as expense_description,
        u.first_name, u.last_name, u.email as approver_email
      FROM expense_approvals ea
      JOIN expenses e ON ea.expense_id = e.id
      JOIN users u ON ea.approver_id = u.id
      ORDER BY ea.created_at DESC
    `);

    console.log('\nAll Approval Records:');
    approvalsResult.rows.forEach(approval => {
      console.log(`- Expense: ${approval.expense_description}`);
      console.log(`  Approver: ${approval.first_name} ${approval.last_name} (${approval.approver_email})`);
      console.log(`  Status: ${approval.status}`);
      console.log(`  Comments: ${approval.comments || 'None'}`);
      console.log(`  Created: ${approval.created_at}`);
      console.log('');
    });

    // Check manager user
    const managerResult = await pool.query(`
      SELECT id, first_name, last_name, email, role, manager_id
      FROM users 
      WHERE role = 'manager' AND email = 'prajapati@cognitivecoreai.com'
    `);

    if (managerResult.rows.length > 0) {
      const manager = managerResult.rows[0];
      console.log(`Manager: ${manager.first_name} ${manager.last_name} (${manager.id})`);
      
      // Check if manager has any approval records
      const managerApprovals = approvalsResult.rows.filter(a => a.approver_id === manager.id);
      console.log(`Manager has ${managerApprovals.length} approval records`);
      
      if (managerApprovals.length === 0) {
        console.log('❌ Manager has no approval records - this is the problem!');
        
        // Check if there are any expenses that should have approvals for this manager
        const expensesNeedingApproval = expensesResult.rows.filter(e => e.status === 'pending');
        console.log(`Found ${expensesNeedingApproval.length} pending expenses that need approval`);
        
        if (expensesNeedingApproval.length > 0) {
          console.log('Creating missing approval records...');
          
          for (const expense of expensesNeedingApproval) {
            await pool.query(`
              INSERT INTO expense_approvals (expense_id, approver_id, status)
              VALUES ($1, $2, 'pending')
            `, [expense.id, manager.id]);
            console.log(`Created approval record for expense: ${expense.description}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkApprovals();
