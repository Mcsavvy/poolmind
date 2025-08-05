# Authentication System - PoolMind Platform

This document explains how to use the wallet-based authentication system integrated with NextAuth.js and Stacks Connect.

## 🚀 Overview

The authentication system provides:
- Wallet-based authentication using Stacks Connect
- User profile management with optional fields
- Role-based access control (user, moderator, admin)
- Notification preferences management
- JWT session handling
- Protected routes and API endpoints

## 🛠️ Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/poolmind

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Stacks Network
NEXT_PUBLIC_STACKS_NETWORK=testnet  # or 'mainnet' for production

# Application
APP_NAME=PoolMind
```

## 🔐 How Authentication Works

### 1. Wallet Connection Flow
1. User clicks "Connect Wallet" button
2. Stacks Connect modal opens
3. User signs authentication message with their wallet
4. Server verifies signature and creates/updates user record
5. NextAuth session is established with JWT

### 2. User Model Structure
```typescript
interface IUser {
  // Primary authentication
  walletAddress: string;  // Required, unique
  publicKey?: string;
  
  // Profile (optional)
  username?: string;
  email?: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;
  
  // Metadata
  role: 'user' | 'admin' | 'moderator';
  isEmailVerified: boolean;
  notificationPreferences: INotificationPreferences;
  socialLinks?: object;
  connectionHistory: Array<object>;
}
```

## 🎯 Usage Examples

### Client-Side Components

#### Using the Wallet Connect Button
```tsx
import WalletConnectButton from '@/components/auth/wallet-connect-button';

function MyComponent() {
  return (
    <WalletConnectButton 
      variant="default" 
      size="lg"
      className="w-full"
    >
      Connect Your Wallet
    </WalletConnectButton>
  );
}
```

#### Using the User Profile Dropdown
```tsx
import UserProfileDropdown from '@/components/auth/user-profile-dropdown';

function Navbar() {
  return (
    <nav>
      {/* ... other nav items */}
      <UserProfileDropdown />
    </nav>
  );
}
```

#### Protecting Routes
```tsx
import ProtectedRoute from '@/components/auth/protected-route';

function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin only content</div>
    </ProtectedRoute>
  );
}
```

### Server-Side Usage

#### In API Routes
```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Your protected logic here
}
```

#### In Server Components
```tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  return <div>Welcome {session.user.displayName}!</div>;
}
```

## 🔧 Available API Endpoints

### Authentication
- `POST /api/auth/nonce` - Get authentication message for wallet signing
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### User Management
- `GET /api/user/profile` - Get current user profile
- `PATCH /api/user/profile` - Update user profile
- `GET /api/user/notifications` - Get notification preferences
- `PATCH /api/user/notifications` - Update notification preferences

## 🛡️ Security Features

### Message Signing
- Authentication messages include timestamp and nonce
- Messages expire after 5 minutes to prevent replay attacks
- Signatures are verified using Stacks encryption library

### Route Protection
- Middleware protects routes based on authentication status
- Role-based access control for admin/moderator functions
- API endpoints validate session tokens

### Data Validation
- Wallet address format validation
- Email and URL validation
- Input sanitization and filtering

## 🎛️ User Profile Management

### Updating Profile
```typescript
// Frontend usage
const updateProfile = async (data) => {
  const response = await fetch('/api/user/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};
```

### Notification Preferences
```typescript
const updateNotifications = async (preferences) => {
  const response = await fetch('/api/user/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences)
  });
  return response.json();
};
```

## 🔄 Session Management

### Using NextAuth Hook
```tsx
import { useSession } from 'next-auth/react';

function Component() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Please sign in</div>;
  
  return <div>Hello {session.user.displayName}!</div>;
}
```

### Signing Out
```tsx
import { signOut } from 'next-auth/react';

function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/' })}>
      Sign Out
    </button>
  );
}
```

## 📝 Role-Based Access

### Available Roles
- `user` - Default role for all users
- `moderator` - Can access moderator functions
- `admin` - Full access to all functions

### Checking Permissions
```typescript
// In User model
user.isAdmin() // Returns true if user is admin
user.isModerator() // Returns true if user is moderator or admin

// In API routes
import { requireAdmin, requireModerator } from '@/lib/auth';

const user = await requireAdmin(token); // Throws error if not admin
```

## 🧪 Testing Authentication

### Development Tips
- Use Stacks testnet for development
- Test with multiple wallet addresses
- Verify role-based access control
- Test session expiration and renewal

### Common Issues
- Ensure NEXTAUTH_URL matches your development URL
- Check MongoDB connection string
- Verify Stacks network configuration
- Make sure environment variables are loaded

This authentication system provides a robust foundation for wallet-based user management in your PoolMind application!