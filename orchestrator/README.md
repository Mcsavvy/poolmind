# PoolMind Orchestrator API

The central orchestrator for the PoolMind pooled crypto arbitrage fund platform.

## Features

- **User Authentication**: Telegram Web App integration with JWT tokens
- **Profile Management**: User profile updates and preferences
- **Wallet Integration**: Stacks wallet linking and verification
- **KYC Management**: User verification workflow
- **API Documentation**: Comprehensive Swagger/OpenAPI documentation

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- MongoDB instance running
- Redis instance running (for background jobs)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/poolmind
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000` and the documentation at `http://localhost:3000/api-docs`.

## Authentication System

### Telegram Web App Authentication

The API supports Telegram Web App authentication flow:

1. **POST /api/v1/auth/telegram** - Authenticate with Telegram initData
2. **GET /api/v1/auth/profile** - Get current user profile
3. **PUT /api/v1/auth/profile** - Update user profile
4. **POST /api/v1/auth/wallet** - Link Stacks wallet address
5. **DELETE /api/v1/auth/wallet** - Unlink wallet address

### JWT Token Usage

After successful authentication, include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Management Features

- **Registration**: Automatic user creation on first Telegram login
- **Profile Updates**: Name, preferences, and language settings
- **Wallet Linking**: Secure Stacks wallet address association
- **KYC Status**: Verification workflow management
- **Account Deactivation**: Soft delete functionality

## API Structure

```
src/
├── config/          # Database and configuration
├── controllers/     # HTTP request handlers
├── middleware/      # Authentication and validation
├── models/          # MongoDB schemas
├── routes/          # API route definitions
├── services/        # Business logic
├── utils/           # Utilities and helpers
└── docs/            # API documentation
```

## Database Schema

### Users Collection

- `telegramId`: Unique Telegram user ID
- `username`: Telegram username
- `firstName`, `lastName`: User's name
- `walletAddress`: Linked Stacks wallet (optional)
- `kycStatus`: Verification status (pending/approved/rejected)
- `isActive`: Account status
- `preferences`: User preferences (notifications, language)

## Development

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (to be implemented)

### Code Style

- TypeScript for type safety
- ESLint and Prettier for code formatting
- Swagger/OpenAPI for API documentation
- Zod for request validation

## Next Steps

The authentication system is now ready. Next implementations should include:

1. **Pool Operations**: Deposit/withdrawal functionality
2. **Smart Contract Integration**: Stacks blockchain interactions
3. **AI Agent Communication**: Trading result reporting
4. **Admin Operations**: Platform management
5. **Background Jobs**: Transaction monitoring and processing

## API Documentation

Visit `http://localhost:3000/api-docs` when the server is running to explore the interactive API documentation. 