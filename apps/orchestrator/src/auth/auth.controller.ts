import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Get,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { AuthService } from './auth.service';
import {
  GenerateNonceDto,
  WalletLoginDto,
  RefreshTokenDto,
  TelegramLoginDto,
  LinkTelegramDto,
} from './dto/auth.dto';
import { Public, CurrentUser } from './decorators';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type IUser } from '../lib/models/user';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate authentication message',
    description:
      'Generate a nonce and authentication message for wallet signing',
  })
  @ApiBody({ type: GenerateNonceDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication message generated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Authentication message to be signed by wallet',
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address',
  })
  generateNonce(@Body() generateNonceDto: GenerateNonceDto) {
    const { walletAddress } = generateNonceDto;
    
    this.logger.log(`🔢 Generating nonce for wallet: ${walletAddress.substring(0, 8)}...`);
    
    try {
      const message = this.authService.generateAuthMessage(walletAddress);

      this.logger.debug(`✓ Nonce generated successfully for wallet: ${walletAddress.substring(0, 8)}...`);
      
      return {
        message,
        success: true,
      };
    } catch (error) {
      this.logger.error(`✗ Failed to generate nonce for wallet: ${walletAddress.substring(0, 8)}...`, error);
      throw error;
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with wallet',
    description: 'Authenticate user using wallet signature and get JWT token',
  })
  @ApiBody({ type: WalletLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT authentication token',
        },
        expiresAt: {
          type: 'number',
          description: 'Expiration timestamp',
        },
        user: {
          type: 'object',
          description: 'User information',
          properties: {
            id: { type: 'string' },
            walletAddress: { type: 'string' },
            username: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
            isEmailVerified: { type: 'boolean' },
          },
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or authentication failed',
  })
  async login(@Body() walletLoginDto: WalletLoginDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const walletAddress = walletLoginDto.walletAddress;

    this.logger.log(`🔐 Wallet login attempt from ${walletAddress.substring(0, 8)}... (IP: ${ipAddress})`);

    try {
      const { user, token, expiresAt } =
        await this.authService.authenticateWallet(walletLoginDto, ipAddress);

      // Return user data without sensitive information
      const userResponse = {
        id: user._id.toString(),
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      };

      this.logger.log(`✓ Wallet login successful for user ${user._id} (${walletAddress.substring(0, 8)}...) from IP: ${ipAddress}`);

      return {
        token,
        expiresAt,
        user: userResponse,
        success: true,
      };
    } catch (error) {
      this.logger.warn(`✗ Wallet login failed for ${walletAddress.substring(0, 8)}... (IP: ${ipAddress}): ${error.message}`);
      throw error;
    }
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh JWT token',
    description: 'Get a new JWT token using an existing valid token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'New JWT authentication token',
        },
        expiresAt: {
          type: 'number',
          description: 'Expiration timestamp',
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const { token: oldToken } = refreshTokenDto;
    
    this.logger.log('🔄 Token refresh attempt');

    try {
      const newToken = await this.authService.refreshToken(oldToken);

      if (!newToken) {
        this.logger.warn('✗ Token refresh failed - invalid or expired token');
        throw new Error('Invalid or expired token');
      }

      this.logger.log('✓ Token refreshed successfully');

      return {
        token: newToken.token,
        expiresAt: newToken.expiresAt,
        success: true,
      };
    } catch (error) {
      this.logger.warn(`✗ Token refresh failed: ${error.message}`);
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get information about the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'User information',
          properties: {
            id: { type: 'string' },
            walletAddress: { type: 'string' },
            username: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            lastLoginAt: { type: 'string', format: 'date-time' },
            loginCount: { type: 'number' },
          },
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getCurrentUser(@CurrentUser() user: IUser) {
    this.logger.debug(`👤 Get current user request from user ${user._id} (${user.walletAddress.substring(0, 8)}...)`);

    // Return user data without sensitive information
    const userResponse = {
      id: user._id.toString(),
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      notificationPreferences: user.notificationPreferences,
      socialLinks: user.socialLinks,
      telegramAuth: user.telegramAuth,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    };

    return {
      user: userResponse,
      success: true,
    };
  }

  @Public()
  @Post('telegram/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with Telegram',
    description:
      'Authenticate user using Telegram login data and get JWT token',
  })
  @ApiBody({ type: TelegramLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT authentication token',
        },
        expiresAt: {
          type: 'number',
          description: 'Expiration timestamp',
        },
        user: {
          type: 'object',
          description: 'User information',
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid Telegram data or account not linked',
  })
  async telegramLogin(
    @Body() telegramLoginDto: TelegramLoginDto,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const telegramId = telegramLoginDto.id;

    this.logger.log(`📱 Telegram login attempt from user ${telegramId} (IP: ${ipAddress})`);

    try {
      const { user, token, expiresAt } =
        await this.authService.authenticateTelegram(telegramLoginDto, ipAddress);

      // Return user data without sensitive information
      const userResponse = {
        id: user._id.toString(),
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        telegramAuth: user.telegramAuth,
      };

      this.logger.log(`✓ Telegram login successful for user ${user._id} (Telegram ID: ${telegramId}) from IP: ${ipAddress}`);

      return {
        token,
        expiresAt,
        user: userResponse,
        success: true,
      };
    } catch (error) {
      this.logger.warn(`✗ Telegram login failed for Telegram ID ${telegramId} (IP: ${ipAddress}): ${error.message}`);
      throw error;
    }
  }

  @Post('telegram/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link Telegram account',
    description: 'Link Telegram account to existing user profile',
  })
  @ApiBody({ type: LinkTelegramDto })
  @ApiResponse({
    status: 200,
    description: 'Telegram account linked successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Updated user information',
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Telegram account already linked to another user',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid Telegram data or unauthorized',
  })
  async linkTelegram(
    @Body() linkTelegramDto: LinkTelegramDto,
    @CurrentUser() user: IUser,
  ) {
    const telegramId = linkTelegramDto.telegramData.id;
    
    this.logger.log(`🔗 Telegram linking attempt - User ${user._id} attempting to link Telegram ID ${telegramId}`);

    try {
      const updatedUser = await this.authService.linkTelegramAccount(
        user._id.toString(),
        linkTelegramDto.telegramData,
      );

      // Return user data without sensitive information
      const userResponse = {
        id: updatedUser._id.toString(),
        walletAddress: updatedUser.walletAddress,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        bio: updatedUser.bio,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        notificationPreferences: updatedUser.notificationPreferences,
        socialLinks: updatedUser.socialLinks,
        telegramAuth: updatedUser.telegramAuth,
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt,
        loginCount: updatedUser.loginCount,
      };

      this.logger.log(`✓ Telegram account linked successfully - User ${user._id} linked to Telegram ID ${telegramId}`);

      return {
        user: userResponse,
        success: true,
      };
    } catch (error) {
      this.logger.warn(`✗ Telegram linking failed - User ${user._id} could not link Telegram ID ${telegramId}: ${error.message}`);
      throw error;
    }
  }

  @Post('telegram/unlink')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unlink Telegram account',
    description: 'Remove Telegram authentication from user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Telegram account unlinked successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Updated user information',
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async unlinkTelegram(@CurrentUser() user: IUser) {
    const currentTelegramId = user.telegramAuth?.telegramId;
    
    this.logger.log(`🔓 Telegram unlinking attempt - User ${user._id} attempting to unlink Telegram ID ${currentTelegramId || 'unknown'}`);

    try {
      const updatedUser = await this.authService.unlinkTelegramAccount(
        user._id.toString(),
      );

      // Return user data without sensitive information
      const userResponse = {
        id: updatedUser._id.toString(),
        walletAddress: updatedUser.walletAddress,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        bio: updatedUser.bio,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        notificationPreferences: updatedUser.notificationPreferences,
        socialLinks: updatedUser.socialLinks,
        telegramAuth: updatedUser.telegramAuth,
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt,
        loginCount: updatedUser.loginCount,
      };

      this.logger.log(`✓ Telegram account unlinked successfully - User ${user._id} unlinked from Telegram ID ${currentTelegramId || 'unknown'}`);

      return {
        user: userResponse,
        success: true,
      };
    } catch (error) {
      this.logger.warn(`✗ Telegram unlinking failed - User ${user._id}: ${error.message}`);
      throw error;
    }
  }
}
