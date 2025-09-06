import { z } from 'zod';

// Notification priority levels
export const NotificationPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
]);

// Notification target types
export const NotificationTargetTypeSchema = z.enum([
  'user',
  'role',
  'broadcast',
]);

// Notification types (aligned with existing NotificationType enum)
export const NotificationTypeSchema = z.enum([
  'security',
  'update',
  'marketing',
  'system',
  'trading',
  'arbitrage',
  'transaction',
]);

// Target details schema
export const NotificationTargetDetailsSchema = z.object({
  userId: z.string().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

// Notification metadata schema
export const NotificationMetadataSchema = z.object({
  relatedEntityType: z
    .enum(['transaction', 'user', 'system', 'trading'])
    .optional(),
  relatedEntityId: z.string().optional(),
  actionUrl: z.url().optional(),
  actionText: z.string().max(50).optional(),
  data: z.record(z.string(), z.string()).optional(),
});

// Sender information schema
export const NotificationSentBySchema = z.object({
  userId: z.string().optional(),
  system: z.boolean().default(true),
});

// Notification statistics schema
export const NotificationStatsSchema = z.object({
  totalRecipients: z.number().min(0).default(0),
  totalRead: z.number().min(0).default(0),
  totalDeleted: z.number().min(0).default(0),
});

// Complete notification schema
export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  priority: NotificationPrioritySchema.default('normal'),

  targetType: NotificationTargetTypeSchema,
  targetDetails: NotificationTargetDetailsSchema,

  metadata: NotificationMetadataSchema.optional(),
  sentBy: NotificationSentBySchema.optional(),

  expiresAt: z.date().optional(),
  stats: NotificationStatsSchema,

  // Base document fields
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
});

// User notification metadata schema
export const UserNotificationMetadataSchema = z.object({
  starred: z.boolean().default(false),
  archived: z.boolean().default(false),
});

// User notification schema
export const UserNotificationSchema = z.object({
  id: z.string(),
  notificationId: z.string(),
  userId: z.string(),

  isRead: z.boolean().default(false),
  readAt: z.date().optional(),

  isDeleted: z.boolean().default(false),
  deletedAt: z.date().optional(),

  metadata: UserNotificationMetadataSchema,

  // Base document fields
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
});

// Combined notification with user-specific data
export const UserNotificationWithDetailsSchema = NotificationSchema.extend({
  userNotification: UserNotificationSchema.optional(),
});

// Create notification request schema
export const CreateNotificationSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  priority: NotificationPrioritySchema.optional(),

  targetType: NotificationTargetTypeSchema,
  targetDetails: NotificationTargetDetailsSchema,

  metadata: NotificationMetadataSchema.optional(),
  expiresAt: z.date().optional(),
});

// Update notification schema
export const UpdateNotificationSchema = CreateNotificationSchema.partial();

// Query parameters for fetching notifications
export const GetNotificationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
  types: z.array(NotificationTypeSchema).optional(),
  priority: NotificationPrioritySchema.optional(),
  sortBy: z.enum(['createdAt', 'priority', 'readAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Mark notifications as read schema
export const MarkNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(), // If not provided, marks all as read
  types: z.array(NotificationTypeSchema).optional(), // Filter by types when marking all
});

// Notification preferences schema (extension to existing user preferences)
export const InAppNotificationPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  digestFrequency: z
    .enum(['immediate', 'hourly', 'daily', 'weekly', 'never'])
    .default('immediate'),
});

// API Response schemas
export const NotificationResponseSchema = z.object({
  notification: NotificationSchema,
  success: z.boolean(),
  message: z.string().optional(),
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(UserNotificationWithDetailsSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
  unreadCount: z.number(),
});

export const NotificationStatsResponseSchema = z.object({
  total: z.number(),
  unread: z.number(),
  byType: z.record(z.string(), z.number()),
  byPriority: z.record(z.string(), z.number()),
});

// Bulk operations
export const BulkNotificationActionSchema = z.object({
  action: z.enum([
    'markRead',
    'markUnread',
    'delete',
    'star',
    'unstar',
    'archive',
    'unarchive',
  ]),
  notificationIds: z.array(z.string()),
});

// Type exports
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationTargetType = z.infer<
  typeof NotificationTargetTypeSchema
>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationTargetDetails = z.infer<
  typeof NotificationTargetDetailsSchema
>;
export type NotificationMetadata = z.infer<typeof NotificationMetadataSchema>;
export type NotificationSentBy = z.infer<typeof NotificationSentBySchema>;
export type NotificationStats = z.infer<typeof NotificationStatsSchema>;

export type UserNotification = z.infer<typeof UserNotificationSchema>;
export type UserNotificationMetadata = z.infer<
  typeof UserNotificationMetadataSchema
>;
export type UserNotificationWithDetails = z.infer<
  typeof UserNotificationWithDetailsSchema
>;

export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>;
export type GetNotificationsQuery = z.infer<typeof GetNotificationsQuerySchema>;
export type MarkNotificationsRead = z.infer<typeof MarkNotificationsReadSchema>;
export type InAppNotificationPreferences = z.infer<
  typeof InAppNotificationPreferencesSchema
>;

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationListResponse = z.infer<
  typeof NotificationListResponseSchema
>;
export type NotificationStatsResponse = z.infer<
  typeof NotificationStatsResponseSchema
>;
export type BulkNotificationAction = z.infer<
  typeof BulkNotificationActionSchema
>;

// Helper type for notification creation in services
export interface CreateInAppNotificationData {
  type: NotificationType;
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetDetails: NotificationTargetDetails;
  priority?: NotificationPriority;
  metadata?: NotificationMetadata;
  expiresAt?: Date;
  sentBy?: NotificationSentBy;
}

// Helper type for notification filtering
export interface NotificationFilters {
  types?: NotificationType[];
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  userId?: string;
  role?: 'user' | 'admin' | 'moderator';
  dateRange?: {
    from: Date;
    to: Date;
  };
}
