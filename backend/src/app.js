const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const healthController = require('./controllers/healthController');

const app = express();

// Trust proxy for rate limiter & secure cookies if behind reverse proxy
app.set('trust proxy', 1);

// 1. Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Dynamic CORS Configuration (Supports local React, Vercel frontend, and configured origins)
const getAllowedOrigins = () => {
  const defaults = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  const envOrigins = [
    config.cors.frontendUrl,
    ...(config.cors.allowedOrigins || []),
  ]
    .filter(Boolean)
    .map((o) => o.trim().replace(/\/$/, ''));

  return [...new Set([...defaults, ...envOrigins])];
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const origins = getAllowedOrigins();
    const isAllowed =
      origins.includes(origin) ||
      (config.env !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      return callback(null, true);
    }

    // Permissive in non-production environments
    if (config.env !== 'production') {
      return callback(null, true);
    }

    return callback(new Error(`CORS Error: Origin ${origin} not allowed by Access-Control-Allow-Origin.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['ETag'],
}));

// 3. Request Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 4. Request Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Static Files (for uploaded equipment photos)
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    maxAge: 0,
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    },
  })
);

// 6. Direct Healthcheck Endpoints (Unthrottled for Render / cloud monitoring probes)
app.get('/health', healthController.getHealth);
app.get('/api/health', healthController.getHealth);
app.get('/api/v1/health', healthController.getHealth);

// 7. Mount Core REST API Routes under /api with Rate Limiting
app.use('/api', apiLimiter, routes);

// 8. 404 Route Not Found Handler
app.use(notFoundHandler);

// 9. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
