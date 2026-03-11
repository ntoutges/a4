/**
 * @file not.ts
 * @description Not cell implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "../../cells.js";
import * as _cells from "../../cell_types.js";

export type not_cell = {
    type: "not";
    cell: _cells.cell_t;
};

export type not_compiled = {
    cell: _cells.fcell_t;
} & _cells.base_cell;

// Register rule
function compile(cell: not_cell): not_compiled {
    const ccell = cells.compile(cell.cell);

    return {
        cell: ccell,
        metadata: {
            generating: false,
            descriptor: `not(${ccell.data.metadata.descriptor})`,

            optim: {
                descmatch: ccell.data.metadata.optim.descmatch,
            },
        },
    };
}

function eq(a: not_compiled, b: not_compiled): boolean {
    return a.metadata.descriptor === b.metadata.descriptor;
}

function gt(a: not_compiled, b: not_compiled): boolean {
    return !a.cell.cell.gt(a.cell.data as any, b.cell.data as any);
}

function lt(a: not_compiled, b: not_compiled): boolean {
    return !a.cell.cell.lt(a.cell.data as any, b.cell.data as any);
}

function matches(a: not_compiled, b: _cells.fcell_t): boolean {
    return !a.cell.cell.matches(a.cell.data as any, b);
}

function execute(cell: not_compiled): never {
    throw new Error("Not cells cannot be executed directly");
}

// Register type
cells.register({
    type: "not",
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
        not: {
            user: not_cell;
            comp: not_compiled;
        };
    }
}
