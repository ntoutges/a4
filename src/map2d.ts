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

    // Cached # of entries in map
    private _size: number = 0;

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

        if (!row.has(x)) this._size++;
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
        if (row.has(x)) this._size--;
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
        this._size = 0;
    }

    /**
     * Get the size of the map
     * @returns     The size of the map
     */
    size(): number {
        return this._size;
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

    // Cached # of entries in map
    private _size: number = 0;

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

        if (!row.has(x)) this._size++;
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
        if (row.has(x)) this._size--;
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
        this._size = 0;
    }

    /**
     * Get the size of the set
     * @returns     The size of the set
     */
    size(): number {
        return this._size;
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

export interface ReadonlyMap2D<K, V> extends Omit<
    Map2D<K, V>,
    "set" | "delete" | "clear"
> {}
export interface ReadonlySet2D<K> extends Omit<
    Set2D<K>,
    "add" | "delete" | "clear"
> {}
