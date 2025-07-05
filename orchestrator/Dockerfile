# Multi-stage Dockerfile for Orchestrator
# Stage 1: Build backend and handle environment propagation
FROM node:20.19-alpine AS backend-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source code and scripts
COPY src/ ./src/
COPY scripts/ ./scripts/

# Install frontend dependencies
RUN cd src/frontend && npm ci

# Create .env file from build args for environment propagation
ARG NODE_ENV=production
ARG STACKS_NETWORK
ARG POOLMIND_CONTRACT_ADDRESS
ARG POOLMIND_CONTRACT_NAME

# Create temporary .env file for propagation
RUN echo "NODE_ENV=${NODE_ENV}" > .env && \
    echo "STACKS_NETWORK=${STACKS_NETWORK}" >> .env && \
    echo "POOLMIND_CONTRACT_ADDRESS=${POOLMIND_CONTRACT_ADDRESS}" >> .env && \
    echo "POOLMIND_CONTRACT_NAME=${POOLMIND_CONTRACT_NAME}" >> .env

# Propagate environment variables to frontend
RUN npm run propagate-env

# Build frontend with propagated environment variables
RUN cd src/frontend && npm run build

# Build backend
RUN npm run build:backend

# Copy frontend files to dist/public
RUN npm run copy:frontend

# Stage 2: Production image
FROM node:20.19-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S orchestrator -u 1001

# Copy root package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/scripts ./scripts

# Create logs directory
RUN mkdir -p logs && chown -R orchestrator:nodejs logs

# Switch to non-root user
USER orchestrator

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["npm", "start"] 