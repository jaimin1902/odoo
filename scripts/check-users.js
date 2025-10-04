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

async function checkUsers() {
  try {
    console.log('👥 Checking User Relationships...\n');

    const result = await pool.query(`
      SELECT id, first_name, last_name, email, role, manager_id, company_id
      FROM users 
      ORDER BY role, first_name
    `);

    console.log('All users:');
    result.rows.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Manager ID: ${user.manager_id}`);
      console.log(`  Company ID: ${user.company_id}`);
      console.log('');
    });

    // Check manager-employee relationships
    console.log('\nManager-Employee Relationships:');
    const managers = result.rows.filter(u => u.role === 'manager');
    managers.forEach(manager => {
      const employees = result.rows.filter(u => u.manager_id === manager.id);
      console.log(`Manager: ${manager.first_name} ${manager.last_name} (${manager.id})`);
      console.log(`  Employees: ${employees.length}`);
      employees.forEach(emp => {
        console.log(`    - ${emp.first_name} ${emp.last_name} (${emp.id})`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
