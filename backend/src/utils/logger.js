/**
 * Structured Logger Utility
 */

const isDev = process.env.NODE_ENV === 'development';

const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
};

const logger = {
  info: (message, meta = {}) => {
    console.log(formatMessage('info', message, meta));
  },
  warn: (message, meta = {}) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message, meta = {}) => {
    console.error(formatMessage('error', message, meta));
  },
  debug: (message, meta = {}) => {
    if (isDev) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};

module.exports = logger;
