# Multi-stage build for NestJS orchestrator
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/orchestrator/package.json ./apps/orchestrator/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build the application
RUN pnpm build --filter=@poolmind/orchestrator

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/orchestrator/package.json ./apps/orchestrator/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/apps/orchestrator/dist ./apps/orchestrator/dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/docs', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "apps/orchestrator/dist/main.js"]
