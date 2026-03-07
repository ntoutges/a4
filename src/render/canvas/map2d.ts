/**
 * @file map2d.ts
 * @description 2D map/set classes for mapping x/y coordinates to arbitrary values
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

export class Map2D<K, V> {
    /**
     * The underlying map object
     * Stores values in the format Map<y, Map<x, V>>
     */
    private readonly map: Map<K, Map<K, V>> = new Map();

    /**
     * Set a value in the map at the given coordinates
     * @param x
     * @param y
     * @param value
     */
    set(x: K, y: K, value: V): void {
        let row = this.map.get(y);
        if (!row) {
            row = new Map();
            this.map.set(y, row);
        }

        row.set(x, value);
    }

    /**
     * Get a value from the map at the given coordinates
     * @param x
     * @param y
     * @returns The value at the given coordinates, or `undefined` if no value is set
     */
    get(x: K, y: K): V | undefined {
        return this.map.get(y)?.get(x);
    }

    /**
     * Check if a value exists in the map at the given coordinates
     * @param x
     * @param y
     * @returns `true` if a value exists at the given coordinates, `false` otherwise
     */
    has(x: K, y: K): boolean {
        return this.map.has(y) && this.map.get(y)!.has(x);
    }

    /**
     * Remove a value from the map at the given coordinates
     * @param x
     * @param y
     */
    delete(x: K, y: K): void {
        const row = this.map.get(y);

        if (!row) return;

        // Remove value from row
        row.delete(x);

        // Row empty: remove it from the map
        if (row.size === 0) {
            this.map.delete(y);
        }
    }

    /**
     * Clear all values from the map
     */
    clear(): void {
        this.map.clear();
    }

    /**
     * Get an iterable of all keys in the map, as [x, y] coordinate pairs
     * @returns An iterable of all keys in the map, as [x, y] coordinate pairs
     */
    keys(): Iterable<[x: K, y: K]> {
        const result: [x: K, y: K][] = [];

        for (const [y, row] of this.map.entries()) {
            for (const x of row.keys()) {
                result.push([x, y]);
            }
        }

        return result;
    }

    /**
     * Get an iterable of all values in the map
     * @returns An iterable of all values in the map
     */
    values(): Iterable<V> {
        const result: V[] = [];

        for (const row of this.map.values()) {
            for (const value of row.values()) {
                result.push(value);
            }
        }

        return result;
    }

    /**
     * Get an iterable of all entries in the map, as [x, y, value] tuples
     * @returns An iterable of all entries in the map, as [x, y, value] tuples
     */
    entries(): Iterable<[x: K, y: K, value: V]> {
        const result: [x: K, y: K, value: V][] = [];

        for (const [y, row] of this.map.entries()) {
            for (const [x, value] of row.entries()) {
                result.push([x, y, value]);
            }
        }

        return result;
    }
}

export class Set2D<K> {
    /**
     * The underlying set object
     * Stores values in the format Map<y, Set<x>>
     */
    private readonly set: Map<K, Set<K>> = new Map();

    /**
     * Add some coordinates to the set
     * @param x
     * @param y
     */
    add(x: K, y: K): void {
        let row = this.set.get(y);

        if (!row) {
            row = new Set();
            this.set.set(y, row);
        }

        row.add(x);
    }

    /**
     * Check if some coordinates exist in the set
     * @param x
     * @param y
     * @returns `true` if the coordinates exist in the set, `false` otherwise
     */
    has(x: K, y: K): boolean {
        return this.set.has(y) && this.set.get(y)!.has(x);
    }

    /**
     * Remove some coordinates from the set
     * @param x
     * @param y
     */
    delete(x: K, y: K): void {
        const row = this.set.get(y);

        if (!row) return;

        // Remove value from row
        row.delete(x);

        // Row empty: remove it from the set
        if (row.size === 0) {
            this.set.delete(y);
        }
    }

    /**
     * Clear all values from the set
     */
    clear(): void {
        this.set.clear();
    }

    /**
     * Get an iterable of all keys in the set, as [x, y] coordinate pairs
     * @returns An iterable of all keys in the set, as [x, y] coordinate pairs
     */
    keys(): Iterable<[x: K, y: K]> {
        const result: [x: K, y: K][] = [];

        for (const [y, row] of this.set.entries()) {
            for (const x of row.keys()) {
                result.push([x, y]);
            }
        }

        return result;
    }
}
