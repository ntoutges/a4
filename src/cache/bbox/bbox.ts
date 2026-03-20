/**
 * @file bbox.ts
 * @description Bounding box cache implementation for the automata system
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _cache from "../../cache_types.js";
import * as _cells from "../../cell_types.js";
import * as _grid from "../../grid_types.js";
import * as cache from "../../cache.js";
import * as ccell from "../cell/cell.js";
import { ReadonlySet2D, Set2D, Map2D } from "../../map2d.js";

// Import required caches
import "../cell/cell.js";

export type bbox_cache = {
    type: "bbox";

    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    base: _cells.fcell_t;
    watch?: _cells.fcell_t[];
};

class BBOXCompiled implements _cache.base_cache {
    private readonly grid: _grid.readonly_grid_t;

    private readonly baseCache: ccell.cell_cache;
    private readonly baseQuery: string; // Base query string for base cell cache

    /**
     * Maps pgrid coordinates to sets of base cell positions
     * Each cell's position is given as an absolute coordinate pair in grid units
     */
    private readonly pgrid: Map2D<number, Set2D<number>> = new Map2D();

    private readonly vx: number; // X offset of the bounding box from the base cell origin
    private readonly vy: number; // Y offset of the bounding box from the base cell origin
    private readonly vwidth: number; // Width of the bounding box in grid units
    private readonly vheight: number; // Height of the bounding box in grid units

    private readonly _cache: Set2D<number> = new Set2D();

    // Bounding box offsets to check
    static offsets = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 0],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
    ];

    constructor(
        bbox: Pick<bbox_cache, "minX" | "minY" | "maxX" | "maxY">,
        base: _cells.fcell_t,
        watch: _cells.fcell_t[] | null,
        grid: _grid.readonly_grid_t,
    ) {
        this.grid = grid;

        this.baseCache = {
            type: "cell",
            cell: base,
        };
        this.baseQuery = cache.identifier(this.baseCache);

        this.vx = bbox.minX;
        this.vy = bbox.minY;
        this.vwidth = bbox.maxX - bbox.minX;
        this.vheight = bbox.maxY - bbox.minY;

        console.log(this.vx, this.vy, this.vwidth, this.vheight);
    }

    update(): void {
        this._cache.clear(); // Clear the internal cache before updating
        this.pgrid.clear(); // Clear the position grid

        // Get the base cell positions from the base cache
        const basePositions = this.grid.cache(this.baseCache);

        // Populate pgrid with the positions of the base cells
        for (const pos of basePositions.keys()) {
            const [x, y] = pos;
            const [px, py] = this.toPGridSpace(x, y);

            if (!this.pgrid.has(px, py)) this.pgrid.set(px, py, new Set2D());
            this.pgrid.get(px, py)!.add(x, y);
        }

        // Check all diffs against pgrid
        for (const { x, y, to } of this.grid.diffs().cdiffs) {
            const [px, py] = this.toPGridSpace(x, y);

            // Check against all offsets
            for (const [ox, oy] of BBOXCompiled.offsets) {
                if (!this.pgrid.has(px + ox, py + oy)) continue; // Invalid neighboring pgrid cell, skip

                // Check if the changed cell is within the bounding box of any base cell in the left neighboring pgrid cell
                for (const [vx, vy] of this.pgrid
                    .get(px + ox, py + oy)!
                    .keys()) {
                    if (this.withinBBox(x, y, vx, vy)) this._cache.add(vx, vy);
                }
            }
        }
    }

    /**
     * Convert absolute grid coordinates to pgrid coordinates
     * @param x Absolute x coordinate in grid units
     * @param y Absolute y coordinate in grid units
     * @returns [px, py] Pgrid coordinates corresponding to the given absolute coordinates
     */
    private toPGridSpace(x: number, y: number): [x: number, y: number] {
        return [
            Math.floor((x - this.vx) / this.vwidth),
            Math.floor((y - this.vy) / this.vheight),
        ];
    }

    /**
     * Check if some coordinates are within the bounding box of a base cell with some base coordinates
     * @param x
     * @param y
     * @param baseX
     * @param baseY
     * @returns `true` iff the coordinates are within the bounding box of the base cell
     */
    private withinBBox(
        x: number,
        y: number,
        baseX: number,
        baseY: number,
    ): boolean {
        return (
            x >= baseX + this.vx &&
            x < baseX + this.vx + this.vwidth &&
            y >= baseY + this.vy &&
            y < baseY + this.vy + this.vheight
        );
    }

    get(): ReadonlySet2D<number> {
        return this._cache;
    }

    clear(): void {}
}

function identifier(data: bbox_cache): string {
    let watch: string[] = []; // Array of watch cell descriptors, sorted alphabetically
    if (data.watch !== undefined) {
        for (const cell of data.watch) {
            watch.push(cell.data.metadata.descriptor);
        }
        watch.sort((a, b) => a.localeCompare(b));
    }

    return `${data.minX},${data.minY},${data.maxX},${data.maxY},${data.base.data.metadata.descriptor}(${watch.join(",")})`;
}

function compile(
    data: bbox_cache,
    grid: _grid.readonly_grid_t,
): _cache.base_cache {
    return new BBOXCompiled(
        {
            minX: data.minX,
            minY: data.minY,
            maxX: data.maxX,
            maxY: data.maxY,
        },
        data.base,
        data.watch ?? null,
        grid,
    );
}

// +----------------+
// | Register cache |
// +----------------+
declare module "../../cache_types.js" {
    interface cache_registry {
        bbox: {
            user: bbox_cache;
            comp: BBOXCompiled;
        };
    }
}

cache.register({
    type: "bbox",
    identifier,
    compile,
});
