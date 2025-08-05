import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  email: z.string().email().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;