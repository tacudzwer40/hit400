require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/deedguard',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // AI Service configuration
  aiService: {
    endpoint: process.env.AI_SERVICE_ENDPOINT || 'http://localhost:5000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT) || 300000, // 5 minutes
    maxRetries: parseInt(process.env.AI_SERVICE_MAX_RETRIES) || 3
  },
  
  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf'
    ],
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },
  
  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:8080']
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: process.env.LOG_FILE || './logs/app.log'
  },
  
  // Email configuration (for notifications)
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    from: process.env.EMAIL_FROM || 'noreply@deedguard.co.zw'
  },
  
  // Compliance configuration
  compliance: {
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 365,
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-change-this',
    auditLogging: process.env.AUDIT_LOGGING === 'true' || true
  },
  
  // API configuration
  api: {
    version: '1.0.0',
    docsPath: '/api-docs',
    basePath: '/api'
  },
  
  // Production URL
  productionUrl: process.env.PRODUCTION_URL || 'https://api.deedguard.co.zw'
};

// Validate required environment variables
const requiredEnvVars = [];
if (config.nodeEnv === 'production') {
  requiredEnvVars.push('JWT_SECRET', 'DATABASE_URI');
}

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set. Using default value.`);
  }
});

module.exports = config;