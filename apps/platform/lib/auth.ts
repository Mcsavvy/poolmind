import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyMessageSignatureRsv } from '@stacks/encryption';
import apiClient from './api-client';
import { clientConfig } from './config';
import type { UserProfileResponse } from '@poolmind/shared-types';

// Type for the user object returned from API responses
type ApiUser = UserProfileResponse['user'];

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      walletAddress: string;
      username?: string;
      displayName?: string;
      email?: string;
      profilePicture?: string;
      role: 'user' | 'admin' | 'moderator';
      isEmailVerified: boolean;
    };
  }

  interface User {
    id: string;
    walletAddress: string;
    username?: string;
    displayName?: string;
    email?: string;
    profilePicture?: string;
    role: 'user' | 'admin' | 'moderator';
    isEmailVerified: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    walletAddress: string;
    username?: string;
    displayName?: string;
    email?: string;
    profilePicture?: string;
    role: 'user' | 'admin' | 'moderator';
    isEmailVerified: boolean;
  }
}

// Utility function to verify Stacks signature
async function verifyStacksSignature(
  message: string,
  signature: string,
  publicKey: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<boolean> {
  try {
    // Verify the signature using Stacks encryption library
    const isValid = verifyMessageSignatureRsv({
      message,
      signature,
      publicKey
    });
    
    return isValid;
  } catch (error) {
    console.error('Error verifying Stacks signature:', error);
    return false;
  }
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'stacks-wallet',
      name: 'Stacks Wallet',
      credentials: {
        walletAddress: { label: 'Wallet Address', type: 'text' },
        publicKey: { label: 'Public Key', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
        message: { label: 'Message', type: 'text' },
        walletType: { label: 'Wallet Type', type: 'text' },
        network: { label: 'Network', type: 'text' }
      },
      async authorize(credentials, req) {
        if (!credentials?.walletAddress || !credentials?.signature || !credentials?.message || !credentials?.publicKey) {
          throw new Error('Missing required wallet credentials');
        }

        try {
          // Verify the message signature
          const isValidSignature = await verifyStacksSignature(
            credentials.message,
            credentials.signature,
            credentials.publicKey,
            credentials.network as 'mainnet' | 'testnet'
          );

          if (!isValidSignature) {
            throw new Error('Invalid wallet signature');
          }

          // Parse and validate the auth message
          const messageData = parseAuthMessage(credentials.message);
          if (!messageData) {
            throw new Error('Invalid message format');
          }

          // Validate wallet address
          if (messageData.walletAddress !== credentials.walletAddress) {
            throw new Error('Wallet address mismatch');
          }

          // Check if message is recent (within 5 minutes to prevent replay attacks)
          const signedAt = new Date(messageData.timestamp);
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

          if (signedAt < fiveMinutesAgo) {
            throw new Error('Signature expired');
          }

          // Authenticate with NestJS API
          const loginResponse = await apiClient.login({
            walletAddress: credentials.walletAddress,
            publicKey: credentials.publicKey,
            signature: credentials.signature,
            message: credentials.message,
            walletType: credentials.walletType,
            network: credentials.network as 'mainnet' | 'testnet'
          });

          if (!loginResponse.success) {
            throw new Error('Authentication failed');
          }

          const { user } = loginResponse;

          // Return user data for NextAuth
          return {
            id: user.id,
            walletAddress: user.walletAddress,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            profilePicture: user.profilePicture,
            role: user.role,
            isEmailVerified: user.isEmailVerified
          };
        } catch (error) {
          console.error('Wallet authentication error:', error);
          throw new Error(error instanceof Error ? error.message : 'Authentication failed');
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  jwt: {
    maxAge: clientConfig.sessionMaxAge
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
        token.displayName = user.displayName;
        token.email = user.email;
        token.profilePicture = user.profilePicture;
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
      }
      
      // Return previous token if the access token has not expired
      return token;
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id;
        session.user.walletAddress = token.walletAddress;
        session.user.username = token.username;
        session.user.displayName = token.displayName;
        session.user.email = token.email;
        session.user.profilePicture = token.profilePicture;
        session.user.role = token.role;
        session.user.isEmailVerified = token.isEmailVerified;
      }
      
      return session;
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log successful sign-ins
      console.log(`User signed in: ${user.walletAddress}`);
    },
    
    async signOut({ token }) {
      // Log sign-outs
      console.log(`User signed out: ${token?.walletAddress}`);
    }
  },
  
  debug: clientConfig.nodeEnv === 'development',
};

// Utility functions for authentication
export async function getCurrentUser(token: JWT | null): Promise<ApiUser | null> {
  if (!token?.walletAddress) return null;
  
  try {
    // Use the token to get current user from API
    if (apiClient.getToken()) {
      const response = await apiClient.getCurrentUser();
      return response.user;
    }
    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function requireAuth(token: JWT | null): Promise<ApiUser> {
  const user = await getCurrentUser(token);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireAdmin(token: JWT | null): Promise<ApiUser> {
  const user = await requireAuth(token);
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

export async function requireModerator(token: JWT | null): Promise<ApiUser> {
  const user = await requireAuth(token);
  if (!['admin', 'moderator'].includes(user.role)) {
    throw new Error('Moderator access required');
  }
  return user;
}

// Generate authentication message for wallet signing
export async function generateAuthMessage(walletAddress: string): Promise<string> {
  try {
    const response = await apiClient.generateNonce({ walletAddress });
    return response.message;
  } catch (error) {
    console.error('Error generating auth message:', error);
    // Fallback to local generation if API fails
    const timestamp = new Date().toISOString();
    const randomNonce = Math.random().toString(36).substring(2);
    let message = "Sign this message to authenticate with PoolMind\n"
    message += `\nDomain: ${clientConfig.nextAuthUrl}`
    message += `\nWallet Address: ${walletAddress}`
    message += `\nTimestamp: ${timestamp}`
    message += `\nNonce: ${randomNonce}`
    message += `\n\nBy signing this message, you confirm that you are the owner of this wallet address and agree to authenticate with PoolMind.`
    return message;
  }
}

// Helper function to parse plain text auth message
function parseAuthMessage(message: string): { walletAddress: string; timestamp: string; nonce: string } | null {
  try {
    const walletAddressMatch = message.match(/Wallet Address: (.+)/);
    const timestampMatch = message.match(/Timestamp: (.+)/);
    const nonceMatch = message.match(/Nonce: (.+)/);
    
    if (!walletAddressMatch || !timestampMatch || !nonceMatch) {
      return null;
    }
    
    return {
      walletAddress: walletAddressMatch[1],
      timestamp: timestampMatch[1],
      nonce: nonceMatch[1]
    };
  } catch (error) {
    return null;
  }
}


export default authOptions;