const path = require('path');
const dotenv = require('dotenv');

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'student_equipment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/student_equipment_db',
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10) || 2000,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_jwt_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  payment: {
    bkash: {
      baseURL: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
      appKey: process.env.BKASH_APP_KEY || '',
      appSecret: process.env.BKASH_APP_SECRET || '',
      username: process.env.BKASH_USERNAME || '',
      password: process.env.BKASH_PASSWORD || '',
      callbackURL: process.env.BKASH_CALLBACK_URL || 'http://localhost:5000/api/v1/payments/callback/bkash',
      sandboxMode: process.env.BKASH_SANDBOX_MODE !== 'false',
    },
    nagad: {
      baseURL: process.env.NAGAD_BASE_URL || 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs',
      merchantID: process.env.NAGAD_MERCHANT_ID || '',
      merchantNumber: process.env.NAGAD_MERCHANT_NUMBER || '',
      publicKey: process.env.NAGAD_PUBLIC_KEY || '',
      privateKey: process.env.NAGAD_PRIVATE_KEY || '',
      callbackURL: process.env.NAGAD_CALLBACK_URL || 'http://localhost:5000/api/v1/payments/callback/nagad',
      sandboxMode: process.env.NAGAD_SANDBOX_MODE !== 'false',
    },
  },
};

module.exports = config;
