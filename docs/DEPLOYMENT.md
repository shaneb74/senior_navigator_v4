# GCP Deployment Guide

## Overview

This guide covers deployment of the GCP (Guided Care Plan) module from local development to production environments.

**Current Deployment Status:** Development only (no production deployment yet)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Building for Production](#building-for-production)
5. [Deployment Options](#deployment-options)
6. [Environment Variables](#environment-variables)
7. [Health Checks](#health-checks)
8. [Monitoring](#monitoring)
9. [Rollback Strategy](#rollback-strategy)
10. [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x+ | Runtime for backend and build tools |
| npm | 10.x+ | Package management |
| Git | 2.x+ | Version control |

### Optional Tools

| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| PM2 | Process management (production) |
| nginx | Reverse proxy / static files |

### Install Node.js

```bash
# macOS (using Homebrew)
brew install node@20

# Verify installation
node --version  # Should be 20.x
npm --version   # Should be 10.x
```

---

## Environment Setup

### Environment Types

| Environment | Purpose | Branch | URL |
|-------------|---------|--------|-----|
| **Local** | Development | feature/* | http://localhost:4200 |
| **Development** | Testing/QA | develop | dev.seniornavigator.com |
| **Staging** | Pre-production | main | staging.seniornavigator.com |
| **Production** | Live users | release/* | app.seniornavigator.com |

---

## Local Development

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd senior_navigator_v4

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Start development servers
./start_servers.sh
```

### Manual Start (Alternative)

**Terminal 1 - Frontend:**
```bash
cd frontend
npm start
# Runs on http://localhost:4200
```

**Terminal 2 - Backend:**
```bash
cd backend
node server.js
# Runs on http://localhost:3000
```

### Environment Variables (Local)

**Frontend: `frontend/src/environments/environment.ts`**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  llm: {
    enabled: true,
    defaultMode: 'shadow' // off | shadow | assist
  },
  features: {
    gcpModule: true,
    costPlanner: true,
    pfma: true
  }
};
```

**Backend: `backend/.env`**
```bash
PORT=3000
NODE_ENV=development

# OpenAI API
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_MODEL=gpt-4o-mini

# LLM Policy
LLM_MODE=shadow      # off | shadow | assist
CONFIDENCE_THRESHOLD=0.7

# Feature Flags
ENABLE_GCP=true
ENABLE_COST_PLANNER=true

# Logging
DEBUG_LLM=off        # on | off
LOG_LEVEL=info       # debug | info | warn | error
```

---

## Building for Production

### Frontend Build

```bash
cd frontend

# Production build
npm run build

# Output: dist/senior-navigator-v4/browser/
```

**Build Configuration:**

`frontend/angular.json` (production settings):
```json
{
  "configurations": {
    "production": {
      "optimization": true,
      "outputHashing": "all",
      "sourceMap": false,
      "namedChunks": false,
      "aot": true,
      "extractLicenses": true,
      "budgets": [
        {
          "type": "initial",
          "maximumWarning": "2mb",
          "maximumError": "5mb"
        }
      ]
    }
  }
}
```

**Build Optimizations:**
- **AOT Compilation** - Faster rendering
- **Tree Shaking** - Remove unused code
- **Minification** - Smaller bundle size
- **Output Hashing** - Cache busting

### Backend Build

Backend is pure Node.js (no build step needed):

```bash
cd backend

# Install production dependencies only
npm install --production

# Verify no dev dependencies
ls node_modules/  # Should not include jest, nodemon, etc.
```

---

## Deployment Options

### Option 1: Traditional Server (VPS/EC2)

**Architecture:**
```
Internet → nginx (port 80/443) → 
  ├─ Static Files (Angular dist/)
  └─ API Proxy (Node.js backend on port 3000)
```

#### Step 1: Server Setup

```bash
# SSH into server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
sudo apt-get install nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### Step 2: Deploy Backend

```bash
# Create app directory
sudo mkdir -p /var/www/senior-navigator/backend
cd /var/www/senior-navigator/backend

# Copy backend files (via SCP, git, or rsync)
rsync -avz backend/ user@server:/var/www/senior-navigator/backend/

# Install dependencies
npm install --production

# Create .env file
nano .env
# (Paste production environment variables)

# Start with PM2
pm2 start server.js --name "senior-nav-api"
pm2 save
pm2 startup  # Enable auto-start on reboot
```

#### Step 3: Deploy Frontend

```bash
# Build locally
cd frontend
npm run build

# Copy dist to server
rsync -avz dist/senior-navigator-v4/browser/ user@server:/var/www/senior-navigator/frontend/

# Set permissions
sudo chown -R www-data:www-data /var/www/senior-navigator/frontend
```

#### Step 4: Configure nginx

**`/etc/nginx/sites-available/senior-navigator`**

```nginx
server {
    listen 80;
    server_name app.seniornavigator.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.seniornavigator.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seniornavigator.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seniornavigator.com/privkey.pem;

    # Frontend - Serve Angular static files
    root /var/www/senior-navigator/frontend;
    index index.html;

    # Angular routing - Fallback to index.html for SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API - Proxy to Node.js backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/senior-navigator /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### Step 5: SSL Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d app.seniornavigator.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run  # Test renewal
```

---

### Option 2: Docker Deployment

**Architecture:**
```
Internet → nginx container (port 80/443) →
  ├─ Frontend container (Angular)
  └─ Backend container (Node.js API)
```

#### Dockerfile - Backend

**`backend/Dockerfile`**
```dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

#### Dockerfile - Frontend

**`frontend/Dockerfile`**
```dockerfile
# Stage 1: Build Angular app
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built Angular app
COPY --from=build /usr/src/app/dist/senior-navigator-v4/browser /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/nginx.conf`**
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Angular SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (to backend container)
    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Docker Compose

**`docker-compose.yml`**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: senior-nav-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LLM_MODE=${LLM_MODE}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  frontend:
    build: ./frontend
    container_name: senior-nav-web
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - ./ssl:/etc/nginx/ssl:ro  # SSL certificates
```

**Deployment Commands:**
```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

### Option 3: Cloud Platform (AWS/GCP/Azure)

#### AWS Example (Elastic Beanstalk + S3)

**Frontend → S3 + CloudFront:**
```bash
# Build frontend
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/senior-navigator-v4/browser/ s3://senior-nav-frontend/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123456789 --paths "/*"
```

**Backend → Elastic Beanstalk:**
```bash
# Initialize EB
cd backend
eb init -p node.js-20 senior-navigator-api

# Create environment
eb create production --cname senior-nav-api

# Deploy
eb deploy
```

---

## Environment Variables

### Frontend Environment Files

**Development: `environment.ts`**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  llm: { enabled: true, defaultMode: 'shadow' },
  features: { gcpModule: true },
  analytics: { enabled: false }
};
```

**Production: `environment.prod.ts`**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.seniornavigator.com/api',
  llm: { enabled: true, defaultMode: 'assist' },
  features: { gcpModule: true },
  analytics: { enabled: true, gtag: 'G-XXXXXXXXXX' }
};
```

### Backend Environment Variables

**Required:**
```bash
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=sk-...          # Required for LLM features
```

**Optional:**
```bash
# LLM Configuration
OPENAI_MODEL=gpt-4o-mini       # Default: gpt-4o-mini
LLM_MODE=assist                # off | shadow | assist
CONFIDENCE_THRESHOLD=0.7       # 0.0 - 1.0
TEMPERATURE=0.7                # 0.0 - 2.0

# Feature Flags
ENABLE_GCP=true
ENABLE_COST_PLANNER=true
ENABLE_PFMA=false

# Logging
LOG_LEVEL=info                 # debug | info | warn | error
DEBUG_LLM=off                  # on | off

# Rate Limiting
RATE_LIMIT_WINDOW=15           # Minutes
RATE_LIMIT_MAX_REQUESTS=100    # Per window

# CORS
CORS_ORIGIN=https://app.seniornavigator.com
```

### Securing API Keys

**Never commit API keys to git!**

**Option 1: .env file (local/server)**
```bash
# Create .env file
echo "OPENAI_API_KEY=sk-..." > backend/.env

# Add to .gitignore
echo ".env" >> .gitignore
```

**Option 2: Environment Variables (Docker)**
```bash
# Pass at runtime
docker run -e OPENAI_API_KEY=sk-... senior-nav-api
```

**Option 3: Secrets Manager (AWS/GCP)**
```bash
# AWS Secrets Manager
aws secretsmanager create-secret --name openai-api-key --secret-string "sk-..."

# Retrieve in app
const key = await secretsManager.getSecretValue({ SecretId: 'openai-api-key' }).promise();
```

---

## Health Checks

### Backend Health Endpoint

**Add to `backend/server.js`:**
```javascript
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    features: {
      gcp: process.env.ENABLE_GCP === 'true',
      llm: !!process.env.OPENAI_API_KEY
    }
  });
});
```

**Test:**
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-09T10:30:00.000Z",
  "uptime": 12345.67,
  "environment": "production",
  "features": {
    "gcp": true,
    "llm": true
  }
}
```

### Frontend Health Check

**Add to `frontend/src/app/app.ts`:**
```typescript
import { HttpClient } from '@angular/common/http';

export class App {
  constructor(private http: HttpClient) {
    this.checkBackendHealth();
  }

  checkBackendHealth() {
    this.http.get('/api/health').subscribe({
      next: (health) => console.log('Backend healthy:', health),
      error: (err) => console.error('Backend unreachable:', err)
    });
  }
}
```

---

## Monitoring

### Application Monitoring (Recommended: Sentry)

**Install Sentry:**
```bash
# Frontend
cd frontend
npm install @sentry/angular-ivy

# Backend
cd backend
npm install @sentry/node
```

**Frontend Setup (`frontend/src/app/app.config.ts`):**
```typescript
import * as Sentry from '@sentry/angular-ivy';

Sentry.init({
  dsn: 'https://...@sentry.io/...',
  environment: environment.production ? 'production' : 'development',
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.routingInstrumentation
    })
  ]
});
```

**Backend Setup (`backend/server.js`):**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'https://...@sentry.io/...',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

// Error handler middleware
app.use(Sentry.Handlers.errorHandler());
```

### Logging

**Structured Logging with Winston:**

```bash
cd backend
npm install winston
```

**`backend/logger.js`:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;
```

**Usage:**
```javascript
const logger = require('./logger');

logger.info('Assessment submitted', { userId: 123, careTier: 'assisted_living' });
logger.error('LLM request failed', { error: err.message });
```

### Performance Monitoring

**Track Key Metrics:**

```javascript
// Backend - Track response times
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    });
  });
  next();
});
```

**Key Metrics to Monitor:**
- Request latency (p50, p95, p99)
- Error rate (%)
- LLM request success rate
- Assessment submission rate
- Page load time (frontend)

---

## Rollback Strategy

### Quick Rollback (PM2)

```bash
# View process history
pm2 list

# Rollback to previous version
pm2 restart senior-nav-api --update-env

# If using git deployment:
git checkout <previous-commit>
npm install
pm2 restart senior-nav-api
```

### Docker Rollback

```bash
# Tag images with version
docker tag senior-nav-api:latest senior-nav-api:v1.2.3

# Rollback to specific version
docker-compose down
docker-compose up -d senior-nav-api:v1.2.2
```

### Blue-Green Deployment

**Setup:**
```bash
# Deploy to "green" environment while "blue" is live
pm2 start server.js --name "senior-nav-api-green" -- --port 3001

# Test green environment
curl http://localhost:3001/api/health

# Switch nginx to green
sudo nano /etc/nginx/sites-available/senior-navigator
# Change proxy_pass to http://localhost:3001

sudo nginx -t && sudo systemctl reload nginx

# Stop blue environment
pm2 stop senior-nav-api-blue
```

---

## Production Checklist

### Pre-Deployment

- [ ] **Environment variables set** (API keys, feature flags)
- [ ] **Secrets secured** (not in git, using secure storage)
- [ ] **Frontend built for production** (`npm run build`)
- [ ] **Backend dependencies installed** (`npm install --production`)
- [ ] **Health checks working** (`/api/health` returns 200)
- [ ] **SSL certificates valid** (not expired)
- [ ] **Logging configured** (Winston, Sentry)
- [ ] **Monitoring enabled** (error tracking, performance)

### Testing

- [ ] **Smoke test on staging** (basic flow works)
- [ ] **API endpoints tested** (assessment submission)
- [ ] **LLM integration tested** (OpenAI API working)
- [ ] **Error handling tested** (graceful failures)
- [ ] **Load testing completed** (can handle expected traffic)

### Security

- [ ] **HTTPS enabled** (SSL/TLS certificates)
- [ ] **CORS configured** (allowed origins only)
- [ ] **Rate limiting enabled** (prevent abuse)
- [ ] **Input validation** (XSS, SQL injection prevention)
- [ ] **API keys rotated** (if compromised)
- [ ] **Dependencies updated** (no known vulnerabilities)

### Performance

- [ ] **Gzip compression enabled** (nginx)
- [ ] **Static asset caching** (1 year for images/fonts)
- [ ] **CDN configured** (CloudFront, Cloudflare)
- [ ] **Database indexed** (if using database)
- [ ] **LLM timeout set** (prevent hanging requests)

### Monitoring

- [ ] **Error tracking active** (Sentry dashboard)
- [ ] **Uptime monitoring** (Pingdom, UptimeRobot)
- [ ] **Log aggregation** (CloudWatch, Datadog)
- [ ] **Alerts configured** (email/Slack for errors)
- [ ] **Performance dashboards** (response times, error rates)

### Documentation

- [ ] **Deployment runbook updated** (this guide!)
- [ ] **API documentation current** (endpoints, payloads)
- [ ] **Rollback procedure documented**
- [ ] **Contact info updated** (on-call engineers)

---

## Troubleshooting

### Backend Not Starting

**Symptom:** `npm start` fails or server crashes

**Check:**
```bash
# Check logs
pm2 logs senior-nav-api

# Common issues:
# - Missing .env file
# - Invalid API key
# - Port already in use
```

**Fix:**
```bash
# Check port availability
lsof -i :3000

# Kill process on port 3000
kill -9 <PID>

# Verify .env exists
ls -la .env

# Test API key
node -e "console.log(process.env.OPENAI_API_KEY)"
```

---

### Frontend Build Fails

**Symptom:** `npm run build` errors

**Check:**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit

# Check for circular dependencies
npx madge --circular src/
```

---

### 502 Bad Gateway (nginx)

**Symptom:** nginx returns 502 error

**Cause:** Backend not running or unreachable

**Fix:**
```bash
# Check backend status
pm2 status

# Restart backend
pm2 restart senior-nav-api

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

### LLM Requests Failing

**Symptom:** Assessments return deterministic only, no LLM advice

**Check:**
```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check backend logs
pm2 logs senior-nav-api | grep LLM
```

**Fix:**
```bash
# Update API key
echo "OPENAI_API_KEY=sk-new-key" >> .env
pm2 restart senior-nav-api
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review error logs (Sentry dashboard)
- [ ] Check uptime (> 99.9% expected)
- [ ] Review performance metrics (response times)

**Monthly:**
- [ ] Update dependencies (`npm update`)
- [ ] Rotate API keys (if policy requires)
- [ ] Review and archive old logs
- [ ] Run security audit (`npm audit`)

**Quarterly:**
- [ ] Load testing (ensure scalability)
- [ ] Disaster recovery drill (test backups)
- [ ] Review and update documentation

---

## Scaling Strategies

### Horizontal Scaling (Multiple Instances)

**Using PM2 Cluster Mode:**
```bash
# Start 4 instances (one per CPU core)
pm2 start server.js -i 4 --name "senior-nav-api"
```

**Using Docker + Load Balancer:**
```yaml
# docker-compose.yml
services:
  backend:
    image: senior-nav-api
    deploy:
      replicas: 3  # Run 3 instances
```

### Vertical Scaling (Bigger Server)

**AWS EC2 Instance Types:**
- Development: `t3.micro` (1 vCPU, 1GB RAM)
- Staging: `t3.small` (2 vCPU, 2GB RAM)
- Production: `t3.medium` (2 vCPU, 4GB RAM)

**Scale up when:**
- CPU consistently > 70%
- Memory usage > 80%
- Response times increasing

---

## Related Documentation

- [GCP Architecture Guide](./GCP_ARCHITECTURE.md) - System overview
- [Configuration Guide](./CONFIGURATION_GUIDE.md) - JSON configuration
- [Testing Guide](./TESTING_GUIDE.md) - Test strategy

---

## Support

**Deployment Issues:**
- Check logs first (`pm2 logs`, `docker logs`)
- Review health check endpoint (`/api/health`)
- Verify environment variables

**Production Incidents:**
1. Check status page / monitoring dashboard
2. Review recent deployments (rollback if needed)
3. Check error tracking (Sentry)
4. Contact on-call engineer

---

**Last Updated:** November 9, 2025  
**Version:** 1.0  
**Authors:** Senior Navigator Engineering Team
