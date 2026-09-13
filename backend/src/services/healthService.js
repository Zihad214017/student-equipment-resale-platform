const db = require('../config/database');

const getSystemHealth = async () => {
  const dbHealth = await db.testConnection();

  return {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'Smart Student Old Equipment Tracking and Resale Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbHealth.connected ? 'connected' : 'disconnected',
      mode: dbHealth.mode || 'unknown',
      serverTime: dbHealth.serverTime || null,
      error: dbHealth.error || null,
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
  };
};

module.exports = {
  getSystemHealth,
};
