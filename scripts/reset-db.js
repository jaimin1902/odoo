import { pool } from '../server.js';

const resetDatabase = async () => {
  try {
    console.log('Resetting database...');

    // Drop all tables in the correct order (reverse of creation)
    const dropTables = [
      'DROP TABLE IF EXISTS approval_notifications CASCADE;',
      'DROP TABLE IF EXISTS expense_approvals CASCADE;',
      'DROP TABLE IF EXISTS approval_workflow_steps CASCADE;',
      'DROP TABLE IF EXISTS approval_workflows CASCADE;',
      'DROP TABLE IF EXISTS approval_rules CASCADE;',
      'DROP TABLE IF EXISTS expenses CASCADE;',
      'DROP TABLE IF EXISTS expense_categories CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;',
      'DROP TABLE IF EXISTS companies CASCADE;',
    ];

    for (const dropQuery of dropTables) {
      await pool.query(dropQuery);
      console.log('Dropped table');
    }

    // Drop functions
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
    console.log('Dropped functions');

    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
};

// Run reset
resetDatabase().then(() => {
  console.log('Database reset completed');
  process.exit(0);
});
