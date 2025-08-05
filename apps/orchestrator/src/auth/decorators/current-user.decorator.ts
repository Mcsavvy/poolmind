import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from '../../lib/models/user';

/**
 * Decorator to extract the current user from the request
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
