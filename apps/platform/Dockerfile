# Multi-stage build for Next.js platform
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/platform/package.json ./apps/platform/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build

# Accept build arguments for environment variables
ARG NEXT_PUBLIC_STACKS_NETWORK
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ARG NEXT_PUBLIC_TELEGRAM_GROUP_LINK
ARG NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_SUPPORT_PHONE
ARG NEXT_PUBLIC_DEMO_LINK
ARG NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_POOLMIND_CONTRACT_NAME

# Set environment variables for build
ENV NEXT_PUBLIC_STACKS_NETWORK=$NEXT_PUBLIC_STACKS_NETWORK
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_PUBLIC_TELEGRAM_GROUP_LINK=$NEXT_PUBLIC_TELEGRAM_GROUP_LINK
ENV NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK=$NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK
ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_SUPPORT_PHONE=$NEXT_PUBLIC_SUPPORT_PHONE
ENV NEXT_PUBLIC_DEMO_LINK=$NEXT_PUBLIC_DEMO_LINK
ENV NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS=$NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_POOLMIND_CONTRACT_NAME=$NEXT_PUBLIC_POOLMIND_CONTRACT_NAME

# Copy source code
COPY . .

# Build the application
RUN pnpm build --filter=@poolmind/platform

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/platform/package.json ./apps/platform/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from build stage
COPY --from=build --chown=nextjs:nodejs /app/apps/platform/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/platform/.next/static ./apps/platform/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/platform/public ./apps/platform/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "apps/platform/server.js"]
