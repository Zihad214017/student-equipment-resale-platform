const healthService = require('../services/healthService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Health check controller
 * GET /api/health
 */
const getHealth = async (req, res, next) => {
  try {
    const health = await healthService.getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return ApiResponse.success(res, 'System health report', health, statusCode);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
};
