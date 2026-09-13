const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./app');
const config = require('./config/env');
const db = require('./config/database');
const logger = require('./utils/logger');

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Created uploads directory at: ${uploadsDir}`);
}

const server = http.createServer(app);

const startServer = async () => {
  try {
    logger.info('Starting Smart Student Equipment Platform Backend...');
    logger.info(`Environment: ${config.env}`);

    // Probe database connectivity
    await db.testConnection();

    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`✓ Server is running and listening on http://localhost:${PORT}`);
      logger.info(`✓ Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Graceful Shutdown Handling
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      if (db.pool) {
        await db.pool.end();
        logger.info('PostgreSQL connection pool closed.');
      }
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason });
});

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
