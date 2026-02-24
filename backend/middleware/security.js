const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Security middleware configuration
 */
class SecurityMiddleware {
  
  /**
   * Configure Helmet security headers
   */
  static configureHelmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.deedguard.co.zw"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: ["no-referrer"] },
      xssFilter: true
    });
  }

  /**
   * Configure CORS
   */
  static configureCORS() {
    return cors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
          ? process.env.ALLOWED_ORIGINS.split(',') 
          : ['http://localhost:3000', 'http://localhost:8080', 'https://deedguard.co.zw'];
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`Blocked CORS request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Requested-With'
      ],
      exposedHeaders: ['X-Total-Count'],
      maxAge: 86400 // 24 hours
    });
  }

  /**
   * Configure rate limiting
   */
  static configureRateLimit() {
    // General API rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: 15 * 60
        });
      }
    });

    // Strict rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    });

    // Very strict rate limiting for verification endpoints
    const verificationLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // limit each IP to 10 verification requests per minute
      message: {
        error: 'Too many verification requests, please try again later.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    return {
      general: generalLimiter,
      auth: authLimiter,
      verification: verificationLimiter
    };
  }

  /**
   * Request validation middleware
   */
  static validateRequest() {
    return (req, res, next) => {
      // Check for suspicious headers
      const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'x-cluster-client-ip'
      ];

      suspiciousHeaders.forEach(header => {
        if (req.headers[header] && req.headers[header].includes(';')) {
          logger.warn(`Suspicious header detected: ${header} = ${req.headers[header]}`);
          return res.status(400).json({
            error: 'Invalid request headers'
          });
        }
      });

      // Check for SQL injection patterns in query parameters
      const sqlInjectionPatterns = [
        /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b|\bexec\b)/i,
        /('|(\\')|(;)|(--)|(\||(\%27)|(\%3B)|(\%2D\%2D)))/i
      ];

      const checkForSqlInjection = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            if (sqlInjectionPatterns.some(pattern => pattern.test(obj[key]))) {
              logger.warn(`SQL injection attempt detected in ${key}: ${obj[key]}`);
              return true;
            }
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (checkForSqlInjection(obj[key])) {
              return true;
            }
          }
        }
        return false;
      };

      if (checkForSqlInjection(req.query) || checkForSqlInjection(req.body)) {
        return res.status(400).json({
          error: 'Invalid request parameters'
        });
      }

      // Check for XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];

      const checkForXSS = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            if (xssPatterns.some(pattern => pattern.test(obj[key]))) {
              logger.warn(`XSS attempt detected in ${key}: ${obj[key]}`);
              return true;
            }
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (checkForXSS(obj[key])) {
              return true;
            }
          }
        }
        return false;
      };

      if (checkForXSS(req.body)) {
        return res.status(400).json({
          error: 'Invalid request content'
        });
      }

      next();
    };
  }

  /**
   * Request logging middleware
   */
  static requestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Log request
      logger.info(`${req.method} ${req.path} - ${req.ip} - ${req.get('User-Agent') || 'Unknown'}`);
      
      // Log response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'error' : 'info';
        
        logger[logLevel](`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });

      next();
    };
  }

  /**
   * API key validation middleware
   */
  static validateApiKey() {
    return (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required'
        });
      }

      // In production, this would check against a database
      const validApiKey = process.env.API_KEY;
      
      if (apiKey !== validApiKey) {
        logger.warn(`Invalid API key attempt: ${apiKey}`);
        return res.status(403).json({
          error: 'Invalid API key'
        });
      }

      next();
    };
  }

  /**
   * Request size validation
   */
  static validateRequestSize() {
    return (req, res, next) => {
      const contentLength = parseInt(req.headers['content-length']);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength && contentLength > maxSize) {
        logger.warn(`Request too large: ${contentLength} bytes from ${req.ip}`);
        return res.status(413).json({
          error: 'Request too large',
          maxSize: maxSize
        });
      }

      next();
    };
  }

  /**
   * Security headers for responses
   */
  static addSecurityHeaders() {
    return (req, res, next) => {
      // Add custom security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  /**
   * Session security middleware
   */
  static sessionSecurity() {
    return (req, res, next) => {
      // Check for session timeout
      if (req.session && req.session.lastActivity) {
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes
        
        if (now - req.session.lastActivity > sessionTimeout) {
          req.session.destroy();
          return res.status(401).json({
            error: 'Session expired'
          });
        }
      }

      // Update last activity
      if (req.session) {
        req.session.lastActivity = Date.now();
      }

      next();
    };
  }

  /**
   * Audit logging middleware
   */
  static auditLogger() {
    return (req, res, next) => {
      // Log sensitive operations
      const sensitiveOperations = ['/api/auth', '/api/admin', '/api/verify'];
      const isSensitive = sensitiveOperations.some(path => req.path.startsWith(path));

      if (isSensitive) {
        const auditLog = {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          path: req.path,
          userId: req.user?.id || 'anonymous',
          body: req.method === 'POST' ? req.body : undefined
        };

        logger.info('AUDIT: ' + JSON.stringify(auditLog));
      }

      next();
    };
  }
}

module.exports = SecurityMiddleware;