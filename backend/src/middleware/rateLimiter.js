const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

/**
 * Standard API rate limiter (150 requests per 15 minutes per IP)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, 'Too many requests from this IP. Please try again after 15 minutes.', 429);
  },
});

/**
 * Strict Auth rate limiter (20 attempts per 15 minutes per IP)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, 'Too many authentication attempts. Please try again after 15 minutes.', 429);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
