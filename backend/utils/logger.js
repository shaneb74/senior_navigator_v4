/**
 * Simple logger with environment-aware log levels
 * Replace console.log statements with logger.debug/info/warn/error
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase() || 'info'];

const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log('[INFO]', ...args);
    }
  },
  
  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error('[ERROR]', ...args);
    }
  }
};

module.exports = logger;
