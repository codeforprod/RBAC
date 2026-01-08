# @prodforcode/rbac-mongoose

MongoDB adapter for @prodforcode/rbac-core using Mongoose ODM for document-based RBAC storage.

## Features

- **Mongoose Integration** - Seamless integration with Mongoose ODM
- **MongoDB Support** - Native MongoDB document storage
- **Schema Validation** - Built-in Mongoose schema validation
- **Indexes** - Optimized queries with compound indexes
- **Flexible Schema** - JSON-friendly document structure
- **Aggregation** - Powerful MongoDB aggregation pipelines
- **Connection Pooling** - Efficient connection management

## Installation

```bash
npm install @prodforcode/rbac-mongoose @prodforcode/rbac-core mongoose
# or
yarn add @prodforcode/rbac-mongoose @prodforcode/rbac-core mongoose
# or
pnpm add @prodforcode/rbac-mongoose @prodforcode/rbac-core mongoose
```

## Quick Start

```typescript
import mongoose from 'mongoose';
import { RBACEngine } from '@prodforcode/rbac-core';
import { MongooseAdapter } from '@prodforcode/rbac-mongoose';

// 1. Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 2. Create RBAC adapter
const adapter = new MongooseAdapter(mongoose.connection);

// 3. Initialize RBAC engine
const rbac = await RBACEngine.create({ adapter });
```

## Database Setup

### Connection Configuration

```typescript
import mongoose from 'mongoose';
import { MongooseAdapter } from '@prodforcode/rbac-mongoose';

// Basic connection
await mongoose.connect('mongodb://localhost:27017/myapp');

// With options
await mongoose.connect('mongodb://localhost:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});

// Create adapter
const adapter = new MongooseAdapter(mongoose.connection);
```

### MongoDB Atlas

```typescript
const uri = 'mongodb+srv://username:password@cluster.mongodb.net/myapp?retryWrites=true&w=majority';

await mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const adapter = new MongooseAdapter(mongoose.connection);
```

### Connection with Authentication

```typescript
await mongoose.connect('mongodb://localhost:27017/myapp', {
  auth: {
    username: 'admin',
    password: 'password'
  },
  authSource: 'admin'
});
```

## Schemas

The adapter provides five main schemas:

### RoleSchema

Represents roles in the system.

```typescript
import { RoleModel } from '@prodforcode/rbac-mongoose';

// Schema structure
interface IRole {
  _id: ObjectId;
  name: string;                  // Unique role name
  description?: string;          // Optional description
  organizationId?: string;       // For multi-tenancy
  isActive: boolean;             // Active status (default: true)
  metadata: Record<string, any>; // Custom metadata
  parentRoles: ObjectId[];       // Parent role references
  createdAt: Date;
  updatedAt: Date;
}

// Model usage
const role = await RoleModel.create({
  name: 'editor',
  description: 'Content editor',
  organizationId: 'org-123',
  metadata: { department: 'marketing' }
});
```

### PermissionSchema

Represents permissions that can be assigned to roles.

```typescript
import { PermissionModel } from '@prodforcode/rbac-mongoose';

interface IPermission {
  _id: ObjectId;
  resource: string;              // Resource name (e.g., 'posts')
  action: string;                // Action name (e.g., 'read')
  scope?: string;                // Optional scope (e.g., 'own')
  description?: string;          // Optional description
  conditions?: Record<string, any>; // ABAC conditions
  createdAt: Date;
  updatedAt: Date;
}

// Model usage
const permission = await PermissionModel.create({
  resource: 'posts',
  action: 'write',
  scope: 'own',
  description: 'Write own posts'
});
```

### RolePermissionSchema

Junction collection linking roles and permissions.

```typescript
import { RolePermissionModel } from '@prodforcode/rbac-mongoose';

interface IRolePermission {
  _id: ObjectId;
  roleId: ObjectId;              // Reference to Role
  permissionId: ObjectId;        // Reference to Permission
  grantedAt: Date;
  grantedBy?: string;            // User ID who granted the permission
}

// Model usage
const rolePermission = await RolePermissionModel.create({
  roleId: role._id,
  permissionId: permission._id,
  grantedBy: 'admin-123'
});
```

### UserRoleSchema

Associates users with roles.

```typescript
import { UserRoleModel } from '@prodforcode/rbac-mongoose';

interface IUserRole {
  _id: ObjectId;
  userId: string;                // User ID (external reference)
  roleId: ObjectId;              // Reference to Role
  organizationId?: string;       // For multi-tenancy
  assignedAt: Date;
  assignedBy?: string;           // User ID who assigned the role
  expiresAt?: Date;              // Optional expiration
}

// Model usage
const userRole = await UserRoleModel.create({
  userId: 'user-123',
  roleId: role._id,
  organizationId: 'org-123',
  assignedBy: 'admin-456'
});
```

### AuditLogSchema

Tracks all RBAC operations for audit purposes.

```typescript
import { AuditLogModel } from '@prodforcode/rbac-mongoose';

interface IAuditLog {
  _id: ObjectId;
  action: string;                // e.g., 'ROLE_CREATED', 'PERMISSION_GRANTED'
  actorId?: string;              // User who performed the action
  targetType: string;            // e.g., 'role', 'permission', 'user'
  targetId: string;              // ID of the target entity
  details: Record<string, any>;  // Additional details
  severity: string;              // 'low', 'medium', 'high', 'critical'
  timestamp: Date;
}

// Model usage
const log = await AuditLogModel.create({
  action: 'ROLE_CREATED',
  actorId: 'admin-123',
  targetType: 'role',
  targetId: role._id.toString(),
  details: { roleName: 'editor' },
  severity: 'low'
});
```

## Repositories

The adapter provides specialized repositories for database operations.

### RoleRepository

```typescript
import { RoleRepository } from '@prodforcode/rbac-mongoose';

const roleRepo = new RoleRepository(mongoose.connection);

// Create a role
const role = await roleRepo.create({
  name: 'editor',
  description: 'Content editor role',
  organizationId: 'org-123'
});

// Find by name
const role = await roleRepo.findByName('editor', 'org-123');

// Get with permissions (using aggregation)
const roleWithPerms = await roleRepo.findByIdWithPermissions(role._id);

// Update role
await roleRepo.update(role._id.toString(), {
  description: 'Updated description'
});

// Soft delete
await roleRepo.deactivate(role._id.toString());

// Find with parent roles
const rolesWithHierarchy = await roleRepo.findWithParents();
```

### PermissionRepository

```typescript
import { PermissionRepository } from '@prodforcode/rbac-mongoose';

const permRepo = new PermissionRepository(mongoose.connection);

// Create permission
const permission = await permRepo.create({
  resource: 'posts',
  action: 'write',
  scope: 'own',
  description: 'Write own posts'
});

// Find by resource and action
const perm = await permRepo.findByResourceAction('posts', 'write', 'own');

// Bulk create
const perms = await permRepo.bulkCreate([
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' },
  { resource: 'posts', action: 'delete' }
]);

// Search by resource pattern
const postPerms = await permRepo.findByResource('posts');
```

### UserRoleRepository

```typescript
import { UserRoleRepository } from '@prodforcode/rbac-mongoose';

const userRoleRepo = new UserRoleRepository(mongoose.connection);

// Assign role to user
await userRoleRepo.assignRole({
  userId: 'user-123',
  roleId: role._id.toString(),
  organizationId: 'org-123',
  assignedBy: 'admin-456'
});

// Get user's roles (with role details)
const roles = await userRoleRepo.getUserRolesWithDetails('user-123', 'org-123');

// Revoke role
await userRoleRepo.revokeRole('user-123', role._id.toString(), 'org-123');

// Check if user has role
const hasRole = await userRoleRepo.hasRole('user-123', role._id.toString(), 'org-123');

// Get users by role
const users = await userRoleRepo.getUsersByRole(role._id.toString());
```

## Indexes

The schemas include optimized indexes for common queries:

```typescript
// Role indexes
roleSchema.index({ name: 1, organizationId: 1 }, { unique: true });
roleSchema.index({ organizationId: 1 });
roleSchema.index({ isActive: 1 });

// Permission indexes
permissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true });
permissionSchema.index({ resource: 1 });

// User role indexes
userRoleSchema.index({ userId: 1, organizationId: 1 });
userRoleSchema.index({ roleId: 1 });
userRoleSchema.index({ expiresAt: 1 });

// Audit log indexes
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ timestamp: -1 });
```

## Aggregation Pipelines

Use MongoDB aggregation for complex queries:

```typescript
import { RoleModel } from '@prodforcode/rbac-mongoose';

// Get roles with permission counts
const rolesWithCounts = await RoleModel.aggregate([
  {
    $lookup: {
      from: 'rolepermissions',
      localField: '_id',
      foreignField: 'roleId',
      as: 'permissions'
    }
  },
  {
    $addFields: {
      permissionCount: { $size: '$permissions' }
    }
  },
  {
    $project: {
      permissions: 0
    }
  }
]);

// Get user's effective permissions (with inheritance)
const userPermissions = await UserRoleModel.aggregate([
  {
    $match: { userId: 'user-123' }
  },
  {
    $lookup: {
      from: 'roles',
      localField: 'roleId',
      foreignField: '_id',
      as: 'role'
    }
  },
  {
    $unwind: '$role'
  },
  {
    $lookup: {
      from: 'rolepermissions',
      localField: 'role._id',
      foreignField: 'roleId',
      as: 'rolePermissions'
    }
  },
  {
    $lookup: {
      from: 'permissions',
      localField: 'rolePermissions.permissionId',
      foreignField: '_id',
      as: 'permissions'
    }
  }
]);
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
const orgRoles = await RoleModel.find({
  organizationId: 'org-123'
}).lean();
```

## Transaction Support

Use MongoDB transactions for atomic operations:

```typescript
import { MongooseAdapter } from '@prodforcode/rbac-mongoose';

const adapter = new MongooseAdapter(mongoose.connection);

const session = await mongoose.startSession();
await session.startTransaction();

try {
  // Create role
  const role = await RoleModel.create(
    [{ name: 'editor', organizationId: 'org-123' }],
    { session }
  );

  // Grant permissions
  await RolePermissionModel.create(
    [{ roleId: role[0]._id, permissionId: perm._id }],
    { session }
  );

  // Assign to user
  await UserRoleModel.create(
    [{ userId: 'user-123', roleId: role[0]._id }],
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

## Performance Optimization

### Lean Queries

Use `.lean()` for read-only operations:

```typescript
// Returns plain JavaScript objects (faster)
const roles = await RoleModel.find({ isActive: true }).lean();

// Returns Mongoose documents (slower, but with methods)
const roles = await RoleModel.find({ isActive: true });
```

### Select Specific Fields

```typescript
// Only fetch needed fields
const roles = await RoleModel
  .find({ organizationId: 'org-123' })
  .select('name description')
  .lean();
```

### Batch Operations

```typescript
// Bulk insert
await RoleModel.insertMany([
  { name: 'role1', organizationId: 'org-123' },
  { name: 'role2', organizationId: 'org-123' }
]);

// Bulk update
await RoleModel.updateMany(
  { organizationId: 'org-123' },
  { $set: { isActive: false } }
);
```

## Complete Example

```typescript
import mongoose from 'mongoose';
import { RBACEngine } from '@prodforcode/rbac-core';
import { MongooseAdapter } from '@prodforcode/rbac-mongoose';

async function main() {
  // 1. Connect to MongoDB
  await mongoose.connect('mongodb://localhost:27017/myapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('MongoDB connected');

  // 2. Create adapter and RBAC engine
  const adapter = new MongooseAdapter(mongoose.connection);
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

  // 6. Query with Mongoose directly
  const { RoleModel } = await import('@prodforcode/rbac-mongoose');
  const activeRoles = await RoleModel.find({ isActive: true }).lean();
  console.log('Active roles:', activeRoles);

  // 7. Cleanup
  await mongoose.connection.close();
}

main().catch(console.error);
```

## Schema Validation

Custom validators are included:

```typescript
import { RoleModel } from '@prodforcode/rbac-mongoose';

// Name validation
try {
  await RoleModel.create({
    name: 'a', // Too short
    organizationId: 'org-123'
  });
} catch (error) {
  console.error('Validation error:', error.message);
  // "Role name must be between 2 and 100 characters"
}

// Unique constraint
try {
  await RoleModel.create({ name: 'editor', organizationId: 'org-123' });
  await RoleModel.create({ name: 'editor', organizationId: 'org-123' });
} catch (error) {
  console.error('Duplicate key error:', error.message);
}
```

## Migration from Other Databases

```typescript
import { MongooseAdapter } from '@prodforcode/rbac-mongoose';
import { TypeORMAdapter } from '@prodforcode/rbac-typeorm';

async function migrateFromPostgres() {
  // Setup both adapters
  const pgAdapter = new TypeORMAdapter(pgDataSource);
  const mongoAdapter = new MongooseAdapter(mongoose.connection);

  // Migrate roles
  const roles = await pgAdapter.listRoles();
  for (const role of roles) {
    await mongoAdapter.createRole({
      name: role.name,
      description: role.description,
      organizationId: role.organizationId
    });
  }

  // Migrate permissions...
  // Migrate user roles...
}
```

## API Reference

### MongooseAdapter

```typescript
class MongooseAdapter implements IRBACAdapter {
  constructor(connection: Connection);

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

### Exported Models

```typescript
export {
  RoleModel,
  PermissionModel,
  RolePermissionModel,
  UserRoleModel,
  AuditLogModel
};
```

## License

MIT
