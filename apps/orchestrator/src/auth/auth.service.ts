import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifyMessageSignatureRsv } from '@stacks/encryption';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../config/env.schema';
import { IUser, IUserModel } from '../lib/models/user';

export interface WalletCredentials {
  walletAddress: string;
  publicKey: string;
  signature: string;
  message: string;
  walletType?: string;
  network?: 'mainnet' | 'testnet' | 'devnet';
}

export interface AuthMessage {
  walletAddress: string;
  timestamp: string;
  nonce: string;
  domain?: string;
}

export interface JwtPayload {
  sub: string; // User ID
  walletAddress: string;
  role: 'user' | 'admin' | 'moderator';
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly jwtService: JwtService,
    @InjectModel('User') private readonly userModel: Model<IUser>,
  ) {}

  /**
   * Verify Stacks signature
   */
  async verifyStacksSignature(
    message: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    try {
      const isValid = verifyMessageSignatureRsv({
        message,
        signature,
        publicKey,
      });
      return isValid;
    } catch (error) {
      console.error('Error verifying Stacks signature:', error);
      return false;
    }
  }

  /**
   * Parse authentication message
   */
  parseAuthMessage(message: string): AuthMessage | null {
    try {
      const walletAddressMatch = message.match(/Wallet Address: (.+)/);
      const timestampMatch = message.match(/Timestamp: (.+)/);
      const nonceMatch = message.match(/Nonce: (.+)/);
      const domainMatch = message.match(/Domain: (.+)/);

      if (!walletAddressMatch || !timestampMatch || !nonceMatch) {
        return null;
      }

      return {
        walletAddress: walletAddressMatch[1],
        timestamp: timestampMatch[1],
        nonce: nonceMatch[1],
        domain: domainMatch?.[1],
      };
    } catch (error) {
      console.error('Error parsing auth message:', error);
      return null;
    }
  }

  /**
   * Generate authentication message for wallet signing
   */
  generateAuthMessage(walletAddress: string, nonce?: string): string {
    const timestamp = new Date().toISOString();
    const randomNonce = nonce || Math.random().toString(36).substring(2);
    let message = 'Sign this message to authenticate with PoolMind\n';
    message += `\nDomain: poolmind-orchestrator`;
    message += `\nWallet Address: ${walletAddress}`;
    message += `\nTimestamp: ${timestamp}`;
    message += `\nNonce: ${randomNonce}`;
    message += `\n\nBy signing this message, you confirm that you are the owner of this wallet address and agree to authenticate with PoolMind.`;
    return message;
  }

  /**
   * Authenticate user with wallet credentials
   */
  async authenticateWallet(
    credentials: WalletCredentials,
    ipAddress?: string,
  ): Promise<{ user: IUser; token: string }> {
    const {
      walletAddress,
      publicKey,
      signature,
      message,
      walletType = 'unknown',
      // network = 'testnet',
    } = credentials;

    // Verify the message signature
    const isValidSignature = await this.verifyStacksSignature(
      message,
      signature,
      publicKey,
    );

    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    // Parse and validate the auth message
    const messageData = this.parseAuthMessage(message);
    if (!messageData) {
      throw new UnauthorizedException('Invalid message format');
    }

    // Validate wallet address
    if (messageData.walletAddress !== walletAddress) {
      throw new UnauthorizedException('Wallet address mismatch');
    }

    // Check if message is recent (within 5 minutes to prevent replay attacks)
    const signedAt = new Date(messageData.timestamp);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (signedAt < fiveMinutesAgo) {
      throw new UnauthorizedException('Signature expired');
    }

    // Find or create user
    let user = await this.userModel.findOne({ walletAddress });

    if (!user) {
      // Create new user
      user = new this.userModel({
        walletAddress,
        publicKey,
        connectionHistory: [
          {
            connectedAt: new Date(),
            walletType,
            ipAddress,
          },
        ],
      });
      await user.save();
    } else {
      // Update existing user
      user.lastLoginAt = new Date();
      user.loginCount += 1;
      user.connectionHistory.unshift({
        connectedAt: new Date(),
        walletType,
        ipAddress,
      });

      // Keep only last 10 connections
      if (user.connectionHistory.length > 10) {
        user.connectionHistory = user.connectionHistory.slice(0, 10);
      }

      await user.save();
    }

    // Generate JWT token
    const token = await this.generateToken(user);

    return { user, token };
  }

  /**
   * Generate JWT token for user
   */
  async generateToken(user: IUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      walletAddress: user.walletAddress,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<IUser | null> {
    try {
      const secret = this.configService.get<string>('auth.jwtSecret')!;
      const payload = jwt.verify(token, secret) as JwtPayload;

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await this.userModel.findById(userId);
      return user?.isActive ? user : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(oldToken: string): Promise<string | null> {
    const user = await this.verifyToken(oldToken);
    if (!user) return null;

    return this.generateToken(user);
  }
}
