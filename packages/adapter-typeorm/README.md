# @holocron/rbac-adapter-typeorm

TypeORM adapter for @holocron/rbac-core providing PostgreSQL, MySQL, and SQLite database integration.

## Features

- **TypeORM Integration** - Seamless integration with TypeORM ORM
- **Multiple Databases** - PostgreSQL, MySQL, MariaDB, SQLite support
- **Entity Management** - Pre-configured entities for roles, permissions, and audit logs
- **Migrations** - Database migration scripts included
- **Repository Pattern** - Type-safe repositories for all operations
- **Transaction Support** - ACID-compliant operations
- **Indexes & Constraints** - Optimized database schema with proper indexes

## Installation

```bash
npm install @holocron/rbac-adapter-typeorm @holocron/rbac-core typeorm reflect-metadata
# or
yarn add @holocron/rbac-adapter-typeorm @holocron/rbac-core typeorm reflect-metadata
# or
pnpm add @holocron/rbac-adapter-typeorm @holocron/rbac-core typeorm reflect-metadata
```

Install database driver:
```bash
# PostgreSQL
npm install pg

# MySQL/MariaDB
npm install mysql2

# SQLite
npm install better-sqlite3
```

## Quick Start

```typescript
import { DataSource } from 'typeorm';
import { RBACEngine } from '@holocron/rbac-core';
import { TypeORMAdapter, entities } from '@holocron/rbac-adapter-typeorm';

// 1. Create TypeORM DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'admin',
  password: 'password',
  database: 'myapp',
  entities: entities,
  synchronize: false // Use migrations in production
});

await dataSource.initialize();

// 2. Create RBAC adapter
const adapter = new TypeORMAdapter(dataSource);

// 3. Initialize RBAC engine
const rbac = await RBACEngine.create({ adapter });
```

## Database Setup

### PostgreSQL

```typescript
import { DataSource } from 'typeorm';
import { entities } from '@holocron/rbac-adapter-typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'admin',
  password: 'password',
  database: 'myapp',
  entities: entities,
  synchronize: true, // Only for development
  logging: ['error', 'warn']
});

await dataSource.initialize();
```

### MySQL/MariaDB

```typescript
const dataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'admin',
  password: 'password',
  database: 'myapp',
  entities: entities,
  synchronize: true,
  charset: 'utf8mb4'
});
```

### SQLite

```typescript
const dataSource = new DataSource({
  type: 'sqlite',
  database: './myapp.db',
  entities: entities,
  synchronize: true
});
```

## Entities

The adapter provides five main entities:

### RoleEntity

Represents roles in the system.

```typescript
import { RoleEntity } from '@holocron/rbac-adapter-typeorm';

// Entity structure
class RoleEntity {
  id: string;                    // UUID primary key
  name: string;                  // Unique role name
  description: string | null;    // Optional description
  organizationId: string | null; // For multi-tenancy
  isActive: boolean;             // Active status
  metadata: Record<string, any>; // Custom metadata (JSONB)
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp

  // Relations
  permissions: RolePermissionEntity[];
  userRoles: UserRoleEntity[];
  parentRoles: RoleEntity[];
  childRoles: RoleEntity[];
}
```

### PermissionEntity

Represents permissions that can be assigned to roles.

```typescript
import { PermissionEntity } from '@holocron/rbac-adapter-typeorm';

class PermissionEntity {
  id: string;                    // UUID primary key
  resource: string;              // Resource name (e.g., 'posts')
  action: string;                // Action name (e.g., 'read')
  scope: string | null;          // Optional scope (e.g., 'own')
  description: string | null;    // Optional description
  conditions: Record<string, any> | null; // ABAC conditions
  createdAt: Date;
  updatedAt: Date;

  // Relations
  rolePermissions: RolePermissionEntity[];
}
```

### RolePermissionEntity

Junction table linking roles and permissions.

```typescript
import { RolePermissionEntity } from '@holocron/rbac-adapter-typeorm';

class RolePermissionEntity {
  id: string;
  roleId: string;
  permissionId: string;
  grantedAt: Date;
  grantedBy: string | null; // User ID who granted the permission

  // Relations
  role: RoleEntity;
  permission: PermissionEntity;
}
```

### UserRoleEntity

Associates users with roles.

```typescript
import { UserRoleEntity } from '@holocron/rbac-adapter-typeorm';

class UserRoleEntity {
  id: string;
  userId: string;
  roleId: string;
  organizationId: string | null; // For multi-tenancy
  assignedAt: Date;
  assignedBy: string | null; // User ID who assigned the role
  expiresAt: Date | null;    // Optional expiration

  // Relations
  role: RoleEntity;
}
```

### AuditLogEntity

Tracks all RBAC operations for audit purposes.

```typescript
import { AuditLogEntity } from '@holocron/rbac-adapter-typeorm';

class AuditLogEntity {
  id: string;
  action: string;           // e.g., 'ROLE_CREATED', 'PERMISSION_GRANTED'
  actorId: string | null;   // User who performed the action
  targetType: string;       // e.g., 'role', 'permission', 'user'
  targetId: string;         // ID of the target entity
  details: Record<string, any>; // Additional details (JSONB)
  severity: string;         // 'low', 'medium', 'high', 'critical'
  timestamp: Date;
}
```

## Repositories

The adapter provides specialized repositories for database operations.

### RoleRepository

```typescript
import { RoleRepository } from '@holocron/rbac-adapter-typeorm';

const roleRepo = new RoleRepository(dataSource);

// Create a role
const role = await roleRepo.createRole({
  name: 'editor',
  description: 'Content editor role',
  organizationId: 'org-123'
});

// Find by name
const role = await roleRepo.findByName('editor', 'org-123');

// Get with permissions
const roleWithPerms = await roleRepo.findByIdWithPermissions(role.id);

// Update role
await roleRepo.updateRole(role.id, { description: 'Updated description' });

// Soft delete
await roleRepo.deactivateRole(role.id);
```

### PermissionRepository

```typescript
import { PermissionRepository } from '@holocron/rbac-adapter-typeorm';

const permRepo = new PermissionRepository(dataSource);

// Create permission
const permission = await permRepo.createPermission({
  resource: 'posts',
  action: 'write',
  scope: 'own',
  description: 'Write own posts'
});

// Find by resource and action
const perm = await permRepo.findByResourceAction('posts', 'write', 'own');

// Bulk create
const perms = await permRepo.bulkCreatePermissions([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' },
  { resource: 'posts', action: 'delete' }
]);
```

### UserRoleRepository

```typescript
import { UserRoleRepository } from '@holocron/rbac-adapter-typeorm';

const userRoleRepo = new UserRoleRepository(dataSource);

// Assign role to user
await userRoleRepo.assignRole({
  userId: 'user-123',
  roleId: role.id,
  organizationId: 'org-123',
  assignedBy: 'admin-456'
});

// Get user's roles
const roles = await userRoleRepo.getUserRoles('user-123', 'org-123');

// Revoke role
await userRoleRepo.revokeRole('user-123', role.id, 'org-123');

// Check if user has role
const hasRole = await userRoleRepo.hasRole('user-123', role.id, 'org-123');
```

### AuditRepository

```typescript
import { AuditRepository } from '@holocron/rbac-adapter-typeorm';

const auditRepo = new AuditRepository(dataSource);

// Log an action
await auditRepo.log({
  action: 'ROLE_CREATED',
  actorId: 'admin-123',
  targetType: 'role',
  targetId: role.id,
  details: { roleName: 'editor' },
  severity: 'low'
});

// Query audit logs
const logs = await auditRepo.query({
  actorId: 'admin-123',
  startDate: new Date('2024-01-01'),
  limit: 100
});
```

## Migrations

### Generate Migration

```bash
npm run migration:generate -- -n CreateRBACTables
```

### Run Migrations

```bash
npm run migration:run
```

### Revert Migration

```bash
npm run migration:revert
```

### Example Migration

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRBACTables1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "organization_id" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_name_org" UNIQUE ("name", "organization_id")
      );

      CREATE INDEX "IDX_roles_organization" ON "roles" ("organization_id");
      CREATE INDEX "IDX_roles_is_active" ON "roles" ("is_active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
```

## Transaction Support

Use TypeORM transactions for atomic operations:

```typescript
import { TypeORMAdapter } from '@holocron/rbac-adapter-typeorm';

const adapter = new TypeORMAdapter(dataSource);

await dataSource.transaction(async (entityManager) => {
  // Create transactional adapter
  const txAdapter = new TypeORMAdapter(dataSource, entityManager);

  // All operations use the same transaction
  const role = await txAdapter.createRole({ name: 'editor' });
  await txAdapter.grantPermission(role.id, permission.id);
  await txAdapter.assignRole({ userId: 'user-123', roleId: role.id });

  // If any operation fails, entire transaction is rolled back
});
```

## Multi-Tenancy

The adapter supports organization-scoped data:

```typescript
// Create organization-specific role
const orgRole = await adapter.createRole({
  name: 'org-admin',
  organizationId: 'org-123'
});

// Assign role within organization
await adapter.assignRole({
  userId: 'user-456',
  roleId: orgRole.id,
  organizationId: 'org-123'
});

// Query organization-specific data
const orgRoles = await adapter.listRoles({ organizationId: 'org-123' });
```

## Performance Optimization

### Indexes

All entities include optimized indexes:

```sql
-- Role lookups
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_organization ON roles(organization_id);

-- Permission lookups
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- User role queries
CREATE INDEX idx_user_roles_user_org ON user_roles(user_id, organization_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### Query Optimization

```typescript
// Use relation loading for efficient queries
const rolesWithPermissions = await roleRepo.find({
  relations: ['permissions', 'permissions.permission'],
  where: { organizationId: 'org-123' }
});

// Use query builder for complex queries
const roles = await dataSource
  .getRepository(RoleEntity)
  .createQueryBuilder('role')
  .leftJoinAndSelect('role.permissions', 'rp')
  .leftJoinAndSelect('rp.permission', 'perm')
  .where('role.organization_id = :orgId', { orgId: 'org-123' })
  .andWhere('role.is_active = :active', { active: true })
  .getMany();
```

## Complete Example

```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { RBACEngine } from '@holocron/rbac-core';
import { TypeORMAdapter, entities } from '@holocron/rbac-adapter-typeorm';

async function main() {
  // 1. Initialize database
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'admin',
    password: 'password',
    database: 'myapp',
    entities: entities,
    synchronize: true,
    logging: true
  });

  await dataSource.initialize();
  console.log('Database connected');

  // 2. Create adapter and RBAC engine
  const adapter = new TypeORMAdapter(dataSource);
  const rbac = await RBACEngine.create({ adapter });

  // 3. Create roles
  const viewerRole = await rbac.createRole({
    name: 'viewer',
    permissions: ['posts:read', 'comments:read']
  });

  const editorRole = await rbac.createRole({
    name: 'editor',
    permissions: ['posts:*', 'comments:*'],
    parentRoles: [viewerRole.id]
  });

  // 4. Assign role to user
  await rbac.assignRole({
    userId: 'user-123',
    roleId: editorRole.id
  });

  // 5. Check permissions
  const canEdit = await rbac.can('user-123', 'posts:write');
  console.log('Can edit posts:', canEdit); // true

  // 6. Query audit logs
  const logs = await adapter.queryAuditLogs({
    limit: 10
  });
  console.log('Recent audit logs:', logs);
}

main().catch(console.error);
```

## API Reference

### TypeORMAdapter

```typescript
class TypeORMAdapter implements IRBACAdapter {
  constructor(dataSource: DataSource, entityManager?: EntityManager);

  // Role operations
  async createRole(options: ICreateRoleOptions): Promise<IRole>;
  async updateRole(id: string, updates: IUpdateRoleOptions): Promise<IRole>;
  async deleteRole(id: string): Promise<boolean>;
  async findRoleById(id: string): Promise<IRole | null>;
  async findRoleByName(name: string, orgId?: string): Promise<IRole | null>;
  async listRoles(options?: ListRolesOptions): Promise<IRole[]>;

  // Permission operations
  async createPermission(options: ICreatePermissionOptions): Promise<IPermission>;
  async grantPermission(roleId: string, permissionId: string): Promise<void>;
  async revokePermission(roleId: string, permissionId: string): Promise<void>;

  // User role operations
  async assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
  async revokeRole(userId: string, roleId: string, orgId?: string): Promise<boolean>;
  async getUserRoles(userId: string, orgId?: string): Promise<IRole[]>;
  async getUserPermissions(userId: string, orgId?: string): Promise<IPermission[]>;

  // Audit operations
  async logAuditEntry(entry: ICreateAuditEntryOptions): Promise<IAuditEntry>;
  async queryAuditLogs(options: IAuditQueryOptions): Promise<IAuditQueryResult>;

  // Health check
  async healthCheck(): Promise<IAdapterHealthCheck>;
}
```

## License

MIT
