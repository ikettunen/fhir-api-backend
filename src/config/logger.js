/**
 * Logger configuration
 * Uses Winston if available, falls back to console
 */

let logger;

try {
  const winston = require('winston');
  
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'nursing-home-backend' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
} catch (error) {
  // Fallback to console if winston is not available
  logger = {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args),
    verbose: (...args) => console.log('[VERBOSE]', ...args)
  };
}

module.exports = logger;

