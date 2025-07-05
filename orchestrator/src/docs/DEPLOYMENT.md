# PoolMind Full-Stack Deployment Guide

This application serves a React frontend through an Express backend, with integrated Stacks wallet connection functionality.

## Architecture

- **Backend**: Express.js server with TypeScript
- **Frontend**: React + Vite with Stacks Connect integration
- **Deployment**: Single server serves both API and frontend

## Development Setup

### Prerequisites

- Node.js 20.19+
- npm or yarn
- MongoDB instance
- Redis instance

**Node.js Version Management:**
If you use nvm, you can set the correct Node.js version with:

```bash
nvm use  # Uses version specified in .nvmrc
```

### Environment Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Configure your `.env` file with required values:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/poolmind
JWT_SECRET=your-super-secret-jwt-key-here
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
POOLMIND_CONTRACT_ADDRESS=your-contract-address
```

### Development Commands

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm run build:frontend

# Start backend in development mode
npm run dev

# Start frontend development server (optional, for separate frontend dev)
npm run dev:frontend
```

In development, the Express server serves the frontend from `src/frontend/dist`.

## Production Deployment

### Build Process

The production build process:

1. **Frontend Build**: Compiles React app to static files
2. **Backend Build**: Compiles TypeScript to JavaScript
3. **Copy Frontend**: Moves frontend files to backend's static directory

```bash
# Build everything for production
npm run build:all

# Or step by step:
npm run build:frontend  # Build React app
npm run build:backend   # Compile TypeScript
npm run copy:frontend   # Copy frontend to backend
```

### Production Start

```bash
# Start production server
npm run start:prod
```

This will:

- Set `NODE_ENV=production`
- Build both frontend and backend
- Start the server

### Manual Production Start

```bash
# Set environment
export NODE_ENV=production

# Build (if not already done)
npm run build:all

# Start server
npm start
```

## File Structure

```
orchestrator/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server entry point
│   ├── config/            # Configuration files
│   ├── routes/            # API routes
│   └── frontend/          # React frontend
│       ├── src/
│       │   ├── components/
│       │   │   └── WalletConnect.tsx  # Wallet connection
│       │   ├── utils/
│       │   │   ├── api.ts             # Backend API calls
│       │   │   └── mobile.ts          # Mobile detection
│       │   └── types/
│       │       └── wallet.ts          # Type definitions
│       └── dist/          # Frontend build output
├── dist/                  # Backend build output
│   ├── public/           # Frontend files (production)
│   └── *.js              # Compiled backend
└── scripts/
    └── copy-frontend.js   # Cross-platform file copy
```

## Routing Strategy

### API Routes

- `/api/v1/*` - Backend API endpoints
- `/api-docs` - Swagger documentation
- `/health` - Health check endpoint

### Frontend Routes

- `/wallet/connect?access_token=...` - Wallet connection page
- `/*` - All other routes serve React app (client-side routing)

## Wallet Connection Flow

1. User navigates to `/wallet/connect?access_token=TOKEN`
2. Frontend detects device type (mobile/desktop)
3. For mobile: Shows wallet options with deep linking
4. For desktop: Direct wallet connection
5. On successful connection: Sends credentials to backend API
6. Backend can use credentials for smart contract interactions

## Environment-Specific Behavior

### Development (`NODE_ENV=development`)

- Frontend served from: `src/frontend/dist`
- Hot reloading available with separate dev servers
- Detailed error logging

### Production (`NODE_ENV=production`)

- Frontend served from: `dist/public`
- Optimized builds and static file serving
- Error handling for missing files

## Deployment Options

### Single Server Deployment

1. Build the application: `npm run build:all`
2. Start: `npm start`
3. Configure reverse proxy (nginx) if needed

### Container Deployment

```dockerfile
FROM node:20.19-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build:all

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables in Production

Make sure to set:

- `NODE_ENV=production`
- `MONGODB_URI` (production database)
- `JWT_SECRET` (secure random string)
- All other required environment variables

## Troubleshooting

### Frontend Not Loading

- Check if `dist/public` directory exists and contains files
- Verify `NODE_ENV` is set correctly
- Check server logs for file serving errors

### API Routes Not Working

- Ensure routes don't conflict with static file paths
- Check API base URL configuration in frontend
- Verify CORS settings for production

### Wallet Connection Issues

- Check frontend environment variables (`VITE_API_BASE_URL`)
- Verify access token is passed correctly in URL
- Check browser console for Stacks Connect errors
