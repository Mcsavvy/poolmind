import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { type IUser } from '../lib/models/user';
import User from '../lib/models/user';
import {
  UpdateUserProfileDto,
  UpdateNotificationPreferencesDto,
  UpdateSocialLinksDto,
} from '../auth/dto/user.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: "Get the current user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'User profile information',
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
  getProfile(@CurrentUser() user: IUser) {
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
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    };

    return {
      user: userResponse,
      success: true,
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user profile',
    description: "Update the current user's profile information",
  })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
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
    description: 'Invalid profile data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() updateProfileDto: UpdateUserProfileDto,
  ) {
    // Check for username uniqueness if username is being updated
    if (
      updateProfileDto.username &&
      updateProfileDto.username !== user.username
    ) {
      const existingUser = await User.findByUsername(updateProfileDto.username);
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        throw new ForbiddenException('Username is already taken');
      }
    }

    // Check for email uniqueness if email is being updated
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await User.findByEmail(updateProfileDto.email);
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        throw new ForbiddenException('Email is already registered');
      }
    }

    // Update user profile
    Object.assign(user, updateProfileDto);
    await user.save();

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
      updatedAt: user.updatedAt,
    };

    return {
      user: userResponse,
      success: true,
    };
  }

  @Patch('notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update notification preferences',
    description: "Update the current user's notification preferences",
  })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        notificationPreferences: {
          type: 'object',
          description: 'Updated notification preferences',
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
  async updateNotificationPreferences(
    @CurrentUser() user: IUser,
    @Body() notificationPreferencesDto: UpdateNotificationPreferencesDto,
  ) {
    await user.updateNotificationPreferences(notificationPreferencesDto);

    return {
      notificationPreferences: user.notificationPreferences,
      success: true,
    };
  }

  @Patch('social-links')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update social links',
    description: "Update the current user's social media links",
  })
  @ApiBody({ type: UpdateSocialLinksDto })
  @ApiResponse({
    status: 200,
    description: 'Social links updated successfully',
    schema: {
      type: 'object',
      properties: {
        socialLinks: {
          type: 'object',
          description: 'Updated social links',
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
  async updateSocialLinks(
    @CurrentUser() user: IUser,
    @Body() socialLinksDto: UpdateSocialLinksDto,
  ) {
    user.socialLinks = {
      ...user.socialLinks,
      ...socialLinksDto,
    };
    await user.save();

    return {
      socialLinks: user.socialLinks,
      success: true,
    };
  }

  @Get('stats')
  @Roles('admin', 'moderator')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Get statistics about users (admin/moderator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number' },
            usersWithEmail: { type: 'number' },
            usersWithUsername: { type: 'number' },
            adminUsers: { type: 'number' },
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or moderator role required',
  })
  async getUserStats() {
    const stats = await User.getStats();

    return {
      stats,
      success: true,
    };
  }
}
