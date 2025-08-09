import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { verifyMessageSignatureRsv } from '@stacks/encryption';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { AppConfig } from '../config/env.schema';
import { IUser, type IUserModel } from '../lib/models/user';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

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

export interface TelegramCredentials {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface JwtPayload {
  sub: string; // User ID
  walletAddress?: string;
  telegramId?: number;
  role: 'user' | 'admin' | 'moderator';
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly jwtService: JwtService,
    @InjectModel('User') private readonly userModel: IUserModel,
    private readonly notificationsService: NotificationsService,
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
      this.logger.debug(`Verifying Stacks signature for public key: ${publicKey.substring(0, 20)}...`);
      
      const isValid = verifyMessageSignatureRsv({
        message,
        signature,
        publicKey,
      });
      
      if (isValid) {
        this.logger.debug(`✓ Stacks signature verification successful`);
      } else {
        this.logger.warn(`✗ Stacks signature verification failed`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error(`Error verifying Stacks signature:`, error);
      return false;
    }
  }

  /**
   * Parse authentication message
   */
  parseAuthMessage(message: string): AuthMessage | null {
    try {
      this.logger.debug(`Parsing authentication message`);
      
      const walletAddressMatch = message.match(/Wallet Address: (.+)/);
      const timestampMatch = message.match(/Timestamp: (.+)/);
      const nonceMatch = message.match(/Nonce: (.+)/);
      const domainMatch = message.match(/Domain: (.+)/);

      if (!walletAddressMatch || !timestampMatch || !nonceMatch) {
        this.logger.warn(`✗ Invalid authentication message format - missing required fields`);
        return null;
      }

      const authMessage = {
        walletAddress: walletAddressMatch[1],
        timestamp: timestampMatch[1],
        nonce: nonceMatch[1],
        domain: domainMatch?.[1],
      };

      this.logger.debug(`✓ Authentication message parsed successfully for wallet: ${authMessage.walletAddress.substring(0, 8)}...`);
      return authMessage;
    } catch (error) {
      this.logger.error(`Error parsing auth message:`, error);
      return null;
    }
  }

  /**
   * Generate authentication message for wallet signing
   */
  generateAuthMessage(walletAddress: string, nonce?: string): string {
    this.logger.debug(`Generating authentication message for wallet: ${walletAddress.substring(0, 8)}...`);
    
    const timestamp = new Date().toISOString();
    const randomNonce = nonce || Math.random().toString(36).substring(2);
    let message = 'Sign this message to authenticate with PoolMind\n';
    message += `\nDomain: poolmind-orchestrator`;
    message += `\nWallet Address: ${walletAddress}`;
    message += `\nTimestamp: ${timestamp}`;
    message += `\nNonce: ${randomNonce}`;
    message += `\n\nBy signing this message, you confirm that you are the owner of this wallet address and agree to authenticate with PoolMind.`;
    
    this.logger.debug(`✓ Authentication message generated with nonce: ${randomNonce}`);
    return message;
  }

  /**
   * Authenticate user with wallet credentials
   */
  async authenticateWallet(
    credentials: WalletCredentials,
    ipAddress?: string,
  ): Promise<{ user: IUser; token: string; expiresAt: number }> {
    const {
      walletAddress,
      publicKey,
      signature,
      message,
      walletType = 'unknown',
      // network = 'testnet',
    } = credentials;

    this.logger.log(`🔐 Starting wallet authentication for: ${walletAddress.substring(0, 8)}... (IP: ${ipAddress})`);

    // Verify the message signature
    const isValidSignature = await this.verifyStacksSignature(
      message,
      signature,
      publicKey,
    );

    if (!isValidSignature) {
      this.logger.warn(`✗ Invalid wallet signature for: ${walletAddress.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid wallet signature');
    }

    // Parse and validate the auth message
    const messageData = this.parseAuthMessage(message);
    if (!messageData) {
      this.logger.warn(`✗ Invalid message format for: ${walletAddress.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid message format');
    }

    // Validate wallet address
    if (messageData.walletAddress !== walletAddress) {
      this.logger.warn(`✗ Wallet address mismatch for: ${walletAddress.substring(0, 8)}... (expected: ${messageData.walletAddress.substring(0, 8)}...)`);
      throw new UnauthorizedException('Wallet address mismatch');
    }

    // Check if message is recent (within 5 minutes to prevent replay attacks)
    const signedAt = new Date(messageData.timestamp);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (signedAt < fiveMinutesAgo) {
      this.logger.warn(`✗ Signature expired for: ${walletAddress.substring(0, 8)}... (signed at: ${signedAt.toISOString()})`);
      throw new UnauthorizedException('Signature expired');
    }

    // Find or create user
    let user = await this.userModel.findOne({ walletAddress });

    if (!user) {
      // Create new user
      this.logger.log(`👤 Creating new user for wallet: ${walletAddress.substring(0, 8)}...`);
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
      this.logger.log(`✓ New user created with ID: ${user._id}`);
    } else {
      // Update existing user
      this.logger.debug(`👤 Updating existing user ${user._id} login info (login count: ${user.loginCount + 1})`);
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
    const { token, expiresAt } = await this.generateToken(user);

    this.logger.log(`✓ Wallet authentication successful for user ${user._id} (${walletAddress.substring(0, 8)}...)`);
    return { user, token, expiresAt };
  }

  /**
   * Verify Telegram auth data
   */
  verifyTelegramAuth(data: TelegramCredentials): boolean {
    this.logger.debug(`Verifying Telegram auth data for user ${data.id}`);
    
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      this.logger.error('Telegram bot token not configured');
      throw new Error('Telegram bot token not configured');
    }

    const { hash, ...authData } = data;

    // Create data check string
    const dataCheckString = Object.keys(authData)
      .sort()
      .map((key) => `${key}=${authData[key as keyof typeof authData]}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Create HMAC
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(dataCheckString);
    const calculatedHash = hmac.digest('hex');

    // Check if hash matches
    if (hash !== calculatedHash) {
      this.logger.warn(`✗ Telegram auth hash mismatch for user ${data.id}`);
      return false;
    }

    // Check if auth_date is recent (within 5 minutes)
    const authDate = new Date(data.auth_date * 1000);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (authDate < fiveMinutesAgo) {
      this.logger.warn(`✗ Telegram auth data expired for user ${data.id} (auth date: ${authDate.toISOString()})`);
      return false;
    }

    this.logger.debug(`✓ Telegram auth verification successful for user ${data.id}`);
    return true;
  }

  /**
   * Link Telegram account to existing user
   */
  async linkTelegramAccount(
    userId: string,
    telegramData: TelegramCredentials,
  ): Promise<IUser> {
    this.logger.log(`🔗 Linking Telegram account ${telegramData.id} to user ${userId}`);

    // Verify Telegram data
    if (!this.verifyTelegramAuth(telegramData)) {
      this.logger.warn(`✗ Invalid Telegram authentication data for user ${telegramData.id}`);
      throw new UnauthorizedException('Invalid Telegram authentication data');
    }

    // Check if Telegram ID is already linked to another account
    const existingUser = await this.userModel.findByTelegramId(telegramData.id);
    if (existingUser && existingUser._id.toString() !== userId) {
      this.logger.warn(`✗ Telegram ID ${telegramData.id} already linked to user ${existingUser._id}`);
      throw new BadRequestException(
        'Telegram account is already linked to another user',
      );
    }

    // Find the user to link to
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      this.logger.warn(`✗ User ${userId} not found or inactive for Telegram linking`);
      throw new UnauthorizedException('User not found');
    }

    // Link Telegram account
    user.telegramAuth = {
      telegramId: telegramData.id,
      firstName: telegramData.first_name,
      lastName: telegramData.last_name,
      username: telegramData.username,
      photoUrl: telegramData.photo_url,
      authDate: telegramData.auth_date,
      linkedAt: new Date(),
    };

    await user.save();
    this.logger.log(`✓ Telegram account ${telegramData.id} successfully linked to user ${userId}`);
    
    // Queue welcome notification (non-blocking)
    try {
      await this.queueTelegramWelcomeMessage(user);
    } catch (error) {
      // Log error but don't fail the linking process
      this.logger.error('Failed to queue Telegram welcome message:', error);
    }
    
    return user;
  }

  /**
   * Unlink Telegram account from user
   */
  async unlinkTelegramAccount(userId: string): Promise<IUser> {
    this.logger.log(`🔓 Unlinking Telegram account from user ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      this.logger.warn(`✗ User ${userId} not found or inactive for Telegram unlinking`);
      throw new UnauthorizedException('User not found');
    }

    const telegramId = user.telegramAuth?.telegramId;

    // Queue goodbye notification before unlinking (non-blocking)
    try {
      await this.queueTelegramGoodbyeMessage(user);
    } catch (error) {
      // Log error but don't fail the unlinking process
      this.logger.error('Failed to queue Telegram goodbye message:', error);
    }
    
    user.telegramAuth = undefined;
    await user.save();
    
    this.logger.log(`✓ Telegram account ${telegramId || 'unknown'} successfully unlinked from user ${userId}`);
    return user;
  }

  /**
   * Authenticate user with Telegram credentials
   */
  async authenticateTelegram(
    credentials: TelegramCredentials,
    ipAddress?: string,
  ): Promise<{ user: IUser; token: string; expiresAt: number }> {
    this.logger.log(`📱 Starting Telegram authentication for user ${credentials.id} (IP: ${ipAddress})`);

    // Verify Telegram auth data
    if (!this.verifyTelegramAuth(credentials)) {
      this.logger.warn(`✗ Invalid Telegram authentication data for user ${credentials.id}`);
      throw new UnauthorizedException('Invalid Telegram authentication data');
    }

    // Find user by Telegram ID
    const user = await this.userModel.findByTelegramId(credentials.id);
    if (!user || !user.isActive) {
      this.logger.warn(`✗ Telegram ID ${credentials.id} not linked to any active user`);
      throw new UnauthorizedException(
        'Telegram account not linked to any user',
      );
    }

    // Update login info
    this.logger.debug(`👤 Updating login info for user ${user._id} (login count: ${user.loginCount + 1})`);
    user.lastLoginAt = new Date();
    user.loginCount += 1;
    user.connectionHistory.unshift({
      connectedAt: new Date(),
      walletType: 'telegram',
      ipAddress,
    });

    // Keep only last 10 connections
    if (user.connectionHistory.length > 10) {
      user.connectionHistory = user.connectionHistory.slice(0, 10);
    }

    await user.save();

    // Generate JWT token
    const { token, expiresAt } = await this.generateToken(user);

    this.logger.log(`✓ Telegram authentication successful for user ${user._id} (Telegram ID: ${credentials.id})`);
    return { user, token, expiresAt };
  }

  /**
   * Generate JWT token for user
   */
  async generateToken(
    user: IUser,
  ): Promise<{ token: string; expiresAt: number }> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      walletAddress: user.walletAddress,
      telegramId: user.telegramAuth?.telegramId,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    const jwtPayload = this.jwtService.decode(token);
    const expiresAt = jwtPayload.exp;
    return { token, expiresAt };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<IUser | null> {
    try {
      this.logger.debug('Verifying JWT token');
      const secret = this.configService.get<string>('auth.jwtSecret')!;
      const payload = jwt.verify(token, secret) as JwtPayload;

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        this.logger.debug(`Token valid but user ${payload.sub} not found or inactive`);
        return null;
      }

      this.logger.debug(`✓ Token verified for user ${user._id}`);
      return user;
    } catch (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
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
      this.logger.debug(`Getting user by ID: ${userId}`);
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        this.logger.debug(`User ${userId} not found`);
        return null;
      }
      
      if (!user.isActive) {
        this.logger.debug(`User ${userId} is inactive`);
        return null;
      }
      
      return user;
    } catch (error) {
      this.logger.error(`Error getting user by ID ${userId}:`, error);
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(
    oldToken: string,
  ): Promise<{ token: string; expiresAt: number } | null> {
    this.logger.debug('Processing token refresh request');
    
    const user = await this.verifyToken(oldToken);
    if (!user) {
      this.logger.debug('Token refresh failed - invalid token or user');
      return null;
    }

    const { token, expiresAt } = await this.generateToken(user);
    this.logger.debug(`✓ Token refreshed successfully for user ${user._id}`);
    return { token, expiresAt };
  }

  /**
   * Queue welcome message when user links Telegram (non-blocking)
   */
  private async queueTelegramWelcomeMessage(user: IUser): Promise<void> {
    const displayName = user.getDisplayName();
    const groupLink = this.configService.get<string>('telegram.groupLink');
    const channelLink = this.configService.get<string>('telegram.channelLink');
    
    let body = `Welcome to PoolMind, ${displayName}! 🎉\n\n`;
    body += `Your Telegram account has been successfully linked to your PoolMind wallet.\n\n`;
    body += `📊 You'll now receive important updates about:\n`;
    body += `• Arbitrage opportunities\n`;
    body += `• Trading performance\n`;
    body += `• System announcements\n`;
    body += `• Security alerts\n\n`;
    
    if (groupLink || channelLink) {
      body += `📢 Stay connected with our community:\n`;
      if (groupLink) {
        body += `• Join our group: ${groupLink}\n`;
      }
      if (channelLink) {
        body += `• Subscribe to our channel: ${channelLink}\n`;
      }
      body += `\n`;
    }
    
    body += `💡 You can manage your notification preferences in your profile settings anytime.\n\n`;
    body += `Happy trading! 🚀`;

    await this.notificationsService.queueToUser(user._id.toString(), {
      type: NotificationType.SYSTEM,
      title: '🔗 Telegram Connected Successfully!',
      body,
      options: {
        parseMode: 'Markdown',
        disablePreview: false,
        silent: false,
        includeIcon: false
      },
    }, {
      priority: 2, // High priority for welcome messages
    });
  }

  /**
   * Queue goodbye message when user unlinks Telegram (non-blocking)
   */
  private async queueTelegramGoodbyeMessage(user: IUser): Promise<void> {
    const displayName = user.getDisplayName();
    
    let body = `Goodbye, ${displayName}! 👋\n\n`;
    body += `Your Telegram account has been unlinked from PoolMind.\n\n`;
    body += `📱 You will no longer receive:\n`;
    body += `• Trading notifications\n`;
    body += `• Arbitrage alerts\n`;
    body += `• System updates\n\n`;
    body += `🔄 You can always link your Telegram account again through your profile settings.\n\n`;
    body += `Thank you for being part of PoolMind! 💙`;

    await this.notificationsService.queueToTelegramUser(user.telegramAuth!.telegramId, {
      type: NotificationType.SYSTEM,
      title: '🔗 Telegram Disconnected',
      body,
      options: {
        parseMode: 'Markdown',
        silent: false,
        includeIcon: false
      },
    }, {
      priority: 2, // High priority for goodbye messages
    });
  }
}
