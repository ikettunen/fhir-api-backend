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
    
    // Close any existing connection pool before reinitializing
    await database.close();
    
    // Initialize connection pool (this connects to the database)
    await database.initialize();
    
    // Explicitly select the database
    const dbName = process.env.DB_NAME || 'nursing_home_db';
    await database.query(`USE \`${dbName}\``);
    logger.info(`Using database: ${dbName}`);
    
    // Verify we're in the right database
    const dbResult = await database.query('SELECT DATABASE() as current_db');
    if (dbResult && dbResult.length > 0) {
      logger.info(`Current database: ${dbResult[0].current_db}`);
    } else {
      logger.warn('Could not determine current database');
    }
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema;
    try {
      schema = await fs.readFile(schemaPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read schema file at ${schemaPath}: ${error.message}`);
    }
    
    if (!schema || schema.trim().length === 0) {
      throw new Error('Schema file is empty');
    }
    
    logger.info(`Schema file read successfully, length: ${schema.length} characters`);
    
    // Split schema into individual statements
    // Handle multi-line comments and statements better
    // But be careful - we want to preserve CREATE TABLE statements that span multiple lines
    let cleanedSchema = schema
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/--.*$/gm, '') // Remove -- comments (only full-line comments)
      .replace(/\n\s*\n/g, '\n'); // Remove empty lines
    
    // Split by semicolon, but keep multi-line statements together
    const statements = cleanedSchema
      .split(';')
      .map(stmt => stmt.trim().replace(/\n\s+/g, ' ')) // Normalize whitespace
      .filter(stmt => stmt.length > 10 && !stmt.match(/^\s*(USE|SET)\s+/i)); // Filter out short statements and USE/SET commands
    
    // Filter out any statements that are just whitespace or comments
    const validStatements = statements.filter(stmt => {
      const upper = stmt.toUpperCase();
      return stmt.length > 10 && (
        upper.includes('CREATE TABLE') ||
        upper.includes('CREATE INDEX') ||
        upper.includes('ALTER TABLE')
      );
    });
    
    logger.info(`Parsed ${validStatements.length} valid SQL statements to execute (out of ${statements.length} total)`);
    
    // Log first few statements for debugging
    if (validStatements.length > 0) {
      logger.info(`First statement preview: ${validStatements[0].substring(0, 100)}...`);
    } else {
      logger.error('No valid CREATE TABLE statements found in schema!');
      throw new Error('Schema file contains no valid CREATE TABLE statements');
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      if (statement && statement.length > 10) {
        try {
          const result = await database.query(statement);
          // Log result for CREATE TABLE statements
          if (validStatements[i].toUpperCase().includes('CREATE TABLE')) {
            const tableNameMatch = validStatements[i].match(/CREATE TABLE (?:IF NOT EXISTS )?[`"]?(\w+)[`"]?/i);
            const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
            logger.info(`✓ Statement ${i + 1}/${validStatements.length}: Created table '${tableName}'`);
          } else {
            logger.info(`✓ Statement ${i + 1}/${validStatements.length}: Executed successfully`);
          }
          successCount++;
        } catch (error) {
          // Allow "already exists" errors to pass silently for CREATE TABLE IF NOT EXISTS
          if (error.message.includes('already exists') || 
              error.message.includes('Duplicate key') ||
              error.code === 'ER_DUP_KEYNAME' ||
              error.code === 'ER_TABLE_EXISTS_ERROR') {
            const tableNameMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?[`"]?(\w+)[`"]?/i);
            const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
            logger.info(`⚠ Statement ${i + 1}/${validStatements.length}: Table '${tableName}' already exists (skipping)`);
            successCount++;
          } else {
            errorCount++;
            const tableNameMatch = validStatements[i].match(/CREATE TABLE (?:IF NOT EXISTS )?[`"]?(\w+)[`"]?/i);
            const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
            logger.error(`✗ Statement ${i + 1}/${validStatements.length} failed (table: ${tableName}):`, error.message);
            logger.error(`Failed statement (first 300 chars): ${validStatements[i].substring(0, 300)}`);
            logger.error(`Error code: ${error.code}`);
            // Still continue, but log the error
          }
        }
      }
    }
    
    logger.info(`Migration complete: ${successCount} statements succeeded, ${errorCount} failed`);
    
    if (errorCount > 0 && successCount === 0) {
      throw new Error(`All ${errorCount} migration statements failed. Check logs for details.`);
    }
    
    // Verify tables were created
    logger.info('Verifying tables were created...');
    try {
      const tables = await database.query('SHOW TABLES');
      let tableNames = [];
      if (tables && tables.length > 0) {
        // MySQL returns table names in format: { 'Tables_in_database_name': 'table_name' }
        const firstKey = Object.keys(tables[0])[0];
        tableNames = tables.map(row => row[firstKey]);
      }
      logger.info(`Tables in database: ${tableNames.length} tables found`);
      if (tableNames.length > 0) {
        logger.info(`Table names: ${tableNames.join(', ')}`);
      } else {
        logger.warn('WARNING: No tables found in database after migration!');
      }
    } catch (error) {
      logger.error('Failed to verify tables:', error.message);
    }
    
    logger.info('Database migration completed successfully');
    
    // Test the connection with a simple query (only if table exists)
    try {
      const result = await database.query('SELECT COUNT(*) as count FROM patients');
      logger.info(`Database test query successful. Patients table has ${result[0].count} records.`);
    } catch (testError) {
      // Table might not exist if migration failed
      logger.warn('Could not verify patients table:', testError.message);
      logger.warn('This might indicate the migration did not create tables successfully');
    }
    
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
