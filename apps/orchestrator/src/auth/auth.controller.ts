import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Get,
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
} from './dto/auth.dto';
import { Public, CurrentUser } from './decorators';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type IUser } from '../lib/models/user';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
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
    const message = this.authService.generateAuthMessage(walletAddress);

    return {
      message,
      success: true,
    };
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

    const { user, token } = await this.authService.authenticateWallet(
      walletLoginDto,
      ipAddress,
    );

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

    return {
      token,
      user: userResponse,
      success: true,
    };
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
    const newToken = await this.authService.refreshToken(oldToken);

    if (!newToken) {
      throw new Error('Invalid or expired token');
    }

    return {
      token: newToken,
      success: true,
    };
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
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    };

    return {
      user: userResponse,
      success: true,
    };
  }
}
