require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('./logger');

class Database {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nursing_home_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    };
  }

  /**
   * Create database if it doesn't exist
   */
  async createDatabase() {
    try {
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password
      });

      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.end();
      
      logger.info(`Database '${this.config.database}' created or already exists`);
    } catch (error) {
      logger.error('Failed to create database:', error.message);
      throw error;
    }
  }

  /**
   * Create database user if needed (optional, can be skipped if using root)
   */
  async createUser() {
    // This is optional - you can skip this if using root or if user already exists
    // Uncomment and modify if you need to create a specific database user
    /*
    try {
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: 'root',
        password: process.env.DB_ROOT_PASSWORD || ''
      });

      const dbUser = process.env.DB_USER || 'db_user';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = this.config.database;

      await connection.query(`CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`);
      await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%'`);
      await connection.query('FLUSH PRIVILEGES');
      await connection.end();
      
      logger.info(`Database user '${dbUser}' created or already exists`);
    } catch (error) {
      // Log warning but don't fail - user might already exist or not have CREATE USER privileges
      logger.warn('Failed to create database user (this is optional):', error.message);
    }
    */
    logger.info('Database user creation skipped (using existing user)');
  }

  /**
   * Initialize connection pool
   */
  async initialize() {
    try {
      if (!this.pool) {
        this.pool = mysql.createPool(this.config);
        logger.info(`Database connection pool initialized for '${this.config.database}'`);
      }
    } catch (error) {
      logger.error('Failed to initialize database connection pool:', error.message);
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query(sql, params = []) {
    if (!this.pool) {
      await this.initialize();
    }

    try {
      const [results] = await this.pool.query(sql, params);
      return results;
    } catch (error) {
      logger.error('Database query failed:', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a connection from the pool (for transactions)
   */
  async getConnection() {
    if (!this.pool) {
      await this.initialize();
    }
    return await this.pool.getConnection();
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database connection pool closed');
    }
  }
}

// Export singleton instance
const database = new Database();

module.exports = database;

