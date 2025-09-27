require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const database = require('../config/database');
const logger = require('../config/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migration...');
    
    // Create database and user first
    await database.createDatabase();
    await database.createUser();
    
    // Initialize connection pool
    await database.initialize();
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    logger.info(`Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await database.query(statement);
        } catch (error) {
          // Log but continue for statements that might already exist
          if (!error.message.includes('already exists')) {
            logger.warn(`Statement warning: ${error.message}`);
          }
        }
      }
    }
    
    logger.info('Database migration completed successfully');
    
    // Test the connection with a simple query
    const result = await database.query('SELECT COUNT(*) as count FROM patients');
    logger.info(`Database test query successful. Patients table has ${result[0].count} records.`);
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await database.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Database migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
