// Deprecated: NextAuth configuration removed. Keeping utility helpers for wallet auth message.
import { verifyMessageSignatureRsv } from '@stacks/encryption';
import { config } from './config';
import type { UserProfileResponse } from '@poolmind/shared-types';

// Type for the user object returned from API responses
type ApiUser = UserProfileResponse['user'];

// Extend NextAuth types
// NextAuth types removed


export default {} as any;