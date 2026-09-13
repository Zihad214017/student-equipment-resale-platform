/**
 * Standardized API Response Helpers
 * Smart Student Old Equipment Tracking and Resale Platform
 */

class ApiResponse {
  /**
   * Send a successful JSON response
   * @param {import('express').Response} res 
   * @param {string} message 
   * @param {any} data 
   * @param {number} statusCode 
   * @param {object} meta 
   */
  static success(res, message = 'Success', data = null, statusCode = 200, meta = null) {
    const responseBody = {
      success: true,
      message,
      data,
    };

    if (meta) {
      responseBody.meta = meta;
    }

    return res.status(statusCode).json(responseBody);
  }

  /**
   * Send a created (201) JSON response
   * @param {import('express').Response} res 
   * @param {string} message 
   * @param {any} data 
   */
  static created(res, message = 'Resource created successfully', data = null) {
    return this.success(res, message, data, 201);
  }

  /**
   * Send an error JSON response
   * @param {import('express').Response} res 
   * @param {string} message 
   * @param {number} statusCode 
   * @param {any} errors 
   */
  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    const responseBody = {
      success: false,
      message,
    };

    if (errors) {
      responseBody.errors = errors;
    }

    return res.status(statusCode).json(responseBody);
  }

  /**
   * Send a 400 Bad Request error
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Send a 401 Unauthorized error
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  /**
   * Send a 403 Forbidden error
   */
  static forbidden(res, message = 'Forbidden: Insufficient permissions') {
    return this.error(res, message, 403);
  }

  /**
   * Send a 404 Not Found error
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Send a 409 Conflict error
   */
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409);
  }
}

module.exports = ApiResponse;
