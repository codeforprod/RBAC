# @prodforcode/rbac-typeorm

## 1.1.0

### Minor Changes

- dfb557b: Initial release of @prodforcode/rbac library

  This is the first release of the @prodforcode/rbac monorepo, providing a universal, database-agnostic RBAC (Role-Based Access Control) authorization library for NestJS and Express.js.

  Features:
  - Core RBAC engine with database-agnostic interfaces (@prodforcode/rbac-core)
  - MongoDB/Mongoose adapter (@prodforcode/rbac-mongoose)
  - PostgreSQL/TypeORM adapter (@prodforcode/rbac-typeorm)
  - High-performance caching layer with Memory and Redis support (@prodforcode/rbac-cache)
  - Full NestJS integration with decorators, guards, and dynamic modules (@prodforcode/rbac-nestjs)

### Patch Changes

- Updated dependencies [dfb557b]
  - @prodforcode/rbac-core@1.1.0
