import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { IUser } from '../lib/models/user';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationSchema,
  GetNotificationsQuerySchema,
  MarkNotificationsReadSchema,
  BulkNotificationActionSchema,
  type CreateNotification,
  type GetNotificationsQuery,
  type MarkNotificationsRead,
  type BulkNotificationAction,
  type NotificationListResponse,
  type NotificationStatsResponse,
  NotificationType,
  NotificationPriority,
  NotificationTargetType,
  NotificationPrioritySchema,
} from '@poolmind/shared-types';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  // =====================================
  // USER ENDPOINTS
  // =====================================

  @Get('in-app')
  @ApiOperation({ summary: 'Get in-app notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of notifications to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of notifications to skip' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Only return unread notifications' })
  @ApiQuery({ name: 'types', required: false, type: [String], description: 'Filter by notification types' })
  @ApiQuery({ name: 'priority', required: false, enum: NotificationPrioritySchema.options, description: 'Filter by priority' })
  async getInAppNotifications(
    @CurrentUser() user: IUser,
    @Query() query: GetNotificationsQuery
  ): Promise<NotificationListResponse> {
    try {
      // Validate query parameters
      const validatedQuery = GetNotificationsQuerySchema.parse(query);
      
      this.logger.debug(`Getting in-app notifications for user ${user._id} with query:`, validatedQuery);

      const result = await this.notificationsService.getInAppNotificationsForUser(
        user._id.toString(),
        {
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          unreadOnly: validatedQuery.unreadOnly,
          types: validatedQuery.types,
          priority: validatedQuery.priority,
        }
      );

      const response: NotificationListResponse = {
        notifications: result.notifications.map(notification => ({
          ...notification,
          id: notification._id.toString(),
          metadata: notification.metadata ? {
            ...notification.metadata,
            data: notification.metadata.data ? Object.fromEntries(notification.metadata.data) : undefined,
          } : undefined,
          userNotification: notification.userNotification ? {
            ...notification.userNotification,
            id: notification.userNotification._id.toString(),
          } : undefined,
        })),
        pagination: {
          total: result.total,
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          hasMore: validatedQuery.offset + validatedQuery.limit < result.total,
        },
        unreadCount: result.unreadCount,
      };

      return response;
    } catch (error) {
      this.logger.error(`Failed to get in-app notifications for user ${user._id}:`, error);
      throw new HttpException(
        'Failed to retrieve notifications',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('in-app/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  @ApiQuery({ name: 'types', required: false, type: [String], description: 'Filter by notification types' })
  async getUnreadCount(
    @CurrentUser() user: IUser,
    @Query('types') types?: string[]
  ): Promise<{ unreadCount: number }> {
    try {
      const notificationTypes = types ? types as NotificationType[] : undefined;
      const unreadCount = await this.notificationsService.getUnreadCountForUser(
        user._id.toString(),
        notificationTypes
      );

      return { unreadCount };
    } catch (error) {
      this.logger.error(`Failed to get unread count for user ${user._id}:`, error);
      throw new HttpException(
        'Failed to retrieve unread count',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('in-app/:notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() user: IUser,
    @Param('notificationId') notificationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.notificationsService.markInAppNotificationAsRead(
        notificationId,
        user._id.toString()
      );

      if (!success) {
        throw new NotFoundException('Notification not found or already read');
      }

      return {
        success: true,
        message: 'Notification marked as read successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to mark notification ${notificationId} as read for user ${user._id}:`, error);
      throw new HttpException(
        'Failed to mark notification as read',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('in-app/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read successfully' })
  async markAllAsRead(
    @CurrentUser() user: IUser,
    @Body() body: MarkNotificationsRead
  ): Promise<{ success: boolean; markedCount: number; message: string }> {
    try {
      // Validate request body
      const validatedBody = MarkNotificationsReadSchema.parse(body);
      
      const markedCount = await this.notificationsService.markAllInAppNotificationsAsRead(
        user._id.toString(),
        validatedBody.types as NotificationType[]
      );

      return {
        success: true,
        markedCount,
        message: `${markedCount} notifications marked as read successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read for user ${user._id}:`, error);
      throw new HttpException(
        'Failed to mark notifications as read',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('in-app/:notificationId')
  @ApiOperation({ summary: 'Delete notification for current user' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @CurrentUser() user: IUser,
    @Param('notificationId') notificationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.notificationsService.deleteInAppNotificationForUser(
        notificationId,
        user._id.toString()
      );

      if (!success) {
        throw new NotFoundException('Notification not found');
      }

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete notification ${notificationId} for user ${user._id}:`, error);
      throw new HttpException(
        'Failed to delete notification',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('in-app/bulk-action')
  @ApiOperation({ summary: 'Perform bulk action on notifications' })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  async bulkAction(
    @CurrentUser() user: IUser,
    @Body() body: BulkNotificationAction
  ): Promise<{ success: boolean; affectedCount: number; message: string }> {
    try {
      // Validate request body
      const validatedBody = BulkNotificationActionSchema.parse(body);
      
      let affectedCount = 0;
      const userId = user._id.toString();

      switch (validatedBody.action) {
        case 'markRead':
          for (const notificationId of validatedBody.notificationIds) {
            const success = await this.notificationsService.markInAppNotificationAsRead(
              notificationId,
              userId
            );
            if (success) affectedCount++;
          }
          break;

        case 'delete':
          for (const notificationId of validatedBody.notificationIds) {
            const success = await this.notificationsService.deleteInAppNotificationForUser(
              notificationId,
              userId
            );
            if (success) affectedCount++;
          }
          break;

        default:
          throw new BadRequestException(`Unsupported bulk action: ${validatedBody.action}`);
      }

      return {
        success: true,
        affectedCount,
        message: `Bulk ${validatedBody.action} completed successfully`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to perform bulk action for user ${user._id}:`, error);
      throw new HttpException(
        'Failed to perform bulk action',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =====================================
  // ADMIN ENDPOINTS
  // =====================================

  @Post('in-app')
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create in-app notification (Admin/Moderator only)' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createInAppNotification(
    @CurrentUser() user: IUser,
    @Body() createData: CreateNotification
  ): Promise<{ success: boolean; notificationId: string; message: string }> {
    try {
      // Validate request body
      const validatedData = CreateNotificationSchema.parse(createData);

      const notification = await this.notificationsService.createInAppNotification({
        type: validatedData.type as NotificationType,
        title: validatedData.title,
        body: validatedData.body,
        targetType: validatedData.targetType as NotificationTargetType,
        targetDetails: validatedData.targetDetails,
        priority: validatedData.priority as NotificationPriority,
        metadata: validatedData.metadata,
        expiresAt: validatedData.expiresAt,
        sentBy: {
          userId: user._id.toString(),
          system: false,
        },
      });

      return {
        success: true,
        notificationId: notification._id.toString(),
        message: 'Notification created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create in-app notification by user ${user._id}:`, error);
      throw new HttpException(
        'Failed to create notification',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('in-app/stats')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get notification statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getNotificationStats(): Promise<NotificationStatsResponse> {
    try {
      const stats = await this.notificationsService.getInAppNotificationStats();
      return {
        ...stats,
        unread: stats.total - (stats.recentActivity?.read24h || 0),
      };
    } catch (error) {
      this.logger.error('Failed to get notification statistics:', error);
      throw new HttpException(
        'Failed to retrieve notification statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('in-app/cleanup')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cleanup old notifications (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  @ApiQuery({ name: 'daysOld', required: false, type: Number, description: 'Number of days old to cleanup (default: 30)' })
  async cleanupOldNotifications(
    @Query('daysOld') daysOld?: number
  ): Promise<{
    success: boolean;
    deactivatedNotifications: number;
    deletedUserNotifications: number;
    message: string;
  }> {
    try {
      const days = daysOld || 30;
      const result = await this.notificationsService.cleanupOldInAppNotifications(days);

      return {
        success: true,
        ...result,
        message: `Cleanup completed: ${result.deactivatedNotifications} notifications deactivated, ${result.deletedUserNotifications} user notifications deleted`,
      };
    } catch (error) {
      this.logger.error('Failed to cleanup old notifications:', error);
      throw new HttpException(
        'Failed to cleanup notifications',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('in-app/queue')
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Queue in-app notification (Admin/Moderator only)' })
  @ApiResponse({ status: 202, description: 'Notification queued successfully' })
  async queueInAppNotification(
    @CurrentUser() user: IUser,
    @Body() createData: CreateNotification & {
      options?: {
        priority?: number;
        delay?: number;
        attempts?: number;
      };
    }
  ): Promise<{ success: boolean; jobId: string; message: string }> {
    try {
      // Validate request body
      const validatedData = CreateNotificationSchema.parse(createData);

      const job = await this.notificationsService.queueInAppNotification({
        type: validatedData.type as NotificationType,
        title: validatedData.title,
        body: validatedData.body,
        targetType: validatedData.targetType as NotificationTargetType,
        targetDetails: validatedData.targetDetails,
        priority: validatedData.priority as NotificationPriority,
        metadata: validatedData.metadata,
        expiresAt: validatedData.expiresAt,
        sentBy: {
          userId: user._id.toString(),
          system: false,
        },
      }, createData.options);

      return {
        success: true,
        jobId: job.id.toString(),
        message: 'Notification queued successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to queue in-app notification by user ${user._id}:`, error);
      throw new HttpException(
        'Failed to queue notification',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('queue/stats')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get notification queue statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStats(): Promise<any> {
    try {
      return await this.notificationsService.getQueueStats();
    } catch (error) {
      this.logger.error('Failed to get queue statistics:', error);
      throw new HttpException(
        'Failed to retrieve queue statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
