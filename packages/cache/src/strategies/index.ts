/**
 * @fileoverview Cache strategies barrel export.
 */

export { LRUStrategy, LRUEvictionEvent } from './lru-strategy';

export {
  TTLStrategy,
  TTLExpirationEvent,
  TTLStrategyOptions,
  DEFAULT_TTL_OPTIONS,
} from './ttl-strategy';
