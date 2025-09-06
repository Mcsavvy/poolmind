import { z } from 'zod';

// Import in-app notification preferences from notification types
import { InAppNotificationPreferencesSchema } from './notification';

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  email: z.boolean(),
  telegram: z.boolean(),
  inApp: InAppNotificationPreferencesSchema.default({
    enabled: true,
    digestFrequency: 'immediate',
  }),
});

// Telegram authentication schema
export const TelegramAuthSchema = z.object({
  telegramId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  photoUrl: z.string().url().optional(),
  authDate: z.number(),
  linkedAt: z.date(),
});

// Social links schema
export const SocialLinksSchema = z.object({
  twitter: z.string().optional(),
  discord: z.string().optional(),
  telegram: z.string().optional(),
  website: z.url().optional(),
});

// Connection history schema
export const ConnectionHistorySchema = z.object({
  connectedAt: z.date(),
  walletType: z.string(),
  ipAddress: z.string().optional(),
});

// Complete user schema
export const UserSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  publicKey: z.string().optional(),

  // Profile information
  username: z.string().optional(),
  email: z.email().optional(),
  displayName: z.string().optional(),
  profilePicture: z.url().optional(),
  bio: z.string().optional(),

  // Authentication metadata
  lastLoginAt: z.date().optional(),
  loginCount: z.number(),
  isEmailVerified: z.boolean(),

  // Telegram authentication (optional)
  telegramAuth: TelegramAuthSchema.optional(),

  // Preferences and settings
  notificationPreferences: NotificationPreferencesSchema,
  socialLinks: SocialLinksSchema.optional(),

  // Role and permissions
  role: z.enum(['user', 'admin', 'moderator']),

  // Connection tracking
  connectionHistory: z.array(ConnectionHistorySchema),

  // Base document fields
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
});

// Update DTOs
export const UpdateUserProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.email().optional(),
  displayName: z.string().max(50).optional(),
  profilePicture: z.url().optional(),
  bio: z.string().max(500).optional(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  telegram: z.boolean().optional(),
  inApp: InAppNotificationPreferencesSchema.partial().optional(),
});

export const UpdateSocialLinksSchema = z.object({
  twitter: z.string().optional(),
  discord: z.string().max(50).optional(),
  telegram: z.string().optional(),
  website: z.url().optional(),
});

// Telegram login data schema (from Telegram widget)
export const TelegramLoginDataSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

// Link Telegram account schema
export const LinkTelegramSchema = z.object({
  telegramData: TelegramLoginDataSchema,
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;
export type TelegramAuth = z.infer<typeof TelegramAuthSchema>;
export type SocialLinks = z.infer<typeof SocialLinksSchema>;
export type ConnectionHistory = z.infer<typeof ConnectionHistorySchema>;
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
export type UpdateNotificationPreferences = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;
export type UpdateSocialLinks = z.infer<typeof UpdateSocialLinksSchema>;
export type TelegramLoginData = z.infer<typeof TelegramLoginDataSchema>;
export type LinkTelegram = z.infer<typeof LinkTelegramSchema>;
