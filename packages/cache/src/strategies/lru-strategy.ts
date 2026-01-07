/**
 * @fileoverview LRU (Least Recently Used) cache eviction strategy.
 *
 * Implementation uses a doubly-linked list for O(1) operations:
 * - Get: O(1) - lookup in map, move to head
 * - Set: O(1) - add to head, possibly evict tail
 * - Delete: O(1) - lookup and remove
 */

/**
 * Node in the doubly-linked list.
 */
interface LRUNode<K, V> {
  /**
   * Cache key.
   */
  key: K;

  /**
   * Cached value.
   */
  value: V;

  /**
   * Previous node in the list (more recently used).
   */
  prev: LRUNode<K, V> | null;

  /**
   * Next node in the list (less recently used).
   */
  next: LRUNode<K, V> | null;
}

/**
 * Event emitted when an entry is evicted.
 */
export interface LRUEvictionEvent<K, V> {
  /**
   * Evicted key.
   */
  key: K;

  /**
   * Evicted value.
   */
  value: V;

  /**
   * Reason for eviction.
   */
  reason: 'capacity' | 'manual';
}

/**
 * LRU cache eviction strategy with O(1) operations.
 *
 * @typeParam K - Key type
 * @typeParam V - Value type
 *
 * @example
 * ```typescript
 * const lru = new LRUStrategy<string, User>(1000);
 *
 * lru.set('user:1', user1);
 * lru.set('user:2', user2);
 *
 * const user = lru.get('user:1'); // Moves user:1 to most recently used
 *
 * // When capacity is exceeded, least recently used is evicted
 * ```
 */
export class LRUStrategy<K, V> {
  /**
   * Maximum number of entries.
   */
  private readonly maxSize: number;

  /**
   * Map for O(1) key lookup.
   */
  private readonly cache: Map<K, LRUNode<K, V>>;

  /**
   * Head of the list (most recently used).
   */
  private head: LRUNode<K, V> | null = null;

  /**
   * Tail of the list (least recently used).
   */
  private tail: LRUNode<K, V> | null = null;

  /**
   * Eviction callback.
   */
  private onEvict?: (event: LRUEvictionEvent<K, V>) => void;

  /**
   * Number of evictions that have occurred.
   */
  private evictionCount = 0;

  /**
   * Create a new LRU strategy instance.
   *
   * @param maxSize - Maximum number of entries
   * @param onEvict - Optional callback for eviction events
   */
  constructor(maxSize: number, onEvict?: (event: LRUEvictionEvent<K, V>) => void) {
    if (maxSize < 1) {
      throw new Error('LRU cache maxSize must be at least 1');
    }
    this.maxSize = maxSize;
    this.cache = new Map();
    this.onEvict = onEvict;
  }

  /**
   * Get a value from the cache.
   * Moves the entry to the head (most recently used).
   *
   * @param key - Cache key
   * @returns Value or undefined if not found
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      return undefined;
    }

    // Move to head (most recently used)
    this.moveToHead(node);

    return node.value;
  }

  /**
   * Check if a key exists without updating access order.
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Peek at a value without updating access order.
   *
   * @param key - Cache key
   * @returns Value or undefined if not found
   */
  peek(key: K): V | undefined {
    const node = this.cache.get(key);
    return node?.value;
  }

  /**
   * Set a value in the cache.
   * If the key exists, updates the value and moves to head.
   * If capacity is exceeded, evicts the least recently used entry.
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing entry
      existingNode.value = value;
      this.moveToHead(existingNode);
      return;
    }

    // Create new node
    const newNode: LRUNode<K, V> = {
      key,
      value,
      prev: null,
      next: null,
    };

    // Add to cache and list
    this.cache.set(key, newNode);
    this.addToHead(newNode);

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Delete an entry from the cache.
   *
   * @param key - Cache key
   * @returns True if entry was deleted
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);

    return true;
  }

  /**
   * Touch an entry to mark it as recently used.
   *
   * @param key - Cache key
   * @returns True if entry was touched
   */
  touch(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.moveToHead(node);
    return true;
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get the current size of the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get the maximum size of the cache.
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Get the number of evictions that have occurred.
   */
  get evictions(): number {
    return this.evictionCount;
  }

  /**
   * Get all keys in order from most to least recently used.
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.head;

    while (current) {
      keys.push(current.key);
      current = current.next;
    }

    return keys;
  }

  /**
   * Get all entries in order from most to least recently used.
   */
  entries(): Array<[K, V]> {
    const entries: Array<[K, V]> = [];
    let current = this.head;

    while (current) {
      entries.push([current.key, current.value]);
      current = current.next;
    }

    return entries;
  }

  /**
   * Iterate over entries from most to least recently used.
   */
  forEach(callback: (value: V, key: K) => void): void {
    let current = this.head;

    while (current) {
      callback(current.value, current.key);
      current = current.next;
    }
  }

  /**
   * Get the least recently used key.
   */
  getLRUKey(): K | undefined {
    return this.tail?.key;
  }

  /**
   * Get the most recently used key.
   */
  getMRUKey(): K | undefined {
    return this.head?.key;
  }

  /**
   * Add a node to the head of the list.
   */
  private addToHead(node: LRUNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove a node from the list.
   */
  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Move a node to the head of the list.
   */
  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) {
      return;
    }

    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const evictedKey = this.tail.key;
    const evictedValue = this.tail.value;

    this.removeNode(this.tail);
    this.cache.delete(evictedKey);
    this.evictionCount++;

    if (this.onEvict) {
      this.onEvict({
        key: evictedKey,
        value: evictedValue,
        reason: 'capacity',
      });
    }
  }
}
