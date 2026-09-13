const bcrypt = require('bcryptjs');
const config = require('../config/env');

/**
 * Hash a plain text password using bcrypt
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  const saltRounds = config.bcrypt.saltRounds || 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a bcrypt hash
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
