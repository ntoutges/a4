import * as _grid from "./grid_types.js";
import * as _cells from "./cell_types.js";
import { ReadonlySet2D } from "./map2d.js";

/** Registry of all registered cell types for type validation */
export interface cache_registry {}

export type cache_t = {
    [K in keyof cache_registry]: cache_registry[K]["user"];
}[keyof cache_registry];

/**
 * Used to define a cache type
 */
export type Cache<T extends cache_t> = {
    /** The unique identifier for this cache */
    readonly type: string;

    /**
     * Generate a unique identifier for this cache based on the provided data.
     * Used to quickly check if a cache entry with the same data already exists
     * Note that the cache type is implied; Only the data needs to be included in the identifier
     * @param data  The user-provided data for this cache, to customize cache behaviour
     * @returns     A unique identifier for this cache data
     */
    identifier: (data: T) => string;

    /**
     * Create a new cache instance based on the provided data and grid state
     * @param data  The user-provided data for this cache, to customize cache behaviour
     * @param grid  The grid this cache is attached to
     * @param proto The cell that this cache intersects
     * @returns     The compiled cache instance
     */
    compile: (data: T, grid: _grid.readonly_grid_t) => base_cache;
};

export interface base_cache {
    /**
     * Called once all diffs have been applied to the grid, but before any rules have been applied
     * Used to update the cache based on the changes that occurred in the grid
     */
    update(): void;

    /**
     * Called when the grid diffs are cleared. Used to clear any temporary data stored in the cache
     */
    clear(): void;

    /**
     * Returns the current state of the cache
     */
    get(): ReadonlySet2D<number>;
}
