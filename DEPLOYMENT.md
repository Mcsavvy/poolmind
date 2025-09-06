# PoolMind Deployment Guide

This guide covers deploying the PoolMind monorepo on a VPS using Coolify with Docker Compose.

## 🏗️ Architecture Overview

PoolMind consists of two main services:
- **Orchestrator**: NestJS API backend (Port 3001)
- **Platform**: Next.js frontend (Port 3000)

External dependencies:
- **MongoDB**: Database (external)
- **Redis**: Caching and job queue (external)

## 🚀 Deployment Options

### Recommended: Docker Compose with Coolify

**Why Docker Compose?**
- ✅ Perfect for monorepo deployments
- ✅ Easy service orchestration
- ✅ Excellent Coolify integration
- ✅ Simplified environment management
- ✅ Built-in health checks and restart policies

## 📋 Prerequisites

1. **VPS with Docker installed**
2. **Coolify instance running**
3. **External MongoDB database**
4. **External Redis instance**
5. **Domain names configured**

## 🔧 Setup Instructions

### 1. Prepare External Services

#### MongoDB Setup
```bash
# Create MongoDB database
# Use MongoDB Atlas or self-hosted MongoDB
# Ensure network access is configured
```

#### Redis Setup
```bash
# Create Redis instance
# Use Redis Cloud or self-hosted Redis
# Ensure network access is configured
```

### 2. Environment Configuration

1. Copy the environment template:
```bash
cp env.production.example .env.production
```

2. Fill in your production values:
```bash
# Database Configuration
DATABASE_URI=mongodb://username:password@your-mongodb-host:27017/poolmind_prod?authSource=admin
DATABASE_NAME=poolmind_prod

# CORS Configuration
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Stacks Blockchain Configuration
STACKS_NETWORK=mainnet
POOLMIND_CONTRACT_ADDRESS=your-mainnet-contract-address
POOLMIND_CONTRACT_NAME=poolmind-v1-2

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username
TELEGRAM_CHANNEL_ID=your-channel-id
TELEGRAM_GROUP_LINK=https://t.me/your-group
TELEGRAM_CHANNEL_LINK=https://t.me/your-channel

# Redis Configuration
REDIS_URL=redis://username:password@your-redis-host:6379

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS=your-mainnet-contract-address
NEXT_PUBLIC_POOLMIND_CONTRACT_NAME=poolmind-v1-2
```

### 3. Coolify Deployment

#### Option A: Docker Compose Deployment (Recommended)

1. **Create New Application in Coolify**
   - Choose "Docker Compose" as deployment method
   - Connect your Git repository

2. **Configure Build Settings**
   - Build Context: `/` (root of repository)
   - Docker Compose File: `docker-compose.prod.yml`
   - Environment File: `.env.production`

3. **Set Environment Variables**
   - Add all environment variables from `.env.production`
   - Ensure sensitive values are properly secured

4. **Configure Domains**
   - Platform: `https://your-domain.com`
   - Orchestrator: `https://api.your-domain.com`

#### Option B: Separate Service Deployment

If you prefer to deploy services separately:

1. **Deploy Orchestrator**
   - Use `apps/orchestrator/Dockerfile`
   - Set port to 3001
   - Configure environment variables

2. **Deploy Platform**
   - Use `apps/platform/Dockerfile`
   - Set port to 3000
   - Configure environment variables

### 4. Domain Configuration

#### Nginx Reverse Proxy (if not using Coolify's built-in proxy)

```nginx
# /etc/nginx/sites-available/poolmind
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    location / {
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
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 Health Checks

Both services include health check endpoints:

- **Platform**: `GET /api/health`
- **Orchestrator**: `GET /api/docs` (Swagger UI)

## 📊 Monitoring

### Service Health
```bash
# Check orchestrator health
curl https://api.your-domain.com/api/docs

# Check platform health
curl https://your-domain.com/api/health
```

### Logs
```bash
# View orchestrator logs
docker logs poolmind-orchestrator-prod

# View platform logs
docker logs poolmind-platform-prod
```

## 🔄 Updates and Maintenance

### Updating Services
1. Push changes to your Git repository
2. Coolify will automatically rebuild and redeploy
3. Monitor health checks to ensure successful deployment

### Database Migrations
```bash
# Connect to MongoDB and run any necessary migrations
# The application handles schema validation automatically
```

## 🛠️ Troubleshooting

### Common Issues

1. **Service won't start**
   - Check environment variables
   - Verify external service connectivity
   - Review container logs

2. **Database connection issues**
   - Verify MongoDB URI format
   - Check network connectivity
   - Ensure authentication credentials

3. **CORS errors**
   - Verify CORS_ORIGINS configuration
   - Check domain configuration

4. **Build failures**
   - Ensure all dependencies are properly installed
   - Check Docker build context
   - Verify file permissions

### Debug Commands
```bash
# Check running containers
docker ps

# View container logs
docker logs <container-name>

# Execute commands in container
docker exec -it <container-name> /bin/sh

# Check service health
curl -f http://localhost:3000/api/health
curl -f http://localhost:3001/api/docs
```

## 🔒 Security Considerations

1. **Environment Variables**
   - Use strong, unique secrets
   - Rotate JWT secrets regularly
   - Never commit secrets to Git

2. **Network Security**
   - Use HTTPS for all external communication
   - Configure proper firewall rules
   - Limit database access to application servers

3. **Container Security**
   - Run containers as non-root users
   - Keep base images updated
   - Use specific image tags

## 📈 Performance Optimization

1. **Resource Limits**
   - Set appropriate CPU and memory limits
   - Monitor resource usage
   - Scale services as needed

2. **Caching**
   - Configure Redis caching strategies
   - Use CDN for static assets
   - Implement proper cache headers

3. **Database Optimization**
   - Create appropriate indexes
   - Monitor query performance
   - Use connection pooling

## 🆘 Support

For deployment issues:
1. Check the troubleshooting section
2. Review container logs
3. Verify environment configuration
4. Test external service connectivity

---

**Deployment Checklist:**
- [ ] External MongoDB configured and accessible
- [ ] External Redis configured and accessible
- [ ] Environment variables set correctly
- [ ] Domain names configured
- [ ] SSL certificates installed
- [ ] Health checks passing
- [ ] Services responding correctly
- [ ] Monitoring configured
