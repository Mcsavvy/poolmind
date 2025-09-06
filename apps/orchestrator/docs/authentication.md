# Authentication System - PoolMind Orchestrator

This document explains the wallet-based authentication system implemented in the PoolMind Orchestrator using NestJS, JWT tokens, and Stacks wallet signatures.

## 🚀 Overview

The authentication system provides:

- Wallet-based authentication using Stacks signatures
- JWT token-based session management
- Role-based access control (user, moderator, admin)
- User profile management
- Optional authentication for flexible endpoints
- Protected routes and API endpoints

## 🛠️ Environment Setup

Add these variables to your `.env.{environment}.local` file:

```bash
# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-here-at-least-32-characters
JWT_EXPIRES_IN=7d
STACKS_NETWORK=testnet  # or 'mainnet' for production
```

## 🔐 How Authentication Works

### 1. Wallet Authentication Flow

1. Client requests authentication message via `POST /auth/nonce`
2. Client signs the message with their Stacks wallet
3. Client submits signature via `POST /auth/login`
4. Server verifies signature and creates/updates user record
5. Server returns JWT token for subsequent requests

### 2. JWT Token Usage

- Include token in `Authorization: Bearer <token>` header
- Tokens are validated on protected routes
- Use `GET /auth/me` to get current user info
- Use `POST /auth/refresh` to refresh tokens

## 🎯 Usage Examples

### Client-Side Authentication Flow

```typescript
// 1. Get authentication message
const { message } = await fetch('/auth/nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: 'SP123...' }),
}).then((res) => res.json());

// 2. Sign message with wallet (implementation depends on wallet)
const signature = await signMessage(message);

// 3. Authenticate and get token
const { token, user } = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'SP123...',
    publicKey: '0x456...',
    signature: signature,
    message: message,
    walletType: 'xverse',
  }),
}).then((res) => res.json());

// 4. Use token for authenticated requests
const userProfile = await fetch('/users/profile', {
  headers: { Authorization: `Bearer ${token}` },
}).then((res) => res.json());
```

### Server-Side Route Protection

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../auth';
import { IUser } from '../lib/models/user';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin')
  getUsers(@CurrentUser() user: IUser) {
    // Only admin users can access this endpoint
    return { users: [], currentUser: user };
  }
}
```

### Public Routes

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth';

@Controller('public')
@Public() // This controller doesn't require authentication
export class PublicController {
  @Get('info')
  getInfo() {
    return { message: 'This is public information' };
  }
}
```

### Optional Authentication

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard, CurrentUser } from '../auth';
import { IUser } from '../lib/models/user';

@Controller('content')
@UseGuards(OptionalJwtAuthGuard)
export class ContentController {
  @Get('posts')
  getPosts(@CurrentUser() user?: IUser) {
    // User is populated if authenticated, undefined if not
    const posts = this.getPostsBasedOnUser(user);
    return { posts };
  }
}
```

## 🔧 Available Guards

- **JwtAuthGuard**: Requires valid JWT token
- **RolesGuard**: Requires specific user roles
- **OptionalJwtAuthGuard**: Populates user if token is valid, but doesn't require it

## 🏷️ Available Decorators

- **@Public()**: Marks routes as public (no authentication required)
- **@Roles('admin', 'moderator')**: Requires specific roles
- **@CurrentUser()**: Injects current user into route handler

## 📡 API Endpoints

### Authentication

- `POST /auth/nonce` - Generate authentication message
- `POST /auth/login` - Authenticate with wallet signature
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user information

### User Management

- `GET /users/profile` - Get user profile
- `PATCH /users/profile` - Update user profile
- `PATCH /users/notifications` - Update notification preferences
- `PATCH /users/social-links` - Update social media links
- `GET /users/stats` - Get user statistics (admin/moderator only)

## 🛡️ Security Features

- **Signature Verification**: Uses Stacks encryption library to verify wallet signatures
- **Message Expiry**: Authentication messages expire after 5 minutes
- **JWT Security**: Tokens are signed with a secure secret
- **Role-Based Access**: Fine-grained permission control
- **Input Validation**: All inputs are validated using class-validator
- **Rate Limiting**: Consider implementing rate limiting for auth endpoints

## 🔄 Token Refresh

Tokens can be refreshed using the refresh endpoint:

```typescript
const { token: newToken } = await fetch('/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: currentToken }),
}).then((res) => res.json());
```

## 🚦 Error Handling

The system returns appropriate HTTP status codes:

- `401 Unauthorized` - Invalid/missing token or signature
- `403 Forbidden` - Insufficient permissions
- `400 Bad Request` - Invalid input data
- `500 Internal Server Error` - Server-side errors

All error responses include descriptive messages for debugging.
