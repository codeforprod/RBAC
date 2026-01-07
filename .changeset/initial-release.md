---
"@holocron/rbac-core": minor
"@holocron/rbac-adapter-mongoose": minor
"@holocron/rbac-adapter-typeorm": minor
"@holocron/rbac-cache": minor
"@holocron/rbac-nestjs": minor
---

Initial release of @holocron/rbac library

This is the first release of the @holocron/rbac monorepo, providing a universal, database-agnostic RBAC (Role-Based Access Control) authorization library for NestJS and Express.js.

Features:
- Core RBAC engine with database-agnostic interfaces (@holocron/rbac-core)
- MongoDB/Mongoose adapter (@holocron/rbac-adapter-mongoose)
- PostgreSQL/TypeORM adapter (@holocron/rbac-adapter-typeorm)
- High-performance caching layer with Memory and Redis support (@holocron/rbac-cache)
- Full NestJS integration with decorators, guards, and dynamic modules (@holocron/rbac-nestjs)
