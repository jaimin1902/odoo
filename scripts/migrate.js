import { pool } from '../server.js';
import fs from 'fs';
import path from 'path';

const createTables = async () => {
  try {
    console.log('Starting database migration...');

    // Read and execute SQL schema
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('Database tables created successfully');
    
    // Insert initial data
    await insertInitialData();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

const insertInitialData = async () => {
  try {
    // Insert default expense categories
    const categories = [
      'Travel',
      'Meals',
      'Accommodation',
      'Transportation',
      'Office Supplies',
      'Training',
      'Entertainment',
      'Other'
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO expense_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [category]
      );
    }

    console.log('Initial data inserted successfully');
  } catch (error) {
    console.error('Error inserting initial data:', error);
  }
};

// Run migration
createTables().then(() => {
  console.log('Migration completed successfully');
  process.exit(0);
});
