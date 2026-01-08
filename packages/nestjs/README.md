# @prodforcode/rbac-nestjs

NestJS integration for @prodforcode/rbac-core with decorators, guards, interceptors, and dynamic module configuration.

## Features

- **Dynamic Module** - Configure RBAC with `forRoot` and `forRootAsync`
- **Decorators** - `@Roles()`, `@Permissions()`, `@CurrentUser()`, and more
- **Guards** - `RolesGuard` and `PermissionsGuard` for route protection
- **Interceptors** - `AuditInterceptor` for automatic audit logging
- **Dependency Injection** - Full DI support for adapters and services
- **TypeScript** - Complete type safety
- **Testing** - Easy to mock and test

## Installation

```bash
npm install @prodforcode/rbac-nestjs @prodforcode/rbac-core @nestjs/common @nestjs/core reflect-metadata rxjs
# or
yarn add @prodforcode/rbac-nestjs @prodforcode/rbac-core @nestjs/common @nestjs/core reflect-metadata rxjs
# or
pnpm add @prodforcode/rbac-nestjs @prodforcode/rbac-core @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { RbacModule } from '@prodforcode/rbac-nestjs';
import { TypeORMAdapter } from '@prodforcode/rbac-typeorm';
import { RedisCacheAdapter } from '@prodforcode/rbac-cache';

@Module({
  imports: [
    RbacModule.forRoot({
      adapter: new TypeORMAdapter(dataSource),
      cache: new RedisCacheAdapter({ redis }),
      options: {
        enableAuditLog: true,
        cacheTtl: 300
      }
    })
  ]
})
export class AppModule {}
```

## Module Configuration

### Synchronous Configuration

Use `forRoot()` when your configuration is static:

```typescript
import { Module } from '@nestjs/common';
import { RbacModule } from '@prodforcode/rbac-nestjs';
import { TypeORMAdapter } from '@prodforcode/rbac-typeorm';
import { MemoryCacheAdapter } from '@prodforcode/rbac-cache';

@Module({
  imports: [
    RbacModule.forRoot({
      // Required: Database adapter
      adapter: new TypeORMAdapter(dataSource),

      // Optional: Cache adapter (defaults to in-memory)
      cache: new MemoryCacheAdapter({
        maxSize: 10000,
        defaultTtl: 300
      }),

      // Optional: Audit logger
      auditLogger: new DatabaseAuditLogger(db),

      // Optional: Configuration options
      options: {
        enableAuditLog: true,
        cacheTtl: 300,
        defaultRole: 'viewer'
      }
    })
  ]
})
export class AppModule {}
```

### Asynchronous Configuration

Use `forRootAsync()` when you need to inject dependencies:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RbacModule } from '@prodforcode/rbac-nestjs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        database: config.get('DB_NAME'),
        entities: [/* ... */]
      }),
      inject: [ConfigService]
    }),
    RbacModule.forRootAsync({
      imports: [ConfigModule, TypeOrmModule],
      useFactory: (config: ConfigService, dataSource: DataSource) => ({
        adapter: new TypeORMAdapter(dataSource),
        options: {
          enableAuditLog: config.get('ENABLE_AUDIT'),
          cacheTtl: config.get('CACHE_TTL', 300)
        }
      }),
      inject: [ConfigService, DataSource]
    })
  ]
})
export class AppModule {}
```

## Decorators

### @Roles()

Specify required roles for a route. User must have at least ONE of the specified roles.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '@prodforcode/rbac-nestjs';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles('admin', 'superAdmin')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('settings')
  @Roles('superAdmin')
  getSettings() {
    return { message: 'System settings' };
  }
}
```

### @Permissions()

Specify required permissions for a route. User must have ALL specified permissions.

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { Permissions, PermissionsGuard } from '@prodforcode/rbac-nestjs';

@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  @Post()
  @Permissions('users:create')
  createUser() {
    return { message: 'User created' };
  }

  @Post(':id/ban')
  @Permissions('users:update', 'users:ban')
  banUser() {
    return { message: 'User banned' };
  }
}
```

### @RequiresRole()

Alternative decorator that throws an exception if role is missing:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequiresRole } from '@prodforcode/rbac-nestjs';

@Controller('reports')
export class ReportsController {
  @Get('financial')
  @RequiresRole('accountant')
  getFinancialReport() {
    return { message: 'Financial report' };
  }
}
```

### @RequiresPermission()

Alternative decorator that throws if permission is missing:

```typescript
import { Controller, Delete } from '@nestjs/common';
import { RequiresPermission } from '@prodforcode/rbac-nestjs';

@Controller('posts')
export class PostsController {
  @Delete(':id')
  @RequiresPermission('posts:delete')
  deletePost() {
    return { message: 'Post deleted' };
  }
}
```

### @RequiresAny()

User must have at least one of the specified permissions:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequiresAny } from '@prodforcode/rbac-nestjs';

@Controller('content')
export class ContentController {
  @Get()
  @RequiresAny('posts:read', 'articles:read', 'pages:read')
  getContent() {
    return { message: 'Content list' };
  }
}
```

### @RequiresAll()

User must have all specified permissions:

```typescript
import { Controller, Post } from '@nestjs/common';
import { RequiresAll } from '@prodforcode/rbac-nestjs';

@Controller('deployments')
export class DeploymentsController {
  @Post()
  @RequiresAll('deployments:create', 'infrastructure:write', 'secrets:read')
  createDeployment() {
    return { message: 'Deployment created' };
  }
}
```

### @CurrentUser()

Extract the current user from the request:

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@prodforcode/rbac-nestjs';

interface User {
  id: string;
  email: string;
}

@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: User) {
    return { userId: user.id, email: user.email };
  }
}
```

### @Public()

Mark a route as public (skip all RBAC checks):

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '@prodforcode/rbac-nestjs';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok' };
  }
}
```

## Guards

### RolesGuard

Validates that the user has the required roles.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard, Roles } from '@prodforcode/rbac-nestjs';

@Controller('api')
@UseGuards(RolesGuard)
export class ApiController {
  @Get('data')
  @Roles('admin')
  getData() {
    return { data: [] };
  }
}
```

### PermissionsGuard

Validates that the user has the required permissions.

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { PermissionsGuard, Permissions } from '@prodforcode/rbac-nestjs';

@Controller('api')
@UseGuards(PermissionsGuard)
export class ApiController {
  @Post('data')
  @Permissions('data:create')
  createData() {
    return { success: true };
  }
}
```

### Global Guards

Apply guards globally to all routes:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RbacModule, PermissionsGuard } from '@prodforcode/rbac-nestjs';

@Module({
  imports: [RbacModule.forRoot({ /* ... */ })],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ]
})
export class AppModule {}
```

### Combining Guards

Use multiple guards together:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '@prodforcode/rbac-nestjs';

@Controller('secure')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SecureController {
  @Get('data')
  @Roles('admin')
  getData() {
    return { data: [] };
  }
}
```

## Interceptors

### AuditInterceptor

Automatically log all authorization events:

```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '@prodforcode/rbac-nestjs';

@Controller('users')
@UseInterceptors(AuditInterceptor)
export class UsersController {
  // All requests to this controller will be audited
}
```

### Global Audit Interceptor

Apply audit logging to all routes:

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RbacModule, AuditInterceptor } from '@prodforcode/rbac-nestjs';

@Module({
  imports: [RbacModule.forRoot({ /* ... */ })],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
```

## Injecting RBACEngine

Access the RBAC engine directly in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { RBACEngine } from '@prodforcode/rbac-core';

@Injectable()
export class UsersService {
  constructor(private readonly rbac: RBACEngine) {}

  async assignEditorRole(userId: string) {
    const editorRole = await this.rbac.getRoleByName('editor');
    if (!editorRole) {
      throw new Error('Editor role not found');
    }

    await this.rbac.assignRole({
      userId,
      roleId: editorRole.id
    });
  }

  async checkPermission(userId: string, permission: string) {
    return await this.rbac.can(userId, permission);
  }

  async getUserPermissions(userId: string) {
    return await this.rbac.getUserPermissions(userId);
  }
}
```

## Complete Example

### Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacModule } from '@prodforcode/rbac-nestjs';
import { TypeORMAdapter, entities } from '@prodforcode/rbac-typeorm';
import { RedisCacheAdapter } from '@prodforcode/rbac-cache';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'password',
      database: 'myapp',
      entities: entities,
      synchronize: true
    }),
    RbacModule.forRootAsync({
      imports: [TypeOrmModule],
      useFactory: (dataSource: DataSource) => {
        const redis = new Redis({
          host: 'localhost',
          port: 6379
        });

        return {
          adapter: new TypeORMAdapter(dataSource),
          cache: new RedisCacheAdapter({ redis }),
          options: {
            enableAuditLog: true,
            cacheTtl: 300
          }
        };
      },
      inject: [DataSource]
    })
  ]
})
export class AppModule {}
```

### Controller

```typescript
// users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  Param,
  Body
} from '@nestjs/common';
import {
  Roles,
  Permissions,
  CurrentUser,
  RolesGuard,
  PermissionsGuard,
  AuditInterceptor
} from '@prodforcode/rbac-nestjs';
import { AuthGuard } from '@nestjs/passport';

interface User {
  id: string;
  email: string;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@UseInterceptors(AuditInterceptor)
export class UsersController {
  @Get()
  @Permissions('users:read')
  async listUsers() {
    return [{ id: '1', email: 'user@example.com' }];
  }

  @Get('me')
  @Permissions('users:read:own')
  async getProfile(@CurrentUser() user: User) {
    return { id: user.id, email: user.email };
  }

  @Post()
  @Permissions('users:create')
  async createUser(@Body() data: any) {
    return { id: 'new-user', ...data };
  }

  @Put(':id')
  @Permissions('users:update')
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return { id, ...data };
  }

  @Delete(':id')
  @Permissions('users:delete')
  async deleteUser(@Param('id') id: string) {
    return { deleted: true };
  }

  @Post(':id/ban')
  @Roles('admin', 'moderator')
  @Permissions('users:ban')
  async banUser(@Param('id') id: string) {
    return { banned: true };
  }
}
```

### Service

```typescript
// rbac.service.ts
import { Injectable } from '@nestjs/common';
import { RBACEngine } from '@prodforcode/rbac-core';

@Injectable()
export class RbacService {
  constructor(private readonly rbac: RBACEngine) {}

  async setupDefaultRoles() {
    // Create viewer role
    const viewer = await this.rbac.createRole({
      name: 'viewer',
      permissions: ['posts:read', 'comments:read']
    });

    // Create editor role
    const editor = await this.rbac.createRole({
      name: 'editor',
      permissions: ['posts:*', 'comments:*'],
      parentRoles: [viewer.id]
    });

    // Create admin role
    await this.rbac.createRole({
      name: 'admin',
      permissions: ['**'],
      parentRoles: [editor.id]
    });
  }

  async assignDefaultRole(userId: string) {
    const viewer = await this.rbac.getRoleByName('viewer');
    if (viewer) {
      await this.rbac.assignRole({
        userId,
        roleId: viewer.id
      });
    }
  }

  async promoteToEditor(userId: string) {
    const editor = await this.rbac.getRoleByName('editor');
    if (editor) {
      await this.rbac.assignRole({
        userId,
        roleId: editor.id
      });
    }
  }

  async getUserPermissions(userId: string) {
    return await this.rbac.getUserPermissions(userId);
  }

  async can(userId: string, permission: string) {
    return await this.rbac.can(userId, permission);
  }
}
```

## Authentication Integration

### JWT Strategy

```typescript
// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RBACEngine } from '@prodforcode/rbac-core';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly rbac: RBACEngine) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'your-secret-key'
    });
  }

  async validate(payload: any) {
    // Attach user permissions to request
    const permissions = await this.rbac.getUserPermissions(payload.sub);

    return {
      id: payload.sub,
      email: payload.email,
      permissions: permissions.map(p =>
        `${p.resource}:${p.action}${p.scope ? ':' + p.scope : ''}`
      )
    };
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RBACEngine } from '@prodforcode/rbac-core';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let rbac: RBACEngine;

  beforeEach(async () => {
    const mockRbac = {
      can: jest.fn(),
      getUserPermissions: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: RBACEngine,
          useValue: mockRbac
        }
      ]
    }).compile();

    controller = module.get<UsersController>(UsersController);
    rbac = module.get<RBACEngine>(RBACEngine);
  });

  it('should allow user with permission', async () => {
    jest.spyOn(rbac, 'can').mockResolvedValue(true);
    const result = await controller.listUsers();
    expect(result).toBeDefined();
  });
});
```

### E2E Testing

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (GET) - should require authentication', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(401);
  });

  it('/users (GET) - should allow with valid token', () => {
    return request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## API Reference

### RbacModule

```typescript
class RbacModule {
  static forRoot(options: RbacModuleOptions): DynamicModule;
  static forRootAsync(options: RbacModuleAsyncOptions): DynamicModule;
}

interface RbacModuleOptions {
  adapter: Type<IRBACAdapter> | IRBACAdapter;
  auditLogger?: Type<IAuditLogger> | IAuditLogger;
  cache?: Type<IRBACCache> | IRBACCache;
  options?: {
    enableAuditLog?: boolean;
    cacheTtl?: number;
    defaultRole?: string;
  };
}
```

### Decorators

```typescript
// Role-based
@Roles(...roles: string[])
@RequiresRole(role: string)

// Permission-based
@Permissions(...permissions: string[])
@RequiresPermission(permission: string)
@RequiresAny(...permissions: string[])
@RequiresAll(...permissions: string[])

// Utility
@CurrentUser()
@Public()
```

### Guards

```typescript
class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}

class PermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}
```

### Interceptors

```typescript
class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
```

## Best Practices

1. **Use Guards Consistently** - Apply guards at the controller or global level
2. **Prefer Permissions over Roles** - More granular control
3. **Cache Aggressively** - Use Redis for multi-instance deployments
4. **Audit Important Actions** - Enable audit logging for compliance
5. **Test Authorization** - Write tests for permission checks
6. **Handle Errors Gracefully** - Provide user-friendly error messages

## License

MIT
