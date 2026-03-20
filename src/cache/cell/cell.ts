/**
 * @file cell.ts
 * @description Cell cache implementation for the automata system
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "../../cells.js";

import * as _cache from "../../cache_types.js";
import * as _cells from "../../cell_types.js";
import * as _grid from "../../grid_types.js";
import * as cache from "../../cache.js";
import { ReadonlySet2D, Set2D } from "../../map2d.js";

export type cell_cache = {
    type: "cell";

    cell: _cells.fcell_t;
};

class CellCompiled implements _cache.base_cache {
    private readonly proto: _cells.fcell_t;
    private readonly grid: _grid.readonly_grid_t;

    /** Descriptor of the cell that this cache is tracking */
    private readonly descriptor: string;

    private readonly _cache: Set2D<number> = new Set2D();

    readonly update: () => void;

    constructor(cell: _cells.fcell_t, grid: _grid.readonly_grid_t) {
        this.proto = cell;
        this.grid = grid;

        this.descriptor = cell.data.metadata.descriptor;

        const descMatch = cell.data.metadata.optim.descmatch;
        this.update = descMatch
            ? this.qupdate.bind(this)
            : this.eupdate.bind(this);

        // Initialize cache based on initial grid state
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                if (
                    (descMatch &&
                        this.proto.data.metadata.descriptor ===
                            grid.cell(x, y).data.metadata.descriptor) ||
                    (!descMatch && cells.matches(this.proto, grid.cell(x, y)))
                ) {
                    this._cache.add(x, y);
                }
            }
        }
    }

    /**
     * Quick update; Match exact descriptors, and update cache based on differences
     */
    qupdate(): void {
        for (const { x, y, to, from } of this.grid.diffs().cdiffs) {
            // Update cache based on descriptor matches
            if (from.data.metadata.descriptor === this.descriptor)
                this._cache.delete(x, y);
            else if (to.data.metadata.descriptor === this.descriptor)
                this._cache.add(x, y);
        }
    }

    /**
     * Exact update; Check if the cell prototype matches the cached diff
     */
    eupdate(): void {
        for (const { x, y, to, from } of this.grid.diffs().cdiffs) {
            const fromMatches = cells.matches(this.proto, from);
            const toMatches = cells.matches(this.proto, to);

            if (fromMatches === toMatches) continue; // No change in match status, skip

            // Update cache based on match status
            if (fromMatches) this._cache.delete(x, y);
            else this._cache.add(x, y);
        }
    }

    get(): ReadonlySet2D<number> {
        return this._cache;
    }

    clear(): void {}
}

function identifier(data: cell_cache): string {
    return data.cell.data.metadata.descriptor;
}

function compile(
    data: cell_cache,
    grid: _grid.readonly_grid_t,
): _cache.base_cache {
    return new CellCompiled(data.cell, grid);
}

// +----------------+
// | Register cache |
// +----------------+
declare module "../../cache_types.js" {
    interface cache_registry {
        cell: {
            user: cell_cache;
            comp: CellCompiled;
        };
    }
}

cache.register({
    type: "cell",
    identifier,
    compile,
});
