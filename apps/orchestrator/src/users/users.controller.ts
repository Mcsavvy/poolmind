import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
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
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CurrentUser, Roles } from '../auth/decorators';
import { type IUser } from '../lib/models/user';
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
  private readonly logger = new Logger(UsersController.name);

  constructor(@InjectModel('User') private readonly userModel: Model<IUser>) {}
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
    this.logger.debug(`👤 Get profile request from user ${user._id}`);

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
    this.logger.log(
      `📝 Profile update request from user ${user._id} with fields: ${Object.keys(updateProfileDto).join(', ')}`,
    );

    try {
      // Check for username uniqueness if username is being updated
      if (
        updateProfileDto.username &&
        updateProfileDto.username !== user.username
      ) {
        this.logger.debug(
          `Checking username uniqueness: ${updateProfileDto.username}`,
        );
        const existingUser = await this.userModel.findOne({
          username: updateProfileDto.username,
        });
        if (
          existingUser &&
          existingUser._id.toString() !== user._id.toString()
        ) {
          this.logger.warn(
            `✗ Username ${updateProfileDto.username} already taken by user ${existingUser._id}`,
          );
          throw new ForbiddenException('Username is already taken');
        }
      }

      // Check for email uniqueness if email is being updated
      if (updateProfileDto.email && updateProfileDto.email !== user.email) {
        this.logger.debug(
          `Checking email uniqueness: ${updateProfileDto.email}`,
        );
        const existingUser = await this.userModel.findOne({
          email: updateProfileDto.email,
        });
        if (
          existingUser &&
          existingUser._id.toString() !== user._id.toString()
        ) {
          this.logger.warn(
            `✗ Email ${updateProfileDto.email} already registered to user ${existingUser._id}`,
          );
          throw new ForbiddenException('Email is already registered');
        }
      }

      // Update user profile
      Object.assign(user, updateProfileDto);
      await user.save();

      this.logger.log(`✓ Profile updated successfully for user ${user._id}`);

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
    } catch (error) {
      this.logger.error(
        `✗ Profile update failed for user ${user._id}: ${error.message}`,
      );
      throw error;
    }
  }

  @Get('notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get notification preferences',
    description: "Get the current user's notification preferences",
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notificationPreferences: {
          type: 'object',
          description: 'Notification preferences',
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
  async getNotificationPreferences(@CurrentUser() user: IUser) {
    this.logger.log(`🔔 Notification preferences get from user ${user._id}`);
    return {
      notificationPreferences: user.notificationPreferences,
      success: true,
    };
  }

  @Patch('notification-preferences')
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
    this.logger.log(`🔔 Notification preferences update from user ${user._id}`);

    try {
      await user.updateNotificationPreferences(notificationPreferencesDto);

      this.logger.log(
        `✓ Notification preferences updated successfully for user ${user._id}`,
      );

      return {
        notificationPreferences: user.notificationPreferences,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `✗ Notification preferences update failed for user ${user._id}: ${error.message}`,
      );
      throw error;
    }
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
    this.logger.log(
      `🔗 Social links update from user ${user._id} with fields: ${Object.keys(socialLinksDto).join(', ')}`,
    );

    try {
      user.socialLinks = {
        ...user.socialLinks,
        ...socialLinksDto,
      };
      await user.save();

      this.logger.log(
        `✓ Social links updated successfully for user ${user._id}`,
      );

      return {
        socialLinks: user.socialLinks,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `✗ Social links update failed for user ${user._id}: ${error.message}`,
      );
      throw error;
    }
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
    this.logger.log('📊 User statistics request (admin/moderator only)');

    try {
      const stats = await this.userModel.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            usersWithEmail: {
              $sum: { $cond: [{ $ne: ['$email', null] }, 1, 0] },
            },
            usersWithUsername: {
              $sum: { $cond: [{ $ne: ['$username', null] }, 1, 0] },
            },
            adminUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
            },
          },
        },
      ]);

      const result = stats[0] || {
        totalUsers: 0,
        usersWithEmail: 0,
        usersWithUsername: 0,
        adminUsers: 0,
      };

      this.logger.log(
        `✓ User statistics retrieved: ${result.totalUsers} total users, ${result.adminUsers} admins`,
      );

      return {
        stats: result,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `✗ Failed to retrieve user statistics: ${error.message}`,
      );
      throw error;
    }
  }
}
