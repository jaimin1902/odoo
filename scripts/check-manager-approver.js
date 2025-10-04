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

async function checkManagerApprover() {
  try {
    console.log('👥 Checking Manager Approver Status...\n');

    const result = await pool.query(`
      SELECT id, first_name, last_name, email, role, manager_id, is_manager_approver
      FROM users 
      WHERE email IN ('prajapati@cognitivecoreai.com', 'jaimin.prajapati@cognitivecoreai.com')
    `);

    console.log('Manager and Employee:');
    result.rows.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Manager ID: ${user.manager_id}`);
      console.log(`  Is Manager Approver: ${user.is_manager_approver}`);
      console.log('');
    });

    // Check if manager has is_manager_approver = true
    const manager = result.rows.find(u => u.role === 'manager');
    if (manager && !manager.is_manager_approver) {
      console.log('❌ Manager does not have is_manager_approver = true');
      console.log('Fixing this...');
      
      await pool.query(`
        UPDATE users 
        SET is_manager_approver = true 
        WHERE id = $1
      `, [manager.id]);
      
      console.log('✅ Fixed manager approver status');
    } else if (manager && manager.is_manager_approver) {
      console.log('✅ Manager has is_manager_approver = true');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkManagerApprover();
