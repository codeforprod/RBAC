import { IPermission, IPermissionMatcher, IPermissionCheckResult } from '../interfaces/permission.interface';
import { PermissionOptions } from '../types/options.types';
export interface PermissionMatchContext {
    userId?: string;
    resourceOwnerId?: string;
    organizationId?: string | null;
    attributes?: Record<string, unknown>;
    timestamp?: Date;
}
export interface PermissionMatcherResult {
    matched: boolean;
    matchedPermission?: IPermission;
    matchedPattern?: string;
    matchScore: number;
    reason: string;
}
export declare class PermissionMatcher implements IPermissionMatcher {
    private readonly parser;
    private readonly options;
    constructor(options?: Partial<PermissionOptions>);
    matches(required: string | string[], available: IPermission[], context?: Record<string, unknown>): boolean;
    matchesAll(required: string[], available: IPermission[], context?: Record<string, unknown>): boolean;
    matchesWithWildcard(pattern: string, permissions: IPermission[]): boolean;
    parse(permission: string): {
        resource: string;
        action: string;
        scope?: string;
    };
    normalize(permission: string | Partial<IPermission>): IPermission;
    findBestMatch(required: string, available: IPermission[], context?: PermissionMatchContext): PermissionMatcherResult;
    check(required: string, available: IPermission[], context?: PermissionMatchContext): IPermissionCheckResult;
    findAllMatches(pattern: string, available: IPermission[]): IPermission[];
    private checkScope;
    private evaluateConditions;
    private matchSingle;
    private permissionMatches;
    private evaluateMatch;
    private permissionToString;
}
export declare const permissionMatcher: PermissionMatcher;
//# sourceMappingURL=permission-matcher.d.ts.map