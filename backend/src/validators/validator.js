const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware factory for validating incoming requests using Zod schemas
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body' | 'query' | 'params'} source - Request property to validate (default: 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsedData = schema.parse(req[source]);
      req[source] = parsedData; // Replace with sanitized & typed data
      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return ApiResponse.badRequest(res, 'Validation Error', formattedErrors);
      }
      return ApiResponse.badRequest(res, error.message || 'Invalid Request Data');
    }
  };
};

module.exports = validate;
