import {
  InMemoryAuditLogger,
  ContextualAuditLogger,
  createAuditLogger,
} from '../../../src/services/audit-logger.service';
import {
  IAuditLogger,
  IAuditEntry,
  IAuditContext,
  AuditAction,
  AuditSeverity,
  NoOpAuditLogger,
} from '../../../src/interfaces/audit.interface';
import { AuditOptions } from '../../../src/types/options.types';

describe('InMemoryAuditLogger', () => {
  let logger: InMemoryAuditLogger;

  beforeEach(() => {
    logger = new InMemoryAuditLogger({
      maxEntries: 100,
      auditOptions: {
        enabled: true,
        logSuccessfulChecks: true,
        logDeniedChecks: true,
        logRoleChanges: true,
      },
    });
  });

  describe('constructor', () => {
    it('should create logger with default options', () => {
      const defaultLogger = new InMemoryAuditLogger();
      expect(defaultLogger).toBeInstanceOf(InMemoryAuditLogger);
    });

    it('should create logger with custom max entries', () => {
      const customLogger = new InMemoryAuditLogger({ maxEntries: 50 });
      expect(customLogger).toBeInstanceOf(InMemoryAuditLogger);
    });

    it('should create logger with custom audit options', () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: false,
          logSuccessfulChecks: false,
        },
      });
      expect(customLogger).toBeInstanceOf(InMemoryAuditLogger);
    });
  });

  describe('log', () => {
    it('should log an audit entry when enabled', async () => {
      const entry = await logger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'user-1',
        permission: 'posts:read',
        success: true,
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.action).toBe(AuditAction.PERMISSION_GRANTED);
      expect(entry.actorId).toBe('user-1');
      expect(entry.permission).toBe('posts:read');
      expect(entry.success).toBe(true);
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should not store entry when disabled', async () => {
      const disabledLogger = new InMemoryAuditLogger({
        auditOptions: { enabled: false },
      });

      const entry = await disabledLogger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'user-1',
        permission: 'posts:read',
        success: true,
      });

      const result = await disabledLogger.query({});
      expect(result.total).toBe(0);
      expect(entry).toBeDefined();
    });

    it('should set default severity based on success', async () => {
      const successEntry = await logger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'user-1',
        success: true,
      });
      expect(successEntry.severity).toBe(AuditSeverity.INFO);

      const failureEntry = await logger.log({
        action: AuditAction.PERMISSION_DENIED,
        actorId: 'user-1',
        success: false,
      });
      expect(failureEntry.severity).toBe(AuditSeverity.ERROR);
    });

    it('should use provided severity', async () => {
      const entry = await logger.log({
        action: AuditAction.ROLE_DELETED,
        severity: AuditSeverity.WARNING,
        actorId: 'admin-1',
        success: true,
      });

      expect(entry.severity).toBe(AuditSeverity.WARNING);
    });

    it('should include all optional fields', async () => {
      const entry = await logger.log({
        action: AuditAction.PERMISSION_GRANTED,
        severity: AuditSeverity.INFO,
        actorId: 'user-1',
        actorType: 'service',
        targetId: 'resource-1',
        targetType: 'document',
        resource: 'documents',
        permission: 'documents:read',
        success: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        organizationId: 'org-1',
        requestId: 'req-123',
        metadata: { key: 'value' },
        previousState: { old: 'data' },
        newState: { new: 'data' },
      });

      expect(entry.actorType).toBe('service');
      expect(entry.targetId).toBe('resource-1');
      expect(entry.targetType).toBe('document');
      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
      expect(entry.organizationId).toBe('org-1');
      expect(entry.requestId).toBe('req-123');
      expect(entry.metadata).toEqual({ key: 'value' });
      expect(entry.previousState).toEqual({ old: 'data' });
      expect(entry.newState).toEqual({ new: 'data' });
    });
  });

  describe('logPermissionCheck', () => {
    it('should log granted permission check', async () => {
      const entry = await logger.logPermissionCheck('user-1', 'posts:read', true, {
        resource: 'posts',
        ipAddress: '192.168.1.1',
      });

      expect(entry.action).toBe(AuditAction.PERMISSION_GRANTED);
      expect(entry.actorId).toBe('user-1');
      expect(entry.permission).toBe('posts:read');
      expect(entry.success).toBe(true);
      expect(entry.resource).toBe('posts');
      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.severity).toBe(AuditSeverity.INFO);
    });

    it('should log denied permission check', async () => {
      const entry = await logger.logPermissionCheck('user-1', 'posts:delete', false, {
        resource: 'posts',
        ipAddress: '192.168.1.1',
      });

      expect(entry.action).toBe(AuditAction.PERMISSION_DENIED);
      expect(entry.actorId).toBe('user-1');
      expect(entry.permission).toBe('posts:delete');
      expect(entry.success).toBe(false);
      expect(entry.severity).toBe(AuditSeverity.ERROR);
    });

    it('should not log successful checks when disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: false,
          logDeniedChecks: true,
        },
      });

      await customLogger.logPermissionCheck('user-1', 'posts:read', true);
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });

    it('should not log denied checks when disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: true,
          logDeniedChecks: false,
        },
      });

      await customLogger.logPermissionCheck('user-1', 'posts:delete', false);
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });

    it('should respect includeIpAddress option', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          includeIpAddress: false,
        },
      });

      const entry = await customLogger.logPermissionCheck('user-1', 'posts:read', true, {
        ipAddress: '192.168.1.1',
      });

      expect(entry.ipAddress).toBeUndefined();
    });

    it('should respect includeUserAgent option', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          includeUserAgent: false,
        },
      });

      const entry = await customLogger.logPermissionCheck('user-1', 'posts:read', true, {
        userAgent: 'Mozilla/5.0',
      });

      expect(entry.userAgent).toBeUndefined();
    });

    it('should respect includeContext option', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          includeContext: false,
        },
      });

      const entry = await customLogger.logPermissionCheck('user-1', 'posts:read', true, {
        metadata: { key: 'value' },
      });

      expect(entry.metadata).toBeUndefined();
    });

    it('should include all context fields', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: true,
          includeIpAddress: true,
          includeUserAgent: true,
          includeContext: true,
        },
      });

      const entry = await customLogger.logPermissionCheck('user-1', 'posts:read', true, {
        resource: 'posts',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
        organizationId: 'org-1',
        metadata: { key: 'value' },
      });

      expect(entry.resource).toBe('posts');
      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
      expect(entry.requestId).toBe('req-123');
      expect(entry.organizationId).toBe('org-1');
      expect(entry.metadata).toEqual({ key: 'value' });
    });
  });

  describe('logRoleAssignment', () => {
    it('should log role assignment', async () => {
      const entry = await logger.logRoleAssignment('user-1', 'role-1', 'admin-1', {
        organizationId: 'org-1',
        metadata: { reason: 'promotion' },
      });

      expect(entry.action).toBe(AuditAction.USER_ROLE_ASSIGNED);
      expect(entry.actorId).toBe('admin-1');
      expect(entry.targetId).toBe('user-1');
      expect(entry.targetType).toBe('user');
      expect(entry.success).toBe(true);
      expect(entry.organizationId).toBe('org-1');
      expect(entry.metadata).toMatchObject({
        roleId: 'role-1',
        reason: 'promotion',
      });
    });

    it('should include expiry date in metadata', async () => {
      const expiresAt = new Date('2025-12-31');
      const entry = await logger.logRoleAssignment('user-1', 'role-1', 'admin-1', {
        expiresAt,
      });

      expect(entry.metadata).toMatchObject({
        roleId: 'role-1',
        expiresAt: expiresAt.toISOString(),
      });
    });

    it('should not log when role changes disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logRoleChanges: false,
        },
      });

      await customLogger.logRoleAssignment('user-1', 'role-1', 'admin-1');
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });
  });

  describe('logRoleRemoval', () => {
    it('should log role removal', async () => {
      const entry = await logger.logRoleRemoval('user-1', 'role-1', 'admin-1', {
        organizationId: 'org-1',
        reason: 'demotion',
        metadata: { note: 'performance issues' },
      });

      expect(entry.action).toBe(AuditAction.USER_ROLE_REMOVED);
      expect(entry.actorId).toBe('admin-1');
      expect(entry.targetId).toBe('user-1');
      expect(entry.targetType).toBe('user');
      expect(entry.success).toBe(true);
      expect(entry.metadata).toMatchObject({
        roleId: 'role-1',
        reason: 'demotion',
        note: 'performance issues',
      });
    });

    it('should not log when role changes disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logRoleChanges: false,
        },
      });

      await customLogger.logRoleRemoval('user-1', 'role-1', 'admin-1');
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });
  });

  describe('logRoleCreation', () => {
    it('should log role creation', async () => {
      const roleData = { name: 'editor', displayName: 'Editor' };
      const entry = await logger.logRoleCreation('role-1', 'admin-1', roleData);

      expect(entry.action).toBe(AuditAction.ROLE_CREATED);
      expect(entry.actorId).toBe('admin-1');
      expect(entry.targetId).toBe('role-1');
      expect(entry.targetType).toBe('role');
      expect(entry.success).toBe(true);
      expect(entry.newState).toEqual(roleData);
    });

    it('should not log when role changes disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logRoleChanges: false,
        },
      });

      await customLogger.logRoleCreation('role-1', 'admin-1', {});
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });
  });

  describe('logRoleUpdate', () => {
    it('should log role update', async () => {
      const previousState = { name: 'viewer' };
      const newState = { name: 'editor' };
      const entry = await logger.logRoleUpdate('role-1', 'admin-1', previousState, newState);

      expect(entry.action).toBe(AuditAction.ROLE_UPDATED);
      expect(entry.actorId).toBe('admin-1');
      expect(entry.targetId).toBe('role-1');
      expect(entry.targetType).toBe('role');
      expect(entry.success).toBe(true);
      expect(entry.previousState).toEqual(previousState);
      expect(entry.newState).toEqual(newState);
    });

    it('should not log when role changes disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logRoleChanges: false,
        },
      });

      await customLogger.logRoleUpdate('role-1', 'admin-1', {}, {});
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });
  });

  describe('logRoleDeletion', () => {
    it('should log role deletion', async () => {
      const roleData = { name: 'editor', displayName: 'Editor' };
      const entry = await logger.logRoleDeletion('role-1', 'admin-1', roleData);

      expect(entry.action).toBe(AuditAction.ROLE_DELETED);
      expect(entry.severity).toBe(AuditSeverity.WARNING);
      expect(entry.actorId).toBe('admin-1');
      expect(entry.targetId).toBe('role-1');
      expect(entry.targetType).toBe('role');
      expect(entry.success).toBe(true);
      expect(entry.previousState).toEqual(roleData);
    });

    it('should not log when role changes disabled', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logRoleChanges: false,
        },
      });

      await customLogger.logRoleDeletion('role-1', 'admin-1', {});
      const result = await customLogger.query({});
      expect(result.total).toBe(0);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await logger.logPermissionCheck('user-1', 'posts:read', true);
      await logger.logPermissionCheck('user-2', 'posts:delete', false);
      await logger.logRoleAssignment('user-1', 'role-1', 'admin-1');
    });

    it('should query all entries', async () => {
      const result = await logger.query({});
      expect(result.total).toBe(3);
      expect(result.entries).toHaveLength(3);
    });

    it('should filter by action', async () => {
      const result = await logger.query({ action: AuditAction.PERMISSION_DENIED });
      expect(result.total).toBe(1);
      expect(result.entries[0].action).toBe(AuditAction.PERMISSION_DENIED);
    });

    it('should filter by multiple actions', async () => {
      const result = await logger.query({
        actions: [AuditAction.PERMISSION_GRANTED, AuditAction.PERMISSION_DENIED],
      });
      expect(result.total).toBe(2);
    });

    it('should filter by actorId', async () => {
      const result = await logger.query({ actorId: 'user-1' });
      expect(result.total).toBe(1);
    });

    it('should filter by targetId', async () => {
      const result = await logger.query({ targetId: 'user-1' });
      expect(result.total).toBe(1);
    });

    it('should filter by targetType', async () => {
      const result = await logger.query({ targetType: 'user' });
      expect(result.total).toBe(1);
    });

    it('should filter by success', async () => {
      const result = await logger.query({ success: false });
      expect(result.total).toBe(1);
      expect(result.entries[0].success).toBe(false);
    });

    it('should filter by organizationId', async () => {
      await logger.logPermissionCheck('user-3', 'posts:read', true, {
        organizationId: 'org-1',
      });

      const result = await logger.query({ organizationId: 'org-1' });
      expect(result.total).toBe(1);
    });

    it('should filter by severity', async () => {
      const result = await logger.query({ severity: AuditSeverity.ERROR });
      expect(result.total).toBe(1);
    });

    it('should filter by minSeverity', async () => {
      await logger.log({
        action: AuditAction.ROLE_DELETED,
        severity: AuditSeverity.CRITICAL,
        actorId: 'admin-1',
        success: true,
      });

      const result = await logger.query({ minSeverity: AuditSeverity.WARNING });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by date range', async () => {
      // Create fresh logger for this test to avoid interference with beforeEach entries
      const freshLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: true,
        },
      });

      jest.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00Z');
      jest.setSystemTime(now);

      await freshLogger.logPermissionCheck('user-3', 'posts:read', true);

      const futureDate = new Date('2024-01-01T00:00:01Z');
      jest.setSystemTime(futureDate);

      await freshLogger.logPermissionCheck('user-4', 'posts:read', true);

      jest.useRealTimers();

      const result = await freshLogger.query({ startDate: futureDate });
      expect(result.total).toBe(1);
      expect(result.entries[0].actorId).toBe('user-4');
    });

    it('should paginate results', async () => {
      const result = await logger.query({ offset: 1, limit: 1 });
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should sort by timestamp ascending', async () => {
      const result = await logger.query({ sortOrder: 'asc' });
      expect(result.entries[0].timestamp.getTime()).toBeLessThanOrEqual(
        result.entries[1].timestamp.getTime(),
      );
    });

    it('should sort by timestamp descending by default', async () => {
      const result = await logger.query({});
      expect(result.entries[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        result.entries[1].timestamp.getTime(),
      );
    });

    it('should remove metadata when not requested', async () => {
      await logger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'user-1',
        success: true,
        metadata: { key: 'value' },
      });

      const result = await logger.query({ includeMetadata: false });
      for (const entry of result.entries) {
        expect(entry.metadata).toBeUndefined();
      }
    });

    it('should include metadata when requested', async () => {
      const customLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          includeContext: true,
        },
      });

      await customLogger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'user-metadata-test',
        success: true,
        metadata: { key: 'value' },
      });

      const result = await customLogger.query({ includeMetadata: true });
      expect(result.entries[0].metadata).toEqual({ key: 'value' });
    });
  });

  describe('getByUser', () => {
    it('should get entries by user', async () => {
      await logger.logPermissionCheck('user-1', 'posts:read', true);
      await logger.logPermissionCheck('user-2', 'posts:read', true);

      const result = await logger.getByUser('user-1');
      expect(result.total).toBe(1);
      expect(result.entries[0].actorId).toBe('user-1');
    });
  });

  describe('getByTarget', () => {
    it('should get entries by target', async () => {
      await logger.logRoleAssignment('user-1', 'role-1', 'admin-1');
      await logger.logRoleAssignment('user-2', 'role-1', 'admin-1');

      const result = await logger.getByTarget('user-1', 'user');
      expect(result.total).toBe(1);
      expect(result.entries[0].targetId).toBe('user-1');
    });
  });

  describe('getSummary', () => {
    beforeEach(async () => {
      await logger.logPermissionCheck('user-1', 'posts:read', true);
      await logger.logPermissionCheck('user-2', 'posts:delete', false);
      await logger.logRoleAssignment('user-1', 'role-1', 'admin-1');
    });

    it('should get summary of all entries', async () => {
      const summary = await logger.getSummary();

      expect(summary.totalEntries).toBe(3);
      expect(summary.successCount).toBe(2);
      expect(summary.failureCount).toBe(1);
      expect(summary.byAction[AuditAction.PERMISSION_GRANTED]).toBe(1);
      expect(summary.byAction[AuditAction.PERMISSION_DENIED]).toBe(1);
      expect(summary.byAction[AuditAction.USER_ROLE_ASSIGNED]).toBe(1);
      expect(summary.bySeverity[AuditSeverity.INFO]).toBe(2);
      expect(summary.bySeverity[AuditSeverity.ERROR]).toBe(1);
    });

    it('should filter summary by date range', async () => {
      // Create fresh logger for this test to avoid interference with beforeEach entries
      const freshLogger = new InMemoryAuditLogger({
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: true,
        },
      });

      jest.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00Z');
      jest.setSystemTime(now);

      await freshLogger.logPermissionCheck('user-3', 'posts:read', true);

      const futureDate = new Date('2024-01-01T00:00:01Z');
      jest.setSystemTime(futureDate);

      await freshLogger.logPermissionCheck('user-4', 'posts:read', true);

      jest.useRealTimers();

      const summary = await freshLogger.getSummary({ startDate: futureDate });
      expect(summary.totalEntries).toBe(1);
    });

    it('should filter summary by organizationId', async () => {
      await logger.logPermissionCheck('user-3', 'posts:read', true, {
        organizationId: 'org-1',
      });

      const summary = await logger.getSummary({ organizationId: 'org-1' });
      expect(summary.totalEntries).toBe(1);
    });
  });

  describe('purge', () => {
    it('should delete entries older than specified date', async () => {
      await logger.logPermissionCheck('user-1', 'posts:read', true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const cutoffDate = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10));
      await logger.logPermissionCheck('user-2', 'posts:read', true);

      const deleted = await logger.purge(cutoffDate);
      expect(deleted).toBe(1);

      const result = await logger.query({});
      expect(result.total).toBe(1);
    });
  });

  describe('export', () => {
    beforeEach(async () => {
      await logger.logPermissionCheck('user-1', 'posts:read', true, {
        ipAddress: '192.168.1.1',
      });
      await logger.logPermissionCheck('user-2', 'posts:delete', false);
    });

    it('should export entries as JSON', async () => {
      const exported = await logger.export({}, 'json');
      const entries = JSON.parse(exported);

      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(2);
      expect(entries[0].action).toBeDefined();
    });

    it('should export entries as CSV', async () => {
      const exported = await logger.export({}, 'csv');
      const lines = exported.split('\n');

      expect(lines[0]).toContain('id,timestamp,action');
      expect(lines).toHaveLength(3);
    });

    it('should export empty CSV when no entries', async () => {
      const emptyLogger = new InMemoryAuditLogger();
      const exported = await emptyLogger.export({}, 'csv');
      expect(exported).toBe('');
    });

    it('should escape CSV values', async () => {
      await logger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'user-"1"',
        success: true,
      });

      const exported = await logger.export({}, 'csv');
      expect(exported).toContain('""');
    });
  });

  describe('storage management', () => {
    it('should respect max entries limit', async () => {
      const smallLogger = new InMemoryAuditLogger({
        maxEntries: 2,
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: true,
        },
      });

      await smallLogger.logPermissionCheck('user-1', 'posts:read', true);
      await smallLogger.logPermissionCheck('user-2', 'posts:read', true);
      await smallLogger.logPermissionCheck('user-3', 'posts:read', true);

      const result = await smallLogger.query({});
      expect(result.total).toBe(2);
    });

    it('should remove oldest entries when exceeding max', async () => {
      const smallLogger = new InMemoryAuditLogger({
        maxEntries: 2,
        auditOptions: {
          enabled: true,
          logSuccessfulChecks: true,
        },
      });

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      await smallLogger.logPermissionCheck('user-1', 'posts:read', true);

      jest.setSystemTime(new Date('2024-01-01T00:00:01Z'));
      await smallLogger.logPermissionCheck('user-2', 'posts:read', true);

      jest.setSystemTime(new Date('2024-01-01T00:00:02Z'));
      await smallLogger.logPermissionCheck('user-3', 'posts:read', true);

      jest.useRealTimers();

      const result = await smallLogger.query({ sortOrder: 'asc' });
      expect(result.entries[0].actorId).toBe('user-2');
    });
  });
});

describe('ContextualAuditLogger', () => {
  let delegate: jest.Mocked<IAuditLogger>;
  let contextLogger: ContextualAuditLogger;
  let context: IAuditContext;

  beforeEach(() => {
    delegate = {
      log: jest.fn(),
      logPermissionCheck: jest.fn(),
      logRoleAssignment: jest.fn(),
      logRoleRemoval: jest.fn(),
      logRoleCreation: jest.fn(),
      logRoleUpdate: jest.fn(),
      logRoleDeletion: jest.fn(),
      query: jest.fn(),
      getByUser: jest.fn(),
      getByTarget: jest.fn(),
      getSummary: jest.fn(),
      purge: jest.fn(),
    } as unknown as jest.Mocked<IAuditLogger>;

    context = {
      userId: 'context-user',
      ipAddress: '192.168.1.100',
      userAgent: 'ContextAgent/1.0',
      requestId: 'context-req-123',
      organizationId: 'context-org',
      metadata: { contextKey: 'contextValue' },
    };

    contextLogger = new ContextualAuditLogger(delegate, context);
  });

  describe('log', () => {
    it('should inject context into log call', async () => {
      await contextLogger.log({
        action: AuditAction.PERMISSION_GRANTED,
        success: true,
      });

      expect(delegate.log).toHaveBeenCalledWith({
        action: AuditAction.PERMISSION_GRANTED,
        success: true,
        actorId: 'context-user',
        actorType: undefined,
        ipAddress: '192.168.1.100',
        userAgent: 'ContextAgent/1.0',
        requestId: 'context-req-123',
        organizationId: 'context-org',
        metadata: { contextKey: 'contextValue' },
      });
    });

    it('should not override explicit values', async () => {
      await contextLogger.log({
        action: AuditAction.PERMISSION_GRANTED,
        actorId: 'explicit-user',
        ipAddress: '10.0.0.1',
        success: true,
      });

      expect(delegate.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'explicit-user',
          ipAddress: '10.0.0.1',
        }),
      );
    });

    it('should merge metadata', async () => {
      await contextLogger.log({
        action: AuditAction.PERMISSION_GRANTED,
        success: true,
        metadata: { logKey: 'logValue' },
      });

      expect(delegate.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            contextKey: 'contextValue',
            logKey: 'logValue',
          },
        }),
      );
    });
  });

  describe('logPermissionCheck', () => {
    it('should inject context into permission check', async () => {
      await contextLogger.logPermissionCheck('user-1', 'posts:read', true);

      expect(delegate.logPermissionCheck).toHaveBeenCalledWith('user-1', 'posts:read', true, {
        ipAddress: '192.168.1.100',
        userAgent: 'ContextAgent/1.0',
        requestId: 'context-req-123',
        organizationId: 'context-org',
        metadata: { contextKey: 'contextValue' },
      });
    });

    it('should not override explicit context values', async () => {
      await contextLogger.logPermissionCheck('user-1', 'posts:read', true, {
        ipAddress: '10.0.0.1',
      });

      expect(delegate.logPermissionCheck).toHaveBeenCalledWith(
        'user-1',
        'posts:read',
        true,
        expect.objectContaining({
          ipAddress: '10.0.0.1',
        }),
      );
    });
  });

  describe('logRoleAssignment', () => {
    it('should inject context into role assignment', async () => {
      await contextLogger.logRoleAssignment('user-1', 'role-1', 'admin-1');

      expect(delegate.logRoleAssignment).toHaveBeenCalledWith('user-1', 'role-1', 'admin-1', {
        organizationId: 'context-org',
        metadata: { contextKey: 'contextValue' },
      });
    });

    it('should not override explicit organizationId', async () => {
      await contextLogger.logRoleAssignment('user-1', 'role-1', 'admin-1', {
        organizationId: 'explicit-org',
      });

      expect(delegate.logRoleAssignment).toHaveBeenCalledWith(
        'user-1',
        'role-1',
        'admin-1',
        expect.objectContaining({
          organizationId: 'explicit-org',
        }),
      );
    });
  });

  describe('logRoleRemoval', () => {
    it('should inject context into role removal', async () => {
      await contextLogger.logRoleRemoval('user-1', 'role-1', 'admin-1');

      expect(delegate.logRoleRemoval).toHaveBeenCalledWith('user-1', 'role-1', 'admin-1', {
        organizationId: 'context-org',
        metadata: { contextKey: 'contextValue' },
      });
    });
  });

  describe('delegate methods', () => {
    it('should delegate logRoleCreation', async () => {
      await contextLogger.logRoleCreation('role-1', 'admin-1', {});
      expect(delegate.logRoleCreation).toHaveBeenCalledWith('role-1', 'admin-1', {});
    });

    it('should delegate logRoleUpdate', async () => {
      await contextLogger.logRoleUpdate('role-1', 'admin-1', {}, {});
      expect(delegate.logRoleUpdate).toHaveBeenCalledWith('role-1', 'admin-1', {}, {});
    });

    it('should delegate logRoleDeletion', async () => {
      await contextLogger.logRoleDeletion('role-1', 'admin-1', {});
      expect(delegate.logRoleDeletion).toHaveBeenCalledWith('role-1', 'admin-1', {});
    });

    it('should delegate query', async () => {
      await contextLogger.query({});
      expect(delegate.query).toHaveBeenCalledWith({});
    });

    it('should delegate getByUser', async () => {
      await contextLogger.getByUser('user-1');
      expect(delegate.getByUser).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should delegate getByTarget', async () => {
      await contextLogger.getByTarget('target-1', 'user');
      expect(delegate.getByTarget).toHaveBeenCalledWith('target-1', 'user', undefined);
    });

    it('should delegate getSummary', async () => {
      await contextLogger.getSummary();
      expect(delegate.getSummary).toHaveBeenCalledWith(undefined);
    });

    it('should delegate purge', async () => {
      const date = new Date();
      await contextLogger.purge(date);
      expect(delegate.purge).toHaveBeenCalledWith(date);
    });
  });
});

describe('createAuditLogger', () => {
  it('should create NoOpAuditLogger when disabled', () => {
    const logger = createAuditLogger({ enabled: false });
    expect(logger).toBeInstanceOf(NoOpAuditLogger);
  });

  it('should create NoOpAuditLogger when type is no-op', () => {
    const logger = createAuditLogger({ enabled: true, type: 'no-op' });
    expect(logger).toBeInstanceOf(NoOpAuditLogger);
  });

  it('should create InMemoryAuditLogger when enabled', () => {
    const logger = createAuditLogger({ enabled: true });
    expect(logger).toBeInstanceOf(InMemoryAuditLogger);
  });

  it('should create InMemoryAuditLogger with custom options', () => {
    const logger = createAuditLogger({
      enabled: true,
      type: 'in-memory',
      maxEntries: 5000,
      auditOptions: {
        logSuccessfulChecks: false,
      },
    });
    expect(logger).toBeInstanceOf(InMemoryAuditLogger);
  });

  it('should default to in-memory when type not specified', () => {
    const logger = createAuditLogger({ enabled: true });
    expect(logger).toBeInstanceOf(InMemoryAuditLogger);
  });
});
