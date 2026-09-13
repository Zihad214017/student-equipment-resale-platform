const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a signed JWT token
 * @param {object} payload - Claims e.g. { id, email, role, student_id }
 * @param {string|number} expiresIn - Expiration time (default from env e.g. '24h')
 * @returns {string} Signed JWT token
 */
const generateToken = (payload, expiresIn = config.jwt.expiresIn) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn,
    algorithm: 'HS256',
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token 
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'],
  });
};

module.exports = {
  generateToken,
  verifyToken,
};
