# DeedGuard Zimbabwe - Land Title Verification System

An AI-powered mobile and cloud application for verifying the authenticity of Zimbabwean land title deeds using advanced machine learning and computer vision techniques.

## 🎯 Overview

DeedGuard is a comprehensive solution designed to combat land title deed fraud in Zimbabwe. The system combines:

- **Mobile Application**: Android app with camera functionality for document capture
- **Cloud Backend**: Node.js API with security and compliance features
- **AI Service**: Python-based machine learning service for document analysis
- **Docker Deployment**: Complete containerized infrastructure

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Android App   │───▶│   Node.js API    │───▶│   AI Service    │
│   (Kotlin)      │    │   (Express)      │    │   (Flask)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   MongoDB        │
                       │   (Database)     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Redis          │
                       │   (Cache)        │
                       └──────────────────┘
```

## 🚀 Features

### Mobile Application
- ✅ Camera integration for document capture
- ✅ Real-time internet connectivity monitoring
- ✅ Document preview and upload
- ✅ Verification result display
- ✅ Zimbabwean color scheme and branding
- ✅ Offline status indicators

### Cloud Backend
- ✅ JWT authentication and authorization
- ✅ Rate limiting and DDoS protection
- ✅ CORS configuration and security headers
- ✅ Request validation and sanitization
- ✅ Comprehensive logging and monitoring
- ✅ File upload handling with size limits
- ✅ API documentation with Swagger

### AI Service
- ✅ Document preprocessing and enhancement
- ✅ Official seal detection using computer vision
- ✅ Watermark analysis with frequency domain techniques
- ✅ Text quality and readability assessment
- ✅ Tampering detection algorithms
- ✅ Confidence scoring and fraud detection
- ✅ Mock model for demonstration (production-ready model structure)

### Security & Compliance
- ✅ Helmet.js security headers
- ✅ Input validation and sanitization
- ✅ Rate limiting per endpoint type
- ✅ Audit logging for compliance
- ✅ Session management and timeout
- ✅ API key validation
- ✅ CORS policy enforcement

### Infrastructure
- ✅ Docker containerization
- ✅ Docker Compose orchestration
- ✅ Multi-stage Docker builds
- ✅ Health checks and monitoring
- ✅ Volume management for data persistence
- ✅ Network isolation and security

## 📋 System Requirements

### Development Environment
- **Node.js**: 18.0.0 or higher
- **Python**: 3.11 or higher
- **Android Studio**: Latest version
- **Docker**: 20.10.0 or higher
- **Docker Compose**: 2.0.0 or higher

### Production Requirements
- **Server**: 4GB RAM, 2 CPU cores minimum
- **Storage**: 50GB SSD recommended
- **Network**: HTTPS/TLS support
- **Database**: MongoDB 6.0+
- **Cache**: Redis 6.0+

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hit400
```

### 2. Environment Configuration

Create `.env` files for each service:

#### Backend Environment (backend/.env)
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URI=mongodb://localhost:27017/deedguard

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# AI Service Configuration
AI_SERVICE_ENDPOINT=http://localhost:5000
AI_SERVICE_TIMEOUT=300000
AI_SERVICE_MAX_RETRIES=3

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined
LOG_FILE=./logs/app.log

# Compliance Configuration
DATA_RETENTION_DAYS=365
ENCRYPTION_KEY=your-encryption-key-change-this
AUDIT_LOGGING=true

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@deedguard.co.zw

# Production URL
PRODUCTION_URL=https://api.deedguard.co.zw
```

#### AI Service Environment (ai_service/.env)
```env
FLASK_ENV=production
FLASK_DEBUG=0
UPLOAD_FOLDER=/app/uploads
MODEL_PATH=/app/models/document_verification_model.h5
```

### 3. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### AI Service Dependencies
```bash
cd ai_service
pip install -r requirements.txt
```

### 4. Database Setup

#### MongoDB Setup
```bash
# Start MongoDB
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=deedguard \
  mongo:7.0
```

#### Redis Setup
```bash
# Start Redis
docker run -d --name redis -p 6379:6379 \
  -e REDIS_PASSWORD=redis123 \
  redis:7.2-alpine
```

### 5. Build and Run

#### Option 1: Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 2: Development Mode
```bash
# Start backend
cd backend
npm run dev

# Start AI service
cd ai_service
python app.py

# Build and run Android app
cd app
# Open in Android Studio and run
```

## 🔧 Configuration

### Security Configuration

The system includes comprehensive security measures:

1. **Rate Limiting**: Different limits for different endpoints
2. **Input Validation**: SQL injection and XSS protection
3. **Authentication**: JWT-based authentication
4. **Authorization**: Role-based access control
5. **CORS**: Strict origin control
6. **Security Headers**: Helmet.js protection
7. **Audit Logging**: Complete audit trail

### AI Model Configuration

The AI service supports both mock and production models:

1. **Mock Model**: For development and testing
2. **Production Model**: TensorFlow/Keras model for real verification
3. **Model Path**: Configurable model location
4. **Feature Analysis**: Multiple verification techniques

### Docker Configuration

The `docker-compose.yml` includes:

- **Multi-service orchestration**
- **Volume management**
- **Network isolation**
- **Health checks**
- **Monitoring stack** (Prometheus + Grafana)
- **Log aggregation** (ELK Stack)

## 📊 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Health Check
```http
GET /health
```

#### Authentication
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

#### Document Verification
```http
POST /api/verify
GET /api/verify/status/:id
GET /api/verify/history
POST /api/verify/batch
```

#### Admin
```http
GET /api/admin/stats
GET /api/admin/users
GET /api/admin/verifications
```

### API Documentation
Access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

## 🤖 AI Service Features

### Document Analysis Techniques

1. **Seal Detection**
   - Circle detection using Hough Transform
   - Confidence scoring based on detection quality
   - Multiple seal detection support

2. **Watermark Analysis**
   - Frequency domain analysis using FFT
   - Pattern recognition for watermark detection
   - Strength and quality assessment

3. **Text Quality Assessment**
   - Sharpness analysis using Laplacian operator
   - Contrast and brightness evaluation
   - Readability scoring

4. **Image Quality Analysis**
   - Noise level estimation
   - Blur detection
   - Color balance analysis
   - Resolution assessment

5. **Tampering Detection**
   - Edge density analysis
   - Histogram variance calculation
   - Unusual pattern detection

### Confidence Scoring

The system uses a weighted scoring algorithm:
- Base score: 50%
- Seal detection: +30%
- Watermark detection: +20%
- Text quality: +10%
- Tampering indicators: -40%

## 📱 Mobile App Features

### User Interface
- **Zimbabwean Color Scheme**: Green, gold, and black theme
- **Modern Design**: Material Design 3 components
- **Responsive Layout**: Works on all screen sizes
- **Accessibility**: Proper contrast and font sizes

### Camera Integration
- **Real-time Preview**: Live camera feed
- **Auto-focus Support**: Clear document capture
- **Flash Control**: Manual flash toggle
- **Image Processing**: Automatic enhancement

### Document Processing
- **Preview Mode**: Review before upload
- **Compression**: Optimize for upload
- **Format Support**: JPEG, PNG, PDF
- **Size Limits**: 10MB maximum

## 🔒 Security & Compliance

### Data Protection
- **Encryption**: AES-256 for sensitive data
- **Secure Storage**: Encrypted database fields
- **Access Control**: Role-based permissions
- **Audit Trail**: Complete logging of all operations

### Compliance Features
- **Data Retention**: Configurable retention policies
- **GDPR Compliance**: Data protection measures
- **Audit Logging**: Comprehensive activity logs
- **Security Headers**: OWASP recommended headers

### Network Security
- **HTTPS/TLS**: Encrypted communication
- **Firewall Rules**: Port and protocol restrictions
- **VPN Support**: Secure remote access
- **DDoS Protection**: Rate limiting and monitoring

## 📈 Monitoring & Logging

### Application Monitoring
- **Health Checks**: Service availability monitoring
- **Performance Metrics**: Response time and throughput
- **Error Tracking**: Comprehensive error logging
- **Resource Usage**: CPU, memory, and disk monitoring

### Log Management
- **Centralized Logging**: ELK Stack integration
- **Log Levels**: Debug, info, warn, error
- **Structured Logging**: JSON format for analysis
- **Log Rotation**: Automatic cleanup and archiving

### Metrics Collection
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Custom Metrics**: Application-specific measurements
- **Alerting**: Threshold-based notifications

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_URI=mongodb://prod-server:27017/deedguard
   export JWT_SECRET=production-secret-key
   ```

2. **Build Production Images**
   ```bash
   docker-compose -f docker-compose.yml build --no-cache
   ```

3. **Deploy Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Deployment**
   ```bash
   # Check service health
   curl http://localhost:3000/health
   curl http://localhost:5000/health
   ```

### SSL/TLS Configuration

For production SSL setup:

1. **Generate SSL Certificates**
   ```bash
   # Using Let's Encrypt
   certbot certonly --standalone -d api.deedguard.co.zw
   ```

2. **Configure Nginx**
   ```nginx
   server {
       listen 443 ssl;
       server_name api.deedguard.co.zw;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       # SSL Configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
   }
   ```

## 🧪 Testing

### Unit Testing
```bash
# Backend tests
cd backend
npm test

# AI service tests
cd ai_service
pytest tests/
```

### Integration Testing
```bash
# End-to-end API testing
npm run test:integration

# Mobile app testing
./gradlew connectedAndroidTest
```

### Load Testing
```bash
# API load testing
artillery run tests/load-test.yml

# Performance monitoring
npm run monitor
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   
   # Kill conflicting processes
   sudo kill -9 <pid>
   ```

2. **Database Connection**
   ```bash
   # Check MongoDB status
   docker ps | grep mongodb
   
   # Test connection
   mongo --host localhost:27017 --username admin --password
   ```

3. **Docker Issues**
   ```bash
   # Clean up Docker
   docker system prune -a
   
   # Rebuild images
   docker-compose build --no-cache
   ```

### Logs and Debugging

1. **Application Logs**
   ```bash
   # Backend logs
   docker-compose logs backend
   
   # AI service logs
   docker-compose logs ai-service
   ```

2. **Error Analysis**
   ```bash
   # View specific service logs
   docker-compose logs -f --tail=100 backend
   
   # Check container status
   docker-compose ps
   ```

## 🤝 Contributing

### Development Workflow

1. **Fork the Repository**
2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make Changes**
4. **Write Tests**
5. **Run Linters**
   ```bash
   npm run lint
   npm run format
   ```
6. **Submit Pull Request**

### Code Standards

- **JavaScript/Node.js**: ESLint with Airbnb config
- **Python**: Black formatter and Flake8 linter
- **Kotlin**: Android Kotlin style guide
- **Docker**: Multi-stage builds and security scanning

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TensorFlow Team**: For the powerful ML framework
- **OpenCV Team**: For computer vision capabilities
- **Node.js Community**: For the excellent ecosystem
- **Android Team**: For the mobile platform
- **Zimbabwe Land Registry**: For domain expertise

## 📞 Support

For support and questions:

- **Email**: support@deedguard.co.zw
- **Documentation**: [API Docs](http://localhost:3000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

**DeedGuard Zimbabwe** - Protecting Land Rights with AI Technology