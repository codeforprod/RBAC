import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import {
  IRBACAdapter,
  IRBACCache,
  IAuditLogger,
  RBACEngine,
  PermissionChecker,
  InMemoryCache,
  NoOpAuditLogger,
} from '@prodforcode/rbac-core';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

export interface RbacModuleOptions {
  /**
   * RBAC adapter implementation (replaces individual repositories)
   */
  adapter: Type<IRBACAdapter> | IRBACAdapter;

  /**
   * Audit logger implementation (optional)
   */
  auditLogger?: Type<IAuditLogger> | IAuditLogger;

  /**
   * Cache implementation (optional)
   */
  cache?: Type<IRBACCache> | IRBACCache;

  /**
   * RBAC configuration options
   */
  options?: {
    /**
     * Enable audit logging
     * @default false
     */
    enableAuditLog?: boolean;

    /**
     * Cache TTL in seconds
     * @default 300 (5 minutes)
     */
    cacheTtl?: number;

    /**
     * Default role for new users
     */
    defaultRole?: string;
  };
}

export interface RbacModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<RbacModuleOptions> | RbacModuleOptions;
  inject?: any[];
}

/**
 * RBAC Module for NestJS
 *
 * @example
 * ```typescript
 * // Synchronous configuration
 * RbacModule.forRoot({
 *   adapter: new TypeOrmAdapter(dataSource),
 *   cache: new RedisCache(redisClient),
 *   auditLogger: new DatabaseAuditLogger(db),
 *   options: {
 *     enableAuditLog: true,
 *     cacheTtl: 300,
 *   }
 * })
 *
 * // Asynchronous configuration
 * RbacModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (configService: ConfigService) => ({
 *     adapter: new MongooseAdapter(connection),
 *     // ...
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class RbacModule {
  /**
   * Register RBAC module with synchronous configuration
   */
  static forRoot(options: RbacModuleOptions): DynamicModule {
    const providers = this.createProviders(options);

    return {
      module: RbacModule,
      providers: [
        ...providers,
        RolesGuard,
        PermissionsGuard,
      ],
      exports: [
        RBACEngine,
        PermissionChecker,
        RolesGuard,
        PermissionsGuard,
      ],
      global: true,
    };
  }

  /**
   * Register RBAC module with asynchronous configuration
   */
  static forRootAsync(asyncOptions: RbacModuleAsyncOptions): DynamicModule {
    return {
      module: RbacModule,
      imports: asyncOptions.imports || [],
      providers: [
        {
          provide: 'RBAC_MODULE_OPTIONS',
          useFactory: asyncOptions.useFactory,
          inject: asyncOptions.inject || [],
        },
        {
          provide: RBACEngine,
          useFactory: async (options: RbacModuleOptions) => {
            const adapter = typeof options.adapter === 'function'
              ? new (options.adapter as Type<IRBACAdapter>)()
              : options.adapter;

            const cache = options.cache
              ? (typeof options.cache === 'function'
                  ? new (options.cache as Type<IRBACCache>)()
                  : options.cache)
              : new InMemoryCache();

            const auditLogger = options.auditLogger
              ? (typeof options.auditLogger === 'function'
                  ? new (options.auditLogger as Type<IAuditLogger>)()
                  : options.auditLogger)
              : new NoOpAuditLogger();

            return await RBACEngine.create({
              adapter,
              cache,
              auditLogger,
            });
          },
          inject: ['RBAC_MODULE_OPTIONS'],
        },
        RolesGuard,
        PermissionsGuard,
      ],
      exports: [
        RBACEngine,
        PermissionChecker,
        RolesGuard,
        PermissionsGuard,
      ],
      global: true,
    };
  }

  /**
   * Create providers from synchronous options
   */
  private static createProviders(options: RbacModuleOptions): Provider[] {
    return [
      {
        provide: RBACEngine,
        useFactory: async () => {
          const adapter = typeof options.adapter === 'function'
            ? new (options.adapter as Type<IRBACAdapter>)()
            : options.adapter;

          const cache = options.cache
            ? (typeof options.cache === 'function'
                ? new (options.cache as Type<IRBACCache>)()
                : options.cache)
            : new InMemoryCache();

          const auditLogger = options.auditLogger
            ? (typeof options.auditLogger === 'function'
                ? new (options.auditLogger as Type<IAuditLogger>)()
                : options.auditLogger)
            : new NoOpAuditLogger();

          return await RBACEngine.create({
            adapter,
            cache,
            auditLogger,
          });
        },
      },
    ];
  }
}
