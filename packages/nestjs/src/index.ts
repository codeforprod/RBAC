/**
 * @callairis/rbac-nestjs
 *
 * NestJS integration for RBAC system
 */

// Module
export * from './modules/rbac.module';

// Guards
export * from './guards/roles.guard';
export * from './guards/permissions.guard';

// Decorators
export * from './decorators/roles.decorator';
export * from './decorators/permissions.decorator';
export * from './decorators/current-user.decorator';

// Interceptors
export * from './interceptors/audit.interceptor';
