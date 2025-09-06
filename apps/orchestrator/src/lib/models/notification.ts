import { createModel, IBaseDocument, IBaseModel, validators } from '../schemas';

// Notification model interface with custom statics
export interface INotificationModel extends IBaseModel<INotification> {
  findByType(type: string): Promise<INotification[]>;
  findRecent(limit?: number): Promise<INotification[]>;
  findForUser(
    userId: string,
    options?: {
      limit?: number;
      unreadOnly?: boolean;
      types?: string[];
    },
  ): Promise<Array<INotification & { userNotification: IUserNotification }>>;
  markAsReadForUser(notificationId: string, userId: string): Promise<boolean>;
  markAllAsReadForUser(userId: string, types?: string[]): Promise<number>;
  getUnreadCountForUser(userId: string, types?: string[]): Promise<number>;
  deleteForUser(notificationId: string, userId: string): Promise<boolean>;
  cleanupOldNotifications(daysOld?: number): Promise<number>;
}

// User Notification model interface
export interface IUserNotificationModel extends IBaseModel<IUserNotification> {
  findByUser(
    userId: string,
    options?: {
      limit?: number;
      unreadOnly?: boolean;
    },
  ): Promise<IUserNotification[]>;
  markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<IUserNotification | null>;
  markAllAsRead(userId: string): Promise<number>;
  deleteByUser(userId: string, notificationId: string): Promise<boolean>;
  getUnreadCount(userId: string): Promise<number>;
}

// Notification priority levels
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Notification target types
export enum NotificationTargetType {
  USER = 'user',
  ROLE = 'role',
  BROADCAST = 'broadcast',
}

// Create the Notification model
const Notification = createModel<INotification>(
  'Notification',
  {
    // Core notification content
    type: {
      type: String,
      required: true,
      enum: [
        'security',
        'update',
        'marketing',
        'system',
        'trading',
        'arbitrage',
        'transaction',
      ],
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      index: true,
    },

    // Targeting information
    targetType: {
      type: String,
      required: true,
      enum: Object.values(NotificationTargetType),
      index: true,
    },

    // Target details (depending on targetType)
    targetDetails: {
      // For USER type: specific user ID
      userId: {
        type: String,
        index: true,
      },
      // For ROLE type: role name
      role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        index: true,
      },
      // For BROADCAST: no additional details needed
    },

    // Optional metadata
    metadata: {
      // Related entity information
      relatedEntityType: {
        type: String,
        enum: ['transaction', 'user', 'system', 'trading'],
      },
      relatedEntityId: {
        type: String,
        index: true,
      },

      // Action information
      actionUrl: {
        type: String,
        validate: validators.url,
      },
      actionText: {
        type: String,
        maxlength: 50,
      },

      // Additional data
      data: {
        type: Map,
        of: String,
      },
    },

    // Sender information (optional for system notifications)
    sentBy: {
      userId: {
        type: String,
        index: true,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },

    // Expiration (for temporary notifications)
    expiresAt: {
      type: Date,
    },

    // Statistics
    stats: {
      totalRecipients: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalRead: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalDeleted: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    // Additional instance methods
    additionalMethods: {
      // Check if notification is expired
      isExpired(this: INotification): boolean {
        return this.expiresAt ? new Date() > this.expiresAt : false;
      },

      // Get read percentage
      getReadPercentage(this: INotification): number {
        if (this.stats.totalRecipients === 0) return 0;
        return Math.round(
          (this.stats.totalRead / this.stats.totalRecipients) * 100,
        );
      },

      // Update statistics
      async updateStats(this: INotification): Promise<INotification> {
        const UserNotification = require('./user-notification').default;

        const stats = await UserNotification.aggregate([
          { $match: { notificationId: this._id.toString() } },
          {
            $group: {
              _id: null,
              totalRecipients: { $sum: 1 },
              totalRead: { $sum: { $cond: ['$isRead', 1, 0] } },
              totalDeleted: { $sum: { $cond: ['$isDeleted', 1, 0] } },
            },
          },
        ]);

        if (stats.length > 0) {
          this.stats = {
            totalRecipients: stats[0].totalRecipients,
            totalRead: stats[0].totalRead,
            totalDeleted: stats[0].totalDeleted,
          };
          await this.save();
        }

        return this;
      },
    },

    // Additional static methods
    additionalStatics: {
      // Find notifications by type
      findByType(type: string): Promise<INotification[]> {
        return this.find({ type, isActive: true })
          .sort({ createdAt: -1 })
          .limit(100);
      },

      // Find recent notifications
      findRecent(limit = 50): Promise<INotification[]> {
        return this.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit);
      },

      // Find notifications for a specific user with read status
      async findForUser(
        userId: string,
        options: {
          limit?: number;
          unreadOnly?: boolean;
          types?: string[];
        } = {},
      ): Promise<
        Array<INotification & { userNotification: IUserNotification }>
      > {
        const { limit = 50, unreadOnly = false, types } = options;
        const UserNotification = require('./user-notification').default;

        // Build match conditions
        const matchConditions: any = {
          $or: [
            { 'targetDetails.userId': userId },
            { targetType: 'broadcast' },
            // Add role-based targeting if user's role matches
          ],
          isActive: true,
        };

        if (types && types.length > 0) {
          matchConditions.type = { $in: types };
        }

        // Build pipeline
        const pipeline = [
          { $match: matchConditions },
          {
            $lookup: {
              from: 'usernotifications',
              localField: '_id',
              foreignField: 'notificationId',
              as: 'userNotifications',
              pipeline: [{ $match: { userId } }],
            },
          },
          {
            $addFields: {
              userNotification: { $arrayElemAt: ['$userNotifications', 0] },
            },
          },
        ];

        if (unreadOnly) {
          pipeline.push({
            $match: {
              $or: [
                { 'userNotification.isRead': false },
                { userNotification: null },
              ],
            },
          } as any);
        }

        pipeline.push(
          { $sort: { createdAt: -1 } } as any,
          { $limit: limit } as any,
          { $unset: 'userNotifications' } as any,
        );

        return this.aggregate(pipeline);
      },

      // Mark notification as read for user
      async markAsReadForUser(
        notificationId: string,
        userId: string,
      ): Promise<boolean> {
        const UserNotification = require('./user-notification').default;

        const result = await UserNotification.findOneAndUpdate(
          { notificationId, userId },
          {
            isRead: true,
            readAt: new Date(),
            $setOnInsert: { isDeleted: false },
          },
          { upsert: true, new: true },
        );

        // Update notification stats
        const notification = await this.findById(notificationId);
        if (notification) {
          await notification.updateStats();
        }

        return !!result;
      },

      // Mark all notifications as read for user
      async markAllAsReadForUser(
        userId: string,
        types?: string[],
      ): Promise<number> {
        const UserNotification = require('./user-notification').default;

        // First, get all notification IDs for the user
        const matchConditions: any = {
          $or: [
            { 'targetDetails.userId': userId },
            { targetType: 'broadcast' },
          ],
          isActive: true,
        };

        if (types && types.length > 0) {
          matchConditions.type = { $in: types };
        }

        const notifications = await this.find(matchConditions, '_id');
        const notificationIds = notifications.map((n) => n._id.toString());

        if (notificationIds.length === 0) return 0;

        // Update or create UserNotification records
        const operations = notificationIds.map((notificationId) => ({
          updateOne: {
            filter: { notificationId, userId },
            update: {
              $set: { isRead: true, readAt: new Date() },
              $setOnInsert: { isDeleted: false },
            },
            upsert: true,
          },
        }));

        const result = await UserNotification.bulkWrite(operations);
        return result.modifiedCount + result.upsertedCount;
      },

      // Get unread count for user
      async getUnreadCountForUser(
        userId: string,
        types?: string[],
      ): Promise<number> {
        const matchConditions: any = {
          $or: [
            { 'targetDetails.userId': userId },
            { targetType: 'broadcast' },
          ],
          isActive: true,
        };

        if (types && types.length > 0) {
          matchConditions.type = { $in: types };
        }

        const UserNotification = require('./user-notification').default;

        const pipeline = [
          { $match: matchConditions },
          {
            $lookup: {
              from: 'usernotifications',
              localField: '_id',
              foreignField: 'notificationId',
              as: 'userNotifications',
              pipeline: [{ $match: { userId } }],
            },
          },
          {
            $match: {
              $or: [
                { 'userNotifications.isRead': false },
                { userNotifications: { $size: 0 } },
              ],
            },
          },
          { $count: 'unreadCount' },
        ];

        const result = await this.aggregate(pipeline);
        return result.length > 0 ? result[0].unreadCount : 0;
      },

      // Delete notification for user (soft delete)
      async deleteForUser(
        notificationId: string,
        userId: string,
      ): Promise<boolean> {
        const UserNotification = require('./user-notification').default;

        const result = await UserNotification.findOneAndUpdate(
          { notificationId, userId },
          {
            isDeleted: true,
            deletedAt: new Date(),
            $setOnInsert: { isRead: false },
          },
          { upsert: true, new: true },
        );

        return !!result;
      },

      // Cleanup old notifications
      async cleanupOldNotifications(daysOld = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.updateMany(
          {
            createdAt: { $lt: cutoffDate },
            isActive: true,
          },
          { isActive: false },
        );

        return result.modifiedCount || 0;
      },
    },

    // Indexes for better performance
    indexes: [
      [{ type: 1, createdAt: -1 }],
      [{ targetType: 1, 'targetDetails.userId': 1 }],
      [{ targetType: 1, 'targetDetails.role': 1 }],
      [{ priority: 1, createdAt: -1 }],
      [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
      [{ 'metadata.relatedEntityType': 1, 'metadata.relatedEntityId': 1 }],
    ],
  },
);

// Create the UserNotification model
const UserNotification = createModel<IUserNotification>(
  'UserNotification',
  {
    // References
    notificationId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      index: true,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },

    // Additional user-specific metadata
    metadata: {
      starred: {
        type: Boolean,
        default: false,
      },
      archived: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    // Additional instance methods
    additionalMethods: {
      // Mark as read
      async markAsRead(this: IUserNotification): Promise<IUserNotification> {
        this.isRead = true;
        this.readAt = new Date();
        return this.save();
      },

      // Toggle star status
      async toggleStar(this: IUserNotification): Promise<IUserNotification> {
        this.metadata.starred = !this.metadata.starred;
        return this.save();
      },

      // Soft delete
      async softDelete(this: IUserNotification): Promise<IUserNotification> {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return this.save();
      },
    },

    // Additional static methods
    additionalStatics: {
      // Find notifications for a user
      findByUser(
        userId: string,
        options: {
          limit?: number;
          unreadOnly?: boolean;
        } = {},
      ): Promise<IUserNotification[]> {
        const { limit = 50, unreadOnly = false } = options;

        const query: any = { userId, isDeleted: false };
        if (unreadOnly) {
          query.isRead = false;
        }

        return this.find(query).sort({ createdAt: -1 }).limit(limit);
      },

      // Mark as read
      async markAsRead(
        userId: string,
        notificationId: string,
      ): Promise<IUserNotification | null> {
        return this.findOneAndUpdate(
          { userId, notificationId },
          {
            isRead: true,
            readAt: new Date(),
          },
          { new: true },
        );
      },

      // Mark all as read for user
      async markAllAsRead(userId: string): Promise<number> {
        const result = await this.updateMany(
          { userId, isRead: false, isDeleted: false },
          {
            isRead: true,
            readAt: new Date(),
          },
        );

        return result.modifiedCount || 0;
      },

      // Delete notification for user
      async deleteByUser(
        userId: string,
        notificationId: string,
      ): Promise<boolean> {
        const result = await this.findOneAndUpdate(
          { userId, notificationId },
          {
            isDeleted: true,
            deletedAt: new Date(),
          },
          { new: true },
        );

        return !!result;
      },

      // Get unread count for user
      async getUnreadCount(userId: string): Promise<number> {
        return this.countDocuments({
          userId,
          isRead: false,
          isDeleted: false,
        });
      },
    },

    // Indexes for better performance
    indexes: [
      [{ userId: 1, isRead: 1, isDeleted: 1 }],
      [{ notificationId: 1, userId: 1 }, { unique: true }],
      [{ userId: 1, createdAt: -1 }],
      [{ userId: 1, readAt: -1 }],
    ],
  },
);

// Notification interface extending base document
export interface INotification extends IBaseDocument {
  type:
    | 'security'
    | 'update'
    | 'marketing'
    | 'system'
    | 'trading'
    | 'arbitrage'
    | 'transaction';
  title: string;
  body: string;
  priority: NotificationPriority;

  targetType: NotificationTargetType;
  targetDetails: {
    userId?: string;
    role?: 'user' | 'admin' | 'moderator';
  };

  metadata?: {
    relatedEntityType?: 'transaction' | 'user' | 'system' | 'trading';
    relatedEntityId?: string;
    actionUrl?: string;
    actionText?: string;
    data?: Map<string, string>;
  };

  sentBy?: {
    userId?: string;
    system: boolean;
  };

  expiresAt?: Date;

  stats: {
    totalRecipients: number;
    totalRead: number;
    totalDeleted: number;
  };

  // Instance methods
  isExpired(): boolean;
  getReadPercentage(): number;
  updateStats(): Promise<INotification>;
}

// UserNotification interface extending base document
export interface IUserNotification extends IBaseDocument {
  notificationId: string;
  userId: string;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;

  metadata: {
    starred: boolean;
    archived: boolean;
  };

  // Instance methods
  markAsRead(): Promise<IUserNotification>;
  toggleStar(): Promise<IUserNotification>;
  softDelete(): Promise<IUserNotification>;
}

export { Notification as default, UserNotification };
