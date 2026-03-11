/**
 * @file grid.ts
 * @description Grid compilation and utility functions for the automata system
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "./cells.js";

import * as _grids from "./grid_types.js";
import * as _cells from "./cell_types.js";
import * as _diffs from "./diff_types.js";
import { ReadonlySet2D, Set2D } from "./map2d.js";

/**
 * Create a grid from a 2D array of cell values, compiling the cell values into the internal format used by the automata system.
 * @param value The 2D array of cell values to create the grid from
 * @param fillValue The cell value to use for any cells that are out of bounds
 */
export function compile(
    value: _cells.cell_t[][],
    fillValue: _cells.cell_t,
    options?: _grids.grid_options_t,
): _grids.grid_t {
    return new Grid(
        value.map((row) => row.map((cell) => cells.compile(cell))),
        cells.compile(fillValue),
        options,
    );
}

/**
 * Create a new grid filled with some initial cell value
 * @param width     The width of the grid to create
 * @param height    The height of the grid to create
 * @param fillValue The cell value to fill the grid with
 * @returns         The newly created grid filled with the initial cell value
 */
export function fill(
    width: number,
    height: number,
    fillValue: _cells.cell_t,
    options?: _grids.grid_options_t,
): _grids.grid_t {
    // Generate filled grid
    const compiledFillValue = cells.compile(fillValue);
    const cellsArray = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => compiledFillValue),
    );

    return new Grid(cellsArray, compiledFillValue, options);
}

type cache_entry_t = {
    proto: _cells.fcell_t; // The cell to compare against when updating the grid
    cache: Set2D<number>; // The full cache
};

class Grid implements _grids.grid_t {
    readonly height: number;
    readonly width: number;
    readonly wrap: Readonly<{ x: boolean; y: boolean }>;
    readonly padding: Readonly<{ n: number; s: number; e: number; w: number }>;

    /** Internal cell storage */
    private readonly cells: _cells.fcell_t[][] = [];

    /** Fill value for out-of-bounds cells */
    private readonly fillValue: _cells.fcell_t;

    /** Set of all differences since the last `cldiff` call */
    private readonly _diffs: Required<_diffs.diffs> = {
        cdiffs: [],
        ddiffs: [],
    };

    /** Map cell descriptors to their associated cache */
    private readonly _cache: Map<string, cache_entry_t> = new Map();

    /**
     * Set of all cache entries that cannot be indexed directly by `desc` (!optim.descmatch)
     * N(ot) D(esc) M(atch) Cache Etnries
     */
    private readonly _ndmCacheEntries: Set<cache_entry_t> = new Set();

    constructor(
        cells: _cells.fcell_t[][],
        fillValue: _cells.fcell_t,
        options?: _grids.grid_options_t,
    ) {
        const height = cells.length;
        let width = 0;

        // Find width of grid from the longest row
        for (const row of cells) {
            width = Math.max(width, row.length);
        }

        this.height = height;
        this.width = width;

        this.wrap = {
            x: options?.wrapX ?? false,
            y: options?.wrapY ?? false,
        };

        this.padding = {
            n: options?.padN ?? 0,
            s: options?.padS ?? 0,
            e: options?.padE ?? 0,
            w: options?.padW ?? 0,
        };

        this.fillValue = fillValue;

        // Fill in any missing cells with the fill value, to ensure all rows have the same length and the grid is rectangular
        for (let y = 0; y < height; y++) {
            const row: _cells.fcell_t[] = [];
            this.cells.push(row);

            for (let x = 0; x < width; x++) {
                const cell = x < cells[y].length ? cells[y][x] : fillValue;

                // Push cell + diff
                row.push(cell);
                this._diffs.cdiffs.push({
                    x,
                    y,
                    to: cell,
                });
            }
        }
    }

    slice(
        x: number,
        y: number,
        width: number,
        height: number,
    ): _grids.grid_slice_t {
        return new GridSlice(this, x, y, width, height);
    }

    cell(x: number, y: number): Readonly<_cells.fcell_t> {
        [x, y] = this._coords(x, y); // Apply wrapping to coordinates

        // Check if coordinates are out of bounds, and return fill value if so
        if (x < 0 || x >= this.width || y < 0 || y >= this.height)
            return this.fillValue;

        return this.cells[y][x];
    }

    index(x: number, y: number): number {
        [x, y] = this._coords(x, y); // Apply wrapping to coordinates
        return y * this.width + x;
    }

    write(x: number, y: number, cell: _cells.fcell_t): void {
        [x, y] = this._coords(x, y); // Apply wrapping to coordinates

        // Check if coordinates are out of bounds, and return fill value if so
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const old = this.cells[y][x];

        // Check if cell is different
        // If not: Ignore!
        if (cells.equals(old, cell)) return;

        // Track difference
        this._updateCache(x, y, old, cell);
        this._diffs.cdiffs.push({ x, y, to: cell });

        this.cells[y][x] = cell;
    }

    diffs(): Required<_diffs.diffs> {
        return this._diffs;
    }

    cldiff(): void {
        this._diffs.cdiffs.splice(0);
        this._diffs.ddiffs.splice(0);
    }

    cache(cell: _cells.fcell_t): ReadonlySet2D<number> {
        // Build and insert a new cache
        if (!this._cache.has(cell.data.metadata.descriptor)) {
            this._buildCache(cell);
        }
        return this._cache.get(cell.data.metadata.descriptor)!.cache;
    }

    /**
     * Build the initial state for the cache for some cell type
     * @param proto  The cell to use as the prototype of the cache
     * @returns     The built cache
     */
    private _buildCache(proto: _cells.fcell_t): void {
        const cache = new Set2D<number>();

        // Check prototype cell against all current cells to initialize cache
        for (const y in this.cells) {
            const row = this.cells[y];
            for (const x in row) {
                const cell = row[x];

                if (cells.matches(proto, cell)) cache.add(+x, +y);
            }
        }

        const entry = {
            cache,
            proto,
        };

        // Build + insert cache entry
        this._cache.set(proto.data.metadata.descriptor, entry);

        // Add cache entry `ndmCacheEntries` set if unable `optim.descmatch` not enabled
        if (!proto.data.metadata.optim.descmatch)
            this._ndmCacheEntries.add(entry);
    }

    /**
     * Update the internal cache based on some diff
     * @param x     The location being updated
     * @param y     The location being updated
     * @param from  The old cell to be replaced
     * @param to    The new cell to replace
     */
    private _updateCache(
        x: number,
        y: number,
        from: _cells.fcell_t,
        to: _cells.fcell_t,
    ) {
        // Remove `from` from any cache entries
        // OPTIMIZATION! Index by descriptor
        if (from.data.metadata.optim.descmatch) {
            const desc = from.data.metadata.descriptor;

            if (this._cache.has(desc)) {
                this._cache.get(desc)!.cache.delete(x, y);
            }
        }
        // Check against unoptimized entries
        for (const entry of this._ndmCacheEntries) {
            if (cells.matches(entry.proto, from)) {
                entry.cache.delete(x, y);
            }
        }

        // Add `to` to matching cache entries
        if (to.data.metadata.optim.descmatch) {
            const desc = to.data.metadata.descriptor;

            if (this._cache.has(desc)) {
                this._cache.get(desc)!.cache.add(x, y);
            }
        }
        // Check against unoptimized entries
        for (const entry of this._ndmCacheEntries) {
            if (cells.matches(entry.proto, to)) {
                entry.cache.add(x, y);
            }
        }
    }

    /**
     * Apply grid transformations to coordinates
     * @param x
     * @param y
     * @returns     The transformed coordinates
     */
    private _coords(x: number, y: number): [x: number, y: number] {
        return [
            this.wrap.x ? ((x % this.width) + this.width) % this.width : x,
            this.wrap.y ? ((y % this.height) + this.height) % this.height : y,
        ];
    }
}

class GridSlice implements _grids.grid_slice_t {
    private readonly grid: Grid;

    // Local slice offsets
    private readonly x: number;
    private readonly y: number;
    readonly width: number;
    readonly height: number;

    readonly wrap: Readonly<{ x: boolean; y: boolean }>;
    readonly padding: Readonly<{ n: number; s: number; e: number; w: number }>;

    /**
     * Create a small readonly view of a portion of the grid, with out-of-bounds cells filled with a specified value
     * @param grid      The grid to create the slice from
     * @param x         The x coordinate of the top-left corner of the slice in the grid
     * @param y         The y coordinate of the top-left corner of the slice in the grid
     * @param width     The width of the slice
     * @param height    The height of the slice
     */
    constructor(
        grid: Grid,
        x: number,
        y: number,
        width: number,
        height: number,
    ) {
        this.grid = grid;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.wrap = grid.wrap;
        this.padding = grid.padding;
    }

    cell(x: number, y: number): Readonly<_cells.fcell_t> {
        return this.grid.cell(this.x + x, this.y + y);
    }

    index(x: number, y: number): number {
        return this.grid.index(this.x + x, this.y + y);
    }
}
