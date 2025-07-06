import { Context } from 'telegraf';
import { createHash, createHmac } from 'crypto';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { apiService } from './api';
import { TelegramAuthRequest, AuthResponse, User } from '../types';
import { SessionContext } from '../bot/middleware/session';

class AuthService {
  /**
   * Authenticate a Telegram user with the API
   */
  async authenticateUser(ctx: SessionContext): Promise<AuthResponse | null> {
    if (!ctx.from) {
      logger.error('No user information available in context');
      return null;
    }

    try {
      // Check if user is already authenticated and token is still valid
      const authTimestamp =
        typeof ctx.session.authTimestamp === 'string'
          ? new Date(ctx.session.authTimestamp)
          : ctx.session.authTimestamp;
      if (
        ctx.session?.isAuthenticated &&
        ctx.session?.jwtToken &&
        ctx.session?.user
      ) {
        if (this.isTokenValid(authTimestamp)) {
          logger.debug(`User ${ctx.from.id} already authenticated`);
          // Set the token in API service for subsequent requests
          apiService.setAuthToken(ctx.session.jwtToken);
          return {
            success: true,
            message: 'User already authenticated',
            data: {
              user: ctx.session.user,
              token: ctx.session.jwtToken,
              isNewUser: false,
            },
          };
        } else {
          // Token expired, clear session
          this.clearUserSession(ctx);
        }
      }

      // Prepare authentication request
      const authDate = Math.floor(Date.now() / 1000);
      const authRequest: TelegramAuthRequest = {
        chatId: ctx.chat?.id?.toString() || ctx.from.id.toString(),
        user: {
          id: ctx.from.id,
          username: ctx.from.username || '',
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name,
          language_code: ctx.from.language_code,
        },
        auth_date: authDate,
        hash: this.generateAuthHash(ctx.from, authDate),
      };

      // Authenticate with API
      const authResponse = await apiService.authenticateTelegram(authRequest);

      if (authResponse.success && authResponse.data) {
        // Store authentication data in session
        ctx.session.isAuthenticated = true;
        ctx.session.jwtToken = authResponse.data.token;
        ctx.session.user = authResponse.data.user;
        ctx.session.authTimestamp = new Date();
        ctx.session.userId = ctx.from.id;

        logger.info(`User ${ctx.from.id} authenticated successfully`);
        return authResponse;
      } else {
        logger.error('Authentication failed:', authResponse.message);
        return authResponse;
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed due to server error',
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(ctx: SessionContext): boolean {
    // console.log(`session: ${JSON.stringify(ctx.session, null, 2)}`);
    const authTimestamp =
      typeof ctx.session.authTimestamp === 'string'
        ? new Date(ctx.session.authTimestamp)
        : ctx.session.authTimestamp;

    return !!(
      ctx.session?.isAuthenticated &&
      ctx.session?.jwtToken &&
      ctx.session?.user &&
      this.isTokenValid(authTimestamp)
    );
  }

  /**
   * Get authenticated user from session
   */
  getAuthenticatedUser(ctx: SessionContext): User | null {
    if (this.isAuthenticated(ctx)) {
      return ctx.session.user || null;
    }
    return null;
  }

  /**
   * Clear user session and logout
   */
  clearUserSession(ctx: SessionContext): void {
    if (ctx.session) {
      ctx.session.isAuthenticated = false;
      ctx.session.jwtToken = undefined;
      ctx.session.user = undefined;
      ctx.session.authTimestamp = undefined;
    }
    apiService.clearAuthToken();
    logger.debug(`Session cleared for user ${ctx.from?.id}`);
  }

  /**
   * Check if JWT token is still valid (not expired)
   * Tokens are considered valid for 24 hours
   */
  private isTokenValid(authTimestamp?: Date): boolean {
    if (!authTimestamp) return false;

    const tokenLifetime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = new Date();
    const tokenAge = now.getTime() - authTimestamp.getTime();

    return tokenAge < tokenLifetime;
  }

  /**
   * Generate authentication hash for Telegram user
   * This is a simplified version - in production, you might want to implement
   * the full Telegram authentication verification as described in their docs
   */
  private generateAuthHash(user: any, authDate: number): string {
    const botToken = config.bot.token;
    const secretKey = createHash('sha256').update(botToken).digest();

    // Create data string
    const dataString = [
      `id=${user.id}`,
      user.username ? `username=${user.username}` : '',
      user.first_name ? `first_name=${user.first_name}` : '',
      user.last_name ? `last_name=${user.last_name}` : '',
      user.language_code ? `language_code=${user.language_code}` : '',
      `auth_date=${authDate}`,
    ]
      .filter(Boolean)
      .sort()
      .join('\n');

    // Generate HMAC
    const hmac = createHmac('sha256', secretKey);
    hmac.update(dataString);
    return hmac.digest('hex');
  }

  /**
   * Refresh user profile from API
   */
  async refreshUserProfile(ctx: SessionContext): Promise<User | null> {
    if (!this.ensureApiToken(ctx)) {
      logger.error('Cannot refresh profile - authentication token not available');
      return null;
    }

    try {
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        // Update session with fresh user data
        ctx.session.user = response.data;
        logger.debug(`Profile refreshed for user ${ctx.from?.id}`);
        return response.data;
      }
    } catch (error: any) {
      logger.error('Failed to refresh user profile:', error);
      // If refresh fails due to auth error, clear session
      if (error.response?.status === 401) {
        this.clearUserSession(ctx);
      }
    }

    return null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    ctx: SessionContext,
    profileData: { firstName?: string; lastName?: string; preferences?: any }
  ): Promise<User | null> {
    if (!this.ensureApiToken(ctx)) {
      logger.error('Cannot update profile - authentication token not available');
      return null;
    }

    try {
      logger.info(
        `Updating user profile for user ${ctx.from?.id}:`,
        JSON.stringify(profileData, null, 2)
      );

      const response = await apiService.updateUserProfile(profileData);

      logger.info(
        `Profile update API response:`,
        JSON.stringify(response, null, 2)
      );

      if (response.success && response.data) {
        // Update session with updated user data
        ctx.session.user = response.data;
        logger.info(`Profile updated successfully for user ${ctx.from?.id}`);
        return response.data;
      } else {
        logger.error(
          `Profile update failed for user ${ctx.from?.id}:`,
          response.message
        );
        return null;
      }
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      return null;
    }
  }

  /**
   * Ensure JWT token is set in API service for authenticated requests
   * Call this before making any authenticated API calls
   */
  ensureApiToken(ctx: SessionContext): boolean {
    if (!this.isAuthenticated(ctx)) {
      logger.error('User not authenticated, cannot set API token');
      return false;
    }

    if (ctx.session?.jwtToken) {
      apiService.setAuthToken(ctx.session.jwtToken);
      return true;
    } else {
      logger.error('No JWT token found in session');
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
