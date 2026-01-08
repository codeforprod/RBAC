# @prodforcode/rbac-core

A framework-agnostic, production-ready Role-Based Access Control (RBAC) library for TypeScript applications.

## Features

- **Wildcard Permissions** - Support for single-level (`*`) and multi-level (`**`) wildcards
- **Role Hierarchy** - Inheritance through parent-child role relationships
- **ABAC Support** - Attribute-Based Access Control through conditions
- **Caching Integration** - Built-in caching abstraction for performance
- **Audit Logging** - Comprehensive audit trail for all authorization decisions
- **Multi-Tenancy** - Organization-scoped roles and permissions
- **Zero Dependencies** - Core package has no external runtime dependencies
- **TypeScript First** - Full type safety with strict mode

## Installation

```bash
npm install @prodforcode/rbac-core
# or
yarn add @prodforcode/rbac-core
# or
pnpm add @prodforcode/rbac-core
```

## Quick Start

```typescript
import {
  RBACEngine,
  IRBACAdapter,
  InMemoryCache,
  InMemoryAuditLogger
} from '@prodforcode/rbac-core';

// 1. Implement your database adapter (see Adapters section)
const adapter: IRBACAdapter = new MyDatabaseAdapter();

// 2. Create the RBAC engine
const rbac = await RBACEngine.create({
  adapter,
  cache: new InMemoryCache(),
  auditLogger: new InMemoryAuditLogger()
});

// 3. Check permissions
const canRead = await rbac.can('user-123', 'posts:read');

// 4. Authorize (throws if denied)
await rbac.authorize('user-123', 'posts:update');

// 5. Create roles
const editorRole = await rbac.createRole({
  name: 'editor',
  permissions: ['posts:read', 'posts:write', 'posts:delete']
});

// 6. Assign roles to users
await rbac.assignRole({
  userId: 'user-123',
  roleId: editorRole.id
});
```

## Permission Format

Permissions follow a resource-action pattern separated by colons:

```
resource:action
resource:action:scope
resource:subresource:action
```

### Examples

```typescript
// Basic permissions
'posts:read'          // Read posts
'posts:write'         // Write posts
'users:delete'        // Delete users

// Nested resources
'users:profile:read'  // Read user profiles
'orgs:teams:manage'   // Manage organization teams

// With scope
'posts:update:own'    // Update own posts only
'comments:delete:all' // Delete all comments
```

## Wildcard Permissions

### Single-Level Wildcard (`*`)

Matches exactly one segment:

```typescript
'posts:*'           // Matches: posts:read, posts:write
                    // NOT: posts:draft:publish

'users:*:read'      // Matches: users:profile:read, users:settings:read
                    // NOT: users:read
```

### Multi-Level Wildcard (`**`)

Matches one or more segments:

```typescript
'admin:**'          // Matches: admin:users, admin:users:delete, admin:roles:permissions:grant

'**:read'           // Matches: posts:read, users:profile:read, orgs:teams:members:read

'**'                // Super admin - matches everything
```

### Specificity Rules

When multiple permissions match, the most specific one wins:

1. Exact match: `posts:read` (highest priority)
2. Single wildcard: `posts:*`
3. Multi-level wildcard at end: `posts:**`
4. Multi-level wildcard at start: `**:read`
5. Full wildcard: `**` (lowest priority)

## Role Hierarchy

Roles can inherit permissions from parent roles:

```typescript
// Create base role
const viewerRole = await rbac.createRole({
  name: 'viewer',
  permissions: ['posts:read', 'comments:read']
});

// Create role that inherits from viewer
const editorRole = await rbac.createRole({
  name: 'editor',
  permissions: ['posts:write', 'posts:delete'],
  parentRoles: [viewerRole.id]  // Inherits viewer permissions
});

// Create admin role with multiple parents
const adminRole = await rbac.createRole({
  name: 'admin',
  permissions: ['users:*', 'roles:*'],
  parentRoles: [editorRole.id]  // Inherits editor + viewer
});

// User with 'admin' role has:
// - posts:read (from viewer)
// - comments:read (from viewer)
// - posts:write (from editor)
// - posts:delete (from editor)
// - users:* (direct)
// - roles:* (direct)
```

### Circular Dependency Detection

The library automatically detects and prevents circular dependencies:

```typescript
// This will throw CircularHierarchyError
await rbac.createRole({
  name: 'role-a',
  parentRoles: ['role-b-id']  // role-b already inherits from role-a
});
```

## Authorization Context

Provide context for advanced permission checks:

```typescript
// Ownership check
const canEdit = await rbac.can('user-123', 'posts:update:own', {
  resourceOwnerId: 'user-123'  // User owns the resource
});

// Organization scope
const canManage = await rbac.can('user-123', 'teams:manage', {
  organizationId: 'org-456'
});

// Custom attributes
const canAccess = await rbac.can('user-123', 'reports:view', {
  attributes: {
    department: 'engineering',
    clearanceLevel: 5
  }
});
```

## Implementing Adapters

Create an adapter to connect RBAC to your database:

```typescript
import {
  IRBACAdapter,
  IRole,
  IPermission,
  IUserRoleAssignment,
  ICreateRoleOptions,
  ICreatePermissionOptions,
  ICreateUserRoleOptions
} from '@prodforcode/rbac-core';

class PostgresAdapter implements IRBACAdapter {
  constructor(private db: Database) {}

  // Role operations
  async findRoleById(id: string): Promise<IRole | null> {
    const result = await this.db.query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findRoleByName(name: string, organizationId?: string | null): Promise<IRole | null> {
    const query = organizationId
      ? 'SELECT * FROM roles WHERE name = $1 AND organization_id = $2'
      : 'SELECT * FROM roles WHERE name = $1 AND organization_id IS NULL';

    const params = organizationId ? [name, organizationId] : [name];
    const result = await this.db.query(query, params);
    return result.rows[0] || null;
  }

  async createRole(options: ICreateRoleOptions): Promise<IRole> {
    const result = await this.db.query(
      `INSERT INTO roles (name, description, organization_id, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [options.name, options.description, options.organizationId, true]
    );
    return result.rows[0];
  }

  // ... implement all required methods
  // See IRBACAdapter interface for complete list
}
```

## Caching

### Using Built-in InMemoryCache

```typescript
import { InMemoryCache } from '@prodforcode/rbac-core';

const cache = new InMemoryCache({
  maxSize: 10000,           // Maximum entries
  defaultTtl: 300,          // 5 minutes default TTL
  checkInterval: 60000,     // Cleanup every minute
  enableStatistics: true    // Track hit/miss stats
});

const rbac = await RBACEngine.create({
  adapter,
  cache,
  cacheOptions: {
    enabled: true,
    rolesTtl: 3600,           // Cache roles for 1 hour
    permissionsTtl: 1800,     // Cache permissions for 30 min
    userPermissionsTtl: 300   // Cache user permissions for 5 min
  }
});
```

### Implementing Custom Cache (e.g., Redis)

```typescript
import { IRBACCache, ICacheSetOptions, ICacheGetOptions } from '@prodforcode/rbac-core';
import Redis from 'ioredis';

class RedisCache implements IRBACCache {
  constructor(private redis: Redis) {}

  async get<T>(key: string, options?: ICacheGetOptions): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set<T>(key: string, value: T, options?: ICacheSetOptions): Promise<void> {
    const ttl = options?.ttl ?? 300;
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern.replace('*', '*'));
    if (keys.length === 0) return 0;
    return this.redis.del(...keys);
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }

  async has(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: ICacheSetOptions
  ): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== null) return existing;

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }
}
```

## Audit Logging

### Using InMemoryAuditLogger

```typescript
import { InMemoryAuditLogger, AuditAction } from '@prodforcode/rbac-core';

const auditLogger = new InMemoryAuditLogger({
  maxEntries: 10000,
  enabledActions: [
    AuditAction.PERMISSION_GRANTED,
    AuditAction.PERMISSION_DENIED,
    AuditAction.ROLE_CREATED,
    AuditAction.ROLE_ASSIGNED
  ]
});

const rbac = await RBACEngine.create({ adapter, auditLogger });

// Query audit logs
const logs = await auditLogger.query({
  userId: 'user-123',
  action: AuditAction.PERMISSION_DENIED,
  startDate: new Date('2024-01-01'),
  limit: 100
});

// Export to CSV
const csv = await auditLogger.export({}, 'csv');
```

### Implementing Custom Audit Logger

```typescript
import {
  IAuditLogger,
  IAuditEntry,
  ICreateAuditEntryOptions,
  IAuditQueryOptions,
  IAuditQueryResult
} from '@prodforcode/rbac-core';

class DatabaseAuditLogger implements IAuditLogger {
  constructor(private db: Database) {}

  async log(options: ICreateAuditEntryOptions): Promise<IAuditEntry> {
    const result = await this.db.query(
      `INSERT INTO audit_logs (action, actor_id, target_type, target_id, details, severity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        options.action,
        options.actorId,
        options.targetType,
        options.targetId,
        JSON.stringify(options.details),
        options.severity
      ]
    );
    return result.rows[0];
  }

  async query(options: IAuditQueryOptions): Promise<IAuditQueryResult> {
    // Implement query logic
  }
}
```

## Event Hooks

Register hooks for RBAC events:

```typescript
rbac.registerHooks({
  onPermissionCheck: async (userId, permission, result, context) => {
    console.log(`${userId} checked ${permission}: ${result.allowed}`);
  },

  onRoleCreated: async (role, actorId) => {
    await notifyAdmins(`New role created: ${role.name}`);
  },

  onRoleAssigned: async (assignment, actorId) => {
    await sendEmail(assignment.userId, 'New role assigned');
  },

  onRoleRevoked: async (userId, roleId, actorId) => {
    await invalidateUserSessions(userId);
  },

  onPermissionGranted: async (roleId, permissionId, actorId) => {
    await refreshPermissionCache(roleId);
  }
});
```

## Multi-Tenancy

Support organization-scoped roles and permissions:

```typescript
const rbac = await RBACEngine.create({
  adapter,
  multiTenancyOptions: {
    enabled: true,
    isolationLevel: 'strict',        // 'strict' | 'shared' | 'hybrid'
    organizationIdField: 'org_id',
    allowCrossOrganization: false
  }
});

// Create organization-specific role
const orgAdminRole = await rbac.createRole({
  name: 'org-admin',
  organizationId: 'org-123',
  permissions: ['users:*', 'teams:*']
});

// Assign role within organization
await rbac.assignRole({
  userId: 'user-456',
  roleId: orgAdminRole.id,
  organizationId: 'org-123'
});

// Check permission in organization context
const canManage = await rbac.can('user-456', 'users:manage', {
  organizationId: 'org-123'
});
```

## Error Handling

The library provides specific error types:

```typescript
import {
  RBACError,
  PermissionDeniedError,
  RoleNotFoundError,
  CircularHierarchyError,
  isPermissionDeniedError
} from '@prodforcode/rbac-core';

try {
  await rbac.authorize('user-123', 'admin:delete');
} catch (error) {
  if (isPermissionDeniedError(error)) {
    console.log('Permission denied:', error.permission);
    console.log('User:', error.userId);
    console.log('Suggestion:', error.suggestion);

    // Return appropriate HTTP response
    const httpResponse = error.toHttpResponse();
    // { statusCode: 403, message: '...', code: 'RBAC_1001' }
  }

  if (error instanceof RoleNotFoundError) {
    console.log('Role not found:', error.roleId);
  }

  if (error instanceof CircularHierarchyError) {
    console.log('Circular dependency detected:', error.getVisualChain());
  }
}
```

## API Reference

### RBACEngine

The main entry point for all RBAC operations.

```typescript
class RBACEngine {
  // Factory method
  static async create(options: RBACEngineOptions): Promise<RBACEngine>;

  // Permission checking
  async can(userId: string, permission: string, context?: IUserAuthorizationContext): Promise<boolean>;
  async canAny(userId: string, permissions: string[], context?: IUserAuthorizationContext): Promise<boolean>;
  async canAll(userId: string, permissions: string[], context?: IUserAuthorizationContext): Promise<boolean>;
  async authorize(userId: string, permission: string, context?: IUserAuthorizationContext): Promise<void>;
  async checkDetailed(options: ICheckPermissionOptions): Promise<IDetailedPermissionCheckResult>;

  // Role management
  async createRole(options: ICreateRoleOptions, actorId?: string): Promise<IRole>;
  async updateRole(roleId: string, updates: IUpdateRoleOptions, actorId?: string): Promise<IRole>;
  async deleteRole(roleId: string, actorId?: string): Promise<boolean>;
  async getRole(roleId: string): Promise<IRole | null>;
  async getRoleByName(name: string, organizationId?: string): Promise<IRole | null>;
  async listRoles(options?: { organizationId?: string; includeInactive?: boolean }): Promise<IRole[]>;

  // Permission management
  async grantPermission(roleId: string, permissionId: string, actorId?: string): Promise<void>;
  async revokePermission(roleId: string, permissionId: string, actorId?: string): Promise<void>;

  // User role management
  async assignRole(options: ICreateUserRoleOptions, actorId?: string): Promise<IUserRoleAssignment>;
  async revokeRole(userId: string, roleId: string, organizationId?: string, actorId?: string): Promise<boolean>;
  async getUserRoles(userId: string, organizationId?: string): Promise<IRole[]>;
  async getUserPermissions(userId: string, organizationId?: string): Promise<IPermission[]>;

  // Cache management
  async invalidateUserCache(userId: string, organizationId?: string): Promise<void>;
  async invalidateRoleCache(roleId: string): Promise<void>;
  async clearCache(): Promise<void>;

  // Event hooks
  registerHooks(hooks: RBACEventHooks): void;

  // Health check
  async healthCheck(): Promise<IAdapterHealthCheck>;
}
```

### Utilities

```typescript
// Wildcard Parser
import { WildcardParser, wildcardParser } from '@prodforcode/rbac-core';

const parser = new WildcardParser();
const parsed = parser.parse('posts:*:read');
// { segments: ['posts', '*', 'read'], hasWildcard: true, wildcardType: 'single' }

const matches = parser.matches('posts:*', 'posts:read');  // true
const specificity = parser.getSpecificity('posts:*');     // 2

// Permission Matcher
import { PermissionMatcher, permissionMatcher } from '@prodforcode/rbac-core';

const matcher = new PermissionMatcher();
const result = matcher.findBestMatch('posts:read', permissions, context);
// { matched: true, matchedPermission: {...}, matchedPattern: 'posts:*' }

// Role Hierarchy Resolver
import { RoleHierarchyResolver, hierarchyUtils } from '@prodforcode/rbac-core';

const resolver = new RoleHierarchyResolver(adapter, cache);
const permissions = await resolver.getInheritedPermissions('role-id');
const parents = await resolver.getParentRoles('role-id');
const isValid = await resolver.validateHierarchy('child-id', 'parent-id');
```

## TypeScript Support

Full TypeScript support with strict mode:

```typescript
import type {
  IRole,
  IPermission,
  IUserRoleAssignment,
  IUserAuthorizationContext,
  IDetailedPermissionCheckResult,
  IRBACAdapter,
  IRBACCache,
  IAuditLogger
} from '@prodforcode/rbac-core';
```

## License

MIT
