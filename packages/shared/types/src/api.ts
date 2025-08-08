import { z } from 'zod';

// Base API response schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Authentication request schemas
export const NonceRequestSchema = z.object({
  walletAddress: z.string(),
});

export const LoginRequestSchema = z.object({
  walletAddress: z.string(),
  publicKey: z.string(),
  signature: z.string(),
  message: z.string(),
  walletType: z.string().optional(),
  network: z.enum(['mainnet', 'testnet']).optional(),
});

export const RefreshTokenRequestSchema = z.object({
  token: z.string(),
});

// Telegram authentication schemas
export const TelegramLoginRequestSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

export const LinkTelegramRequestSchema = z.object({
  telegramData: TelegramLoginRequestSchema,
});

// Authentication response schemas
export const NonceResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    walletAddress: z.string(),
    username: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    profilePicture: z.string().optional(),
    role: z.enum(['user', 'admin', 'moderator']),
    isEmailVerified: z.boolean(),
    telegramAuth: z.object({
      telegramId: z.number(),
      firstName: z.string(),
      lastName: z.string().optional(),
      username: z.string().optional(),
      photoUrl: z.string().optional(),
      authDate: z.number(),
      linkedAt: z.string(),
    }).optional(),
  }),
  success: z.boolean(),
});

export const RefreshTokenResponseSchema = z.object({
  token: z.string(),
  success: z.boolean(),
});

// User profile response schemas
export const UserProfileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    walletAddress: z.string(),
    username: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    profilePicture: z.string().optional(),
    bio: z.string().optional(),
    role: z.enum(['user', 'admin', 'moderator']),
    isEmailVerified: z.boolean(),
    telegramAuth: z.object({
      telegramId: z.number(),
      firstName: z.string(),
      lastName: z.string().optional(),
      username: z.string().optional(),
      photoUrl: z.string().optional(),
      authDate: z.number(),
      linkedAt: z.string(),
    }).optional(),
    notificationPreferences: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
      marketing: z.boolean(),
      security: z.boolean(),
    }),
    socialLinks: z.object({
      twitter: z.string().optional(),
      discord: z.string().optional(),
      telegram: z.string().optional(),
      website: z.string().optional(),
    }).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastLoginAt: z.string().optional(),
    loginCount: z.number(),
  }),
  success: z.boolean(),
});

export const UpdateProfileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    walletAddress: z.string(),
    username: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    profilePicture: z.string().optional(),
    bio: z.string().optional(),
    role: z.enum(['user', 'admin', 'moderator']),
    isEmailVerified: z.boolean(),
    notificationPreferences: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
      marketing: z.boolean(),
      security: z.boolean(),
    }),
    socialLinks: z.object({
      twitter: z.string().optional(),
      discord: z.string().optional(),
      telegram: z.string().optional(),
      website: z.string().optional(),
    }).optional(),
    updatedAt: z.string(),
  }),
  message: z.string().optional(),
  success: z.boolean(),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
  details: z.any().optional(),
});

// Type exports
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type NonceRequest = z.infer<typeof NonceRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type TelegramLoginRequest = z.infer<typeof TelegramLoginRequestSchema>;
export type LinkTelegramRequest = z.infer<typeof LinkTelegramRequestSchema>;

export type NonceResponse = z.infer<typeof NonceResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;