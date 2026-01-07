"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wildcardParser = exports.WildcardParser = void 0;
const options_types_1 = require("../types/options.types");
class WildcardParser {
    separator;
    wildcardChar;
    globstarChar;
    caseSensitive;
    constructor(options = {}) {
        const merged = { ...options_types_1.DEFAULT_PERMISSION_OPTIONS, ...options };
        this.separator = merged.separator;
        this.wildcardChar = merged.wildcardChar;
        this.globstarChar = merged.globstarChar;
        this.caseSensitive = merged.caseSensitive;
    }
    parse(permission) {
        const normalized = this.caseSensitive ? permission : permission.toLowerCase();
        if (normalized === this.globstarChar) {
            return {
                resource: this.globstarChar,
                action: this.globstarChar,
                scope: undefined,
                isResourceWildcard: true,
                isActionWildcard: true,
                isGlobstar: true,
                isScopeWildcard: true,
                hasWildcard: true,
                original: permission,
            };
        }
        const parts = normalized.split(this.separator);
        const resource = parts[0] ?? this.wildcardChar;
        const action = parts[1] ?? this.wildcardChar;
        const scope = parts[2];
        const isResourceWildcard = resource === this.wildcardChar;
        const isActionWildcard = action === this.wildcardChar;
        const isScopeWildcard = scope === this.wildcardChar;
        return {
            resource,
            action,
            scope,
            isResourceWildcard,
            isActionWildcard,
            isGlobstar: false,
            isScopeWildcard,
            hasWildcard: isResourceWildcard || isActionWildcard || isScopeWildcard,
            original: permission,
        };
    }
    matches(pattern, permission) {
        const parsedPattern = this.parse(pattern);
        const parsedPermission = this.parse(permission);
        if (parsedPattern.isGlobstar) {
            return true;
        }
        if (!parsedPattern.isResourceWildcard &&
            parsedPattern.resource !== parsedPermission.resource) {
            return false;
        }
        if (!parsedPattern.isActionWildcard &&
            parsedPattern.action !== parsedPermission.action) {
            return false;
        }
        if (parsedPattern.scope !== undefined && !parsedPattern.isScopeWildcard) {
            if (parsedPermission.scope === undefined ||
                parsedPattern.scope !== parsedPermission.scope) {
                return false;
            }
        }
        return true;
    }
    matchesDetailed(pattern, permission) {
        const parsedPattern = this.parse(pattern);
        const parsedPermission = this.parse(permission);
        const matchedParts = {
            resource: parsedPattern.isGlobstar ||
                parsedPattern.isResourceWildcard ||
                parsedPattern.resource === parsedPermission.resource,
            action: parsedPattern.isGlobstar ||
                parsedPattern.isActionWildcard ||
                parsedPattern.action === parsedPermission.action,
            scope: parsedPattern.isGlobstar ||
                parsedPattern.isScopeWildcard ||
                parsedPattern.scope === undefined ||
                parsedPattern.scope === parsedPermission.scope,
        };
        return {
            matches: matchedParts.resource && matchedParts.action && matchedParts.scope,
            pattern,
            permission,
            matchedParts,
        };
    }
    normalize(permission) {
        const normalized = this.caseSensitive ? permission : permission.toLowerCase();
        const parts = normalized.split(this.separator);
        if (parts.length === 1) {
            return `${parts[0]}${this.separator}${this.wildcardChar}`;
        }
        return normalized;
    }
    create(resource, action, scope) {
        const parts = [resource, action];
        if (scope !== undefined) {
            parts.push(scope);
        }
        return parts.join(this.separator);
    }
    createResourceWildcard(resource) {
        return `${resource}${this.separator}${this.wildcardChar}`;
    }
    createActionWildcard(action) {
        return `${this.wildcardChar}${this.separator}${action}`;
    }
    hasWildcard(permission) {
        return permission.includes(this.wildcardChar) ||
            permission === this.globstarChar ||
            permission.includes(this.globstarChar);
    }
    expand(pattern, availablePermissions) {
        return availablePermissions.filter(permission => this.matches(pattern, permission));
    }
    getSpecificity(permission) {
        const parsed = this.parse(permission);
        if (parsed.isGlobstar) {
            return 0;
        }
        let specificity = 0;
        if (!parsed.isResourceWildcard) {
            specificity++;
        }
        if (!parsed.isActionWildcard) {
            specificity++;
        }
        if (parsed.scope !== undefined && !parsed.isScopeWildcard) {
            specificity++;
        }
        return specificity;
    }
    sortBySpecificity(permissions) {
        return [...permissions].sort((a, b) => {
            const specA = this.getSpecificity(a);
            const specB = this.getSpecificity(b);
            return specB - specA;
        });
    }
    validate(permission) {
        if (!permission || permission.trim() === '') {
            return { valid: false, error: 'Permission cannot be empty' };
        }
        const parts = permission.split(this.separator);
        if (parts.length > 3) {
            return {
                valid: false,
                error: `Permission has too many parts (max 3): ${permission}`,
            };
        }
        if (parts.some(part => part === '')) {
            return {
                valid: false,
                error: `Permission contains empty parts: ${permission}`,
            };
        }
        const validPattern = /^[a-zA-Z0-9_-]+$|^\*$|^\*\*$/;
        for (const part of parts) {
            if (!validPattern.test(part)) {
                return {
                    valid: false,
                    error: `Invalid characters in permission part: ${part}`,
                };
            }
        }
        return { valid: true };
    }
}
exports.WildcardParser = WildcardParser;
exports.wildcardParser = new WildcardParser();
//# sourceMappingURL=wildcard-parser.js.map