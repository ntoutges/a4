/**
 * @file set.ts
 * @description Set cell implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "../../cells.js";
import * as _cells from "../../cell_types.js";
import { color_compiled } from "../color/color.js";

export type set_cell = {
    type: "set";
    cells: _cells.cell_t[];
};

export type set_compiled = {
    acells: _cells.fcell_t[]; // Array of compiled cells in the set, for iteration during generation
    scells: Set<_cells.fcell_t>; // Precomputed set of compiled cells in the set, for quick checking during matches
    types: Set<string>; // Precomputed set of cell types in the set, for quick checking during matches
} & _cells.base_cell;

// Register rule
function compile(cell: set_cell): set_compiled {
    if (cell.cells.length === 0) {
        throw new Error("Set cells must contain at least one cell");
    }

    // Copmile options
    const compiledCells = cell.cells.map((c) => cells.compile(c));

    return {
        acells: compiledCells,
        scells: new Set(compiledCells),

        // Precompute types for quick checking during matches
        types: new Set(compiledCells.map((c) => c.cell.type)),
        metadata: {
            generating: true,
        },
    };
}

function eq(a: set_compiled, b: set_compiled): boolean {
    if (a.acells.length !== b.acells.length) return false;

    for (const cell of a.scells) {
        if (!b.scells.has(cell)) {
            return false;
        }
    }

    // All cells match; sets are equal
    return true;
}

function gt(a: set_compiled, b: set_compiled): boolean {
    // A set is greater than another if it contains all cells of the other set, and at least one additional cell
    if (a.acells.length <= b.acells.length) return false;

    for (const cell of b.scells) {
        if (!a.scells.has(cell)) {
            return false;
        }
    }

    // All cells in b are in a, and a has more cells; a is greater than b
    return true;
}

function lt(a: set_compiled, b: set_compiled): boolean {
    // A set is less than another if it is contained within the other set, and the other set has at least one additional cell
    if (a.acells.length >= b.acells.length) return false;

    for (const cell of a.scells) {
        if (!b.scells.has(cell)) {
            return false;
        }
    }

    // All cells in a are in b, and b has more cells; a is less than b
    return true;
}

function matches(a: set_compiled, b: _cells.fcell_t): boolean {
    // OPTIMIZATION: Check if the cell type is in the set's types; if not, it can't match
    if (!a.types.has(b.cell.type)) return false;

    // OPTIMIZATION: Check if the cell is in the set's cells; if so, it matches
    if (a.scells.has(b)) return true;

    // Need to check for non-identical-object matches by iterating through set
    for (const cell of a.acells) {
        if (cell.cell.matches(cell.data as any, b)) {
            return true;
        }
    }

    return false; // No match found
}

function execute(cell: set_compiled): _cells.fcell_t {
    return cell.acells[Math.floor(Math.random() * cell.acells.length)]; // Randomly select a cell from the set to generate
}

// Register type
cells.register({
    type: "set",
    quantum: true,
    compile,
    eq,
    gt,
    lt,
    matches,
    exec: execute,
});

declare module "../../cell_types.js" {
    interface cell_registry {
        set: {
            user: set_cell;
            comp: set_compiled;
        };
    }
}
