import { Provider } from '@nestjs/common';
import { RbacModuleOptions, RbacModuleAsyncOptions } from '../types';
export declare const RBAC_OPTIONS_TOKEN: unique symbol;
export declare const RBAC_ENGINE_TOKEN: unique symbol;
export declare const USER_EXTRACTION_STRATEGY_TOKEN: unique symbol;
export declare function createRbacProviders(options: RbacModuleOptions): Provider[];
export declare function createRbacAsyncProviders(asyncOptions: RbacModuleAsyncOptions): Provider[];
export declare const DefaultUserExtractionStrategy: {
    extractUserId(context: unknown): string | null;
    extractOrganizationId(context: unknown): string | null;
    extractContext(context: unknown): Record<string, unknown>;
};
//# sourceMappingURL=rbac-options.provider.d.ts.map