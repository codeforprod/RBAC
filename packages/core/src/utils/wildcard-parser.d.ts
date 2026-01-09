import { PermissionOptions } from '../types/options.types';
export interface ParsedPermission {
  resource: string;
  action: string;
  scope?: string;
  isResourceWildcard: boolean;
  isActionWildcard: boolean;
  isGlobstar: boolean;
  isScopeWildcard: boolean;
  hasWildcard: boolean;
  original: string;
}
export interface WildcardMatchResult {
  matches: boolean;
  pattern: string;
  permission: string;
  matchedParts: {
    resource: boolean;
    action: boolean;
    scope: boolean;
  };
}
export declare class WildcardParser {
  private readonly separator;
  private readonly wildcardChar;
  private readonly globstarChar;
  private readonly caseSensitive;
  constructor(options?: Partial<PermissionOptions>);
  parse(permission: string): ParsedPermission;
  matches(pattern: string, permission: string): boolean;
  matchesDetailed(pattern: string, permission: string): WildcardMatchResult;
  normalize(permission: string): string;
  create(resource: string, action: string, scope?: string): string;
  createResourceWildcard(resource: string): string;
  createActionWildcard(action: string): string;
  hasWildcard(permission: string): boolean;
  expand(pattern: string, availablePermissions: string[]): string[];
  getSpecificity(permission: string): number;
  sortBySpecificity(permissions: string[]): string[];
  validate(permission: string): {
    valid: boolean;
    error?: string;
  };
}
export declare const wildcardParser: WildcardParser;
//# sourceMappingURL=wildcard-parser.d.ts.map
