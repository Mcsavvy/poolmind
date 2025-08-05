import { SetMetadata } from '@nestjs/common';
import { Role } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for accessing a route
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
