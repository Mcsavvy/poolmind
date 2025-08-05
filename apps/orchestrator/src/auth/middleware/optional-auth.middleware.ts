import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth.service';

/**
 * Optional Authentication Middleware
 * Extracts user information from JWT token if present,
 * but allows requests to continue even without authentication
 */
@Injectable()
export class OptionalAuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const token = this.authService.extractTokenFromHeader(authHeader);

      if (token) {
        const user = await this.authService.verifyToken(token);
        if (user) {
          (req as any).user = user;
        }
      }
    } catch (error) {
      // Silently ignore authentication errors in optional middleware
      console.debug('Optional auth middleware error:', error);
    }

    next();
  }
}
