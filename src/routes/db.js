const express = require('express');
const router = express.Router();
const { runMigrations } = require('../db/migrate');
const { seedDatabase } = require('../db/seed');
const logger = require('../config/logger');

/**
 * Run database migrations
 * POST /api/db/migrate
 */
router.post('/migrate', async (req, res) => {
  try {
    logger.info('Migration request received');
    
    // Import database here to avoid circular dependency
    const database = require('../config/database');
    
    await runMigrations();
    
    // Verify tables were actually created
    await database.initialize();
    const dbName = process.env.DB_NAME || 'nursing_home_db';
    await database.query(`USE \`${dbName}\``);
    const tables = await database.query('SHOW TABLES');
    
    // Handle different table name formats from SHOW TABLES
    let tableNames = [];
    if (tables && tables.length > 0) {
      // MySQL returns table names in format: { 'Tables_in_database_name': 'table_name' }
      const firstKey = Object.keys(tables[0])[0];
      tableNames = tables.map(row => row[firstKey]);
    }
    
    if (tableNames.length === 0) {
      logger.warn('Migration reported success but no tables found!');
      res.status(500).json({
        success: false,
        error: 'Migration completed but no tables were created. Check server logs for details.',
        timestamp: new Date().toISOString(),
        tablesFound: 0
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: `Database migration completed successfully. ${tableNames.length} tables created.`,
      timestamp: new Date().toISOString(),
      tables: tableNames,
      tablesCount: tableNames.length
    });
  } catch (error) {
    logger.error('Migration failed:', error.message || error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Migration failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Seed database with sample data
 * POST /api/db/seed
 */
router.post('/seed', async (req, res) => {
  try {
    logger.info('Database seeding request received');
    
    // Verify tables exist before seeding
    const database = require('../config/database');
    await database.initialize();
    const dbName = process.env.DB_NAME || 'nursing_home_db';
    await database.query(`USE \`${dbName}\``);
    const tables = await database.query('SHOW TABLES');
    
    let tableNames = [];
    if (tables && tables.length > 0) {
      const firstKey = Object.keys(tables[0])[0];
      tableNames = tables.map(row => row[firstKey]);
    }
    
    if (tableNames.length === 0) {
      res.status(500).json({
        success: false,
        error: 'No tables found. Please run migrations first.',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    await seedDatabase();
    
    // Verify data was seeded
    const patientCount = await database.query('SELECT COUNT(*) as count FROM patients');
    const count = patientCount[0]?.count || 0;
    
    res.status(200).json({
      success: true,
      message: `Database seeding completed successfully. ${count} patients created.`,
      timestamp: new Date().toISOString(),
      patientsCreated: count
    });
  } catch (error) {
    logger.error('Seeding failed:', error.message || error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Seeding failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset database (runs migration + seed)
 * POST /api/db/reset
 */
router.post('/reset', async (req, res) => {
  try {
    logger.info('Database reset request received');
    
    // Run migrations first to ensure schema is up to date
    await runMigrations();
    logger.info('Migrations completed, starting seed...');
    
    // Then seed with fresh data
    await seedDatabase();
    
    res.status(200).json({
      success: true,
      message: 'Database reset completed successfully (migration + seed)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database reset failed:', error.message || error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Database reset failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Cleanup old tables (drop visit_tasks and visit_photos)
 * POST /api/db/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    logger.info('Database cleanup request received');
    
    const database = require('../config/database');
    await database.initialize();
    
    // Drop old tables that are now in MongoDB
    await database.query('DROP TABLE IF EXISTS visit_tasks');
    await database.query('DROP TABLE IF EXISTS visit_photos');
    
    logger.info('Dropped visit_tasks and visit_photos tables');
    
    res.status(200).json({
      success: true,
      message: 'Database cleanup completed. Dropped visit_tasks and visit_photos tables.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database cleanup failed:', error.message || error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database cleanup failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

