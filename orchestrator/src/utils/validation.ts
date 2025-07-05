import { z } from "zod";

// Telegram authentication validation
export const telegramAuthSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  user: z.object({
    id: z.number().int().positive("User ID must be a positive integer"),
    username: z.string().min(1, "Username is required"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    language_code: z.string().optional(),
  }),
  auth_date: z
    .number()
    .int()
    .positive("Auth date must be a positive integer")
    .optional(),
  hash: z.string().optional(),
});

// Profile update validation
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  preferences: z
    .object({
      notifications: z.boolean().optional(),
      language: z.string().min(2).max(5).optional(),
    })
    .optional(),
});

// Wallet linking validation
export const linkWalletSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
  signature: z.string().optional(),
});

// Wallet connect URL validation
export const walletConnectUrlSchema = z.object({
  userId: z.string().optional(),
  redirectUrl: z.string().url().optional(),
});

// Note: Complex wallet authentication schemas removed
// Wallet address linking is now handled through the simpler linkWalletSchema above

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Common response schemas
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});

export const errorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  errors: z.array(z.string()).optional(),
});

// Validation middleware helper
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
        });
      }
      next(error);
    }
  };
};
