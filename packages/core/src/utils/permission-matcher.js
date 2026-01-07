"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionMatcher = exports.PermissionMatcher = void 0;
const wildcard_parser_1 = require("./wildcard-parser");
const options_types_1 = require("../types/options.types");
class PermissionMatcher {
    parser;
    options;
    constructor(options = {}) {
        this.options = { ...options_types_1.DEFAULT_PERMISSION_OPTIONS, ...options };
        this.parser = new wildcard_parser_1.WildcardParser(this.options);
    }
    matches(required, available, context) {
        const requiredArray = Array.isArray(required) ? required : [required];
        for (const permission of requiredArray) {
            if (this.matchSingle(permission, available, context)) {
                return true;
            }
        }
        return false;
    }
    matchesAll(required, available, context) {
        for (const permission of required) {
            if (!this.matchSingle(permission, available, context)) {
                return false;
            }
        }
        return true;
    }
    matchesWithWildcard(pattern, permissions) {
        const parsedPattern = this.parser.parse(pattern);
        for (const permission of permissions) {
            const permString = this.permissionToString(permission);
            const parsedPerm = this.parser.parse(permString);
            if (parsedPerm.isGlobstar) {
                return true;
            }
            if (parsedPattern.isGlobstar) {
                return true;
            }
            if (this.parser.matches(pattern, permString)) {
                return true;
            }
            if (parsedPerm.hasWildcard && this.parser.matches(permString, pattern)) {
                return true;
            }
        }
        return false;
    }
    parse(permission) {
        const parsed = this.parser.parse(permission);
        return {
            resource: parsed.resource,
            action: parsed.action,
            scope: parsed.scope,
        };
    }
    normalize(permission) {
        if (typeof permission === 'string') {
            const parsed = this.parser.parse(permission);
            return {
                id: `perm_${parsed.resource}_${parsed.action}${parsed.scope ? `_${parsed.scope}` : ''}`,
                resource: parsed.resource,
                action: parsed.action,
                scope: parsed.scope,
            };
        }
        return {
            id: permission.id ?? `perm_${permission.resource ?? 'unknown'}_${permission.action ?? 'unknown'}`,
            resource: permission.resource ?? '*',
            action: permission.action ?? '*',
            scope: permission.scope,
            conditions: permission.conditions,
            metadata: permission.metadata,
            description: permission.description,
            createdAt: permission.createdAt,
        };
    }
    findBestMatch(required, available, context) {
        const parsedRequired = this.parser.parse(required);
        let bestMatch = {
            matched: false,
            matchScore: 0,
            reason: 'No matching permission found',
        };
        for (const permission of available) {
            const permString = this.permissionToString(permission);
            const parsedAvailable = this.parser.parse(permString);
            const matchResult = this.evaluateMatch(parsedRequired, parsedAvailable, permission, context);
            if (matchResult.matched && matchResult.matchScore > bestMatch.matchScore) {
                bestMatch = matchResult;
            }
        }
        return bestMatch;
    }
    check(required, available, context) {
        const result = this.findBestMatch(required, available, context);
        return {
            allowed: result.matched,
            permission: required,
            reason: result.reason,
            matchedPermission: result.matchedPermission,
            context: context,
        };
    }
    findAllMatches(pattern, available) {
        return available.filter(permission => {
            const permString = this.permissionToString(permission);
            return this.parser.matches(pattern, permString) ||
                this.parser.matches(permString, pattern);
        });
    }
    checkScope(permission, requiredScope, context) {
        if (!requiredScope) {
            return true;
        }
        if (!permission.scope) {
            return false;
        }
        if (permission.scope === '*') {
            return true;
        }
        if (requiredScope === 'own' && permission.scope === 'own') {
            if (context?.userId && context?.resourceOwnerId) {
                return context.userId === context.resourceOwnerId;
            }
            return false;
        }
        if (requiredScope === 'own' && permission.scope === 'all') {
            return true;
        }
        return permission.scope === requiredScope;
    }
    evaluateConditions(permission, context) {
        if (!permission.conditions || Object.keys(permission.conditions).length === 0) {
            return true;
        }
        const attributes = context?.attributes ?? {};
        for (const [key, value] of Object.entries(permission.conditions)) {
            const contextValue = attributes[key];
            if (contextValue !== value) {
                return false;
            }
        }
        return true;
    }
    matchSingle(required, available, context) {
        const parsedRequired = this.parser.parse(required);
        for (const permission of available) {
            const permString = this.permissionToString(permission);
            const parsedAvailable = this.parser.parse(permString);
            if (this.permissionMatches(parsedRequired, parsedAvailable, permission, context)) {
                return true;
            }
        }
        return false;
    }
    permissionMatches(required, available, permission, context) {
        if (available.isGlobstar) {
            return this.evaluateConditions(permission, context);
        }
        if (!available.isResourceWildcard &&
            !required.isResourceWildcard &&
            available.resource !== required.resource) {
            return false;
        }
        if (!available.isActionWildcard &&
            !required.isActionWildcard &&
            available.action !== required.action) {
            return false;
        }
        if (!this.checkScope(permission, required.scope, context)) {
            return false;
        }
        if (!this.evaluateConditions(permission, context)) {
            return false;
        }
        return true;
    }
    evaluateMatch(required, available, permission, context) {
        const permString = this.permissionToString(permission);
        if (!this.permissionMatches(required, available, permission, context)) {
            return {
                matched: false,
                matchScore: 0,
                reason: 'Permission does not match required',
            };
        }
        let score = 0;
        if (!available.isResourceWildcard) {
            score += 10;
        }
        if (!available.isActionWildcard) {
            score += 10;
        }
        if (permission.scope && permission.scope !== '*') {
            score += 5;
        }
        if (permission.conditions && Object.keys(permission.conditions).length > 0) {
            score += 3;
        }
        let reason;
        if (available.isGlobstar) {
            reason = 'Matched by superadmin permission (**)';
        }
        else if (available.isResourceWildcard && available.isActionWildcard) {
            reason = `Matched by full wildcard (*:*)`;
        }
        else if (available.isResourceWildcard) {
            reason = `Matched by resource wildcard (*:${available.action})`;
        }
        else if (available.isActionWildcard) {
            reason = `Matched by action wildcard (${available.resource}:*)`;
        }
        else {
            reason = `Exact match: ${permString}`;
        }
        return {
            matched: true,
            matchedPermission: permission,
            matchedPattern: permString,
            matchScore: score,
            reason,
        };
    }
    permissionToString(permission) {
        let str = `${permission.resource}${this.options.separator}${permission.action}`;
        if (permission.scope) {
            str += `${this.options.separator}${permission.scope}`;
        }
        return str;
    }
}
exports.PermissionMatcher = PermissionMatcher;
exports.permissionMatcher = new PermissionMatcher();
//# sourceMappingURL=permission-matcher.js.map