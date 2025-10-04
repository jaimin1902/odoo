import { pool } from '../server.js';

async function testExpenses() {
  try {
    console.log('🧪 Testing Expense System...\n');

    // Test 1: Check if expenses exist
    console.log('1. Checking expenses in database...');
    const expensesResult = await pool.query('SELECT COUNT(*) FROM expenses');
    console.log(`   ✅ Found ${expensesResult.rows[0].count} expenses`);

    // Test 2: Check expense categories
    console.log('\n2. Checking expense categories...');
    const categoriesResult = await pool.query('SELECT COUNT(*) FROM expense_categories');
    console.log(`   ✅ Found ${categoriesResult.rows[0].count} categories`);

    // Test 3: Check approval workflows
    console.log('\n3. Checking approval workflows...');
    const workflowsResult = await pool.query('SELECT COUNT(*) FROM approval_workflows');
    console.log(`   ✅ Found ${workflowsResult.rows[0].count} approval workflows`);

    // Test 4: Check expense approvals
    console.log('\n4. Checking expense approvals...');
    const approvalsResult = await pool.query('SELECT COUNT(*) FROM expense_approvals');
    console.log(`   ✅ Found ${approvalsResult.rows[0].count} expense approvals`);

    // Test 5: Check approval notifications
    console.log('\n5. Checking approval notifications...');
    const notificationsResult = await pool.query('SELECT COUNT(*) FROM approval_notifications');
    console.log(`   ✅ Found ${notificationsResult.rows[0].count} approval notifications`);

    // Test 6: Check for null approver_id issues
    console.log('\n6. Checking for null approver_id issues...');
    const nullApproverResult = await pool.query('SELECT COUNT(*) FROM approval_notifications WHERE approver_id IS NULL');
    if (nullApproverResult.rows[0].count > 0) {
      console.log(`   ⚠️  Found ${nullApproverResult.rows[0].count} notifications with null approver_id`);
    } else {
      console.log('   ✅ No null approver_id issues found');
    }

    // Test 7: Check recent expenses
    console.log('\n7. Checking recent expenses...');
    const recentExpensesResult = await pool.query(`
      SELECT e.id, e.amount, e.currency, e.description, e.status, 
             u.first_name, u.last_name, u.email
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      ORDER BY e.submitted_at DESC
      LIMIT 5
    `);
    
    if (recentExpensesResult.rows.length > 0) {
      console.log('   ✅ Recent expenses:');
      recentExpensesResult.rows.forEach((expense, index) => {
        console.log(`      ${index + 1}. ${expense.description} - ${expense.amount} ${expense.currency} (${expense.status}) - ${expense.first_name} ${expense.last_name}`);
      });
    } else {
      console.log('   ⚠️  No expenses found');
    }

    // Test 8: Check users and their roles
    console.log('\n8. Checking users and roles...');
    const usersResult = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    
    console.log('   ✅ User roles:');
    usersResult.rows.forEach(user => {
      console.log(`      ${user.role}: ${user.count} users`);
    });

    console.log('\n🎉 Expense system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testExpenses();
