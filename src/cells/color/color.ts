/**
 * @file color.ts
 * @description Color cell implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "../../cells.js";
import * as _cells from "../../cell_types.js";

export type color_cell = {
    type: "color";
    r?: number;
    g?: number;
    b?: number;
};

export type color_compiled = {
    r: number;
    g: number;
    b: number;
    value: number;
} & _cells.base_cell;

// Register rule
function compile(cell: color_cell): color_compiled {
    const r = Math.min(Math.max(cell.r ?? 0, 0), 255);
    const g = Math.min(Math.max(cell.g ?? 0, 0), 255);
    const b = Math.min(Math.max(cell.b ?? 0, 0), 255);
    const value = (r << 16) | (g << 8) | b;

    return {
        r,
        g,
        b,
        value,
        metadata: {
            generating: true,
        },
    };
}

function eq(a: color_compiled, b: color_compiled): boolean {
    return a.value === b.value;
}

function gt(a: color_compiled, b: color_compiled): boolean {
    return a.value > b.value;
}

function lt(a: color_compiled, b: color_compiled): boolean {
    return a.value < b.value;
}

function matches(a: color_compiled, b: _cells.fcell_t): boolean {
    return b.cell.type === "color"
        ? a.value === (b.data as color_compiled).value
        : false;
}

// Register type
cells.register({
    type: "color",
    quantum: false,
    compile,
    eq,
    gt,
    lt,
    matches,
});

declare module "../../cell_types.js" {
    interface cell_registry {
        color: {
            user: color_cell;
            comp: color_compiled;
        };
    }
}
