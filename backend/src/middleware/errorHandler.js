const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Global Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Application Error', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle PostgreSQL Unique Constraint Violation
  if (err.code === '23505') {
    return ApiResponse.conflict(res, 'A record with these details already exists.', {
      detail: err.detail,
    });
  }

  // Handle PostgreSQL Foreign Key Constraint Violation
  if (err.code === '23503') {
    return ApiResponse.badRequest(res, 'Referenced parent record does not exist.', {
      detail: err.detail,
    });
  }

  // Handle PostgreSQL Check Constraint Violation
  if (err.code === '23514') {
    return ApiResponse.badRequest(res, 'Request violates data validation rules.', {
      constraint: err.constraint,
    });
  }

  // Handle JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.badRequest(res, 'Malformed JSON payload in request body');
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : (process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error');

  return ApiResponse.error(res, message, statusCode);
};

module.exports = errorHandler;
